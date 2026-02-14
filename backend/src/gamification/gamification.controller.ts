import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { GamificationService } from './gamification.service';
import { ThemeService } from './theme.service';
import { EquipItemDto, ToggleLeaderboardDto, SetActiveThemeDto, SetShowcaseDto, PaginationDto } from './dto/gamification.dto';

@ApiTags('Gamification — Child')
@Controller('children/:childId/gamification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChildGamificationController {
  constructor(private gamificationService: GamificationService) {}

  @Get('progress')
  @ApiOperation({ summary: 'Get child XP, level, streak progress' })
  async getProgress(@Param('childId') childId: string) {
    return this.gamificationService.getChildProgress(childId);
  }

  @Get('achievements')
  @ApiOperation({ summary: 'Get child achievements (earned + locked)' })
  async getAchievements(@Param('childId') childId: string) {
    return this.gamificationService.getChildAchievements(childId);
  }

  @Get('avatar/items')
  @ApiOperation({ summary: 'Get all avatar items with unlock status' })
  async getAvatarItems(@Param('childId') childId: string) {
    return this.gamificationService.getAvailableAvatarItems(childId);
  }

  @Get('avatar/equipped')
  @ApiOperation({ summary: 'Get currently equipped avatar items' })
  async getEquippedItems(@Param('childId') childId: string) {
    return this.gamificationService.getEquippedItems(childId);
  }

  @Put('avatar/equip')
  @ApiOperation({ summary: 'Equip an avatar item' })
  async equipItem(
    @Param('childId') childId: string,
    @Body() dto: EquipItemDto,
  ) {
    return this.gamificationService.equipItem(childId, dto.avatarItemId);
  }

  @Delete('avatar/slot/:slot')
  @ApiOperation({ summary: 'Unequip avatar item from a slot' })
  async unequipSlot(
    @Param('childId') childId: string,
    @Param('slot') slot: string,
  ) {
    return this.gamificationService.unequipSlot(childId, slot);
  }
}

@ApiTags('Gamification — Family')
@Controller('families/:familyId/gamification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FamilyGamificationController {
  constructor(private gamificationService: GamificationService) {}

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get family weekly leaderboard' })
  async getLeaderboard(
    @Param('familyId') familyId: string,
    @Request() req: any,
  ) {
    return this.gamificationService.getFamilyLeaderboard(familyId, req.user.id);
  }

  @Put('leaderboard/toggle')
  @ApiOperation({ summary: 'Toggle family leaderboard (parent only)' })
  async toggleLeaderboard(
    @Param('familyId') familyId: string,
    @Body() dto: ToggleLeaderboardDto,
    @Request() req: any,
  ) {
    return this.gamificationService.toggleLeaderboard(
      familyId,
      req.user.id,
      dto.enabled,
    );
  }

  @Get('leaderboard/setting')
  @ApiOperation({ summary: 'Get leaderboard enabled/disabled status' })
  async getLeaderboardSetting(
    @Param('familyId') familyId: string,
    @Request() req: any,
  ) {
    return this.gamificationService.getLeaderboardSetting(familyId, req.user.id);
  }
}

@ApiTags('Gamification — Achievements')
@Controller('achievements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AchievementCatalogController {
  constructor(private gamificationService: GamificationService) {}

  @Get()
  @ApiOperation({ summary: 'List all achievement definitions' })
  async getAll() {
    return this.gamificationService.getAllAchievements();
  }
}

@ApiTags('Gamification — Themes')
@Controller('gamification/themes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ThemeController {
  constructor(private themeService: ThemeService) {}

  @Get()
  @ApiOperation({ summary: 'List all themes with unlock status for child' })
  async getThemes(@Request() req: any) {
    return this.themeService.getThemes(req.user.id);
  }

  @Put('active')
  @ApiOperation({ summary: 'Set the child\'s active theme' })
  async setActiveTheme(@Request() req: any, @Body() dto: SetActiveThemeDto) {
    return this.themeService.setActiveTheme(req.user.id, dto.themeId);
  }
}

@ApiTags('Gamification — Streak & Stats')
@Controller('gamification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StreakStatsController {
  constructor(private themeService: ThemeService) {}

  @Post('streak-freeze')
  @ApiOperation({ summary: 'Use a streak freeze (premium)' })
  async useStreakFreeze(@Request() req: any) {
    return this.themeService.useStreakFreeze(req.user.id);
  }

  @Get('progress/weekly-stats')
  @ApiOperation({ summary: 'Weekly quest/XP/time stats for charts' })
  async getWeeklyStats(@Request() req: any) {
    return this.themeService.getWeeklyStats(req.user.id);
  }
}

@ApiTags('Gamification — Badges')
@Controller('gamification/badges')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BadgeShowcaseController {
  constructor(private themeService: ThemeService) {}

  @Put('showcase')
  @ApiOperation({ summary: 'Set up to 3 badge IDs as showcase' })
  async setShowcase(@Request() req: any, @Body() dto: SetShowcaseDto) {
    return this.themeService.setShowcase(req.user.id, dto.badgeIds);
  }

  @Get('showcase/:childId')
  @ApiOperation({ summary: 'Get a child\'s badge showcase' })
  async getShowcase(@Param('childId') childId: string) {
    return this.themeService.getShowcase(childId);
  }
}

@ApiTags('Family — Activity Feed')
@Controller('families/:familyId/activity-feed')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ActivityFeedController {
  constructor(private themeService: ThemeService) {}

  @Get()
  @ApiOperation({ summary: 'Family activity timeline (paginated)' })
  async getActivityFeed(
    @Param('familyId') familyId: string,
    @Query() query: PaginationDto,
  ) {
    return this.themeService.getActivityFeed(familyId, query.page, query.limit);
  }
}
