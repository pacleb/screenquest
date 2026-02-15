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

    // Calculate max possible non-stackable from active (non-expired) completions
    const now = new Date();
    const nonStackableResult = await this.prisma.questCompletion.aggregate({
      where: {
        childId,
        status: 'approved',
        stackingType: 'non_stackable',
        expiresAt: { gt: now },
      },
      _sum: { earnedSeconds: true },
    });

    const maxNonStackable = nonStackableResult._sum.earnedSeconds || 0;

    // Cap stored balance at max possible (handles expirations) but never inflate
    // above stored value (preserves play-session deductions)
    const effectiveNonStackable = Math.min(timeBank.nonStackableBalanceSeconds, maxNonStackable);

    // Sync stored value if completions expired
    if (timeBank.nonStackableBalanceSeconds > maxNonStackable) {
      await this.prisma.timeBank.update({
        where: { childId },
        data: {
          nonStackableBalanceSeconds: effectiveNonStackable,
          lastUpdated: now,
        },
      });
    }

    return {
      stackableSeconds: timeBank.stackableBalanceSeconds,
      nonStackableSeconds: effectiveNonStackable,
      totalSeconds: timeBank.stackableBalanceSeconds + effectiveNonStackable,
    };
  }

  /**
   * Credit time to a child's Time Bank
   */
  async creditTime(
    childId: string,
    seconds: number,
    stackingType: string,
    expiresAt: Date | null,
  ) {
    const timeBank = await this.ensureTimeBank(childId);

    if (stackingType === 'stackable') {
      await this.prisma.timeBank.update({
        where: { childId },
        data: {
          stackableBalanceSeconds: timeBank.stackableBalanceSeconds + seconds,
          lastUpdated: new Date(),
        },
      });
    } else {
      // Non-stackable: add to stored balance directly (preserves deductions)
      await this.prisma.timeBank.update({
        where: { childId },
        data: {
          nonStackableBalanceSeconds: timeBank.nonStackableBalanceSeconds + seconds,
          lastUpdated: new Date(),
        },
      });
    }
  }

  /**
   * Deduct time from a child's Time Bank (used when play timer starts).
   * Non-stackable time is used FIRST (use it or lose it).
   */
  async deductTime(childId: string, seconds: number) {
    const balance = await this.getBalance(childId, childId);
    const total = balance.totalSeconds;

    if (seconds > total) {
      throw new ForbiddenException('Insufficient time balance');
    }

    let remainingDeduction = seconds;

    // Deduct non-stackable first
    const nonStackDeduct = Math.min(remainingDeduction, balance.nonStackableSeconds);
    remainingDeduction -= nonStackDeduct;

    // Deduct stackable for the rest
    const stackDeduct = remainingDeduction;

    await this.prisma.timeBank.update({
      where: { childId },
      data: {
        nonStackableBalanceSeconds: balance.nonStackableSeconds - nonStackDeduct,
        stackableBalanceSeconds: balance.stackableSeconds - stackDeduct,
        lastUpdated: new Date(),
      },
    });

    return {
      deducted: seconds,
      stackableSeconds: balance.stackableSeconds - stackDeduct,
      nonStackableSeconds: balance.nonStackableSeconds - nonStackDeduct,
      totalSeconds: total - seconds,
    };
  }

  /**
   * Deduct penalty from Time Bank (violations). Balance CAN go negative.
   * Non-stackable is used first, then stackable goes negative.
   */
  async deductPenalty(childId: string, seconds: number) {
    const timeBank = await this.ensureTimeBank(childId);

    const currentNonStackable = timeBank.nonStackableBalanceSeconds;
    let remainingDeduction = seconds;

    // Deduct non-stackable first
    const nonStackDeduct = Math.min(remainingDeduction, currentNonStackable);
    remainingDeduction -= nonStackDeduct;

    // The rest comes from stackable (CAN go negative)
    const newStackable = timeBank.stackableBalanceSeconds - remainingDeduction;
    const newNonStackable = currentNonStackable - nonStackDeduct;

    await this.prisma.timeBank.update({
      where: { childId },
      data: {
        nonStackableBalanceSeconds: newNonStackable,
        stackableBalanceSeconds: newStackable,
        lastUpdated: new Date(),
      },
    });

    return {
      deducted: seconds,
      stackableSeconds: newStackable,
      nonStackableSeconds: newNonStackable,
      totalSeconds: newStackable + newNonStackable,
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
