import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionScheduler {
  private readonly logger = new Logger(SubscriptionScheduler.name);

  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

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
