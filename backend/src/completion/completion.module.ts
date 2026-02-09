import { Module } from '@nestjs/common';
import { CompletionService } from './completion.service';
import {
  ChildQuestController,
  FamilyCompletionController,
  CompletionReviewController,
} from './completion.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TimeBankModule } from '../time-bank/time-bank.module';

@Module({
  imports: [PrismaModule, TimeBankModule],
  controllers: [ChildQuestController, FamilyCompletionController, CompletionReviewController],
  providers: [CompletionService],
  exports: [CompletionService],
})
export class CompletionModule {}
