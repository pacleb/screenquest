import { Test, TestingModule } from '@nestjs/testing';
import { GamificationService } from './gamification.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createMockPrisma, MockPrisma } from '../__mocks__/prisma.mock';
import { createMockNotification, MockNotification } from '../__mocks__/notification.mock';

describe('GamificationService', () => {
  let service: GamificationService;
  let prisma: MockPrisma;
  let notificationService: MockNotification;

  beforeEach(async () => {
    prisma = createMockPrisma();
    notificationService = createMockNotification();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notificationService },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<GamificationService>(GamificationService);
  });

  const makeProgress = (overrides = {}) => ({
    childId: 'child-1',
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    weeklyXp: 0,
    lastCompletionDate: null,
    ...overrides,
  });

  describe('processCompletion', () => {
    beforeEach(() => {
      // Default: no unearned achievements
      prisma.achievement.findMany.mockResolvedValue([]);
    });

    it('first-ever completion sets streak to 1', async () => {
      const progress = makeProgress();
      prisma.childProgress.findUnique.mockResolvedValue(progress);
      prisma.childProgress.update.mockResolvedValue({ ...progress, totalXp: 12, currentStreak: 1 });

      const event = await service.processCompletion('child-1', 'comp-1');

      expect(event.currentStreak).toBe(1);
      expect(event.streakUpdated).toBe(true);
    });

    it('consecutive day increments streak', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      const progress = makeProgress({ currentStreak: 3, lastCompletionDate: yesterday });
      prisma.childProgress.findUnique.mockResolvedValue(progress);
      prisma.childProgress.update.mockResolvedValue({ ...progress, totalXp: 18, currentStreak: 4 });

      const event = await service.processCompletion('child-1', 'comp-1');

      expect(event.currentStreak).toBe(4);
      expect(event.streakUpdated).toBe(true);
    });

    it('same-day second completion does not change streak', async () => {
      const today = new Date();
      const progress = makeProgress({ currentStreak: 3, lastCompletionDate: today });
      prisma.childProgress.findUnique.mockResolvedValue(progress);
      prisma.childProgress.update.mockResolvedValue({ ...progress, totalXp: 16 });

      const event = await service.processCompletion('child-1', 'comp-1');

      expect(event.currentStreak).toBe(3);
      expect(event.streakUpdated).toBe(false);
    });

    it('gap > 1 day resets streak to 1', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
      const progress = makeProgress({ currentStreak: 5, lastCompletionDate: twoDaysAgo });
      prisma.childProgress.findUnique.mockResolvedValue(progress);
      prisma.childProgress.update.mockResolvedValue({ ...progress, totalXp: 12, currentStreak: 1 });

      const event = await service.processCompletion('child-1', 'comp-1');

      expect(event.currentStreak).toBe(1);
      expect(event.streakUpdated).toBe(true);
    });

    it('XP = 10 base + min(streak * 2, 20) bonus', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      const progress = makeProgress({ currentStreak: 3, lastCompletionDate: yesterday });
      prisma.childProgress.findUnique.mockResolvedValue(progress);
      prisma.childProgress.update.mockResolvedValue({ ...progress, totalXp: 18 });

      const event = await service.processCompletion('child-1', 'comp-1');

      // streak goes to 4, bonus = min(4*2, 20) = 8, total = 18
      expect(event.xpEarned).toBe(18);
    });

    it('caps streak bonus at 20 for high streaks', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      const progress = makeProgress({ currentStreak: 14, lastCompletionDate: yesterday });
      prisma.childProgress.findUnique.mockResolvedValue(progress);
      prisma.childProgress.update.mockResolvedValue({ ...progress, totalXp: 30 });

      const event = await service.processCompletion('child-1', 'comp-1');

      // streak goes to 15, bonus = min(15*2, 20) = 20, total = 30
      expect(event.xpEarned).toBe(30);
    });

    it('detects level-up at threshold crossing', async () => {
      const progress = makeProgress({ totalXp: 45, level: 1 });
      prisma.childProgress.findUnique.mockResolvedValue(progress);
      // After XP award, totalXp will be 45 + 12 = 57 (crosses level 2 at 50)
      prisma.childProgress.update
        .mockResolvedValueOnce(progress) // streak update
        .mockResolvedValueOnce({ ...progress, totalXp: 57 }) // XP update
        .mockResolvedValueOnce({ ...progress, totalXp: 57, level: 2 }); // level update

      const event = await service.processCompletion('child-1', 'comp-1');

      expect(event.newLevel).toEqual({ level: 2, name: 'Explorer' });
    });

    it('sends streak milestone notification at 3, 5, 7, 14, 30', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      const progress = makeProgress({ currentStreak: 2, lastCompletionDate: yesterday });
      prisma.childProgress.findUnique.mockResolvedValue(progress);
      prisma.childProgress.update.mockResolvedValue({ ...progress, totalXp: 16 });

      await service.processCompletion('child-1', 'comp-1');

      // Streak goes to 3 → milestone notification
      expect(notificationService.sendToUser).toHaveBeenCalledWith(
        'child-1',
        expect.objectContaining({ title: 'Streak Milestone!' }),
        'gamification',
      );
    });
  });

  describe('getChildProgress', () => {
    it('returns correct xpToNextLevel for level 1', async () => {
      const progress = makeProgress({ totalXp: 30 });
      prisma.childProgress.findUnique.mockResolvedValue(progress);

      const result = await service.getChildProgress('child-1');

      expect(result.level).toBe(1);
      expect(result.levelName).toBe('Starter');
      // Next level (2) requires 50 XP, so xpToNextLevel = 50 - 30 = 20
      expect(result.xpToNextLevel).toBe(20);
    });

    it('returns xpToNextLevel = 0 at max level', async () => {
      const progress = makeProgress({ totalXp: 2000, level: 10 });
      prisma.childProgress.findUnique.mockResolvedValue(progress);

      const result = await service.getChildProgress('child-1');

      expect(result.level).toBe(10);
      expect(result.xpToNextLevel).toBe(0);
      expect(result.xpProgressInLevel).toBe(1);
    });

    it('calculates correct xpProgressInLevel', async () => {
      // Level 1 requires 0 XP, Level 2 requires 50 XP
      // At 25 XP: progress = (25-0) / (50-0) = 0.5
      const progress = makeProgress({ totalXp: 25 });
      prisma.childProgress.findUnique.mockResolvedValue(progress);

      const result = await service.getChildProgress('child-1');

      expect(result.xpProgressInLevel).toBe(0.5);
    });
  });
});
