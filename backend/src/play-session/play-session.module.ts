import { Module } from '@nestjs/common';
import { PlaySessionService } from './play-session.service';
import { ChildPlayController, PlaySessionController, FamilyPlayController } from './play-session.controller';
import { PlaySessionScheduler } from './play-session.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { TimeBankModule } from '../time-bank/time-bank.module';

@Module({
  imports: [PrismaModule, TimeBankModule],
  controllers: [FamilyPlayController, ChildPlayController, PlaySessionController],
  providers: [PlaySessionService, PlaySessionScheduler],
  exports: [PlaySessionService],
})
export class PlaySessionModule {}
