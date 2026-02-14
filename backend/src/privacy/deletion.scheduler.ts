import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DeletionService } from './deletion.service';

@Injectable()
export class DeletionScheduler {
  private readonly logger = new Logger(DeletionScheduler.name);

  constructor(
    private prisma: PrismaService,
    private deletionService: DeletionService,
  ) {}

  @Cron('0 2 * * *') // Daily at 2 AM
  async handleExpiredGracePeriods() {
    const expiredRequests = await this.prisma.accountDeletionRequest.findMany({
      where: {
        gracePeriodEndsAt: { lte: new Date() },
        purgedAt: null,
        cancelledAt: null,
      },
    });

    if (expiredRequests.length === 0) return;

    this.logger.log(`Processing ${expiredRequests.length} expired deletion requests`);

    for (const request of expiredRequests) {
      try {
        await this.deletionService.purgeUser(request.id);
      } catch (error) {
        this.logger.error(
          `Failed to purge deletion request ${request.id}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(`Completed purging ${expiredRequests.length} accounts`);
  }
}
