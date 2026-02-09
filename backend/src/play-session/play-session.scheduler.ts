import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlaySessionService } from './play-session.service';

@Injectable()
export class PlaySessionScheduler {
  private readonly logger = new Logger(PlaySessionScheduler.name);

  constructor(private playSessionService: PlaySessionService) {}

  /**
   * Check for expired play sessions every 30 seconds
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleExpiredSessions() {
    try {
      await this.playSessionService.checkExpiredSessions();
    } catch (error) {
      this.logger.error('Error checking expired sessions', error);
    }
  }
}
