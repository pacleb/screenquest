import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class ThemeService {
  private readonly logger = new Logger(ThemeService.name);

  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  // ─── Themes ──────────────────────────────────────────────────

  async getThemes(childId: string) {
    const [themes, progress, childAchievements, user] = await Promise.all([
      this.prisma.theme.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.childProgress.findUnique({ where: { childId } }),
      this.prisma.childAchievement.findMany({
        where: { childId },
        include: { achievement: true },
      }),
      this.prisma.user.findUnique({
        where: { id: childId },
        select: { activeThemeId: true, familyId: true },
      }),
    ]);

    const level = progress?.level ?? 1;
    const streak = progress?.currentStreak ?? 0;
    const achievementKeys = childAchievements.map((ca) => ca.achievement.key);
    const isPremium = user?.familyId
      ? await this.subscriptionService.isPremium(user.familyId)
      : false;

    return themes.map((theme) => ({
      id: theme.id,
      key: theme.key,
      name: theme.name,
      description: theme.description,
      category: theme.category,
      colors: theme.colors,
      gradients: theme.gradients,
      isAnimated: theme.isAnimated,
      isActive: user?.activeThemeId === theme.id,
      isUnlocked: this.isThemeUnlocked(theme, level, streak, achievementKeys, isPremium),
      unlockType: theme.unlockType,
      unlockValue: theme.unlockValue,
    }));
  }

  async setActiveTheme(childId: string, themeId: string) {
    const [theme, progress, childAchievements, user] = await Promise.all([
      this.prisma.theme.findUnique({ where: { id: themeId } }),
      this.prisma.childProgress.findUnique({ where: { childId } }),
      this.prisma.childAchievement.findMany({
        where: { childId },
        include: { achievement: true },
      }),
      this.prisma.user.findUnique({
        where: { id: childId },
        select: { familyId: true },
      }),
    ]);

    if (!theme) throw new NotFoundException('Theme not found');

    const level = progress?.level ?? 1;
    const streak = progress?.currentStreak ?? 0;
    const achievementKeys = childAchievements.map((ca) => ca.achievement.key);
    const isPremium = user?.familyId
      ? await this.subscriptionService.isPremium(user.familyId)
      : false;

    if (!this.isThemeUnlocked(theme, level, streak, achievementKeys, isPremium)) {
      throw new ForbiddenException('Theme is locked');
    }

    await this.prisma.user.update({
      where: { id: childId },
      data: { activeThemeId: themeId },
    });

    return { themeId, key: theme.key, name: theme.name };
  }

  private isThemeUnlocked(
    theme: { unlockType: string; unlockValue: number | null; key: string },
    level: number,
    streak: number,
    achievementKeys: string[],
    isPremium: boolean,
  ): boolean {
    switch (theme.unlockType) {
      case 'free':
        return true;
      case 'level':
        return level >= (theme.unlockValue ?? 0);
      case 'streak':
        return streak >= (theme.unlockValue ?? 0);
      case 'achievement':
        // champion_gold requires 'century' achievement
        if (theme.key === 'champion_gold') return achievementKeys.includes('century');
        return true;
      case 'premium':
        return isPremium;
      default:
        return false;
    }
  }

  // ─── Streak Freeze ──────────────────────────────────────────

  async useStreakFreeze(childId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: childId },
      select: { familyId: true },
    });
    if (!user?.familyId) throw new NotFoundException('User not found');

    const isPremium = await this.subscriptionService.isPremium(user.familyId);
    if (!isPremium) {
      throw new ForbiddenException('Streak freeze is a premium feature');
    }

    const progress = await this.prisma.childProgress.findUnique({
      where: { childId },
    });
    if (!progress) throw new NotFoundException('No progress record');

    // Check if already used this week (Monday-Sunday)
    if (progress.streakFreezeUsedAt) {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
      weekStart.setHours(0, 0, 0, 0);

      if (progress.streakFreezeUsedAt >= weekStart) {
        throw new BadRequestException('Streak freeze already used this week');
      }
    }

    await this.prisma.childProgress.update({
      where: { childId },
      data: {
        streakFreezeUsedAt: new Date(),
        // Extend lastCompletionDate to today so streak doesn't break
        lastCompletionDate: new Date(),
      },
    });

    return { success: true, message: 'Streak freeze activated!' };
  }

  // ─── Badge Showcase ─────────────────────────────────────────

  async setShowcase(childId: string, badgeIds: string[]) {
    if (badgeIds.length > 3) {
      throw new BadRequestException('Maximum 3 showcase badges allowed');
    }

    // Verify child has earned all the badges
    if (badgeIds.length > 0) {
      const earned = await this.prisma.childAchievement.findMany({
        where: {
          childId,
          achievementId: { in: badgeIds },
        },
      });

      if (earned.length !== badgeIds.length) {
        throw new ForbiddenException('You can only showcase earned badges');
      }
    }

    await this.prisma.childProgress.update({
      where: { childId },
      data: { showcaseBadges: badgeIds },
    });

    return { showcaseBadges: badgeIds };
  }

  async getShowcase(childId: string) {
    const progress = await this.prisma.childProgress.findUnique({
      where: { childId },
      select: { showcaseBadges: true },
    });

    if (!progress) return { showcaseBadges: [] };

    // Get full badge details
    const badges = progress.showcaseBadges.length > 0
      ? await this.prisma.achievement.findMany({
          where: { id: { in: progress.showcaseBadges } },
        })
      : [];

    return { showcaseBadges: badges };
  }

  // ─── Weekly Stats ───────────────────────────────────────────

  /**
   * @param tzOffset Client timezone offset in minutes (e.g. 480 for GMT+8).
   *                  Positive = east of UTC, matching -(new Date().getTimezoneOffset()).
   */
  async getWeeklyStats(childId: string, tzOffset = 0) {
    const offsetMs = tzOffset * 60 * 1000;
    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const [completions, progress, playSessions] = await Promise.all([
      this.prisma.questCompletion.findMany({
        where: {
          childId,
          status: 'approved',
          completedAt: { gte: fourWeeksAgo },
        },
        include: { quest: { select: { rewardSeconds: true } } },
      }),
      this.prisma.childProgress.findUnique({ where: { childId } }),
      this.prisma.playSession.findMany({
        where: {
          childId,
          status: 'completed',
          startedAt: { gte: fourWeeksAgo },
        },
        select: { startedAt: true, endedAt: true },
      }),
    ]);

    // Only count last 7 days for the summary totals
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekCompletions = completions.filter((c) => c.completedAt >= weekAgo);
    const weekPlaySessions = playSessions.filter((s) => s.startedAt! >= weekAgo);

    const questsCompleted = weekCompletions.length;
    const secondsEarned = weekCompletions.reduce(
      (sum, c) => sum + (c.quest?.rewardSeconds ?? 0),
      0,
    );
    const xpEarned = progress?.weeklyXp ?? 0;
    const totalPlaySeconds = weekPlaySessions.reduce((sum, s) => {
      if (!s.endedAt) return sum;
      return sum + Math.round((s.endedAt.getTime() - s.startedAt!.getTime()) / 1000);
    }, 0);

    // Helper: format a Date as YYYY-MM-DD in the client's local timezone
    const toLocalDateStr = (d: Date) => {
      const local = new Date(d.getTime() + offsetMs);
      return local.toISOString().slice(0, 10);
    };

    // Daily breakdown for charts — 28 days for streak calendar
    const dailyStats: { date: string; quests: number; seconds: number; xp: number; playSeconds: number }[] = [];
    for (let i = 27; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = toLocalDateStr(date);

      const dayCompletions = completions.filter(
        (c) => toLocalDateStr(c.completedAt) === dateStr,
      );

      const dayPlaySeconds = playSessions
        .filter((s) => toLocalDateStr(s.startedAt!) === dateStr && s.endedAt)
        .reduce((sum, s) => sum + Math.round((s.endedAt!.getTime() - s.startedAt!.getTime()) / 1000), 0);

      const daySeconds = dayCompletions.reduce(
        (sum, c) => sum + (c.quest?.rewardSeconds ?? 0),
        0,
      );

      dailyStats.push({
        date: dateStr,
        quests: dayCompletions.length,
        seconds: daySeconds,
        xp: dayCompletions.length * 10, // approximate XP based on quest count
        playSeconds: dayPlaySeconds,
      });
    }

    return {
      questsCompleted,
      secondsEarned,
      xpEarned,
      totalPlaySeconds,
      currentStreak: progress?.currentStreak ?? 0,
      dailyStats,
    };
  }

  // ─── Activity Feed ──────────────────────────────────────────

  async getActivityFeed(familyId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // Fetch recent completions, achievements, and play sessions
    const [completions, achievements, playSessions] = await Promise.all([
      this.prisma.questCompletion.findMany({
        where: {
          child: { familyId },
          status: 'approved',
        },
        include: {
          child: { select: { id: true, name: true, avatarUrl: true } },
          quest: { select: { name: true, rewardSeconds: true } },
        },
        orderBy: { completedAt: 'desc' },
        take: limit * 2,
      }),
      this.prisma.childAchievement.findMany({
        where: { child: { familyId } },
        include: {
          child: { select: { id: true, name: true, avatarUrl: true } },
          achievement: { select: { name: true, icon: true, badgeTier: true } },
        },
        orderBy: { unlockedAt: 'desc' },
        take: limit * 2,
      }),
      this.prisma.playSession.findMany({
        where: {
          child: { familyId },
          status: { in: ['active', 'paused', 'stopped', 'completed'] },
        },
        include: {
          child: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit * 2,
      }),
    ]);

    // Merge into a unified feed
    type FeedEntry = {
      type: string;
      childId: string;
      childName: string;
      childAvatar: string | null;
      message: string;
      icon: string;
      timestamp: Date;
    };

    const feed: FeedEntry[] = [];

    for (const c of completions) {
      const secs = c.quest.rewardSeconds;
      let timeStr: string;
      if (secs >= 3600) {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        timeStr = m > 0 ? `${h}h ${m}m` : `${h}h`;
      } else if (secs >= 60) {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        timeStr = s > 0 ? `${m}m ${s}s` : `${m} min`;
      } else {
        timeStr = `${secs}s`;
      }
      feed.push({
        type: 'quest_completion',
        childId: c.child.id,
        childName: c.child.name,
        childAvatar: c.child.avatarUrl,
        message: `completed "${c.quest.name}" (+${timeStr})`,
        icon: '✅',
        timestamp: c.completedAt,
      });
    }

    for (const a of achievements) {
      feed.push({
        type: 'achievement',
        childId: a.child.id,
        childName: a.child.name,
        childAvatar: a.child.avatarUrl,
        message: `earned ${a.achievement.icon} ${a.achievement.name}`,
        icon: a.achievement.icon,
        timestamp: a.unlockedAt,
      });
    }

    for (const p of playSessions) {
      if (p.status === 'completed' || p.status === 'stopped') {
        if (!p.endedAt || !p.startedAt) continue;
        const mins = Math.round(
          (p.endedAt.getTime() - p.startedAt.getTime()) / 60000,
        );
        feed.push({
          type: 'play_session',
          childId: p.child.id,
          childName: p.child.name,
          childAvatar: p.child.avatarUrl,
          message: `played for ${mins} minutes`,
          icon: '🎮',
          timestamp: p.endedAt,
        });
      } else if (p.status === 'active') {
        feed.push({
          type: 'play_session',
          childId: p.child.id,
          childName: p.child.name,
          childAvatar: p.child.avatarUrl,
          message: 'started playing',
          icon: '▶️',
          timestamp: p.startedAt ?? p.createdAt,
        });
      } else if (p.status === 'paused') {
        feed.push({
          type: 'play_session',
          childId: p.child.id,
          childName: p.child.name,
          childAvatar: p.child.avatarUrl,
          message: 'paused play time',
          icon: '⏸️',
          timestamp: p.pausedAt ?? p.createdAt,
        });
      }
    }

    // Sort by timestamp desc and paginate
    feed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      items: feed.slice(skip, skip + limit),
      page,
      hasMore: feed.length > skip + limit,
    };
  }
}
