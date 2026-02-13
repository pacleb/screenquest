import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CompletionService } from './completion.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimeBankService } from '../time-bank/time-bank.service';
import { NotificationService } from '../notification/notification.service';
import { GamificationService } from '../gamification/gamification.service';
import { createMockPrisma, MockPrisma } from '../__mocks__/prisma.mock';
import { createMockNotification, MockNotification } from '../__mocks__/notification.mock';

describe('CompletionService', () => {
  let service: CompletionService;
  let prisma: MockPrisma;
  let timeBankService: { creditTime: jest.Mock; deductTime: jest.Mock };
  let notificationService: MockNotification;
  let gamificationService: { processCompletion: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    timeBankService = { creditTime: jest.fn(), deductTime: jest.fn() };
    notificationService = createMockNotification();
    gamificationService = {
      processCompletion: jest.fn().mockResolvedValue({ xpGained: 10 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompletionService,
        { provide: PrismaService, useValue: prisma },
        { provide: TimeBankService, useValue: timeBankService },
        { provide: NotificationService, useValue: notificationService },
        { provide: GamificationService, useValue: gamificationService },
      ],
    }).compile();

    service = module.get<CompletionService>(CompletionService);
  });

  describe('completeQuest', () => {
    const setupChildAndQuest = (overrides: Record<string, any> = {}) => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'child-1',
        role: 'child',
        familyId: 'fam-1',
        name: 'Test Child',
      });
      prisma.quest.findFirst.mockResolvedValue({
        id: 'quest-1',
        name: 'Clean Room',
        isArchived: false,
        rewardMinutes: 30,
        bonusMultiplier: 1.0,
        stackingType: 'stackable',
        recurrence: 'daily',
        requiresProof: false,
        autoApprove: false,
        ...overrides,
      });
      prisma.questCompletion.findFirst.mockResolvedValue(null); // no duplicate
      prisma.questCompletion.create.mockResolvedValue({
        id: 'comp-1',
        questId: 'quest-1',
        childId: 'child-1',
        status: 'pending',
        earnedMinutes: 30,
        quest: { id: 'quest-1', name: 'Clean Room', icon: '🧹', category: 'chores' },
      });
    };

    it('creates a pending completion for non-auto-approve quest', async () => {
      setupChildAndQuest();

      const result = await service.completeQuest('child-1', 'quest-1', {});

      expect(result.status).toBe('pending');
      expect(timeBankService.creditTime).not.toHaveBeenCalled();
    });

    it('auto-approve credits time and processes gamification', async () => {
      setupChildAndQuest({ autoApprove: true });
      prisma.questCompletion.create.mockResolvedValue({
        id: 'comp-1',
        questId: 'quest-1',
        childId: 'child-1',
        status: 'approved',
        earnedMinutes: 30,
        quest: { id: 'quest-1', name: 'Clean Room', icon: '🧹', category: 'chores' },
      });

      const result = await service.completeQuest('child-1', 'quest-1', {});

      expect(timeBankService.creditTime).toHaveBeenCalledWith(
        'child-1',
        30,
        'stackable',
        null,
      );
      expect(gamificationService.processCompletion).toHaveBeenCalledWith('child-1', 'comp-1');
      expect((result as any).gamificationEvent).toBeDefined();
    });

    it('applies bonus multiplier', async () => {
      setupChildAndQuest({ bonusMultiplier: 1.5, autoApprove: true });
      prisma.questCompletion.create.mockResolvedValue({
        id: 'comp-1',
        status: 'approved',
        earnedMinutes: 45,
        quest: {},
      });

      await service.completeQuest('child-1', 'quest-1', {});

      const createCall = prisma.questCompletion.create.mock.calls[0][0];
      expect(createCall.data.earnedMinutes).toBe(45); // 30 * 1.5
    });

    it('blocks duplicate daily completion', async () => {
      setupChildAndQuest({ recurrence: 'daily' });
      prisma.questCompletion.findFirst.mockResolvedValue({
        id: 'existing',
        questId: 'quest-1',
        childId: 'child-1',
      });

      await expect(
        service.completeQuest('child-1', 'quest-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks duplicate one-time completion', async () => {
      setupChildAndQuest({ recurrence: 'one_time' });
      prisma.questCompletion.findFirst.mockResolvedValue({
        id: 'existing',
        status: 'approved',
      });

      await expect(
        service.completeQuest('child-1', 'quest-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires proof when quest has requiresProof', async () => {
      setupChildAndQuest({ requiresProof: true });

      await expect(
        service.completeQuest('child-1', 'quest-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('notifies parents for non-auto-approve', async () => {
      setupChildAndQuest();

      await service.completeQuest('child-1', 'quest-1', {});

      expect(notificationService.sendToParents).toHaveBeenCalledWith(
        'fam-1',
        expect.objectContaining({ title: 'Quest Completed' }),
        'quest_completions',
      );
    });
  });

  describe('approveCompletion', () => {
    it('credits time and triggers gamification', async () => {
      prisma.questCompletion.findUnique.mockResolvedValue({
        id: 'comp-1',
        childId: 'child-1',
        status: 'pending',
        earnedMinutes: 30,
        stackingType: 'stackable',
        expiresAt: null,
        quest: { familyId: 'fam-1' },
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'parent-1',
        role: 'parent',
        familyId: 'fam-1',
      });
      prisma.questCompletion.update.mockResolvedValue({
        id: 'comp-1',
        status: 'approved',
        quest: { id: 'quest-1', name: 'Clean', icon: '🧹' },
        child: { id: 'child-1', name: 'Kid' },
      });

      await service.approveCompletion('comp-1', 'parent-1', {});

      expect(timeBankService.creditTime).toHaveBeenCalledWith('child-1', 30, 'stackable', null);
      expect(gamificationService.processCompletion).toHaveBeenCalledWith('child-1', 'comp-1');
    });

    it('throws BadRequestException if already reviewed', async () => {
      prisma.questCompletion.findUnique.mockResolvedValue({
        id: 'comp-1',
        childId: 'child-1',
        status: 'approved',
        quest: { familyId: 'fam-1' },
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'parent-1',
        role: 'parent',
        familyId: 'fam-1',
      });

      await expect(
        service.approveCompletion('comp-1', 'parent-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('denyCompletion', () => {
    it('denies without crediting time', async () => {
      prisma.questCompletion.findUnique.mockResolvedValue({
        id: 'comp-1',
        childId: 'child-1',
        status: 'pending',
        quest: { familyId: 'fam-1' },
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'parent-1',
        role: 'parent',
        familyId: 'fam-1',
      });
      prisma.questCompletion.update.mockResolvedValue({
        id: 'comp-1',
        status: 'denied',
        quest: { id: 'quest-1', name: 'Clean', icon: '🧹' },
        child: { id: 'child-1', name: 'Kid' },
      });

      await service.denyCompletion('comp-1', 'parent-1', { parentNote: 'Try again' });

      expect(timeBankService.creditTime).not.toHaveBeenCalled();
      expect(notificationService.sendToUser).toHaveBeenCalledWith(
        'child-1',
        expect.objectContaining({ title: 'Quest Not Approved' }),
        'quest_completions',
      );
    });
  });
});
