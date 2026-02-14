import { Global, Module } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { ThemeService } from './theme.service';
import {
  ChildGamificationController,
  FamilyGamificationController,
  AchievementCatalogController,
  ThemeController,
  StreakStatsController,
  BadgeShowcaseController,
  ActivityFeedController,
} from './gamification.controller';
import { GamificationScheduler } from './gamification.scheduler';
import { SubscriptionModule } from '../subscription/subscription.module';

@Global()
@Module({
  imports: [SubscriptionModule],
  controllers: [
    ChildGamificationController,
    FamilyGamificationController,
    AchievementCatalogController,
    ThemeController,
    StreakStatsController,
    BadgeShowcaseController,
    ActivityFeedController,
  ],
  providers: [GamificationService, GamificationScheduler, ThemeService],
  exports: [GamificationService, ThemeService],
})
export class GamificationModule {}
