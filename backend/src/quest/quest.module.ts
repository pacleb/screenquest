import { Module } from '@nestjs/common';
import { QuestService } from './quest.service';
import { QuestController } from './quest.controller';
import { QuestLibraryController } from './quest-library.controller';
import { QuestLibraryAdminController, QuestCategoryAdminController } from './quest-library-admin.controller';
import { QuestLibraryAdminService } from './quest-library-admin.service';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [SubscriptionModule],
  controllers: [QuestController, QuestLibraryController, QuestLibraryAdminController, QuestCategoryAdminController],
  providers: [QuestService, QuestLibraryAdminService],
  exports: [QuestService],
})
export class QuestModule {}
