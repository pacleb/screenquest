import { Test, TestingModule } from '@nestjs/testing';
import { PolicyService } from './policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma, MockPrisma } from '../__mocks__/prisma.mock';

describe('PolicyService', () => {
  let service: PolicyService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PolicyService>(PolicyService);
  });

  describe('acceptPolicy', () => {
    it('upserts a policy acceptance', async () => {
      const acceptance = {
        id: 'pa-1',
        userId: 'user-1',
        documentType: 'privacy_policy',
        documentVersion: '1.0',
      };
      prisma.policyAcceptance.upsert.mockResolvedValue(acceptance);

      const result = await service.acceptPolicy(
        'user-1',
        { documentType: 'privacy_policy', documentVersion: '1.0' },
        '1.2.3.4',
      );

      expect(result.id).toBe('pa-1');
      expect(prisma.policyAcceptance.upsert).toHaveBeenCalledWith({
        where: {
          userId_documentType_documentVersion: {
            userId: 'user-1',
            documentType: 'privacy_policy',
            documentVersion: '1.0',
          },
        },
        update: {},
        create: {
          userId: 'user-1',
          documentType: 'privacy_policy',
          documentVersion: '1.0',
          ipAddress: '1.2.3.4',
        },
      });
    });
  });

  describe('hasAcceptedLatest', () => {
    it('returns true when acceptance exists', async () => {
      prisma.policyAcceptance.findUnique.mockResolvedValue({ id: 'pa-1' });

      const result = await service.hasAcceptedLatest(
        'user-1',
        'privacy_policy',
        '1.0',
      );
      expect(result).toBe(true);
    });

    it('returns false when no acceptance', async () => {
      prisma.policyAcceptance.findUnique.mockResolvedValue(null);

      const result = await service.hasAcceptedLatest(
        'user-1',
        'privacy_policy',
        '2.0',
      );
      expect(result).toBe(false);
    });
  });

  describe('getUserAcceptances', () => {
    it('returns all acceptances for user', async () => {
      const acceptances = [
        { id: 'pa-1', documentType: 'privacy_policy' },
        { id: 'pa-2', documentType: 'terms_of_service' },
      ];
      prisma.policyAcceptance.findMany.mockResolvedValue(acceptances);

      const result = await service.getUserAcceptances('user-1');

      expect(result).toHaveLength(2);
      expect(prisma.policyAcceptance.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { acceptedAt: 'desc' },
      });
    });
  });
});
