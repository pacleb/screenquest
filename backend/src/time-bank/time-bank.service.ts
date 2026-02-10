import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TimeBankService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get time bank balance for a child.
   * Recalculates non-stackable balance based on active (unexpired) completions.
   */
  async getBalance(childId: string, requesterId: string) {
    const child = await this.prisma.user.findUnique({ where: { id: childId } });
    if (!child || child.role !== 'child') throw new NotFoundException('Child not found');

    const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester) throw new ForbiddenException('Access denied');

    const isSelf = requesterId === childId;
    const isFamilyMember = requester.familyId === child.familyId;

    if (!isSelf && !isFamilyMember) {
      throw new ForbiddenException('Access denied');
    }

    // Ensure time bank exists
    const timeBank = await this.ensureTimeBank(childId);

    // Recalculate non-stackable from active completions
    const now = new Date();
    const nonStackableResult = await this.prisma.questCompletion.aggregate({
      where: {
        childId,
        status: 'approved',
        stackingType: 'non_stackable',
        expiresAt: { gt: now },
      },
      _sum: { earnedMinutes: true },
    });

    const nonStackableMinutes = nonStackableResult._sum.earnedMinutes || 0;

    // Update the cached values
    if (timeBank.nonStackableBalanceMinutes !== nonStackableMinutes) {
      await this.prisma.timeBank.update({
        where: { childId },
        data: {
          nonStackableBalanceMinutes: nonStackableMinutes,
          lastUpdated: now,
        },
      });
    }

    return {
      stackableMinutes: timeBank.stackableBalanceMinutes,
      nonStackableMinutes,
      totalMinutes: timeBank.stackableBalanceMinutes + nonStackableMinutes,
    };
  }

  /**
   * Credit time to a child's Time Bank
   */
  async creditTime(
    childId: string,
    minutes: number,
    stackingType: string,
    expiresAt: Date | null,
  ) {
    const timeBank = await this.ensureTimeBank(childId);

    if (stackingType === 'stackable') {
      await this.prisma.timeBank.update({
        where: { childId },
        data: {
          stackableBalanceMinutes: timeBank.stackableBalanceMinutes + minutes,
          lastUpdated: new Date(),
        },
      });
    } else {
      // Non-stackable: recalculate from active completions
      const now = new Date();
      const result = await this.prisma.questCompletion.aggregate({
        where: {
          childId,
          status: 'approved',
          stackingType: 'non_stackable',
          expiresAt: { gt: now },
        },
        _sum: { earnedMinutes: true },
      });

      await this.prisma.timeBank.update({
        where: { childId },
        data: {
          nonStackableBalanceMinutes: result._sum.earnedMinutes || 0,
          lastUpdated: now,
        },
      });
    }
  }

  /**
   * Deduct time from a child's Time Bank (used when play timer starts).
   * Non-stackable time is used FIRST (use it or lose it).
   */
  async deductTime(childId: string, minutes: number) {
    const balance = await this.getBalance(childId, childId);
    const total = balance.totalMinutes;

    if (minutes > total) {
      throw new ForbiddenException('Insufficient time balance');
    }

    let remainingDeduction = minutes;

    // Deduct non-stackable first
    const nonStackDeduct = Math.min(remainingDeduction, balance.nonStackableMinutes);
    remainingDeduction -= nonStackDeduct;

    // Deduct stackable for the rest
    const stackDeduct = remainingDeduction;

    await this.prisma.timeBank.update({
      where: { childId },
      data: {
        nonStackableBalanceMinutes: balance.nonStackableMinutes - nonStackDeduct,
        stackableBalanceMinutes: balance.stackableMinutes - stackDeduct,
        lastUpdated: new Date(),
      },
    });

    return {
      deducted: minutes,
      stackableMinutes: balance.stackableMinutes - stackDeduct,
      nonStackableMinutes: balance.nonStackableMinutes - nonStackDeduct,
      totalMinutes: total - minutes,
    };
  }

  /**
   * Deduct penalty from Time Bank (violations). Balance CAN go negative.
   * Non-stackable is used first, then stackable goes negative.
   */
  async deductPenalty(childId: string, minutes: number) {
    const timeBank = await this.ensureTimeBank(childId);

    const now = new Date();
    const nonStackResult = await this.prisma.questCompletion.aggregate({
      where: {
        childId,
        status: 'approved',
        stackingType: 'non_stackable',
        expiresAt: { gt: now },
      },
      _sum: { earnedMinutes: true },
    });

    const currentNonStackable = nonStackResult._sum.earnedMinutes || 0;
    let remainingDeduction = minutes;

    // Deduct non-stackable first
    const nonStackDeduct = Math.min(remainingDeduction, currentNonStackable);
    remainingDeduction -= nonStackDeduct;

    // The rest comes from stackable (CAN go negative)
    const newStackable = timeBank.stackableBalanceMinutes - remainingDeduction;

    await this.prisma.timeBank.update({
      where: { childId },
      data: {
        nonStackableBalanceMinutes: currentNonStackable - nonStackDeduct,
        stackableBalanceMinutes: newStackable,
        lastUpdated: now,
      },
    });

    return {
      deducted: minutes,
      stackableMinutes: newStackable,
      nonStackableMinutes: currentNonStackable - nonStackDeduct,
      totalMinutes: newStackable + (currentNonStackable - nonStackDeduct),
    };
  }

  /**
   * Ensure a TimeBank record exists for a child (auto-create if missing)
   */
  async ensureTimeBank(childId: string) {
    let timeBank = await this.prisma.timeBank.findUnique({ where: { childId } });

    if (!timeBank) {
      timeBank = await this.prisma.timeBank.create({
        data: { childId },
      });
    }

    return timeBank;
  }
}
