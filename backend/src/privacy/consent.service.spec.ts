import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConsentService } from './consent.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma, MockPrisma } from '../__mocks__/prisma.mock';

describe('ConsentService', () => {
  let service: ConsentService;
  let prisma: MockPrisma;

  const parentUser = {
    id: 'parent-1',
    role: 'parent',
    familyId: 'family-1',
  };

  const childUser = {
    id: 'child-1',
    role: 'child',
    familyId: 'family-1',
  };

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ConsentService>(ConsentService);
  });

  describe('createConsent', () => {
    it('creates a consent record', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(childUser)
        .mockResolvedValueOnce(parentUser);
      prisma.parentalConsent.findFirst.mockResolvedValue(null);
      prisma.parentalConsent.create.mockResolvedValue({
        id: 'consent-1',
        childId: 'child-1',
        parentId: 'parent-1',
        consentText: 'I consent',
        ipAddress: '1.2.3.4',
      });

      const result = await service.createConsent(
        'child-1',
        'parent-1',
        'I consent',
        '1.2.3.4',
      );

      expect(result.id).toBe('consent-1');
      expect(prisma.parentalConsent.create).toHaveBeenCalledWith({
        data: {
          childId: 'child-1',
          parentId: 'parent-1',
          consentText: 'I consent',
          ipAddress: '1.2.3.4',
        },
      });
    });

    it('throws NotFoundException if child not found', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.createConsent('child-1', 'parent-1', 'I consent', null),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if parent not in same family', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(childUser)
        .mockResolvedValueOnce({ ...parentUser, familyId: 'other-family' });

      await expect(
        service.createConsent('child-1', 'parent-1', 'I consent', null),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if consent already exists', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(childUser)
        .mockResolvedValueOnce(parentUser);
      prisma.parentalConsent.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createConsent('child-1', 'parent-1', 'I consent', null),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getConsentForChild', () => {
    it('returns the latest consent record', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(childUser)
        .mockResolvedValueOnce(parentUser);
      prisma.parentalConsent.findFirst.mockResolvedValue({
        id: 'consent-1',
        childId: 'child-1',
      });

      const result = await service.getConsentForChild('child-1', 'parent-1');
      expect(result!.id).toBe('consent-1');
    });
  });

  describe('hasValidConsent', () => {
    it('returns true when non-revoked consent exists', async () => {
      prisma.parentalConsent.findFirst.mockResolvedValue({ id: 'c1' });
      expect(await service.hasValidConsent('child-1')).toBe(true);
    });

    it('returns false when no consent exists', async () => {
      prisma.parentalConsent.findFirst.mockResolvedValue(null);
      expect(await service.hasValidConsent('child-1')).toBe(false);
    });
  });

  describe('revokeConsent', () => {
    it('revokes consent and schedules child deletion', async () => {
      prisma.parentalConsent.findFirst.mockResolvedValue({
        id: 'consent-1',
        childId: 'child-1',
        parentId: 'parent-1',
      });
      prisma.parentalConsent.update.mockResolvedValue({});
      prisma.refreshToken.deleteMany.mockResolvedValue({});
      prisma.accountDeletionRequest.create.mockResolvedValue({});

      const result = await service.revokeConsent('child-1', 'parent-1');

      expect(result.message).toContain('Consent revoked');
      expect(prisma.parentalConsent.update).toHaveBeenCalled();
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'child-1' },
      });
      expect(prisma.accountDeletionRequest.create).toHaveBeenCalled();
    });
  });
});
