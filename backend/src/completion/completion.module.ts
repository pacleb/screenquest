import { Module } from '@nestjs/common';
import { CompletionService } from './completion.service';
import {
  ChildQuestController,
  FamilyCompletionController,
  CompletionReviewController,
} from './completion.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TimeBankModule } from '../time-bank/time-bank.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [PrismaModule, TimeBankModule, UploadModule],
  controllers: [ChildQuestController, FamilyCompletionController, CompletionReviewController],
  providers: [CompletionService],
  exports: [CompletionService],
})
export class CompletionModule {}
