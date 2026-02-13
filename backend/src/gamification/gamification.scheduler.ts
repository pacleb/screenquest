import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class GamificationScheduler {
  private readonly logger = new Logger(GamificationScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Daily at midnight: reset broken streaks.
   * If lastCompletionDate < yesterday, set currentStreak to 0.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleStreakReset() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const result = await this.prisma.childProgress.updateMany({
        where: {
          currentStreak: { gt: 0 },
          lastCompletionDate: { lt: yesterday },
        },
        data: { currentStreak: 0 },
      });

      if (result.count > 0) {
        this.logger.log(`Reset ${result.count} broken streaks`);
      }
    } catch (error) {
      this.logger.error('Error resetting streaks', error);
    }
  }

  /**
   * Daily at 5 PM: "Don't break your streak!" reminder
   * for children who have an active streak but no completion today.
   */
  @Cron('0 17 * * *')
  async handleStreakReminder() {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const atRisk = await this.prisma.childProgress.findMany({
        where: {
          currentStreak: { gt: 0 },
          lastCompletionDate: { lt: todayStart },
        },
        select: { childId: true, currentStreak: true },
      });

      for (const child of atRisk) {
        this.notificationService.sendToUser(
          child.childId,
          {
            title: "Don't Break Your Streak!",
            body: `You're on a ${child.currentStreak}-day streak. Complete a quest today!`,
            data: { type: 'streak_reminder' },
          },
          'gamification',
        );
      }

      if (atRisk.length > 0) {
        this.logger.log(`Sent streak reminders to ${atRisk.length} children`);
      }
    } catch (error) {
      this.logger.error('Error sending streak reminders', error);
    }
  }

  /**
   * Every Monday at midnight: reset weeklyXp for leaderboard.
   */
  @Cron('0 0 * * 1')
  async handleWeeklyXpReset() {
    try {
      const result = await this.prisma.childProgress.updateMany({
        where: { weeklyXp: { gt: 0 } },
        data: { weeklyXp: 0, weeklyXpResetAt: new Date() },
      });

      if (result.count > 0) {
        this.logger.log(`Reset weekly XP for ${result.count} children`);
      }
    } catch (error) {
      this.logger.error('Error resetting weekly XP', error);
    }
  }
}
