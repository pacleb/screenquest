import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionScheduler {
  private readonly logger = new Logger(SubscriptionScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private subscriptionService: SubscriptionService,
  ) {}

  /**
   * Daily at 9am: send trial expiration reminders
   */
  @Cron('0 9 * * *')
  async handleTrialReminders() {
    try {
      const now = new Date();

      // 3 days from now
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      const threeDaysStart = new Date(threeDaysFromNow);
      threeDaysStart.setHours(0, 0, 0, 0);
      const threeDaysEnd = new Date(threeDaysFromNow);
      threeDaysEnd.setHours(23, 59, 59, 999);

      // 1 day from now
      const oneDayFromNow = new Date(now);
      oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
      const oneDayStart = new Date(oneDayFromNow);
      oneDayStart.setHours(0, 0, 0, 0);
      const oneDayEnd = new Date(oneDayFromNow);
      oneDayEnd.setHours(23, 59, 59, 999);

      // Families with trial expiring in 3 days
      const trialExpiring3Days = await this.prisma.family.findMany({
        where: {
          subscriptionStatus: 'trialing',
          subscriptionExpiresAt: {
            gte: threeDaysStart,
            lte: threeDaysEnd,
          },
        },
      });

      for (const family of trialExpiring3Days) {
        await this.notificationService.sendToParents(family.id, {
          title: 'Trial Ending Soon',
          body: 'Your ScreenQuest trial ends in 3 days — subscribe to keep unlimited quests!',
          data: { screen: 'paywall' },
        });
      }

      // Families with trial expiring tomorrow
      const trialExpiringTomorrow = await this.prisma.family.findMany({
        where: {
          subscriptionStatus: 'trialing',
          subscriptionExpiresAt: {
            gte: oneDayStart,
            lte: oneDayEnd,
          },
        },
      });

      for (const family of trialExpiringTomorrow) {
        await this.notificationService.sendToParents(family.id, {
          title: 'Last Day of Trial!',
          body: 'Last day of your free trial! Subscribe now to keep your premium features.',
          data: { screen: 'paywall' },
        });
      }

      const totalNotified = trialExpiring3Days.length + trialExpiringTomorrow.length;
      if (totalNotified > 0) {
        this.logger.log(`Sent trial reminders to ${totalNotified} families`);
      }
    } catch (error) {
      this.logger.error('Error sending trial reminders', error);
    }
  }

  /**
   * Daily: auto-archive excess quests past grace period
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleGracePeriodExpiry() {
    try {
      const now = new Date();

      const expiredGracePeriod = await this.prisma.family.findMany({
        where: {
          plan: 'free',
          gracePeriodEndsAt: { lte: now },
        },
      });

      for (const family of expiredGracePeriod) {
        try {
          await this.subscriptionService.archiveExcessQuests(family.id);
          this.logger.log(`Auto-archived excess quests for family ${family.id}`);
        } catch (error) {
          this.logger.error(`Error archiving quests for family ${family.id}`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error in grace period expiry check', error);
    }
  }
}
