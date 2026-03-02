import {
  Controller,
  Post,
  Get,
  Put,
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
import { CompletionService } from './completion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CompleteQuestDto, ReviewCompletionDto } from './dto/completion.dto';

// --- Child-facing endpoints ---

@ApiTags('Child Quests')
@Controller('children/:childId')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChildQuestController {
  constructor(private completionService: CompletionService) {}

  @Get('quests')
  @ApiOperation({ summary: 'List available quests for this child' })
  @ApiQuery({ name: 'timezone', required: false, example: 'Asia/Manila', description: 'IANA timezone of the device' })
  async listChildQuests(
    @Param('childId') childId: string,
    @Request() req: any,
    @Query('timezone') timezone?: string,
  ) {
    return this.completionService.listChildQuests(childId, req.user.id);
  }

  @Post('quests/:questId/complete')
  @ApiOperation({ summary: 'Child marks quest as done' })
  @ApiResponse({ status: 201, description: 'Quest completion recorded' })
  async completeQuest(
    @Param('childId') childId: string,
    @Param('questId') questId: string,
    @Body() dto: CompleteQuestDto,
    @Request() req: any,
  ) {
    // Validate the requesting user is this child
    if (req.user.id !== childId) {
      // Allow parents to complete on behalf? For now, only the child themselves
      if (req.user.role !== 'child' || req.user.id !== childId) {
        throw new Error('You can only complete quests for yourself');
      }
    }
    return this.completionService.completeQuest(childId, questId, dto);
  }

  @Get('completions')
  @ApiOperation({ summary: 'Get completion history for a child' })
  async listChildCompletions(
    @Param('childId') childId: string,
    @Request() req: any,
  ) {
    return this.completionService.listChildCompletions(childId, req.user.id);
  }
}

// --- Parent-facing endpoints ---

@ApiTags('Completions')
@Controller('families/:familyId/completions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FamilyCompletionController {
  constructor(private completionService: CompletionService) {}

  @Get()
  @Roles('parent', 'guardian')
  @ApiOperation({ summary: 'List quest completions for the family (approval queue)' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'denied'] })
  async listCompletions(
    @Param('familyId') familyId: string,
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    return this.completionService.listFamilyCompletions(familyId, req.user.id, status);
  }
}

@ApiTags('Completions')
@Controller('completions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CompletionReviewController {
  constructor(private completionService: CompletionService) {}

  @Put(':completionId/approve')
  @Roles('parent', 'guardian')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a quest completion' })
  async approve(
    @Param('completionId') completionId: string,
    @Request() req: any,
    @Body() dto: ReviewCompletionDto,
  ) {
    return this.completionService.approveCompletion(completionId, req.user.id, dto);
  }

  @Put(':completionId/deny')
  @Roles('parent', 'guardian')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deny a quest completion' })
  async deny(
    @Param('completionId') completionId: string,
    @Request() req: any,
    @Body() dto: ReviewCompletionDto,
  ) {
    return this.completionService.denyCompletion(completionId, req.user.id, dto);
  }
}
