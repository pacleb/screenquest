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
import { RecordViolationDto } from './dto/violation.dto';
import { ViolationRecordedEvent } from '../common/analytics/analytics.events';

@Injectable()
export class ViolationService {
  private readonly logger = new Logger(ViolationService.name);

  constructor(
    private prisma: PrismaService,
    private timeBankService: TimeBankService,
    private notificationService: NotificationService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Record a violation for a child.
   * Penalty formula: 2 * (2 ^ (violationNumber - 1)) hours → minutes
   * 1st=120min, 2nd=240min, 3rd=480min, 4th=960min, etc.
   */
  async recordViolation(childId: string, parentId: string, dto: RecordViolationDto) {
    await this.enforceParentAccess(childId, parentId);

    // Get or create violation counter
    const counter = await this.ensureCounter(childId);
    const violationNumber = counter.currentCount + 1;

    // Calculate penalty: 2 * 2^(n-1) hours = 2^n hours → converted to seconds
    const penaltyHours = 2 * Math.pow(2, violationNumber - 1);
    const penaltySeconds = penaltyHours * 3600;

    // Create violation record
    const violation = await this.prisma.violation.create({
      data: {
        childId,
        recordedByUserId: parentId,
        violationNumber,
        penaltySeconds,
        description: dto.description || null,
      },
    });

    // Increment counter
    await this.prisma.violationCounter.update({
      where: { childId },
      data: {
        currentCount: violationNumber,
        updatedAt: new Date(),
      },
    });

    // Deduct penalty from Time Bank (CAN go negative)
    await this.timeBankService.deductPenalty(childId, penaltySeconds);

    this.logger.log(
      `Violation #${violationNumber} recorded for child ${childId}: -${penaltySeconds}s (${penaltyHours}h)`,
    );

    // Notify child
    this.notificationService.sendToUser(
      childId,
      {
        title: 'Violation Recorded',
        body: `${penaltyHours} hours deducted from your Time Bank`,
        data: { type: 'violation_recorded', violationId: violation.id },
      },
      'violations',
    );

    // Emit violation recorded analytics event
    const child = await this.prisma.user.findUnique({ where: { id: childId }, select: { familyId: true } });
    this.eventEmitter.emit(
      'violation.recorded',
      new ViolationRecordedEvent(parentId, child?.familyId || '', childId),
    );

    return {
      ...violation,
      penaltyHours,
    };
  }

  /**
   * List all violations for a child
   */
  async listViolations(childId: string, requesterId: string) {
    await this.enforceChildOrParentAccess(childId, requesterId);

    return this.prisma.violation.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
      include: {
        recordedBy: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Reset violation counter to 0
   */
  async resetCounter(childId: string, parentId: string) {
    await this.enforceParentAccess(childId, parentId);

    await this.prisma.violationCounter.upsert({
      where: { childId },
      create: { childId, currentCount: 0, lastResetAt: new Date() },
      update: { currentCount: 0, lastResetAt: new Date(), updatedAt: new Date() },
    });

    this.logger.log(`Violation counter reset for child ${childId} by ${parentId}`);

    // Notify child
    this.notificationService.sendToUser(
      childId,
      {
        title: 'Fresh Start!',
        body: 'Your violation count has been reset',
        data: { type: 'violation_reset' },
      },
      'violations',
    );

    return { success: true };
  }

  /**
   * Forgive a violation — refund penalty, decrement counter
   */
  async forgiveViolation(violationId: string, parentId: string) {
    const violation = await this.prisma.violation.findUnique({
      where: { id: violationId },
    });
    if (!violation) throw new NotFoundException('Violation not found');

    await this.enforceParentAccess(violation.childId, parentId);

    if (violation.forgiven) {
      throw new BadRequestException('Violation has already been forgiven');
    }

    // Mark as forgiven
    const updated = await this.prisma.violation.update({
      where: { id: violationId },
      data: { forgiven: true },
    });

    // Refund the deducted time
    if (violation.penaltySeconds > 0) {
      await this.timeBankService.creditTime(
        violation.childId,
        violation.penaltySeconds,
        'Violation forgiven — time refunded',
      );
    }

    // Decrement counter (minimum 0)
    const counter = await this.ensureCounter(violation.childId);
    await this.prisma.violationCounter.update({
      where: { childId: violation.childId },
      data: {
        currentCount: Math.max(0, counter.currentCount - 1),
        updatedAt: new Date(),
      },
    });

    const refundHours = Math.round(violation.penaltySeconds / 3600);
    this.logger.log(
      `Violation ${violationId} forgiven for child ${violation.childId} (+${violation.penaltySeconds}s / ${refundHours}h refunded)`,
    );

    // Notify child
    this.notificationService.sendToUser(
      violation.childId,
      {
        title: 'Violation Forgiven!',
        body: `Your violation has been forgiven and ${refundHours}h of screen time has been refunded!`,
        data: { type: 'violation_forgiven', violationId },
      },
      'violations',
    );

    return updated;
  }

  /**
   * Get current violation status for a child
   */
  async getViolationStatus(childId: string, requesterId: string) {
    await this.enforceChildOrParentAccess(childId, requesterId);

    const counter = await this.ensureCounter(childId);
    const nextViolationNumber = counter.currentCount + 1;
    const nextPenaltyHours = 2 * Math.pow(2, nextViolationNumber - 1);

    return {
      currentCount: counter.currentCount,
      nextPenaltyHours,
      nextPenaltySeconds: nextPenaltyHours * 3600,
      lastResetAt: counter.lastResetAt,
    };
  }

  // --- Helpers ---

  private async ensureCounter(childId: string) {
    let counter = await this.prisma.violationCounter.findUnique({ where: { childId } });
    if (!counter) {
      counter = await this.prisma.violationCounter.create({
        data: { childId },
      });
    }
    return counter;
  }

  private async enforceParentAccess(childId: string, parentId: string) {
    const child = await this.prisma.user.findUnique({ where: { id: childId } });
    if (!child || child.role !== 'child') throw new NotFoundException('Child not found');

    const parent = await this.prisma.user.findUnique({ where: { id: parentId } });
    if (
      !parent ||
      parent.familyId !== child.familyId ||
      !['parent', 'guardian'].includes(parent.role)
    ) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async enforceChildOrParentAccess(childId: string, requesterId: string) {
    if (requesterId === childId) return;

    const child = await this.prisma.user.findUnique({ where: { id: childId } });
    if (!child) throw new NotFoundException('Child not found');

    const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester || requester.familyId !== child.familyId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
