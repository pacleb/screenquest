import { Global, Module } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import {
  ChildGamificationController,
  FamilyGamificationController,
  AchievementCatalogController,
} from './gamification.controller';
import { GamificationScheduler } from './gamification.scheduler';

@Global()
@Module({
  controllers: [
    ChildGamificationController,
    FamilyGamificationController,
    AchievementCatalogController,
  ],
  providers: [GamificationService, GamificationScheduler],
  exports: [GamificationService],
})
export class GamificationModule {}
