import { Module } from '@nestjs/common';
import { QuestService } from './quest.service';
import { QuestController } from './quest.controller';
import { QuestLibraryController } from './quest-library.controller';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [SubscriptionModule],
  controllers: [QuestController, QuestLibraryController],
  providers: [QuestService],
  exports: [QuestService],
})
export class QuestModule {}
