import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { QuestService } from './quest.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CreateQuestDto, UpdateQuestDto, CreateFromLibraryDto } from './dto/quest.dto';

@ApiTags('Quests')
@Controller('families/:familyId/quests')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QuestController {
  constructor(private questService: QuestService) {}

  @Post()
  @Roles('parent', 'guardian')
  @ApiOperation({ summary: 'Create a new quest' })
  @ApiResponse({ status: 201, description: 'Quest created' })
  @ApiResponse({ status: 402, description: 'Free plan quest limit reached' })
  async create(
    @Param('familyId') familyId: string,
    @Request() req: any,
    @Body() dto: CreateQuestDto,
  ) {
    return this.questService.create(familyId, req.user.id, dto);
  }

  @Post('from-library/:libraryQuestId')
  @Roles('parent', 'guardian')
  @ApiOperation({ summary: 'Create quest from library template' })
  @ApiResponse({ status: 201, description: 'Quest created from library' })
  @ApiResponse({ status: 402, description: 'Free plan quest limit reached' })
  async createFromLibrary(
    @Param('familyId') familyId: string,
    @Param('libraryQuestId') libraryQuestId: string,
    @Request() req: any,
    @Body() dto: CreateFromLibraryDto,
  ) {
    return this.questService.createFromLibrary(familyId, req.user.id, libraryQuestId, dto);
  }

  @Get()
  @Roles('parent', 'guardian')
  @ApiOperation({ summary: 'List all family quests' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'archived', required: false, type: Boolean })
  @ApiQuery({ name: 'childId', required: false })
  async findAll(
    @Param('familyId') familyId: string,
    @Request() req: any,
    @Query('category') category?: string,
    @Query('archived') archived?: string,
    @Query('childId') childId?: string,
  ) {
    return this.questService.findAll(familyId, req.user.id, {
      category,
      archived: archived !== undefined ? archived === 'true' : undefined,
      childId,
    });
  }

  @Get('count')
  @Roles('parent', 'guardian')
  @ApiOperation({ summary: 'Get active quest count (for plan limit display)' })
  async getCount(
    @Param('familyId') familyId: string,
  ) {
    const count = await this.questService.getActiveQuestCount(familyId);
    return { activeQuests: count, limit: 3 };
  }

  @Get(':questId')
  @Roles('parent', 'guardian')
  @ApiOperation({ summary: 'Get quest details' })
  async findOne(
    @Param('familyId') familyId: string,
    @Param('questId') questId: string,
    @Request() req: any,
  ) {
    return this.questService.findOne(familyId, questId, req.user.id);
  }

  @Put(':questId')
  @Roles('parent', 'guardian')
  @ApiOperation({ summary: 'Update a quest' })
  async update(
    @Param('familyId') familyId: string,
    @Param('questId') questId: string,
    @Request() req: any,
    @Body() dto: UpdateQuestDto,
  ) {
    return this.questService.update(familyId, questId, req.user.id, dto);
  }

  @Delete(':questId')
  @Roles('parent', 'guardian')
  @ApiOperation({ summary: 'Delete a quest' })
  async remove(
    @Param('familyId') familyId: string,
    @Param('questId') questId: string,
    @Request() req: any,
  ) {
    return this.questService.remove(familyId, questId, req.user.id);
  }

  @Post(':questId/archive')
  @Roles('parent', 'guardian')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a quest' })
  async archive(
    @Param('familyId') familyId: string,
    @Param('questId') questId: string,
    @Request() req: any,
  ) {
    return this.questService.archive(familyId, questId, req.user.id);
  }

  @Post(':questId/unarchive')
  @Roles('parent', 'guardian')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unarchive a quest' })
  @ApiResponse({ status: 402, description: 'Free plan quest limit reached' })
  async unarchive(
    @Param('familyId') familyId: string,
    @Param('questId') questId: string,
    @Request() req: any,
  ) {
    return this.questService.unarchive(familyId, questId, req.user.id);
  }
}
