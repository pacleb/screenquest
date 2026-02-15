import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLibraryQuestDto,
  UpdateLibraryQuestDto,
  ListLibraryQuestsQueryDto,
  BulkImportRowDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/quest-library-admin.dto';

@Injectable()
export class QuestLibraryAdminService {
  constructor(private prisma: PrismaService) {}

  // ─── Quest Library CRUD ─────────────────────────────────────

  async listAll(query: ListLibraryQuestsQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.status === 'published') {
      where.isPublished = true;
    } else if (query.status === 'draft') {
      where.isPublished = false;
    }

    if (query.ageRange) {
      where.ageRange = query.ageRange;
    }

    const [items, total] = await Promise.all([
      this.prisma.questLibrary.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.questLibrary.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(id: string) {
    const quest = await this.prisma.questLibrary.findUnique({ where: { id } });
    if (!quest) throw new NotFoundException('Library quest not found');
    return quest;
  }

  async create(dto: CreateLibraryQuestDto) {
    const maxOrder = await this.prisma.questLibrary.aggregate({
      _max: { sortOrder: true },
    });

    return this.prisma.questLibrary.create({
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        category: dto.category,
        suggestedRewardSeconds: dto.suggestedRewardSeconds,
        suggestedStackingType: dto.suggestedStackingType || 'stackable',
        ageRange: dto.ageRange,
        isPublished: dto.isPublished ?? false,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
  }

  async update(id: string, dto: UpdateLibraryQuestDto) {
    await this.getById(id);
    return this.prisma.questLibrary.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.getById(id);
    return this.prisma.questLibrary.delete({ where: { id } });
  }

  async publish(id: string) {
    await this.getById(id);
    return this.prisma.questLibrary.update({
      where: { id },
      data: { isPublished: true },
    });
  }

  async unpublish(id: string) {
    await this.getById(id);
    return this.prisma.questLibrary.update({
      where: { id },
      data: { isPublished: false },
    });
  }

  async reorder(ids: string[]) {
    const updates = ids.map((id, index) =>
      this.prisma.questLibrary.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );
    await this.prisma.$transaction(updates);
    return { success: true };
  }

  async bulkImport(rows: BulkImportRowDto[]) {
    const maxOrder = await this.prisma.questLibrary.aggregate({
      _max: { sortOrder: true },
    });
    let nextOrder = (maxOrder._max.sortOrder ?? 0) + 1;

    const created = await this.prisma.$transaction(
      rows.map((row) =>
        this.prisma.questLibrary.create({
          data: {
            name: row.name,
            description: row.description,
            icon: row.icon,
            category: row.category,
            suggestedRewardSeconds: row.suggestedRewardSeconds,
            suggestedStackingType: row.suggestedStackingType || 'stackable',
            ageRange: row.ageRange,
            isPublished: false,
            sortOrder: nextOrder++,
          },
        }),
      ),
    );

    return { imported: created.length };
  }

  async getStats() {
    const [totalQuests, publishedQuests, draftQuests, topUsed] =
      await Promise.all([
        this.prisma.questLibrary.count(),
        this.prisma.questLibrary.count({ where: { isPublished: true } }),
        this.prisma.questLibrary.count({ where: { isPublished: false } }),
        this.prisma.questLibrary.findMany({
          include: { _count: { select: { familyQuests: true } } },
          orderBy: { familyQuests: { _count: 'desc' } },
          take: 10,
        }),
      ]);

    const totalCategories = await this.prisma.questCategory.count();

    return {
      totalQuests,
      publishedQuests,
      draftQuests,
      totalCategories,
      topUsed: topUsed.map((q: { id: string; name: string; icon: string | null; category: string; _count: { familyQuests: number } }) => ({
        id: q.id,
        name: q.name,
        icon: q.icon,
        category: q.category,
        usageCount: q._count.familyQuests,
      })),
    };
  }

  // ─── Category CRUD ──────────────────────────────────────────

  async listCategories() {
    return this.prisma.questCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    const maxOrder = await this.prisma.questCategory.aggregate({
      _max: { sortOrder: true },
    });
    return this.prisma.questCategory.create({
      data: {
        name: dto.name,
        icon: dto.icon,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const cat = await this.prisma.questCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return this.prisma.questCategory.update({ where: { id }, data: dto });
  }

  async removeCategory(id: string) {
    const cat = await this.prisma.questCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return this.prisma.questCategory.delete({ where: { id } });
  }

  async reorderCategories(ids: string[]) {
    const updates = ids.map((id, index) =>
      this.prisma.questCategory.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );
    await this.prisma.$transaction(updates);
    return { success: true };
  }
}
