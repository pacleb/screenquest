import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { RedisService } from '../redis/redis.service';
import { stringify } from 'csv-stringify/sync';
import { ExportRange } from './dto/export.dto';

const RATE_LIMIT_TTL = 3600; // 1 hour in seconds

@Injectable()
export class ExportService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
    private redis: RedisService,
  ) {}

  async exportCSV(
    familyId: string,
    range: ExportRange,
  ): Promise<{ csv: string; filename: string }> {
    // Check premium
    const isPremium = await this.subscriptionService.isPremium(familyId);
    if (!isPremium) {
      throw new HttpException(
        'Data export is a premium feature. Upgrade to access.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // Rate limit: 1 export per hour per family
    const rateLimitKey = `export_limit:${familyId}`;
    const existing = await this.redis.get(rateLimitKey);
    if (existing) {
      throw new HttpException(
        'Export limit reached. Try again in 1 hour.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Calculate date filter
    const dateFilter = this.getDateFilter(range);

    // Get all children in the family
    const children = await this.prisma.user.findMany({
      where: { familyId, role: 'child' },
      select: { id: true, name: true },
    });

    if (children.length === 0) {
      const csv = stringify([], {
        header: true,
        columns: ['Date', 'Child Name', 'Activity', 'Quest Name', 'Seconds Earned', 'Seconds Used'],
      });
      await this.redis.setex(rateLimitKey, RATE_LIMIT_TTL, '1');
      return { csv, filename: this.getFilename(familyId) };
    }

    const childIds = children.map((c) => c.id);
    const childNameMap = new Map(children.map((c) => [c.id, c.name]));

    // Fetch quest completions (approved only)
    const completions = await this.prisma.questCompletion.findMany({
      where: {
        childId: { in: childIds },
        status: 'approved',
        ...(dateFilter ? { completedAt: { gte: dateFilter } } : {}),
      },
      include: { quest: { select: { name: true } } },
      orderBy: { completedAt: 'desc' },
    });

    // Fetch play sessions (ended only)
    const sessions = await this.prisma.playSession.findMany({
      where: {
        childId: { in: childIds },
        status: 'ended',
        ...(dateFilter ? { endedAt: { gte: dateFilter } } : {}),
      },
      orderBy: { endedAt: 'desc' },
    });

    // Build rows
    const rows: string[][] = [];

    for (const c of completions) {
      rows.push([
        c.completedAt.toISOString().split('T')[0],
        childNameMap.get(c.childId) || 'Unknown',
        'Quest Completed',
        c.quest.name,
        String(c.earnedSeconds),
        '0',
      ]);
    }

    for (const s of sessions) {
      const usedSeconds = s.requestedSeconds;
      rows.push([
        (s.endedAt || s.createdAt).toISOString().split('T')[0],
        childNameMap.get(s.childId) || 'Unknown',
        'Play Session',
        '-',
        '0',
        String(usedSeconds),
      ]);
    }

    // Sort by date descending
    rows.sort((a, b) => b[0].localeCompare(a[0]));

    const csv = stringify(rows, {
      header: true,
      columns: ['Date', 'Child Name', 'Activity', 'Quest Name', 'Seconds Earned', 'Seconds Used'],
    });

    // Set rate limit
    await this.redis.setex(rateLimitKey, RATE_LIMIT_TTL, '1');

    return { csv, filename: this.getFilename(familyId) };
  }

  private getDateFilter(range: ExportRange): Date | null {
    const now = new Date();
    switch (range) {
      case ExportRange.THIRTY_DAYS:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case ExportRange.NINETY_DAYS:
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case ExportRange.ALL:
        return null;
    }
  }

  private getFilename(familyId: string): string {
    const date = new Date().toISOString().split('T')[0];
    return `screenquest-export-${date}.csv`;
  }
}
