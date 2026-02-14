import { Test, TestingModule } from '@nestjs/testing';
import { ThemeService } from './theme.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  theme: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  childProgress: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  childAchievement: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  achievement: {
    findMany: jest.fn(),
  },
  questCompletion: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  playSession: {
    findMany: jest.fn(),
  },
};

const mockSubscriptionService = {
  isPremium: jest.fn(),
};

describe('ThemeService', () => {
  let service: ThemeService;
  let prisma: typeof mockPrisma;
  let subscriptionService: typeof mockSubscriptionService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThemeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
      ],
    }).compile();

    service = module.get<ThemeService>(ThemeService);
    prisma = module.get(PrismaService);
    subscriptionService = module.get(SubscriptionService);
  });

  // ─── getThemes ──────────────────────────────────────────────
  describe('getThemes', () => {
    it('should return all themes with unlock status', async () => {
      const childId = 'child-1';
      const themes = [
        { id: 't1', key: 'classic', name: 'Classic', unlockType: 'free', unlockValue: null, colors: {}, gradients: {}, isAnimated: false, description: '', previewUrl: null, category: 'basic', sortOrder: 0 },
        { id: 't2', key: 'ocean', name: 'Ocean', unlockType: 'level', unlockValue: '3', colors: {}, gradients: {}, isAnimated: false, description: '', previewUrl: null, category: 'basic', sortOrder: 1 },
      ];

      prisma.theme.findMany.mockResolvedValue(themes);
      prisma.childProgress.findUnique.mockResolvedValue({
        currentStreak: 5,
        level: 2,
      });
      prisma.childAchievement.findMany.mockResolvedValue([]);
      prisma.user.findUnique.mockResolvedValue({ activeThemeId: 't1', familyId: 'fam-1' });
      mockSubscriptionService.isPremium.mockResolvedValue(false);

      // Need to mock the gamification service level lookup
      // The service computes level from totalXp via progress
      const result = await service.getThemes(childId);

      expect(result).toHaveLength(2);
      expect(result[0].isActive).toBe(true); // classic is active
      expect(result[0].isUnlocked).toBe(true); // free theme
    });
  });

  // ─── setActiveTheme ─────────────────────────────────────────
  describe('setActiveTheme', () => {
    it('should throw NotFoundException if theme not found', async () => {
      prisma.theme.findUnique.mockResolvedValue(null);

      await expect(service.setActiveTheme('child-1', 'invalid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if theme is locked', async () => {
      prisma.theme.findUnique.mockResolvedValue({
        id: 't1',
        unlockType: 'level',
        unlockValue: '10',
      });
      prisma.childProgress.findUnique.mockResolvedValue({
        currentStreak: 0,
        user: { activeThemeId: null, familyId: 'fam-1' },
      });
      prisma.childAchievement.findMany.mockResolvedValue([]);
      mockSubscriptionService.isPremium.mockResolvedValue(false);

      await expect(service.setActiveTheme('child-1', 't1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── useStreakFreeze ────────────────────────────────────────
  describe('useStreakFreeze', () => {
    it('should throw ForbiddenException if not premium', async () => {
      prisma.user.findUnique.mockResolvedValue({ familyId: 'fam-1' });
      mockSubscriptionService.isPremium.mockResolvedValue(false);

      await expect(service.useStreakFreeze('child-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should succeed for premium user who hasn\'t used it this week', async () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 10); // well over a week ago

      prisma.user.findUnique.mockResolvedValue({ familyId: 'fam-1' });
      mockSubscriptionService.isPremium.mockResolvedValue(true);
      prisma.childProgress.findUnique.mockResolvedValue({
        id: 'prog-1',
        streakFreezeUsedAt: fiveDaysAgo,
        lastCompletionDate: new Date(),
      });
      prisma.childProgress.update.mockResolvedValue({});

      const result = await service.useStreakFreeze('child-1');
      expect(result.success).toBe(true);
      expect(prisma.childProgress.update).toHaveBeenCalled();
    });
  });

  // ─── setShowcase ────────────────────────────────────────────
  describe('setShowcase', () => {
    it('should throw ForbiddenException if badge not earned', async () => {
      prisma.childAchievement.findMany.mockResolvedValue([]);

      await expect(service.setShowcase('child-1', ['badge-x'])).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should update showcase badges when all are earned', async () => {
      prisma.childAchievement.findMany.mockResolvedValue([
        { childId: 'child-1', achievementId: 'b1' },
        { childId: 'child-1', achievementId: 'b2' },
      ]);
      prisma.childProgress.update.mockResolvedValue({
        showcaseBadges: ['b1', 'b2'],
      });

      const result = await service.setShowcase('child-1', ['b1', 'b2']);
      expect(prisma.childProgress.update).toHaveBeenCalled();
    });
  });

  // ─── getShowcase ────────────────────────────────────────────
  describe('getShowcase', () => {
    it('should return empty array if no showcase set', async () => {
      prisma.childProgress.findUnique.mockResolvedValue({
        showcaseBadges: [],
      });

      const result = await service.getShowcase('child-1');
      expect(result.showcaseBadges).toEqual([]);
    });

    it('should return achievement details for showcased badges', async () => {
      prisma.childProgress.findUnique.mockResolvedValue({
        showcaseBadges: ['ach-1'],
      });
      prisma.achievement.findMany.mockResolvedValue([
        { id: 'ach-1', name: 'First Steps', icon: '👣', badgeTier: 'bronze', badgeColor: '#CD7F32' },
      ]);

      const result = await service.getShowcase('child-1');
      expect(result.showcaseBadges).toHaveLength(1);
      expect(result.showcaseBadges[0].name).toBe('First Steps');
    });
  });

  // ─── getWeeklyStats ────────────────────────────────────────
  describe('getWeeklyStats', () => {
    it('should return 7-day breakdown with totals', async () => {
      prisma.questCompletion.findMany.mockResolvedValue([]);
      prisma.playSession.findMany.mockResolvedValue([]);
      prisma.childProgress.findUnique.mockResolvedValue({
        currentStreak: 3,
      });

      const result = await service.getWeeklyStats('child-1');
      expect(result.dailyStats).toHaveLength(7);
      expect(result.currentStreak).toBe(3);
      expect(result.questsCompleted).toBe(0);
    });
  });

  // ─── getActivityFeed ───────────────────────────────────────
  describe('getActivityFeed', () => {
    it('should return merged and sorted activity feed', async () => {
      const now = new Date();
      prisma.questCompletion.findMany.mockResolvedValue([
        {
          id: 'c1',
          completedAt: now,
          child: { id: 'ch1', name: 'Alice', avatarUrl: null },
          quest: { name: 'Clean room', rewardMinutes: 15 },
        },
      ]);
      prisma.childAchievement.findMany.mockResolvedValue([]);
      prisma.playSession.findMany.mockResolvedValue([]);

      const result = await service.getActivityFeed('fam-1', 1, 20);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('quest_completion');
      expect(result.items[0].childName).toBe('Alice');
    });
  });
});
