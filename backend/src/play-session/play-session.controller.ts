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
} from '@nestjs/swagger';
import { PlaySessionService } from './play-session.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { RequestPlayDto, ExtendSessionDto, UpdatePlaySettingsDto } from './dto/play-session.dto';

// --- Family-level endpoints (parent only) ---

@ApiTags('Play Sessions')
@Controller('families/:familyId/play-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('parent', 'guardian')
@ApiBearerAuth()
export class FamilyPlayController {
  constructor(private playSessionService: PlaySessionService) {}

  @Get('pending')
  @ApiOperation({ summary: 'List pending play requests for a family (parent only)' })
  async listPending(
    @Param('familyId') familyId: string,
    @Request() req: any,
  ) {
    return this.playSessionService.listFamilyPendingPlayRequests(familyId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List play sessions for a family by filter (parent only)' })
  async listSessions(
    @Param('familyId') familyId: string,
    @Query('filter') filter: string | undefined,
    @Request() req: any,
  ) {
    return this.playSessionService.listFamilyPlaySessions(familyId, req.user.id, filter);
  }
}

// --- Child-facing endpoints ---

@ApiTags('Play Sessions')
@Controller('children/:childId/play')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChildPlayController {
  constructor(private playSessionService: PlaySessionService) {}

  @Post()
  @ApiOperation({ summary: 'Request a play session' })
  async requestPlay(
    @Param('childId') childId: string,
    @Body() dto: RequestPlayDto,
    @Request() req: any,
  ) {
    if (req.user.id !== childId) {
      // Parents can also request play on behalf
      const session = await this.playSessionService.requestPlay(childId, dto);
      return session;
    }
    return this.playSessionService.requestPlay(childId, dto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active play session for a child' })
  async getActive(
    @Param('childId') childId: string,
    @Request() req: any,
  ) {
    return this.playSessionService.getActiveSession(childId, req.user.id);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get play settings for a child' })
  async getSettings(
    @Param('childId') childId: string,
    @Request() req: any,
  ) {
    return this.playSessionService.getChildPlaySettings(childId, req.user.id);
  }

  @Put('settings')
  @UseGuards(RolesGuard)
  @Roles('parent', 'guardian')
  @ApiOperation({ summary: 'Update play settings for a child (parent only)' })
  async updateSettings(
    @Param('childId') childId: string,
    @Body() dto: UpdatePlaySettingsDto,
    @Request() req: any,
  ) {
    return this.playSessionService.updateChildPlaySettings(childId, req.user.id, dto);
  }

  @Get('daily-usage')
  @ApiOperation({ summary: 'Get daily screen time usage for a child' })
  async getDailyUsage(
    @Param('childId') childId: string,
    @Query('timezone') timezone: string | undefined,
    @Request() req: any,
  ) {
    return this.playSessionService.getDailyUsageDetails(childId, req.user.id, timezone);
  }

  @Delete('daily-usage')
  @UseGuards(RolesGuard)
  @Roles('parent', 'guardian')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset daily screen time usage by clearing stale sessions (parent only)' })
  async resetDailyUsage(
    @Param('childId') childId: string,
    @Query('timezone') timezone: string | undefined,
    @Request() req: any,
  ) {
    return this.playSessionService.resetDailyUsage(childId, req.user.id, timezone);
  }
}

// --- Session action endpoints ---

@ApiTags('Play Sessions')
@Controller('play-sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PlaySessionController {
  constructor(private playSessionService: PlaySessionService) {}

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get play session details' })
  async getSession(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.playSessionService.getSession(sessionId, req.user.id);
  }

  @Post(':sessionId/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause active session' })
  async pause(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.playSessionService.pauseSession(sessionId, req.user.id);
  }

  @Post(':sessionId/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume paused session' })
  async resume(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.playSessionService.resumeSession(sessionId, req.user.id);
  }

  @Post(':sessionId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending play request (child only)' })
  async cancel(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.playSessionService.cancelSession(sessionId, req.user.id);
  }

  @Post(':sessionId/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop session early (refunds remaining time)' })
  async stop(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.playSessionService.stopSession(sessionId, req.user.id);
  }

  // --- Parent actions ---

  @Put(':sessionId/approve')
  @UseGuards(RolesGuard)
  @Roles('parent', 'guardian')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve play request (parent only)' })
  async approve(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.playSessionService.approveSession(sessionId, req.user.id);
  }

  @Put(':sessionId/deny')
  @UseGuards(RolesGuard)
  @Roles('parent', 'guardian')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deny play request (parent only)' })
  async deny(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.playSessionService.denySession(sessionId, req.user.id);
  }

  @Post(':sessionId/extend')
  @UseGuards(RolesGuard)
  @Roles('parent', 'guardian')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extend active session (parent only)' })
  async extend(
    @Param('sessionId') sessionId: string,
    @Body() dto: ExtendSessionDto,
    @Request() req: any,
  ) {
    return this.playSessionService.extendSession(sessionId, req.user.id, dto);
  }

  @Post(':sessionId/end')
  @UseGuards(RolesGuard)
  @Roles('parent', 'guardian')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force-end session (parent only, refunds remaining)' })
  async end(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.playSessionService.parentEndSession(sessionId, req.user.id);
  }
}
