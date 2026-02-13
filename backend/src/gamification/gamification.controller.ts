import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { GamificationService } from './gamification.service';
import { EquipItemDto, ToggleLeaderboardDto } from './dto/gamification.dto';

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
