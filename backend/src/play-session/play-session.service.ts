import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimeBankService } from '../time-bank/time-bank.service';
import { NotificationService } from '../notification/notification.service';
import { RequestPlayDto, ExtendSessionDto, UpdatePlaySettingsDto } from './dto/play-session.dto';

export interface PlaySettings {
  playApprovalMode: 'require_approval' | 'notify_only';
  dailyScreenTimeCap: number | null;
  allowedPlayHoursStart: string;
  allowedPlayHoursEnd: string;
  weekendDailyScreenTimeCap: number | null;
  weekendPlayHoursStart: string;
  weekendPlayHoursEnd: string;
}

const DEFAULT_PLAY_SETTINGS: PlaySettings = {
  playApprovalMode: 'notify_only',
  dailyScreenTimeCap: 120,
  allowedPlayHoursStart: '08:00',
  allowedPlayHoursEnd: '20:00',
  weekendDailyScreenTimeCap: 180,
  weekendPlayHoursStart: '09:00',
  weekendPlayHoursEnd: '21:00',
};

@Injectable()
export class PlaySessionService {
  private readonly logger = new Logger(PlaySessionService.name);

  constructor(
    private prisma: PrismaService,
    private timeBankService: TimeBankService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Child requests a play session
   */
  async requestPlay(childId: string, dto: RequestPlayDto) {
    const child = await this.prisma.user.findUnique({ where: { id: childId } });
    if (!child || child.role !== 'child') throw new ForbiddenException('Access denied');

    // Check no active/paused/requested session exists
    const existingSession = await this.prisma.playSession.findFirst({
      where: {
        childId,
        status: { in: ['requested', 'active', 'paused'] },
      },
    });
    if (existingSession) {
      throw new BadRequestException('An active or pending play session already exists');
    }

    // Check Time Bank balance (negative balance blocks play entirely)
    const balance = await this.timeBankService.getBalance(childId, childId);
    if (balance.totalMinutes <= 0) {
      const deficit = Math.abs(balance.totalMinutes);
      throw new BadRequestException(
        `Your time bank is in deficit. Earn ${deficit} more minutes to play!`,
      );
    }
    if (balance.totalMinutes < dto.requestedMinutes) {
      throw new BadRequestException(
        `Insufficient time balance. You have ${balance.totalMinutes} minutes available.`,
      );
    }

    // Get play settings
    const settings = this.getPlaySettings(child.playSettings);

    // Check play hours
    this.validatePlayHours(settings);

    // Check daily cap
    await this.validateDailyCap(childId, dto.requestedMinutes, settings);

    // Determine if auto-start or requires approval
    const autoStart = settings.playApprovalMode === 'notify_only';
    const now = new Date();

    if (autoStart) {
      // Deduct time from bank and start immediately
      await this.timeBankService.deductTime(childId, dto.requestedMinutes);

      const session = await this.prisma.playSession.create({
        data: {
          childId,
          requestedMinutes: dto.requestedMinutes,
          status: 'active',
          startedAt: now,
          lastSyncedAt: now,
        },
      });

      this.logger.log(`Play session ${session.id} auto-started for child ${childId} (${dto.requestedMinutes}min)`);

      // Notify parents
      if (child.familyId) {
        this.notificationService.sendToParents(
          child.familyId,
          {
            title: 'Play Session Started',
            body: `${child.name} started playing (${dto.requestedMinutes} minutes)`,
            data: { type: 'play_started', sessionId: session.id },
          },
          'play_state_changes',
        );
      }

      return this.enrichSession(session);
    } else {
      const session = await this.prisma.playSession.create({
        data: {
          childId,
          requestedMinutes: dto.requestedMinutes,
          status: 'requested',
        },
      });

      this.logger.log(`Play session ${session.id} requested for child ${childId} (${dto.requestedMinutes}min)`);

      // Notify parents of play request
      if (child.familyId) {
        this.notificationService.sendToParents(
          child.familyId,
          {
            title: 'Play Request',
            body: `${child.name} wants to play for ${dto.requestedMinutes} minutes — Approve?`,
            data: { type: 'play_request', sessionId: session.id },
          },
          'play_requests',
        );
      }

      return this.enrichSession(session);
    }
  }

  /**
   * Parent approves a play request
   */
  async approveSession(sessionId: string, userId: string) {
    const session = await this.getSessionWithParentAccess(sessionId, userId);

    if (session.status !== 'requested') {
      throw new BadRequestException('Session is not in requested state');
    }

    // Deduct time from bank
    await this.timeBankService.deductTime(session.childId, session.requestedMinutes);

    const now = new Date();
    const updated = await this.prisma.playSession.update({
      where: { id: sessionId },
      data: {
        status: 'active',
        approvedByUserId: userId,
        startedAt: now,
        lastSyncedAt: now,
      },
    });

    this.logger.log(`Play session ${sessionId} approved by ${userId}`);

    // Notify child that play was approved
    this.notificationService.sendToUser(
      session.childId,
      {
        title: 'Play Approved!',
        body: `Your play request for ${session.requestedMinutes} minutes was approved!`,
        data: { type: 'play_approved', sessionId },
      },
      'play_requests',
    );

    return this.enrichSession(updated);
  }

  /**
   * Parent denies a play request
   */
  async denySession(sessionId: string, userId: string) {
    const session = await this.getSessionWithParentAccess(sessionId, userId);

    if (session.status !== 'requested') {
      throw new BadRequestException('Session is not in requested state');
    }

    const updated = await this.prisma.playSession.update({
      where: { id: sessionId },
      data: {
        status: 'denied',
        approvedByUserId: userId,
        endedAt: new Date(),
      },
    });

    this.logger.log(`Play session ${sessionId} denied by ${userId}`);

    // Notify child that play was denied
    this.notificationService.sendToUser(
      session.childId,
      {
        title: 'Play Request Denied',
        body: 'Your play request was not approved this time.',
        data: { type: 'play_denied', sessionId },
      },
      'play_requests',
    );

    return this.enrichSession(updated);
  }

  /**
   * Pause an active session
   */
  async pauseSession(sessionId: string, userId: string) {
    const session = await this.prisma.playSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.childId !== userId) throw new ForbiddenException('Access denied');
    if (session.status !== 'active') throw new BadRequestException('Session is not active');

    const updated = await this.prisma.playSession.update({
      where: { id: sessionId },
      data: {
        status: 'paused',
        pausedAt: new Date(),
      },
    });

    // Notify parents
    const child = await this.prisma.user.findUnique({ where: { id: session.childId } });
    if (child?.familyId) {
      this.notificationService.sendToParents(
        child.familyId,
        {
          title: 'Play Paused',
          body: `${child.name} paused play time`,
          data: { type: 'play_paused', sessionId },
        },
        'play_state_changes',
      );
    }

    return this.enrichSession(updated);
  }

  /**
   * Resume a paused session
   */
  async resumeSession(sessionId: string, userId: string) {
    const session = await this.prisma.playSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.childId !== userId) throw new ForbiddenException('Access denied');
    if (session.status !== 'paused' || !session.pausedAt) {
      throw new BadRequestException('Session is not paused');
    }

    const now = new Date();
    const pauseDuration = Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000);

    const updated = await this.prisma.playSession.update({
      where: { id: sessionId },
      data: {
        status: 'active',
        pausedAt: null,
        totalPausedSeconds: session.totalPausedSeconds + pauseDuration,
        lastSyncedAt: now,
      },
    });

    // Notify parents
    const child = await this.prisma.user.findUnique({ where: { id: session.childId } });
    if (child?.familyId) {
      this.notificationService.sendToParents(
        child.familyId,
        {
          title: 'Play Resumed',
          body: `${child.name} resumed play time`,
          data: { type: 'play_resumed', sessionId },
        },
        'play_state_changes',
      );
    }

    return this.enrichSession(updated);
  }

  /**
   * Child stops session early — refund remaining time
   */
  async stopSession(sessionId: string, userId: string) {
    const session = await this.prisma.playSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.childId !== userId) throw new ForbiddenException('Access denied');
    if (!['active', 'paused'].includes(session.status)) {
      throw new BadRequestException('Session is not active or paused');
    }

    const remainingSeconds = this.calculateRemainingSeconds(session);
    const refundMinutes = Math.floor(remainingSeconds / 60);

    const now = new Date();
    // If paused, account for the current pause duration
    let totalPaused = session.totalPausedSeconds;
    if (session.status === 'paused' && session.pausedAt) {
      totalPaused += Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000);
    }

    const updated = await this.prisma.playSession.update({
      where: { id: sessionId },
      data: {
        status: 'stopped',
        endedAt: now,
        pausedAt: null,
        totalPausedSeconds: totalPaused,
      },
    });

    // Refund remaining time to stackable bucket
    if (refundMinutes > 0) {
      await this.timeBankService.creditTime(session.childId, refundMinutes, 'stackable', null);
      this.logger.log(`Refunded ${refundMinutes} min to child ${session.childId}`);
    }

    // Notify parents
    const childUser = await this.prisma.user.findUnique({ where: { id: session.childId } });
    if (childUser?.familyId) {
      this.notificationService.sendToParents(
        childUser.familyId,
        {
          title: 'Play Stopped',
          body: `${childUser.name} stopped playing (${refundMinutes} min remaining, refunded)`,
          data: { type: 'play_stopped', sessionId },
        },
        'play_state_changes',
      );
    }

    return this.enrichSession(updated);
  }

  /**
   * Parent force-ends a session — refund remaining
   */
  async parentEndSession(sessionId: string, userId: string) {
    const session = await this.getSessionWithParentAccess(sessionId, userId);

    if (!['active', 'paused'].includes(session.status)) {
      throw new BadRequestException('Session is not active or paused');
    }

    const remainingSeconds = this.calculateRemainingSeconds(session);
    const refundMinutes = Math.floor(remainingSeconds / 60);

    const now = new Date();
    let totalPaused = session.totalPausedSeconds;
    if (session.status === 'paused' && session.pausedAt) {
      totalPaused += Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000);
    }

    const updated = await this.prisma.playSession.update({
      where: { id: sessionId },
      data: {
        status: 'stopped',
        endedAt: now,
        pausedAt: null,
        totalPausedSeconds: totalPaused,
      },
    });

    if (refundMinutes > 0) {
      await this.timeBankService.creditTime(session.childId, refundMinutes, 'stackable', null);
    }

    this.logger.log(`Play session ${sessionId} force-ended by parent ${userId}, refunded ${refundMinutes}min`);

    // Notify child
    this.notificationService.sendToUser(
      session.childId,
      {
        title: 'Play Time Ended',
        body: 'Play time ended by parent',
        data: { type: 'play_ended_by_parent', sessionId },
      },
      'play_state_changes',
    );

    return this.enrichSession(updated);
  }

  /**
   * Parent extends an active session
   */
  async extendSession(sessionId: string, userId: string, dto: ExtendSessionDto) {
    const session = await this.getSessionWithParentAccess(sessionId, userId);

    if (!['active', 'paused'].includes(session.status)) {
      throw new BadRequestException('Session is not active or paused');
    }

    // Check child has enough balance
    const balance = await this.timeBankService.getBalance(session.childId, session.childId);
    if (balance.totalMinutes < dto.additionalMinutes) {
      throw new BadRequestException('Insufficient time balance for extension');
    }

    // Deduct additional time
    await this.timeBankService.deductTime(session.childId, dto.additionalMinutes);

    const updated = await this.prisma.playSession.update({
      where: { id: sessionId },
      data: {
        requestedMinutes: session.requestedMinutes + dto.additionalMinutes,
      },
    });

    this.logger.log(`Play session ${sessionId} extended by ${dto.additionalMinutes}min`);
    return this.enrichSession(updated);
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string, userId: string) {
    const session = await this.prisma.playSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    // Verify access — child themselves or a family parent
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException('Access denied');

    const child = await this.prisma.user.findUnique({ where: { id: session.childId } });
    const isSelf = userId === session.childId;
    const isFamilyParent = user.familyId === child?.familyId && ['parent', 'guardian'].includes(user.role);
    if (!isSelf && !isFamilyParent) throw new ForbiddenException('Access denied');

    return this.enrichSession(session);
  }

  /**
   * Get active session for a child
   */
  async getActiveSession(childId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException('Access denied');

    const child = await this.prisma.user.findUnique({ where: { id: childId } });
    if (!child) throw new NotFoundException('Child not found');

    const isSelf = userId === childId;
    const isFamilyParent = user.familyId === child.familyId && ['parent', 'guardian'].includes(user.role);
    if (!isSelf && !isFamilyParent) throw new ForbiddenException('Access denied');

    const session = await this.prisma.playSession.findFirst({
      where: {
        childId,
        status: { in: ['requested', 'active', 'paused'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) return null;
    return this.enrichSession(session);
  }

  /**
   * Get play settings for a child
   */
  async getChildPlaySettings(childId: string, userId: string): Promise<PlaySettings> {
    const child = await this.prisma.user.findUnique({ where: { id: childId } });
    if (!child) throw new NotFoundException('Child not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException('Access denied');

    const isSelf = userId === childId;
    const isFamilyParent = user.familyId === child.familyId && ['parent', 'guardian'].includes(user.role);
    if (!isSelf && !isFamilyParent) throw new ForbiddenException('Access denied');

    return this.getPlaySettings(child.playSettings);
  }

  /**
   * Update play settings for a child (parent only)
   */
  async updateChildPlaySettings(childId: string, userId: string, dto: UpdatePlaySettingsDto): Promise<PlaySettings> {
    const child = await this.prisma.user.findUnique({ where: { id: childId } });
    if (!child || child.role !== 'child') throw new NotFoundException('Child not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.familyId !== child.familyId || !['parent', 'guardian'].includes(user.role)) {
      throw new ForbiddenException('Access denied');
    }

    const current = this.getPlaySettings(child.playSettings);
    const updated: PlaySettings = {
      ...current,
      ...(dto.playApprovalMode && { playApprovalMode: dto.playApprovalMode as PlaySettings['playApprovalMode'] }),
      ...(dto.dailyScreenTimeCap !== undefined && { dailyScreenTimeCap: dto.dailyScreenTimeCap }),
      ...(dto.allowedPlayHoursStart && { allowedPlayHoursStart: dto.allowedPlayHoursStart }),
      ...(dto.allowedPlayHoursEnd && { allowedPlayHoursEnd: dto.allowedPlayHoursEnd }),
      ...(dto.weekendDailyScreenTimeCap !== undefined && { weekendDailyScreenTimeCap: dto.weekendDailyScreenTimeCap }),
      ...(dto.weekendPlayHoursStart && { weekendPlayHoursStart: dto.weekendPlayHoursStart }),
      ...(dto.weekendPlayHoursEnd && { weekendPlayHoursEnd: dto.weekendPlayHoursEnd }),
    };

    await this.prisma.user.update({
      where: { id: childId },
      data: { playSettings: updated as any },
    });

    return updated;
  }

  /**
   * Scheduled job: check for expired sessions and complete them
   */
  async checkExpiredSessions() {
    const activeSessions = await this.prisma.playSession.findMany({
      where: { status: 'active' },
      include: { child: { select: { id: true, name: true, familyId: true } } },
    });

    for (const session of activeSessions) {
      const remaining = this.calculateRemainingSeconds(session);

      if (remaining <= 0) {
        await this.prisma.playSession.update({
          where: { id: session.id },
          data: {
            status: 'completed',
            endedAt: new Date(),
          },
        });
        this.logger.log(`Play session ${session.id} completed (time expired)`);

        // Notify child: time's up
        this.notificationService.sendToUser(
          session.childId,
          {
            title: "Time's Up!",
            body: 'Great job managing your time!',
            data: { type: 'play_completed', sessionId: session.id },
          },
          'play_state_changes',
        );

        // Notify parents
        if (session.child?.familyId) {
          this.notificationService.sendToParents(
            session.child.familyId,
            {
              title: 'Play Session Ended',
              body: `${session.child.name}'s play session ended`,
              data: { type: 'play_completed', sessionId: session.id },
            },
            'play_state_changes',
          );
        }
      } else if (remaining <= 60 && remaining > 30) {
        // 1-minute warning
        this.notificationService.sendToUser(
          session.childId,
          {
            title: '1 Minute Left!',
            body: 'Almost done!',
            data: { type: 'play_warning_1min', sessionId: session.id },
          },
          'play_state_changes',
        );
      } else if (remaining <= 300 && remaining > 270) {
        // 5-minute warning
        this.notificationService.sendToUser(
          session.childId,
          {
            title: '5 Minutes Left!',
            body: 'Start wrapping up!',
            data: { type: 'play_warning_5min', sessionId: session.id },
          },
          'play_state_changes',
        );
      }
    }
  }

  /**
   * Get daily usage for a child (today's completed + active session minutes)
   */
  async getDailyUsage(childId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sessions = await this.prisma.playSession.findMany({
      where: {
        childId,
        createdAt: { gte: startOfDay },
        status: { in: ['active', 'paused', 'completed', 'stopped'] },
      },
    });

    let totalMinutes = 0;
    for (const s of sessions) {
      if (['completed', 'stopped'].includes(s.status) && s.startedAt && s.endedAt) {
        const elapsed = (s.endedAt.getTime() - s.startedAt.getTime()) / 1000 - s.totalPausedSeconds;
        totalMinutes += Math.ceil(elapsed / 60);
      } else if (['active', 'paused'].includes(s.status)) {
        totalMinutes += s.requestedMinutes;
      }
    }

    return totalMinutes;
  }

  // --- Helpers ---

  getPlaySettings(raw: any): PlaySettings {
    if (!raw) return { ...DEFAULT_PLAY_SETTINGS };
    return { ...DEFAULT_PLAY_SETTINGS, ...raw };
  }

  private calculateRemainingSeconds(session: {
    status: string;
    startedAt: Date | null;
    pausedAt: Date | null;
    totalPausedSeconds: number;
    requestedMinutes: number;
  }): number {
    if (!session.startedAt) return session.requestedMinutes * 60;

    const now = new Date();
    let elapsed: number;

    if (session.status === 'paused' && session.pausedAt) {
      elapsed = (session.pausedAt.getTime() - session.startedAt.getTime()) / 1000 - session.totalPausedSeconds;
    } else {
      elapsed = (now.getTime() - session.startedAt.getTime()) / 1000 - session.totalPausedSeconds;
    }

    return Math.max(0, session.requestedMinutes * 60 - elapsed);
  }

  private enrichSession(session: any) {
    const remainingSeconds = this.calculateRemainingSeconds(session);
    return {
      ...session,
      remainingSeconds: Math.round(remainingSeconds),
      remainingMinutes: Math.ceil(remainingSeconds / 60),
    };
  }

  private validatePlayHours(settings: PlaySettings) {
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    const startStr = isWeekend ? settings.weekendPlayHoursStart : settings.allowedPlayHoursStart;
    const endStr = isWeekend ? settings.weekendPlayHoursEnd : settings.allowedPlayHoursEnd;

    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
      throw new BadRequestException(
        `Play is only allowed between ${startStr} and ${endStr}`,
      );
    }
  }

  private async validateDailyCap(childId: string, requestedMinutes: number, settings: PlaySettings) {
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const cap = isWeekend ? settings.weekendDailyScreenTimeCap : settings.dailyScreenTimeCap;

    if (cap === null) return; // No cap

    const usedToday = await this.getDailyUsage(childId);

    if (usedToday + requestedMinutes > cap) {
      const remaining = Math.max(0, cap - usedToday);
      throw new BadRequestException(
        `Daily screen time limit: ${remaining} minutes remaining (${cap} min cap)`,
      );
    }
  }

  private async getSessionWithParentAccess(sessionId: string, userId: string) {
    const session = await this.prisma.playSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    const child = await this.prisma.user.findUnique({ where: { id: session.childId } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !child || user.familyId !== child.familyId || !['parent', 'guardian'].includes(user.role)) {
      throw new ForbiddenException('Access denied');
    }

    return session;
  }
}
