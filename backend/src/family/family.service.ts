import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import * as bcrypt from 'bcrypt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateFamilyDto, CreateChildDto, UpdateChildDto, UpdateFamilyDto, UpdateGuardianPermissionsDto } from './dto/family.dto';
import { FamilyCreatedEvent, ChildAddedEvent } from '../common/analytics/analytics.events';

export interface GuardianPermissions {
  canApproveQuests: boolean;
  canManageQuests: boolean;
  canManageChildren: boolean;
  canRecordViolations: boolean;
}

const DEFAULT_GUARDIAN_PERMISSIONS: GuardianPermissions = {
  canApproveQuests: true,
  canManageQuests: true,
  canManageChildren: true,
  canRecordViolations: false,
};

@Injectable()
export class FamilyService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createFamily(userId: string, dto: CreateFamilyDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.familyId) throw new ConflictException('User already belongs to a family');

    const familyCode = this.generateFamilyCode();

    const family = await this.prisma.family.create({
      data: {
        name: dto.name,
        familyCode,
        ownerId: userId,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { familyId: family.id, role: 'parent' },
    });

    // Emit family created analytics event
    this.eventEmitter.emit(
      'family.created',
      new FamilyCreatedEvent(userId, family.id),
    );

    return family;
  }

  async joinFamily(userId: string, familyCode: string) {
    const family = await this.prisma.family.findUnique({
      where: { familyCode: familyCode.toUpperCase() },
    });

    if (!family) throw new NotFoundException('Invalid family code');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.familyId) throw new ConflictException('User already belongs to a family');

    await this.prisma.user.update({
      where: { id: userId },
      data: { familyId: family.id, role: 'guardian' },
    });

    return family;
  }

  async getFamily(familyId: string) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
            age: true,
          },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!family) throw new NotFoundException('Family not found');

    return family;
  }

  async getMembers(familyId: string, requestingUserRole?: string) {
    const members = await this.prisma.user.findMany({
      where: { familyId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        age: true,
      },
    });

    // Hide emails from children
    if (requestingUserRole === 'child') {
      return members.map((m: any) => ({ ...m, email: undefined }));
    }

    return members;
  }

  async inviteMember(familyId: string, invitedByUserId: string, email: string) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) throw new NotFoundException('Family not found');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // If a pending invite already exists, refresh its expiration and resend
    const existingInvite = await this.prisma.familyInvite.findFirst({
      where: {
        familyId,
        inviteEmail: email.toLowerCase(),
        status: 'pending',
      },
    });

    let invite;
    if (existingInvite) {
      invite = await this.prisma.familyInvite.update({
        where: { id: existingInvite.id },
        data: { expiresAt, invitedByUserId },
      });
    } else {
      invite = await this.prisma.familyInvite.create({
        data: {
          familyId,
          invitedByUserId,
          inviteEmail: email.toLowerCase(),
          expiresAt,
        },
      });
    }

    // Send invite email
    const inviter = await this.prisma.user.findUnique({ where: { id: invitedByUserId } });
    await this.mail.sendFamilyInviteEmail(
      email,
      family.name,
      inviter?.name || 'A family member',
      family.familyCode,
    );

    return invite;
  }

  async createChild(familyId: string, parentId: string, dto: CreateChildDto, ipAddress?: string | null) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) throw new NotFoundException('Family not found');

    // Check max 6 children on free plan
    const childCount = await this.prisma.user.count({
      where: { familyId, role: 'child' },
    });

    if (childCount >= 6) {
      throw new BadRequestException('Maximum of 6 children per family');
    }

    // Hash the PIN before storing
    const hashedPin = dto.pin ? await bcrypt.hash(dto.pin, 10) : null;

    // Create child and parental consent in a single transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const child = await tx.user.create({
        data: {
          name: dto.name,
          age: dto.age ?? null,
          avatarUrl: dto.avatarUrl || null,
          email: dto.email?.toLowerCase() || null,
          pin: hashedPin,
          role: 'child',
          familyId,
          authProvider: 'email',
          emailVerified: true, // children don't need email verification
        },
      });

      // Record COPPA parental consent
      await tx.parentalConsent.create({
        data: {
          childId: child.id,
          parentId,
          consentText: dto.consentText,
          ipAddress: ipAddress || null,
        },
      });

      return child;
    });

    // Emit child added analytics event
    this.eventEmitter.emit(
      'child.added',
      new ChildAddedEvent(parentId, familyId, result.id),
    );

    return {
      id: result.id,
      name: result.name,
      age: result.age,
      avatarUrl: result.avatarUrl,
      familyId: result.familyId,
    };
  }

  async updateChild(familyId: string, childId: string, dto: UpdateChildDto) {
    const child = await this.prisma.user.findFirst({
      where: { id: childId, familyId, role: 'child' },
    });

    if (!child) throw new NotFoundException('Child not found');

    // Hash the PIN if it's being updated
    const updateData: any = {
      name: dto.name,
      age: dto.age,
      avatarUrl: dto.avatarUrl,
    };
    if (dto.pin) {
      updateData.pin = await bcrypt.hash(dto.pin, 10);
    }

    return this.prisma.user.update({
      where: { id: childId },
      data: updateData,
      select: {
        id: true,
        name: true,
        age: true,
        avatarUrl: true,
        familyId: true,
      },
    });
  }

  async removeChild(familyId: string, childId: string) {
    const child = await this.prisma.user.findFirst({
      where: { id: childId, familyId, role: 'child' },
    });

    if (!child) throw new NotFoundException('Child not found');

    await this.prisma.user.delete({ where: { id: childId } });

    return { message: 'Child removed' };
  }

  async updateMemberRole(familyId: string, userId: string, newRole: string, requestingUserId: string) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) throw new NotFoundException('Family not found');
    if (family.ownerId !== requestingUserId) {
      throw new ForbiddenException('Only the family owner can change roles');
    }

    if (!['guardian', 'parent'].includes(newRole)) {
      throw new BadRequestException('Invalid role');
    }

    const member = await this.prisma.user.findFirst({
      where: { id: userId, familyId, role: { in: ['parent', 'guardian'] } },
    });

    if (!member) throw new NotFoundException('Member not found');
    if (member.id === requestingUserId) {
      throw new BadRequestException('Cannot change your own role');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: { id: true, name: true, role: true },
    });
  }

  async removeMember(familyId: string, userId: string, requestingUserId: string) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) throw new NotFoundException('Family not found');
    if (family.ownerId !== requestingUserId) {
      throw new ForbiddenException('Only the family owner can remove members');
    }
    if (userId === requestingUserId) {
      throw new BadRequestException('Cannot remove yourself');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { familyId: null },
    });

    return { message: 'Member removed' };
  }

  async transferOwnership(familyId: string, newOwnerId: string, requestingUserId: string) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) throw new NotFoundException('Family not found');
    if (family.ownerId !== requestingUserId) {
      throw new ForbiddenException('Only the family owner can transfer ownership');
    }

    const newOwner = await this.prisma.user.findFirst({
      where: { id: newOwnerId, familyId, role: { in: ['parent', 'guardian'] } },
    });

    if (!newOwner) throw new NotFoundException('New owner must be a family member');

    await this.prisma.$transaction([
      this.prisma.family.update({
        where: { id: familyId },
        data: { ownerId: newOwnerId },
      }),
      this.prisma.user.update({
        where: { id: newOwnerId },
        data: { role: 'parent' },
      }),
    ]);

    return { message: 'Ownership transferred' };
  }

  async updateFamily(familyId: string, userId: string, dto: UpdateFamilyDto) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) throw new NotFoundException('Family not found');
    if (family.ownerId !== userId) {
      throw new ForbiddenException('Only the family owner can update family settings');
    }

    return this.prisma.family.update({
      where: { id: familyId },
      data: { name: dto.name },
    });
  }

  async getGuardianPermissions(familyId: string, guardianId: string) {
    const guardian = await this.prisma.user.findFirst({
      where: { id: guardianId, familyId, role: 'guardian' },
    });

    if (!guardian) throw new NotFoundException('Guardian not found');

    return (guardian.guardianPermissions as unknown as GuardianPermissions) || DEFAULT_GUARDIAN_PERMISSIONS;
  }

  async updateGuardianPermissions(
    familyId: string,
    guardianId: string,
    requestingUserId: string,
    dto: UpdateGuardianPermissionsDto,
  ) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) throw new NotFoundException('Family not found');
    if (family.ownerId !== requestingUserId) {
      throw new ForbiddenException('Only the family owner can update guardian permissions');
    }

    const guardian = await this.prisma.user.findFirst({
      where: { id: guardianId, familyId, role: 'guardian' },
    });

    if (!guardian) throw new NotFoundException('Guardian not found');

    const currentPerms = (guardian.guardianPermissions as unknown as GuardianPermissions) || DEFAULT_GUARDIAN_PERMISSIONS;
    const updatedPerms = { ...currentPerms, ...dto };

    return this.prisma.user.update({
      where: { id: guardianId },
      data: { guardianPermissions: updatedPerms as any },
      select: { id: true, name: true, role: true, guardianPermissions: true },
    });
  }

  private generateFamilyCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Letters only, no I or O to avoid confusion
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
