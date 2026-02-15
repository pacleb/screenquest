import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { TimeBankService } from '../time-bank/time-bank.service';
import { NotificationService } from '../notification/notification.service';
import { GamificationService } from '../gamification/gamification.service';
import { CompleteQuestDto, ReviewCompletionDto } from './dto/completion.dto';
import {
  QuestCompletedEvent,
  QuestApprovedEvent,
  QuestDeniedEvent,
} from '../common/analytics/analytics.events';

@Injectable()
export class CompletionService {
  constructor(
    private prisma: PrismaService,
    private timeBankService: TimeBankService,
    private notificationService: NotificationService,
    private gamificationService: GamificationService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Child completes a quest
   */
  async completeQuest(childId: string, questId: string, dto: CompleteQuestDto) {
    // Validate child exists and is a child
    const child = await this.prisma.user.findUnique({ where: { id: childId } });
    if (!child || child.role !== 'child') {
      throw new ForbiddenException('Access denied');
    }

    // Validate quest exists, is active, and assigned to this child
    const quest = await this.prisma.quest.findFirst({
      where: {
        id: questId,
        isArchived: false,
        assignments: { some: { childId } },
      },
    });

    if (!quest) {
      throw new NotFoundException('Quest not found or not assigned to you');
    }

    // Check for duplicate completions in current period
    await this.checkDuplicateCompletion(childId, questId, quest.recurrence);

    // Validate proof if required
    if (quest.requiresProof && !dto.proofImageUrl) {
      throw new BadRequestException('This quest requires photo proof');
    }

    const earnedSeconds = Math.round(quest.rewardSeconds * quest.bonusMultiplier);

    // Determine expiry for non-stackable
    let expiresAt: Date | null = null;
    if (quest.stackingType === 'non_stackable') {
      expiresAt = this.getEndOfDay();
    }

    // Determine initial status
    const status = quest.autoApprove ? 'approved' : 'pending';

    const completion = await this.prisma.questCompletion.create({
      data: {
        questId,
        childId,
        status,
        proofImageUrl: dto.proofImageUrl || null,
        earnedSeconds,
        stackingType: quest.stackingType,
        expiresAt,
        reviewedAt: quest.autoApprove ? new Date() : null,
      },
      include: {
        quest: { select: { id: true, name: true, icon: true, category: true } },
      },
    });

    // Emit quest completed event
    this.eventEmitter.emit(
      'quest.completed',
      new QuestCompletedEvent(childId, child.familyId || '', questId, quest.category || '', earnedSeconds),
    );

    // If auto-approve, credit Time Bank and process gamification
    if (quest.autoApprove) {
      await this.timeBankService.creditTime(childId, earnedSeconds, quest.stackingType, expiresAt);
      const gamificationEvent = await this.gamificationService.processCompletion(childId, completion.id);
      return { ...completion, gamificationEvent };
    }

    // Notify parents about quest completion
    if (child.familyId && !quest.autoApprove) {
      this.notificationService.sendToParents(
        child.familyId,
        {
          title: 'Quest Completed',
          body: `${child.name} completed "${quest.name}" — Approve?`,
          data: { type: 'quest_completion', completionId: completion.id },
        },
        'quest_completions',
      );
    }

    return completion;
  }

  /**
   * List completions for a family (parent approval queue)
   */
  async listFamilyCompletions(familyId: string, userId: string, status?: string) {
    await this.enforceFamilyAccess(familyId, userId, ['parent', 'guardian']);

    const where: any = {
      quest: { familyId },
    };

    if (status) {
      where.status = status;
    }

    return this.prisma.questCompletion.findMany({
      where,
      include: {
        quest: { select: { id: true, name: true, icon: true, category: true, rewardSeconds: true } },
        child: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  /**
   * List completions for a specific child
   */
  async listChildCompletions(childId: string, requesterId: string) {
    // Requester must be the child themselves or a parent in the same family
    const child = await this.prisma.user.findUnique({ where: { id: childId } });
    if (!child) throw new NotFoundException('Child not found');

    const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester) throw new ForbiddenException('Access denied');

    const isSelf = requesterId === childId;
    const isFamilyParent =
      requester.familyId === child.familyId &&
      ['parent', 'guardian'].includes(requester.role);

    if (!isSelf && !isFamilyParent) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.questCompletion.findMany({
      where: { childId },
      include: {
        quest: { select: { id: true, name: true, icon: true, category: true, rewardSeconds: true } },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  /**
   * Approve a completion
   */
  async approveCompletion(completionId: string, userId: string, dto: ReviewCompletionDto) {
    const completion = await this.getCompletionWithAccess(completionId, userId);

    if (completion.status !== 'pending') {
      throw new BadRequestException('Completion has already been reviewed');
    }

    const updated = await this.prisma.questCompletion.update({
      where: { id: completionId },
      data: {
        status: 'approved',
        approvedByUserId: userId,
        parentNote: dto.parentNote || null,
        reviewedAt: new Date(),
      },
      include: {
        quest: { select: { id: true, name: true, icon: true } },
        child: { select: { id: true, name: true } },
      },
    });

    // Credit Time Bank
    await this.timeBankService.creditTime(
      completion.childId,
      completion.earnedSeconds,
      completion.stackingType,
      completion.expiresAt,
    );

    // Notify child of approval
    this.notificationService.sendToUser(
      completion.childId,
      {
        title: 'Quest Approved!',
        body: `+${completion.earnedSeconds} seconds added to your Time Bank!`,
        data: { type: 'quest_approved', completionId },
      },
      'quest_completions',
    );

    // Process gamification (XP, streak, achievements)
    const gamificationEvent = await this.gamificationService.processCompletion(
      completion.childId,
      completionId,
    );

    // Emit quest approved event
    this.eventEmitter.emit(
      'quest.approved',
      new QuestApprovedEvent(userId, completionId, completion.childId),
    );

    return { ...updated, gamificationEvent };
  }

  /**
   * Deny a completion
   */
  async denyCompletion(completionId: string, userId: string, dto: ReviewCompletionDto) {
    const completion = await this.getCompletionWithAccess(completionId, userId);

    if (completion.status !== 'pending') {
      throw new BadRequestException('Completion has already been reviewed');
    }

    const denied = await this.prisma.questCompletion.update({
      where: { id: completionId },
      data: {
        status: 'denied',
        approvedByUserId: userId,
        parentNote: dto.parentNote || null,
        reviewedAt: new Date(),
      },
      include: {
        quest: { select: { id: true, name: true, icon: true } },
        child: { select: { id: true, name: true } },
      },
    });

    // Notify child of denial
    const noteMsg = dto.parentNote ? ` ${dto.parentNote}` : '';
    this.notificationService.sendToUser(
      completion.childId,
      {
        title: 'Quest Not Approved',
        body: `Your quest was not approved.${noteMsg}`,
        data: { type: 'quest_denied', completionId },
      },
      'quest_completions',
    );

    // Emit quest denied event
    this.eventEmitter.emit(
      'quest.denied',
      new QuestDeniedEvent(userId, completionId, completion.childId),
    );

    return denied;
  }

  /**
   * List quests available for a child to complete
   */
  async listChildQuests(childId: string, requesterId: string) {
    const child = await this.prisma.user.findUnique({ where: { id: childId } });
    if (!child || child.role !== 'child') throw new NotFoundException('Child not found');

    const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester) throw new ForbiddenException('Access denied');

    const isSelf = requesterId === childId;
    const isFamilyParent =
      requester.familyId === child.familyId &&
      ['parent', 'guardian'].includes(requester.role);

    if (!isSelf && !isFamilyParent) {
      throw new ForbiddenException('Access denied');
    }

    // Get all active, assigned quests
    const quests = await this.prisma.quest.findMany({
      where: {
        isArchived: false,
        assignments: { some: { childId } },
      },
      include: {
        assignments: {
          include: { child: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    });

    // Get recent completions to determine availability
    const todayStart = this.getStartOfDay();
    const weekStart = this.getStartOfWeek();

    const recentCompletions = await this.prisma.questCompletion.findMany({
      where: {
        childId,
        questId: { in: quests.map((q: { id: string }) => q.id) },
        completedAt: { gte: weekStart },
        status: { in: ['pending', 'approved'] },
      },
      select: { questId: true, completedAt: true, status: true },
    });

    // Build a map of quest availability
    return quests.map((quest: { id: string; recurrence: string; [key: string]: unknown }) => {
      const questCompletions = recentCompletions.filter((c: { questId: string; completedAt: Date; status: string }) => c.questId === quest.id);
      const completedToday = questCompletions.some((c: { completedAt: Date }) => c.completedAt >= todayStart);
      const completedThisWeek = questCompletions.length > 0;
      const pendingApproval = questCompletions.some((c: { status: string }) => c.status === 'pending');

      let availableToComplete = true;
      let statusLabel = 'available';

      if (pendingApproval) {
        availableToComplete = false;
        statusLabel = 'pending';
      } else if (quest.recurrence === 'one_time' && questCompletions.length > 0) {
        availableToComplete = false;
        statusLabel = 'completed';
      } else if (quest.recurrence === 'daily' && completedToday) {
        availableToComplete = false;
        statusLabel = 'completed_today';
      } else if (quest.recurrence === 'weekly' && completedThisWeek) {
        availableToComplete = false;
        statusLabel = 'completed_this_week';
      }

      return {
        ...quest,
        availableToComplete,
        statusLabel,
      };
    });
  }

  // --- Helpers ---

  private async checkDuplicateCompletion(childId: string, questId: string, recurrence: string) {
    let since: Date | undefined;

    if (recurrence === 'daily') {
      since = this.getStartOfDay();
    } else if (recurrence === 'weekly') {
      since = this.getStartOfWeek();
    } else if (recurrence === 'one_time') {
      // For one-time quests, check if ever completed (pending or approved)
      const existing = await this.prisma.questCompletion.findFirst({
        where: {
          childId,
          questId,
          status: { in: ['pending', 'approved'] },
        },
      });
      if (existing) {
        throw new BadRequestException('You have already completed this quest');
      }
      return;
    } else {
      return; // Custom recurrence — no auto-check
    }

    const existing = await this.prisma.questCompletion.findFirst({
      where: {
        childId,
        questId,
        completedAt: { gte: since },
        status: { in: ['pending', 'approved'] },
      },
    });

    if (existing) {
      throw new BadRequestException(
        recurrence === 'daily'
          ? 'You have already completed this quest today'
          : 'You have already completed this quest this week',
      );
    }
  }

  private async getCompletionWithAccess(completionId: string, userId: string) {
    const completion = await this.prisma.questCompletion.findUnique({
      where: { id: completionId },
      include: {
        quest: { select: { familyId: true } },
      },
    });

    if (!completion) throw new NotFoundException('Completion not found');

    await this.enforceFamilyAccess(completion.quest.familyId, userId, ['parent', 'guardian']);

    return completion;
  }

  private async enforceFamilyAccess(familyId: string, userId: string, allowedRoles: string[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.familyId !== familyId) {
      throw new ForbiddenException('Access denied');
    }
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  private getStartOfDay(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getEndOfDay(): Date {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private getStartOfWeek(): Date {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
