import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RequestDeletionDto } from './dto/privacy.dto';

const GRACE_PERIOD_DAYS = 30;

@Injectable()
export class DeletionService {
  private readonly logger = new Logger(DeletionService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async requestDeletion(userId: string, dto: RequestDeletionDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Check for existing active request
    const existing = await this.prisma.accountDeletionRequest.findFirst({
      where: {
        userId,
        cancelledAt: null,
        purgedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('Account deletion already requested');
    }

    const gracePeriodEndsAt = new Date();
    gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + GRACE_PERIOD_DAYS);

    const request = await this.prisma.accountDeletionRequest.create({
      data: {
        userId,
        gracePeriodEndsAt,
        reason: dto.reason || null,
      },
    });

    // Revoke all tokens
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    // Send confirmation email
    if (user.email) {
      await this.mailService.sendDeletionRequestedEmail(
        user.email,
        user.name,
        gracePeriodEndsAt,
      );
    }

    return {
      id: request.id,
      gracePeriodEndsAt: request.gracePeriodEndsAt,
      message: `Account will be permanently deleted after ${gracePeriodEndsAt.toISOString().split('T')[0]}. You can cancel this from Settings.`,
    };
  }

  async cancelDeletion(userId: string) {
    const request = await this.prisma.accountDeletionRequest.findFirst({
      where: {
        userId,
        cancelledAt: null,
        purgedAt: null,
      },
    });

    if (!request) {
      throw new NotFoundException('No active deletion request found');
    }

    await this.prisma.accountDeletionRequest.update({
      where: { id: request.id },
      data: { cancelledAt: new Date() },
    });

    return { message: 'Account deletion cancelled' };
  }

  async getDeletionStatus(userId: string) {
    return this.prisma.accountDeletionRequest.findFirst({
      where: {
        userId,
        cancelledAt: null,
        purgedAt: null,
      },
    });
  }

  async purgeUser(requestId: string) {
    const request = await this.prisma.accountDeletionRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.purgedAt || request.cancelledAt) return;

    const user = await this.prisma.user.findUnique({
      where: { id: request.userId },
    });
    if (!user) return;

    const anonymizedHash = createHash('sha256')
      .update(user.id)
      .digest('hex');

    await this.prisma.$transaction(async (tx) => {
      if (user.role === 'parent' || user.role === 'guardian') {
        await this.purgeParentData(user, tx);
      } else if (user.role === 'child') {
        await this.purgeChildData(user.id, tx);
      }

      // Create audit log
      await tx.deletionAuditLog.create({
        data: {
          anonymizedHash,
          userRole: user.role,
          dataTypesDeleted: this.getDataTypesForRole(user.role),
        },
      });

      // Mark request as purged
      await tx.accountDeletionRequest.update({
        where: { id: requestId },
        data: { purgedAt: new Date() },
      });
    });

    // Send final email (outside transaction)
    if (user.email) {
      await this.mailService.sendAccountDeletedEmail(user.email, user.name);
    }

    this.logger.log(`Purged user [${anonymizedHash}] (role: ${user.role})`);
  }

  private async purgeChildData(childId: string, tx: any) {
    // Delete in FK-safe order
    await tx.questCompletion.deleteMany({ where: { childId } });
    await tx.questAssignment.deleteMany({ where: { childId } });
    await tx.playSession.deleteMany({ where: { childId } });
    await tx.violation.deleteMany({ where: { childId } });
    await tx.violationCounter.deleteMany({ where: { childId } });
    await tx.timeBank.deleteMany({ where: { childId } });
    await tx.childProgress.deleteMany({ where: { childId } });
    await tx.childAchievement.deleteMany({ where: { childId } });
    await tx.childEquippedItem.deleteMany({ where: { childId } });
    await tx.parentalConsent.deleteMany({ where: { childId } });
    // Cascade-handled but explicit for safety
    await tx.refreshToken.deleteMany({ where: { userId: childId } });
    await tx.pushToken.deleteMany({ where: { userId: childId } });
    await tx.avatarPackPurchase.deleteMany({ where: { userId: childId } });
    await tx.notificationPreference.deleteMany({ where: { userId: childId } });
    await tx.policyAcceptance.deleteMany({ where: { userId: childId } });
    await tx.user.delete({ where: { id: childId } });
  }

  private async purgeParentData(
    user: { id: string; familyId: string | null },
    tx: any,
  ) {
    if (!user.familyId) {
      // No family — just delete the user
      await tx.refreshToken.deleteMany({ where: { userId: user.id } });
      await tx.pushToken.deleteMany({ where: { userId: user.id } });
      await tx.policyAcceptance.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
      return;
    }

    // Check if this parent owns the family
    const family = await tx.family.findUnique({ where: { id: user.familyId } });
    if (!family) {
      await tx.user.delete({ where: { id: user.id } });
      return;
    }

    const isOwner = family.ownerId === user.id;

    if (isOwner) {
      // Cascade: delete all children first
      const children = await tx.user.findMany({
        where: { familyId: user.familyId, role: 'child' },
      });

      for (const child of children) {
        await this.purgeChildData(child.id, tx);
      }

      // Delete family-level data
      await tx.quest.deleteMany({ where: { familyId: user.familyId } });
      await tx.familyInvite.deleteMany({ where: { familyId: user.familyId } });

      // Remove other adults from family
      await tx.user.updateMany({
        where: {
          familyId: user.familyId,
          id: { not: user.id },
          role: { in: ['parent', 'guardian'] },
        },
        data: { familyId: null },
      });

      // Delete family
      await tx.family.delete({ where: { id: user.familyId } });
    }

    // Delete the parent user
    await tx.parentalConsent.deleteMany({ where: { parentId: user.id } });
    await tx.refreshToken.deleteMany({ where: { userId: user.id } });
    await tx.pushToken.deleteMany({ where: { userId: user.id } });
    await tx.policyAcceptance.deleteMany({ where: { userId: user.id } });
    await tx.user.delete({ where: { id: user.id } });
  }

  private getDataTypesForRole(role: string): string[] {
    if (role === 'child') {
      return [
        'completions', 'assignments', 'play_sessions', 'violations',
        'time_bank', 'progress', 'achievements', 'avatar_items',
        'consent', 'tokens', 'notifications',
      ];
    }
    return ['tokens', 'notifications', 'consent', 'family_data'];
  }
}
