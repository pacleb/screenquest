import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestDto, UpdateQuestDto, CreateFromLibraryDto } from './dto/quest.dto';

const FREE_PLAN_QUEST_LIMIT = 3;

@Injectable()
export class QuestService {
  constructor(private prisma: PrismaService) {}

  async create(familyId: string, userId: string, dto: CreateQuestDto) {
    await this.enforceFamilyAccess(familyId, userId);
    await this.enforceQuestLimit(familyId);
    await this.validateChildAssignments(familyId, dto.assignedChildIds);

    const quest = await this.prisma.quest.create({
      data: {
        familyId,
        createdByUserId: userId,
        libraryQuestId: dto.libraryQuestId || null,
        name: dto.name,
        description: dto.description || null,
        icon: dto.icon || '⭐',
        category: dto.category,
        rewardMinutes: dto.rewardMinutes,
        stackingType: dto.stackingType,
        recurrence: dto.recurrence || 'one_time',
        recurrenceDays: dto.recurrenceDays ?? Prisma.JsonNull,
        requiresProof: dto.requiresProof || false,
        autoApprove: dto.autoApprove || false,
        bonusMultiplier: dto.bonusMultiplier || 1.0,
        assignments: {
          create: dto.assignedChildIds.map((childId) => ({ childId })),
        },
      },
      include: {
        assignments: {
          include: { child: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });

    return quest;
  }

  async createFromLibrary(
    familyId: string,
    userId: string,
    libraryQuestId: string,
    dto: CreateFromLibraryDto,
  ) {
    await this.enforceFamilyAccess(familyId, userId);
    await this.enforceQuestLimit(familyId);
    await this.validateChildAssignments(familyId, dto.assignedChildIds);

    const libraryQuest = await this.prisma.questLibrary.findUnique({
      where: { id: libraryQuestId },
    });

    if (!libraryQuest || !libraryQuest.isPublished) {
      throw new NotFoundException('Library quest not found');
    }

    const quest = await this.prisma.quest.create({
      data: {
        familyId,
        createdByUserId: userId,
        libraryQuestId,
        name: libraryQuest.name,
        description: libraryQuest.description,
        icon: libraryQuest.icon || '⭐',
        category: libraryQuest.category,
        rewardMinutes: dto.rewardMinutes,
        stackingType: dto.stackingType,
        recurrence: dto.recurrence || 'one_time',
        recurrenceDays: dto.recurrenceDays ?? Prisma.JsonNull,
        requiresProof: dto.requiresProof || false,
        autoApprove: dto.autoApprove || false,
        assignments: {
          create: dto.assignedChildIds.map((childId) => ({ childId })),
        },
      },
      include: {
        assignments: {
          include: { child: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });

    return quest;
  }

  async findAll(
    familyId: string,
    userId: string,
    filters?: { category?: string; archived?: boolean; childId?: string },
  ) {
    await this.enforceFamilyAccess(familyId, userId);

    const where: any = { familyId };

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.archived !== undefined) {
      where.isArchived = filters.archived;
    }

    if (filters?.childId) {
      where.assignments = {
        some: { childId: filters.childId },
      };
    }

    return this.prisma.quest.findMany({
      where,
      include: {
        assignments: {
          include: { child: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(familyId: string, questId: string, userId: string) {
    await this.enforceFamilyAccess(familyId, userId);

    const quest = await this.prisma.quest.findFirst({
      where: { id: questId, familyId },
      include: {
        assignments: {
          include: { child: { select: { id: true, name: true, avatarUrl: true } } },
        },
        libraryQuest: true,
      },
    });

    if (!quest) throw new NotFoundException('Quest not found');

    return quest;
  }

  async update(familyId: string, questId: string, userId: string, dto: UpdateQuestDto) {
    await this.enforceFamilyAccess(familyId, userId);

    const quest = await this.prisma.quest.findFirst({
      where: { id: questId, familyId },
    });

    if (!quest) throw new NotFoundException('Quest not found');

    if (dto.assignedChildIds) {
      await this.validateChildAssignments(familyId, dto.assignedChildIds);
    }

    // Build update data, omitting assignedChildIds
    const { assignedChildIds, ...updateFields } = dto;

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update assignments if provided
      if (assignedChildIds) {
        await tx.questAssignment.deleteMany({ where: { questId } });
        await tx.questAssignment.createMany({
          data: assignedChildIds.map((childId) => ({ questId, childId })),
        });
      }

      return tx.quest.update({
        where: { id: questId },
        data: updateFields,
        include: {
          assignments: {
            include: { child: { select: { id: true, name: true, avatarUrl: true } } },
          },
        },
      });
    });

    return updated;
  }

  async remove(familyId: string, questId: string, userId: string) {
    await this.enforceFamilyAccess(familyId, userId);

    const quest = await this.prisma.quest.findFirst({
      where: { id: questId, familyId },
    });

    if (!quest) throw new NotFoundException('Quest not found');

    await this.prisma.quest.delete({ where: { id: questId } });

    return { message: 'Quest deleted' };
  }

  async archive(familyId: string, questId: string, userId: string) {
    await this.enforceFamilyAccess(familyId, userId);

    const quest = await this.prisma.quest.findFirst({
      where: { id: questId, familyId },
    });

    if (!quest) throw new NotFoundException('Quest not found');

    if (quest.isArchived) {
      throw new BadRequestException('Quest is already archived');
    }

    return this.prisma.quest.update({
      where: { id: questId },
      data: { isArchived: true },
    });
  }

  async unarchive(familyId: string, questId: string, userId: string) {
    await this.enforceFamilyAccess(familyId, userId);
    await this.enforceQuestLimit(familyId);

    const quest = await this.prisma.quest.findFirst({
      where: { id: questId, familyId },
    });

    if (!quest) throw new NotFoundException('Quest not found');

    if (!quest.isArchived) {
      throw new BadRequestException('Quest is not archived');
    }

    return this.prisma.quest.update({
      where: { id: questId },
      data: { isArchived: false },
    });
  }

  async getActiveQuestCount(familyId: string): Promise<number> {
    return this.prisma.quest.count({
      where: { familyId, isArchived: false },
    });
  }

  // --- Quest Library (read-only for parents) ---

  async getLibraryQuests(category?: string) {
    const where: any = { isPublished: true };
    if (category) where.category = category;

    return this.prisma.questLibrary.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async getLibraryQuest(id: string) {
    const quest = await this.prisma.questLibrary.findFirst({
      where: { id, isPublished: true },
    });

    if (!quest) throw new NotFoundException('Library quest not found');
    return quest;
  }

  // --- Helpers ---

  private async enforceFamilyAccess(familyId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.familyId !== familyId) {
      throw new ForbiddenException('Access denied');
    }
    if (!['parent', 'guardian'].includes(user.role)) {
      throw new ForbiddenException('Only parents and guardians can manage quests');
    }
  }

  private async enforceQuestLimit(familyId: string) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) throw new NotFoundException('Family not found');

    if (family.plan === 'free') {
      const activeCount = await this.getActiveQuestCount(familyId);
      if (activeCount >= FREE_PLAN_QUEST_LIMIT) {
        throw new HttpException(
          {
            statusCode: HttpStatus.PAYMENT_REQUIRED,
            message: `Free plan allows up to ${FREE_PLAN_QUEST_LIMIT} active quests. Upgrade to Premium for unlimited quests.`,
            activeQuests: activeCount,
            limit: FREE_PLAN_QUEST_LIMIT,
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    }
  }

  private async validateChildAssignments(familyId: string, childIds: string[]) {
    const children = await this.prisma.user.findMany({
      where: {
        id: { in: childIds },
        familyId,
        role: 'child',
      },
    });

    if (children.length !== childIds.length) {
      throw new BadRequestException(
        'One or more child IDs are invalid or do not belong to this family',
      );
    }
  }
}
