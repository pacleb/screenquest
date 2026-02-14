import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptPolicyDto } from './dto/privacy.dto';

@Injectable()
export class PolicyService {
  constructor(private prisma: PrismaService) {}

  async acceptPolicy(
    userId: string,
    dto: AcceptPolicyDto,
    ipAddress: string | null,
  ) {
    return this.prisma.policyAcceptance.upsert({
      where: {
        userId_documentType_documentVersion: {
          userId,
          documentType: dto.documentType,
          documentVersion: dto.documentVersion,
        },
      },
      update: {},
      create: {
        userId,
        documentType: dto.documentType,
        documentVersion: dto.documentVersion,
        ipAddress,
      },
    });
  }

  async hasAcceptedLatest(
    userId: string,
    documentType: string,
    currentVersion: string,
  ): Promise<boolean> {
    const acceptance = await this.prisma.policyAcceptance.findUnique({
      where: {
        userId_documentType_documentVersion: {
          userId,
          documentType,
          documentVersion: currentVersion,
        },
      },
    });
    return !!acceptance;
  }

  async getUserAcceptances(userId: string) {
    return this.prisma.policyAcceptance.findMany({
      where: { userId },
      orderBy: { acceptedAt: 'desc' },
    });
  }
}
