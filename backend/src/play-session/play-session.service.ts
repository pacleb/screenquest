import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { TimeBankService } from '../time-bank/time-bank.service';
import { NotificationService } from '../notification/notification.service';
import { RequestPlayDto, ExtendSessionDto, UpdatePlaySettingsDto } from './dto/play-session.dto';
import {
  PlaySessionStartedEvent,
  PlaySessionCompletedEvent,
  PlaySessionApprovedEvent,
  PlaySessionDeniedEvent,
} from '../common/analytics/analytics.events';

export interface PlaySettings {
  playApprovalMode: 'require_approval' | 'notify_only';
  dailyScreenTimeCap: number | null;
  allowedPlayHoursStart: string;
  allowedPlayHoursEnd: string;
  weekendDailyScreenTimeCap: number | null;
  weekendPlayHoursStart: string;
  weekendPlayHoursEnd: string;
}

/**
 * Returns the UTC Date that corresponds to midnight (00:00:00) in the given
 * IANA timezone. Falls back to server-local midnight if the timezone is
 * omitted or invalid.
 */
function localStartOfDay(timezone?: string): Date {
  const now = new Date();
  if (timezone) {
    try {
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      });
      const parts = fmt.formatToParts(now);
      const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0');
      const h = get('hour') % 24;
      const m = get('minute');
      const s = get('second');
      const msFromMidnight = (h * 3600 + m * 60 + s) * 1000 + now.getMilliseconds();
      return new Date(now.getTime() - msFromMidnight);
    } catch {
      // fall through
    }
  }
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns { hours, minutes, dayOfWeek } in the given IANA timezone (falls back to server local). */
function localTime(tz: string | undefined): { hours: number; minutes: number; dayOfWeek: number } {
  const now = new Date();
  if (tz) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        minute: 'numeric',
        weekday: 'narrow',
        hour12: false,
      }).formatToParts(now);
      const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
      // hour12:false gives "24" for midnight in some engines; normalise to 0
      const hours = parseInt(get('hour')) % 24;
      const minutes = parseInt(get('minute'));
      // derive day-of-week (0=Sun…6=Sat) from a locale-aware date string
      const dateStr = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'short',
      }).format(now);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayOfWeek = days.findIndex((d) => dateStr.startsWith(d));
      return { hours, minutes, dayOfWeek: dayOfWeek === -1 ? now.getDay() : dayOfWeek };
    } catch {
      // invalid timezone string — fall through to server local
    }
  }
  return { hours: now.getHours(), minutes: now.getMinutes(), dayOfWeek: now.getDay() };
}

function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDuration(seconds: number): string {
  const abs = Math.abs(Math.round(seconds));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} hr${h > 1 ? 's' : ''}`);
  if (m > 0) parts.push(`${m} min`);
  if (s > 0 || parts.length === 0) parts.push(`${s} sec`);
  return parts.join(' ');
}

const DEFAULT_PLAY_SETTINGS: PlaySettings = {
  playApprovalMode: 'notify_only',
  dailyScreenTimeCap: 7200,
  allowedPlayHoursStart: '08:00',
  allowedPlayHoursEnd: '20:00',
  weekendDailyScreenTimeCap: 10800,
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
    private eventEmitter: EventEmitter2,
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
    if (balance.totalSeconds <= 0) {
      const deficit = Math.abs(balance.totalSeconds);
      throw new BadRequestException(
        `Your time bank is in deficit. Earn ${formatDuration(deficit)} more to play!`,
      );
    }
    if (balance.totalSeconds < dto.requestedSeconds) {
      throw new BadRequestException(
        `Insufficient time balance. You have ${formatDuration(balance.totalSeconds)} available.`,
      );
    }

    // Get play settings
    const settings = this.getPlaySettings(child.playSettings);

    // Check play hours
    this.validatePlayHours(settings, dto.timezone);

    // Check daily cap — returns the effective (possibly clamped) seconds
    const effectiveSeconds = await this.validateDailyCap(childId, dto.requestedSeconds, settings, dto.timezone);

    // Determine if auto-start or requires approval
    const autoStart = settings.playApprovalMode === 'notify_only';
    const now = new Date();

    if (autoStart) {
      // Time will be deducted when session ends (based on actual usage)
      const session = await this.prisma.playSession.create({
        data: {
          childId,
          requestedSeconds: effectiveSeconds,
          status: 'active',
          startedAt: now,
          lastSyncedAt: now,
        },
      });

      this.logger.log(`Play session ${session.id} auto-started for child ${childId} (${effectiveSeconds}s)`);

      // Emit play session started analytics event
      this.eventEmitter.emit(
        'play_session.started',
        new PlaySessionStartedEvent(childId, child.familyId || '', session.id, effectiveSeconds),
      );

      // Notify parents
      if (child.familyId) {
        this.notificationService.sendToParents(
          child.familyId,
          {
            title: 'Play Session Started',
            body: `${child.name} started playing (${Math.ceil(effectiveSeconds / 60)} minutes left)`,
            data: { type: 'play_started', sessionId: session.id },
          },
          'play_state_changes',
        ).catch((err) => this.logger.error(`Failed to notify parents of play start: ${err}`));
      }

      return this.enrichSession(session);
    } else {
      const session = await this.prisma.playSession.create({
        data: {
          childId,
          requestedSeconds: effectiveSeconds,
          status: 'requested',
        },
      });

      this.logger.log(`Play session ${session.id} requested for child ${childId} (${effectiveSeconds}s)`);

      // Notify parents of play request
      if (child.familyId) {
        this.notificationService.sendToParents(
          child.familyId,
          {
            title: 'Play Request',
            body: `${child.name} wants to start playing — Approve?`,
            data: { type: 'play_request', sessionId: session.id },
          },
          'play_requests',
        ).catch((err) => this.logger.error(`Failed to notify parents of play request: ${err}`));
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

    // Time will be deducted when session ends (based on actual usage)
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

    // Emit play session approved analytics event
    this.eventEmitter.emit(
      'play_session.approved',
      new PlaySessionApprovedEvent(userId, sessionId, session.childId),
    );

    // Emit play session started (it starts upon approval)
    const child = await this.prisma.user.findUnique({ where: { id: session.childId }, select: { familyId: true } });
    this.eventEmitter.emit(
      'play_session.started',
      new PlaySessionStartedEvent(session.childId, child?.familyId || '', sessionId, session.requestedSeconds),
    );

    // Notify child that play was approved
    this.notificationService.sendToUser(
      session.childId,
      {
        title: 'Play Approved!',
        body: `Your Play Request was approved!`,
        data: { type: 'play_approved', sessionId },
      },
      'play_requests',
    ).catch((err) => this.logger.error(`Failed to notify child of approval: ${err}`));

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

    // Emit play session denied analytics event
    this.eventEmitter.emit(
      'play_session.denied',
      new PlaySessionDeniedEvent(userId, sessionId, session.childId),
    );

    // Notify child that play was denied
    this.notificationService.sendToUser(
      session.childId,
      {
        title: 'Play Request Denied',
        body: 'Your play request was not approved this time.',
        data: { type: 'play_denied', sessionId },
      },
      'play_requests',
    ).catch((err) => this.logger.error(`Failed to notify child of denial: ${err}`));

    return this.enrichSession(updated);
  }

  /**
   * Child cancels a pending (requested) play session
   */
  async cancelSession(sessionId: string, userId: string) {
    const session = await this.prisma.playSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.childId !== userId) throw new ForbiddenException('Access denied');
    if (session.status !== 'requested') {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    const updated = await this.prisma.playSession.update({
      where: { id: sessionId },
      data: {
        status: 'cancelled',
        endedAt: new Date(),
      },
    });

    this.logger.log(`Play session ${sessionId} cancelled by child ${userId}`);

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
      ).catch((err) => this.logger.error(`Failed to notify parents of pause: ${err}`));
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
      ).catch((err) => this.logger.error(`Failed to notify parents of resume: ${err}`));
    }

    return this.enrichSession(updated);
  }

  /**
   * Child stops session — handles both early stop and natural timer expiry.
   * When the timer naturally reaches 0 the client calls this endpoint too;
   * we detect that case (remaining ≤ 0) and treat it as a proper completion
   * with the appropriate status and notifications.
   */
  async stopSession(sessionId: string, userId: string) {
    const session = await this.prisma.playSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.childId !== userId) throw new ForbiddenException('Access denied');
    if (!['active', 'paused'].includes(session.status)) {
      throw new BadRequestException('Session is not active or paused');
    }

    const remainingSeconds = this.calculateRemainingSeconds(session);
    const timerExpired = remainingSeconds <= 0;
    const usedSeconds = timerExpired
      ? session.requestedSeconds
      : session.requestedSeconds - remainingSeconds;

    const now = new Date();
    // If paused, account for the current pause duration
    let totalPaused = session.totalPausedSeconds;
    if (session.status === 'paused' && session.pausedAt) {
      totalPaused += Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000);
    }

    const updated = await this.prisma.playSession.update({
      where: { id: sessionId },
      data: {
        status: timerExpired ? 'completed' : 'stopped',
        endedAt: now,
        pausedAt: null,
        totalPausedSeconds: totalPaused,
      },
    });

    // Deduct only the time actually used (non-stackable first, as designed)
    if (usedSeconds > 0) {
      try {
        await this.timeBankService.deductTime(session.childId, usedSeconds);
      } catch {
        // If balance decreased during session (e.g., non-stackable expired),
        // deduct whatever is available
        const balance = await this.timeBankService.getBalance(session.childId, session.childId);
        const deductible = Math.min(usedSeconds, Math.max(0, balance.totalSeconds));
        if (deductible > 0) {
          await this.timeBankService.deductTime(session.childId, deductible);
        }
      }
      this.logger.log(`Deducted ${usedSeconds}s from child ${session.childId}`);
    }

    // Emit play session completed analytics event
    const childForEvent = await this.prisma.user.findUnique({ where: { id: session.childId }, select: { familyId: true } });
    this.eventEmitter.emit(
      'play_session.completed',
      new PlaySessionCompletedEvent(session.childId, childForEvent?.familyId || '', sessionId, usedSeconds),
    );

    // Notifications differ depending on whether the timer expired naturally
    const childUser = await this.prisma.user.findUnique({ where: { id: session.childId } });
    if (timerExpired) {
      // Timer naturally expired — notify child and parents
      this.notificationService.sendToUser(
        session.childId,
        {
          title: "Time's Up!",
          body: 'Great job managing your time!',
          data: { type: 'play_completed', sessionId },
        },
        'play_state_changes',
      ).catch((err) => this.logger.error(`Failed to notify child of completion: ${err}`));

      if (childUser?.familyId) {
        this.notificationService.sendToParents(
          childUser.familyId,
          {
            title: 'Play Session Ended',
            body: `${childUser.name}'s play session ended`,
            data: { type: 'play_completed', sessionId },
          },
          'play_state_changes',
        ).catch((err) => this.logger.error(`Failed to notify parents of completion: ${err}`));
      }
    } else {
      // Child stopped early
      if (childUser?.familyId) {
        this.notificationService.sendToParents(
          childUser.familyId,
          {
            title: 'Play Stopped',
            body: `${childUser.name} stopped playing (used ${Math.ceil(usedSeconds / 60)} min)`,
            data: { type: 'play_stopped', sessionId },
          },
          'play_state_changes',
        ).catch((err) => this.logger.error(`Failed to notify parents of stop: ${err}`));
      }
    }

    return this.enrichSession(updated);
  }

  /**
   * Parent force-ends a session — deduct only the time actually used
   */
  async parentEndSession(sessionId: string, userId: string) {
    const session = await this.getSessionWithParentAccess(sessionId, userId);

    if (!['active', 'paused'].includes(session.status)) {
      throw new BadRequestException('Session is not active or paused');
    }

    const remainingSeconds = this.calculateRemainingSeconds(session);
    const usedSeconds = session.requestedSeconds - remainingSeconds;

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

    if (usedSeconds > 0) {
      try {
        await this.timeBankService.deductTime(session.childId, usedSeconds);
      } catch {
        const balance = await this.timeBankService.getBalance(session.childId, session.childId);
        const deductible = Math.min(usedSeconds, Math.max(0, balance.totalSeconds));
        if (deductible > 0) {
          await this.timeBankService.deductTime(session.childId, deductible);
        }
      }
    }

    this.logger.log(`Play session ${sessionId} force-ended by parent ${userId}, used ${usedSeconds}s`);

    // Notify child
    this.notificationService.sendToUser(
      session.childId,
      {
        title: 'Play Time Ended',
        body: 'Play time ended by parent',
        data: { type: 'play_ended_by_parent', sessionId },
      },
      'play_state_changes',
    ).catch((err) => this.logger.error(`Failed to notify child of parent-end: ${err}`));

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

    // Check child has enough balance (accounting for time already allocated to this session)
    const balance = await this.timeBankService.getBalance(session.childId, session.childId);
    const remainingSeconds = this.calculateRemainingSeconds(session);
    const uncommittedSeconds = remainingSeconds;
    const availableSeconds = balance.totalSeconds - uncommittedSeconds;
    if (availableSeconds < dto.additionalSeconds) {
      throw new BadRequestException('Insufficient time balance for extension');
    }

    // Time will be deducted when session ends (based on actual usage)
    const updated = await this.prisma.playSession.update({
      where: { id: sessionId },
      data: {
        requestedSeconds: session.requestedSeconds + dto.additionalSeconds,
      },
    });

    this.logger.log(`Play session ${sessionId} extended by ${dto.additionalSeconds}s`);
    return this.enrichSession(updated);
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string, userId: string) {
    let session = await this.prisma.playSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    // Verify access — child themselves or a family parent
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException('Access denied');

    const child = await this.prisma.user.findUnique({ where: { id: session.childId } });
    const isSelf = userId === session.childId;
    const isFamilyParent = user.familyId === child?.familyId && ['parent', 'guardian'].includes(user.role);
    if (!isSelf && !isFamilyParent) throw new ForbiddenException('Access denied');

    // Heartbeat: update lastSyncedAt when the child polls an active/paused session
    // (throttled — only writes if >30 s since last sync to save DB writes)
    if (
      isSelf &&
      ['active', 'paused'].includes(session.status) &&
      (!session.lastSyncedAt || Date.now() - session.lastSyncedAt.getTime() > 30_000)
    ) {
      session = await this.prisma.playSession.update({
        where: { id: sessionId },
        data: { lastSyncedAt: new Date() },
      });
    }

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
   * List all pending play requests for a family (parent view)
   */
  async listFamilyPendingPlayRequests(familyId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.familyId !== familyId || !['parent', 'guardian'].includes(user.role)) {
      throw new ForbiddenException('Access denied');
    }

    const sessions = await this.prisma.playSession.findMany({
      where: {
        status: 'requested',
        child: { familyId },
      },
      include: {
        child: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return sessions.map((s) => ({
      ...this.enrichSession(s),
      child: s.child,
    }));
  }

  /**
   * List play sessions for a family filtered by approval status (parent view)
   * filter: 'pending' = requested, 'approved' = active/paused/completed/stopped,
   *         'denied' = denied, undefined/'all' = everything
   */
  async listFamilyPlaySessions(familyId: string, userId: string, filter?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.familyId !== familyId || !['parent', 'guardian'].includes(user.role)) {
      throw new ForbiddenException('Access denied');
    }

    let statusFilter: string[] | undefined;
    if (filter === 'pending') {
      statusFilter = ['requested'];
    } else if (filter === 'approved') {
      statusFilter = ['active', 'paused', 'completed', 'stopped'];
    } else if (filter === 'denied') {
      statusFilter = ['denied'];
    }

    const sessions = await this.prisma.playSession.findMany({
      where: {
        child: { familyId },
        ...(statusFilter ? { status: { in: statusFilter } } : {}),
      },
      include: {
        child: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((s) => ({
      ...this.enrichSession(s),
      child: s.child,
    }));
  }

  /**
   * Scheduled job: check for expired sessions and complete them.
   * Also auto-stops stale sessions where the client hasn't synced in 5+ minutes
   * (e.g. the kid closed the app), saving their remaining time.
   */
  async checkExpiredSessions() {
    const activeSessions = await this.prisma.playSession.findMany({
      where: { status: 'active' },
      include: { child: { select: { id: true, name: true, familyId: true } } },
    });

    const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes without client sync

    for (const session of activeSessions) {
      const remaining = this.calculateRemainingSeconds(session);

      // --- Stale session detection ---
      // If the client hasn't synced in 5+ minutes and time remains, auto-stop the
      // session so the kid doesn't lose their remaining screen time.
      const sinceLastSync = session.lastSyncedAt
        ? Date.now() - session.lastSyncedAt.getTime()
        : Infinity;

      if (remaining > 0 && sinceLastSync >= STALE_THRESHOLD_MS) {
        const usedSeconds = Math.max(0, session.requestedSeconds - Math.ceil(remaining));
        const now = new Date();

        await this.prisma.playSession.update({
          where: { id: session.id },
          data: {
            status: 'stopped',
            endedAt: now,
          },
        });

        // Deduct only the time actually used before the client went away
        if (usedSeconds > 0) {
          try {
            await this.timeBankService.deductTime(session.childId, usedSeconds);
          } catch {
            const balance = await this.timeBankService.getBalance(session.childId, session.childId);
            const deductible = Math.min(usedSeconds, Math.max(0, balance.totalSeconds));
            if (deductible > 0) {
              await this.timeBankService.deductTime(session.childId, deductible);
            }
          }
        }

        this.logger.log(
          `Play session ${session.id} auto-stopped (stale — no client sync for ${Math.round(sinceLastSync / 1000)}s, used ${usedSeconds}s of ${session.requestedSeconds}s)`,
        );

        // Notify child
        this.notificationService.sendToUser(
          session.childId,
          {
            title: 'Play Session Stopped',
            body: `Your play session was stopped because the app was closed. ${formatDuration(Math.ceil(remaining))} was saved back to your time bank.`,
            data: { type: 'play_stopped', sessionId: session.id },
          },
          'play_state_changes',
        ).catch((err) => this.logger.error(`Failed to notify child of stale stop: ${err}`));

        continue; // skip the normal expiry handling for this session
      }

      if (remaining <= 0) {
        await this.prisma.playSession.update({
          where: { id: session.id },
          data: {
            status: 'completed',
            endedAt: new Date(),
          },
        });

        // Deduct the full requested time (session ran to completion)
        try {
          await this.timeBankService.deductTime(session.childId, session.requestedSeconds);
        } catch {
          const balance = await this.timeBankService.getBalance(session.childId, session.childId);
          const deductible = Math.min(session.requestedSeconds, Math.max(0, balance.totalSeconds));
          if (deductible > 0) {
            await this.timeBankService.deductTime(session.childId, deductible);
          }
        }

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
        ).catch((err) => this.logger.error(`Failed to notify child of completion: ${err}`));

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
          ).catch((err) => this.logger.error(`Failed to notify parents of completion: ${err}`));
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
        ).catch((err) => this.logger.error(`Failed to send 1-min warning: ${err}`));
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
        ).catch((err) => this.logger.error(`Failed to send 5-min warning: ${err}`));
      }
    }

    // --- Auto-expire stale "requested" sessions ---
    // If a play request has been pending for over 30 minutes without approval,
    // cancel it so it doesn't block new play requests indefinitely.
    const staleRequestCutoff = new Date(Date.now() - 30 * 60 * 1000);
    const staleRequests = await this.prisma.playSession.updateMany({
      where: {
        status: 'requested',
        createdAt: { lt: staleRequestCutoff },
      },
      data: { status: 'cancelled' },
    });
    if (staleRequests.count > 0) {
      this.logger.log(`Auto-cancelled ${staleRequests.count} stale play request(s) older than 30 minutes`);
    }
  }

  /**
   * Get daily usage for a child (today's completed + active session minutes)
   */
  async getDailyUsage(childId: string, timezone?: string): Promise<number> {
    const startOfDay = localStartOfDay(timezone);

    const sessions = await this.prisma.playSession.findMany({
      where: {
        childId,
        createdAt: { gte: startOfDay },
        status: { in: ['active', 'paused', 'completed', 'stopped'] },
      },
    });

    let totalSeconds = 0;
    for (const s of sessions) {
      if (['completed', 'stopped'].includes(s.status) && s.startedAt && s.endedAt) {
        const elapsed = (s.endedAt.getTime() - s.startedAt.getTime()) / 1000 - s.totalPausedSeconds;
        totalSeconds += Math.ceil(elapsed);
      } else if (['active', 'paused'].includes(s.status)) {
        totalSeconds += s.requestedSeconds;
      }
    }

    return totalSeconds;
  }

  /**
   * Get daily usage details — shows each session and the total, for debugging
   */
  async getDailyUsageDetails(childId: string, userId: string, timezone?: string) {
    // Verify access
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const child = await this.prisma.user.findUnique({ where: { id: childId } });
    if (!user || !child) throw new NotFoundException('User not found');
    const isSelf = userId === childId;
    const isFamilyParent = user.familyId === child.familyId && ['parent', 'guardian'].includes(user.role);
    if (!isSelf && !isFamilyParent) throw new ForbiddenException('Access denied');

    const startOfDay = localStartOfDay(timezone);
    const sessions = await this.prisma.playSession.findMany({
      where: {
        childId,
        createdAt: { gte: startOfDay },
        status: { in: ['active', 'paused', 'completed', 'stopped'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    const settings = this.getPlaySettings(child.playSettings);
    const { dayOfWeek } = localTime(timezone);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const cap = isWeekend ? settings.weekendDailyScreenTimeCap : settings.dailyScreenTimeCap;

    const sessionDetails = sessions.map((s) => {
      let usedSeconds = 0;
      if (['completed', 'stopped'].includes(s.status) && s.startedAt && s.endedAt) {
        usedSeconds = Math.ceil(
          (s.endedAt.getTime() - s.startedAt.getTime()) / 1000 - s.totalPausedSeconds,
        );
      } else if (['active', 'paused'].includes(s.status)) {
        usedSeconds = s.requestedSeconds;
      }
      return {
        id: s.id,
        status: s.status,
        requestedSeconds: s.requestedSeconds,
        usedSeconds,
        usedFormatted: formatDuration(usedSeconds),
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        createdAt: s.createdAt,
      };
    });

    const usedToday = sessionDetails.reduce((sum, s) => sum + s.usedSeconds, 0);

    return {
      usedToday,
      usedTodayFormatted: formatDuration(usedToday),
      dailyCap: cap,
      dailyCapFormatted: cap !== null ? formatDuration(cap) : 'Unlimited',
      remaining: cap !== null ? Math.max(0, cap - usedToday) : null,
      remainingFormatted: cap !== null ? formatDuration(Math.max(0, cap - usedToday)) : 'Unlimited',
      isWeekend,
      sessions: sessionDetails,
    };
  }

  /**
   * Parent resets daily usage by cancelling/stopping stale sessions from today
   */
  async resetDailyUsage(childId: string, userId: string, timezone?: string) {
    // Verify parent access
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const child = await this.prisma.user.findUnique({ where: { id: childId } });
    if (!user || !child) throw new NotFoundException('User not found');
    if (user.familyId !== child.familyId || !['parent', 'guardian'].includes(user.role)) {
      throw new ForbiddenException('Access denied');
    }

    const startOfDay = localStartOfDay(timezone);

    // Cancel any pending requests
    const pendingCancelled = await this.prisma.playSession.updateMany({
      where: {
        childId,
        createdAt: { gte: startOfDay },
        status: 'requested',
      },
      data: { status: 'cancelled' },
    });

    // Stop any active/paused sessions (refunding remaining time)
    const activeSessions = await this.prisma.playSession.findMany({
      where: {
        childId,
        createdAt: { gte: startOfDay },
        status: { in: ['active', 'paused'] },
      },
    });

    for (const session of activeSessions) {
      const remaining = this.calculateRemainingSeconds(session);
      const usedSeconds = Math.max(0, session.requestedSeconds - Math.ceil(remaining));
      const now = new Date();

      await this.prisma.playSession.update({
        where: { id: session.id },
        data: {
          status: 'stopped',
          endedAt: now,
        },
      });

      if (usedSeconds > 0) {
        try {
          await this.timeBankService.deductTime(childId, usedSeconds);
        } catch {
          // best effort
        }
      }
    }

    // Mark all completed/stopped sessions from today as cancelled so they
    // no longer count toward daily usage
    const resetCount = await this.prisma.playSession.updateMany({
      where: {
        childId,
        createdAt: { gte: startOfDay },
        status: { in: ['completed', 'stopped'] },
      },
      data: { status: 'cancelled' },
    });

    this.logger.log(
      `Parent ${userId} reset daily usage for child ${childId}: ${resetCount.count} sessions cleared, ${activeSessions.length} active stopped, ${pendingCancelled.count} pending cancelled`,
    );

    return {
      message: `Daily usage reset. ${resetCount.count + activeSessions.length + pendingCancelled.count} session(s) cleared.`,
      sessionsCleared: resetCount.count + activeSessions.length + pendingCancelled.count,
    };
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
    requestedSeconds: number;
  }): number {
    if (!session.startedAt) return session.requestedSeconds;

    const now = new Date();
    let elapsed: number;

    if (session.status === 'paused' && session.pausedAt) {
      elapsed = (session.pausedAt.getTime() - session.startedAt.getTime()) / 1000 - session.totalPausedSeconds;
    } else {
      elapsed = (now.getTime() - session.startedAt.getTime()) / 1000 - session.totalPausedSeconds;
    }

    return Math.max(0, session.requestedSeconds - elapsed);
  }

  private enrichSession(session: any) {
    const remainingSeconds = this.calculateRemainingSeconds(session);
    return {
      ...session,
      remainingSeconds: Math.round(remainingSeconds),
      remainingMinutes: Math.ceil(remainingSeconds / 60),
    };
  }

  private validatePlayHours(settings: PlaySettings, timezone?: string) {
    const { hours, minutes, dayOfWeek } = localTime(timezone);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const startStr = isWeekend ? settings.weekendPlayHoursStart : settings.allowedPlayHoursStart;
    const endStr = isWeekend ? settings.weekendPlayHoursEnd : settings.allowedPlayHoursEnd;

    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    const currentMinutes = hours * 60 + minutes;
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
      throw new BadRequestException(
        `Play is only allowed between ${to12h(startStr)} and ${to12h(endStr)}`,
      );
    }
  }

  private async validateDailyCap(childId: string, requestedSeconds: number, settings: PlaySettings, timezone?: string): Promise<number> {
    const { dayOfWeek } = localTime(timezone);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const cap = isWeekend ? settings.weekendDailyScreenTimeCap : settings.dailyScreenTimeCap;

    if (cap === null || cap === 0) return requestedSeconds; // No cap (0 treated as unlimited)

    const usedToday = await this.getDailyUsage(childId, timezone);
    const remaining = Math.max(0, cap - usedToday);

    if (remaining <= 0) {
      throw new BadRequestException(
        `Daily screen time limit reached. You've used ${formatDuration(usedToday)} of your ${formatDuration(cap)} daily allowance.`,
      );
    }

    // Clamp to however much daily time is left
    return Math.min(requestedSeconds, remaining);
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
