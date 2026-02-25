import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { getLevelForXp, getNextLevel, LEVEL_THRESHOLDS } from './constants/levels';
import {
  AchievementEarnedEvent,
  LevelUpEvent,
  AvatarCustomizedEvent,
} from '../common/analytics/analytics.events';

export interface GamificationEvent {
  xpEarned: number;
  newLevel: { level: number; name: string } | null;
  newAchievements: { key: string; name: string; icon: string }[];
  streakUpdated: boolean;
  currentStreak: number;
}

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ─── Core: Process Completion ───────────────────────────────

  async processCompletion(
    childId: string,
    completionId: string,
  ): Promise<GamificationEvent> {
    const events: GamificationEvent = {
      xpEarned: 0,
      newLevel: null,
      newAchievements: [],
      streakUpdated: false,
      currentStreak: 0,
    };

    // 1. Ensure ChildProgress exists
    const progress = await this.ensureProgress(childId);

    // 2. Update streak
    const streakResult = this.computeStreak(progress);
    events.currentStreak = streakResult.newStreak;
    events.streakUpdated = streakResult.changed;

    if (streakResult.changed) {
      await this.prisma.childProgress.update({
        where: { childId },
        data: {
          currentStreak: streakResult.newStreak,
          longestStreak: Math.max(streakResult.newStreak, progress.longestStreak),
          lastCompletionDate: new Date(),
        },
      });

      // Streak milestone notifications
      if ([3, 5, 7, 14, 30].includes(streakResult.newStreak)) {
        this.notificationService.sendToUser(
          childId,
          {
            title: 'Streak Milestone!',
            body: `Amazing! You're on a ${streakResult.newStreak}-day streak!`,
            data: { type: 'streak_milestone', streak: String(streakResult.newStreak) },
          },
          'gamification',
        );
      }
    } else {
      // Still update lastCompletionDate if not changed (same-day completion)
      await this.prisma.childProgress.update({
        where: { childId },
        data: { lastCompletionDate: new Date() },
      });
    }

    // 3. Calculate XP: 10 base + streak bonus (capped at 20)
    const streakBonus = Math.min(streakResult.newStreak * 2, 20);
    const xpEarned = 10 + streakBonus;
    events.xpEarned = xpEarned;

    // 4. Award XP and check level-up
    const updatedProgress = await this.prisma.childProgress.update({
      where: { childId },
      data: {
        totalXp: { increment: xpEarned },
        weeklyXp: { increment: xpEarned },
      },
    });

    const newLevelInfo = getLevelForXp(updatedProgress.totalXp);
    if (newLevelInfo.level > progress.level) {
      await this.prisma.childProgress.update({
        where: { childId },
        data: { level: newLevelInfo.level },
      });
      events.newLevel = { level: newLevelInfo.level, name: newLevelInfo.name };

      // Emit level up analytics event
      const childUser = await this.prisma.user.findUnique({ where: { id: childId }, select: { familyId: true } });
      this.eventEmitter.emit(
        'level.up',
        new LevelUpEvent(childId, childUser?.familyId || '', newLevelInfo.level, newLevelInfo.name),
      );

      this.notificationService.sendToUser(
        childId,
        {
          title: 'Level Up!',
          body: `You reached Level ${newLevelInfo.level} — ${newLevelInfo.name}!`,
          data: { type: 'level_up', level: String(newLevelInfo.level) },
        },
        'gamification',
      );
    }

    // 5. Check achievements
    const newAchievements = await this.checkAchievements(childId, completionId);
    events.newAchievements = newAchievements;

    return events;
  }

  // ─── Streak Logic ───────────────────────────────────────────

  private computeStreak(progress: {
    currentStreak: number;
    longestStreak: number;
    lastCompletionDate: Date | null;
  }): { newStreak: number; changed: boolean } {
    const today = this.getDateString(new Date());
    const lastDate = progress.lastCompletionDate
      ? this.getDateString(new Date(progress.lastCompletionDate))
      : null;

    // Same day — no streak change
    if (lastDate === today) {
      return { newStreak: progress.currentStreak, changed: false };
    }

    const yesterday = this.getDateString(
      new Date(Date.now() - 86400000),
    );

    if (lastDate === yesterday) {
      // Consecutive day — increment
      return { newStreak: progress.currentStreak + 1, changed: true };
    }

    // Broken or first — start at 1
    return { newStreak: 1, changed: true };
  }

  // ─── Achievement Checks ─────────────────────────────────────

  private async checkAchievements(
    childId: string,
    completionId: string,
  ): Promise<{ key: string; name: string; icon: string }[]> {
    const unearned = await this.prisma.achievement.findMany({
      where: {
        childAchievements: { none: { childId } },
      },
    });

    const newlyEarned: { key: string; name: string; icon: string }[] = [];

    for (const achievement of unearned) {
      const criteria = achievement.criteria as any;
      let earned = false;

      switch (criteria.type) {
        case 'total_completions': {
          const count = await this.prisma.questCompletion.count({
            where: { childId, status: 'approved' },
          });
          earned = count >= criteria.value;
          break;
        }
        case 'category_completions': {
          const count = await this.prisma.questCompletion.count({
            where: {
              childId,
              status: 'approved',
              quest: { category: { equals: criteria.category, mode: 'insensitive' } },
            },
          });
          earned = count >= criteria.value;
          break;
        }
        case 'early_completion': {
          const completion = await this.prisma.questCompletion.findUnique({
            where: { id: completionId },
          });
          if (completion) {
            earned = completion.completedAt.getHours() < criteria.beforeHour;
          }
          break;
        }
        case 'total_earned_seconds': {
          const result = await this.prisma.questCompletion.aggregate({
            where: { childId, status: 'approved' },
            _sum: { earnedSeconds: true },
          });
          earned = (result._sum.earnedSeconds || 0) >= criteria.value;
          break;
        }
        case 'streak': {
          const progress = await this.prisma.childProgress.findUnique({
            where: { childId },
          });
          earned = (progress?.currentStreak || 0) >= criteria.value;
          break;
        }
      }

      if (earned) {
        await this.prisma.childAchievement.create({
          data: { childId, achievementId: achievement.id },
        });
        newlyEarned.push({
          key: achievement.key,
          name: achievement.name,
          icon: achievement.icon,
        });

        this.notificationService.sendToUser(
          childId,
          {
            title: 'Achievement Unlocked!',
            body: `${achievement.icon} ${achievement.name} — ${achievement.description}`,
            data: { type: 'achievement_unlocked', achievementKey: achievement.key },
          },
          'gamification',
        );

        // Emit achievement earned analytics event
        const childUser = await this.prisma.user.findUnique({ where: { id: childId }, select: { familyId: true } });
        this.eventEmitter.emit(
          'achievement.earned',
          new AchievementEarnedEvent(childId, childUser?.familyId || '', achievement.key, achievement.name),
        );
      }
    }

    return newlyEarned;
  }

  // ─── Read Methods ───────────────────────────────────────────

  async getChildProgress(childId: string) {
    const progress = await this.ensureProgress(childId);
    const levelInfo = getLevelForXp(progress.totalXp);
    const nextLevel = getNextLevel(levelInfo.level);

    return {
      totalXp: progress.totalXp,
      level: levelInfo.level,
      levelName: levelInfo.name,
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      weeklyXp: progress.weeklyXp,
      xpToNextLevel: nextLevel ? nextLevel.xpRequired - progress.totalXp : 0,
      xpProgressInLevel: nextLevel
        ? (progress.totalXp - levelInfo.xpRequired) /
          (nextLevel.xpRequired - levelInfo.xpRequired)
        : 1,
      xpInLevel: progress.totalXp - levelInfo.xpRequired,
      xpForLevel: nextLevel ? nextLevel.xpRequired - levelInfo.xpRequired : 0,
    };
  }

  async getChildAchievements(childId: string) {
    const [allAchievements, earned] = await Promise.all([
      this.prisma.achievement.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.childAchievement.findMany({
        where: { childId },
        select: { achievementId: true, unlockedAt: true },
      }),
    ]);

    const earnedMap = new Map(
      earned.map((e) => [e.achievementId, e.unlockedAt]),
    );

    return allAchievements.map((a) => ({
      id: a.id,
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon,
      category: a.category,
      unlockedAt: earnedMap.get(a.id)?.toISOString() || null,
    }));
  }

  async getAllAchievements() {
    return this.prisma.achievement.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  // ─── Leaderboard ────────────────────────────────────────────

  async getFamilyLeaderboard(familyId: string, requesterId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
    });
    if (!requester || requester.familyId !== familyId) {
      throw new ForbiddenException('Access denied');
    }

    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    });
    if (!family) throw new NotFoundException('Family not found');

    if (!family.leaderboardEnabled) {
      return { enabled: false, entries: [] };
    }

    const children = await this.prisma.user.findMany({
      where: { familyId, role: 'child' },
      include: { progress: true },
    });

    const entries = children
      .map((child) => ({
        childId: child.id,
        name: child.name,
        avatarUrl: child.avatarUrl,
        weeklyXp: child.progress?.weeklyXp || 0,
        level: child.progress?.level || 1,
        levelName: getLevelForXp(child.progress?.totalXp || 0).name,
      }))
      .sort((a, b) => b.weeklyXp - a.weeklyXp)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    return { enabled: true, entries };
  }

  async toggleLeaderboard(familyId: string, parentId: string, enabled: boolean) {
    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
    });
    if (
      !parent ||
      parent.familyId !== familyId ||
      !['parent', 'guardian'].includes(parent.role)
    ) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.family.update({
      where: { id: familyId },
      data: { leaderboardEnabled: enabled },
    });

    return { enabled };
  }

  async getLeaderboardSetting(familyId: string, requesterId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
    });
    if (!requester || requester.familyId !== familyId) {
      throw new ForbiddenException('Access denied');
    }

    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    });
    return { enabled: family?.leaderboardEnabled ?? false };
  }

  // ─── Avatar Methods ─────────────────────────────────────────

  async getAvailableAvatarItems(childId: string) {
    const allItems = await this.prisma.avatarItem.findMany({
      orderBy: [{ slot: 'asc' }, { sortOrder: 'asc' }],
    });

    const equippedItems = await this.prisma.childEquippedItem.findMany({
      where: { childId },
      select: { avatarItemId: true, slot: true },
    });

    const equippedMap = new Map(equippedItems.map((e) => [e.avatarItemId, true]));

    return allItems.map((item) => ({
      id: item.id,
      key: item.key,
      name: item.name,
      icon: item.icon,
      slot: item.slot,
      unlockType: item.unlockType,
      unlockValue: item.unlockValue,
      isUnlocked: true,
      isEquipped: equippedMap.has(item.id),
    }));
  }

  async getEquippedItems(childId: string) {
    return this.prisma.childEquippedItem.findMany({
      where: { childId },
      include: { avatarItem: true },
    });
  }

  async equipItem(childId: string, avatarItemId: string) {
    const item = await this.prisma.avatarItem.findUnique({
      where: { id: avatarItemId },
    });
    if (!item) throw new NotFoundException('Avatar item not found');

    // Verify item is unlocked
    const items = await this.getAvailableAvatarItems(childId);
    const targetItem = items.find((i) => i.id === avatarItemId);
    if (!targetItem?.isUnlocked) {
      throw new BadRequestException('This item is locked');
    }

    // Upsert — one item per slot
    await this.prisma.childEquippedItem.upsert({
      where: { childId_slot: { childId, slot: item.slot } },
      create: { childId, avatarItemId, slot: item.slot },
      update: { avatarItemId, equippedAt: new Date() },
    });

    // Emit avatar customized analytics event
    const child = await this.prisma.user.findUnique({ where: { id: childId }, select: { familyId: true } });
    this.eventEmitter.emit(
      'avatar.customized',
      new AvatarCustomizedEvent(childId, child?.familyId || ''),
    );

    return { success: true };
  }

  async unequipSlot(childId: string, slot: string) {
    await this.prisma.childEquippedItem.deleteMany({
      where: { childId, slot },
    });
    return { success: true };
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async ensureProgress(childId: string) {
    let progress = await this.prisma.childProgress.findUnique({
      where: { childId },
    });

    if (!progress) {
      progress = await this.prisma.childProgress.create({
        data: { childId },
      });
    }

    return progress;
  }

  private getDateString(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
