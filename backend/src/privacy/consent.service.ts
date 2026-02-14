import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConsentService {
  constructor(private prisma: PrismaService) {}

  async createConsent(
    childId: string,
    parentId: string,
    consentText: string,
    ipAddress: string | null,
  ) {
    // Verify child exists and belongs to same family
    const child = await this.prisma.user.findUnique({ where: { id: childId } });
    if (!child || child.role !== 'child') {
      throw new NotFoundException('Child not found');
    }

    const parent = await this.prisma.user.findUnique({ where: { id: parentId } });
    if (!parent || !['parent', 'guardian'].includes(parent.role)) {
      throw new ForbiddenException('Access denied');
    }
    if (parent.familyId !== child.familyId) {
      throw new ForbiddenException('Not in the same family');
    }

    // Check if consent already exists
    const existing = await this.prisma.parentalConsent.findFirst({
      where: { childId, revokedAt: null },
    });
    if (existing) {
      throw new BadRequestException('Valid consent already exists for this child');
    }

    return this.prisma.parentalConsent.create({
      data: {
        childId,
        parentId,
        consentText,
        ipAddress,
      },
    });
  }

  async getConsentForChild(childId: string, parentId: string) {
    const child = await this.prisma.user.findUnique({ where: { id: childId } });
    if (!child) throw new NotFoundException('Child not found');

    const parent = await this.prisma.user.findUnique({ where: { id: parentId } });
    if (!parent || parent.familyId !== child.familyId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.parentalConsent.findFirst({
      where: { childId },
      orderBy: { consentedAt: 'desc' },
    });
  }

  async hasValidConsent(childId: string): Promise<boolean> {
    const consent = await this.prisma.parentalConsent.findFirst({
      where: { childId, revokedAt: null },
    });
    return !!consent;
  }

  async revokeConsent(childId: string, parentId: string) {
    const consent = await this.prisma.parentalConsent.findFirst({
      where: { childId, parentId, revokedAt: null },
    });

    if (!consent) {
      throw new NotFoundException('No active consent found');
    }

    // Revoke consent
    await this.prisma.parentalConsent.update({
      where: { id: consent.id },
      data: { revokedAt: new Date() },
    });

    // Revoke all child tokens
    await this.prisma.refreshToken.deleteMany({
      where: { userId: childId },
    });

    // Create deletion request for the child (30-day grace)
    const gracePeriodEndsAt = new Date();
    gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + 30);

    await this.prisma.accountDeletionRequest.create({
      data: {
        userId: childId,
        gracePeriodEndsAt,
        reason: 'Parental consent revoked',
      },
    });

    return { message: 'Consent revoked. Child account scheduled for deletion in 30 days.' };
  }
}
