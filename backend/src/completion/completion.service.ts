import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimeBankService } from '../time-bank/time-bank.service';
import { CompleteQuestDto, ReviewCompletionDto } from './dto/completion.dto';

@Injectable()
export class CompletionService {
  constructor(
    private prisma: PrismaService,
    private timeBankService: TimeBankService,
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

    const earnedMinutes = Math.round(quest.rewardMinutes * quest.bonusMultiplier);

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
        earnedMinutes,
        stackingType: quest.stackingType,
        expiresAt,
        reviewedAt: quest.autoApprove ? new Date() : null,
      },
      include: {
        quest: { select: { id: true, name: true, icon: true, category: true } },
      },
    });

    // If auto-approve, credit Time Bank immediately
    if (quest.autoApprove) {
      await this.timeBankService.creditTime(childId, earnedMinutes, quest.stackingType, expiresAt);
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
        quest: { select: { id: true, name: true, icon: true, category: true, rewardMinutes: true } },
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
        quest: { select: { id: true, name: true, icon: true, category: true, rewardMinutes: true } },
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
      completion.earnedMinutes,
      completion.stackingType,
      completion.expiresAt,
    );

    return updated;
  }

  /**
   * Deny a completion
   */
  async denyCompletion(completionId: string, userId: string, dto: ReviewCompletionDto) {
    const completion = await this.getCompletionWithAccess(completionId, userId);

    if (completion.status !== 'pending') {
      throw new BadRequestException('Completion has already been reviewed');
    }

    return this.prisma.questCompletion.update({
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
        questId: { in: quests.map((q) => q.id) },
        completedAt: { gte: weekStart },
        status: { in: ['pending', 'approved'] },
      },
      select: { questId: true, completedAt: true, status: true },
    });

    // Build a map of quest availability
    return quests.map((quest) => {
      const questCompletions = recentCompletions.filter((c) => c.questId === quest.id);
      const completedToday = questCompletions.some((c) => c.completedAt >= todayStart);
      const completedThisWeek = questCompletions.length > 0;
      const pendingApproval = questCompletions.some((c) => c.status === 'pending');

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
