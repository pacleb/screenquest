import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListFamiliesQueryDto, ListUsersQueryDto } from './dto/family-admin.dto';

@Injectable()
export class FamilyAdminService {
  constructor(private prisma: PrismaService) {}

  // ─── Families ─────────────────────────────────────────────

  async listFamilies(query: ListFamiliesQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { familyCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.plan) {
      where.plan = query.plan;
    }

    if (query.subscriptionStatus === 'active') {
      where.subscriptionStatus = 'active';
    } else if (query.subscriptionStatus === 'expired') {
      where.subscriptionStatus = 'expired';
    } else if (query.subscriptionStatus === 'none') {
      where.subscriptionStatus = null;
    }

    const [items, total] = await Promise.all([
      this.prisma.family.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.family.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getFamilyById(id: string) {
    const family = await this.prisma.family.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            age: true,
            avatarUrl: true,
            authProvider: true,
            emailVerified: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!family) throw new NotFoundException('Family not found');
    return family;
  }

  async getFamilyStats() {
    const [totalFamilies, premiumFamilies, freeFamilies, totalGuardians, totalChildren] =
      await Promise.all([
        this.prisma.family.count(),
        this.prisma.family.count({ where: { subscriptionStatus: 'active' } }),
        this.prisma.family.count({ where: { subscriptionStatus: null } }),
        this.prisma.user.count({ where: { role: 'guardian' } }),
        this.prisma.user.count({ where: { role: 'child' } }),
      ]);

    return {
      totalFamilies,
      premiumFamilies,
      freeFamilies,
      totalGuardians,
      totalChildren,
    };
  }

  // ─── Users ────────────────────────────────────────────────

  async listUsers(query: ListUsersQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.authProvider) {
      where.authProvider = query.authProvider;
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          age: true,
          avatarUrl: true,
          authProvider: true,
          emailVerified: true,
          isAppAdmin: true,
          createdAt: true,
          family: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        age: true,
        avatarUrl: true,
        authProvider: true,
        emailVerified: true,
        isAppAdmin: true,
        createdAt: true,
        family: { select: { id: true, name: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
