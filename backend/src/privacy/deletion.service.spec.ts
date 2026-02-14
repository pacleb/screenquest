import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DeletionService } from './deletion.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { createMockPrisma, MockPrisma } from '../__mocks__/prisma.mock';

describe('DeletionService', () => {
  let service: DeletionService;
  let prisma: MockPrisma;
  let mailService: {
    sendDeletionRequestedEmail: jest.Mock;
    sendAccountDeletedEmail: jest.Mock;
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'parent',
    familyId: 'family-1',
  };

  beforeEach(async () => {
    prisma = createMockPrisma();
    mailService = {
      sendDeletionRequestedEmail: jest.fn().mockResolvedValue(undefined),
      sendAccountDeletedEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeletionService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<DeletionService>(DeletionService);
  });

  describe('requestDeletion', () => {
    it('creates a deletion request with 30-day grace period', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.accountDeletionRequest.findFirst.mockResolvedValue(null);
      prisma.accountDeletionRequest.create.mockResolvedValue({
        id: 'del-1',
        gracePeriodEndsAt: new Date('2026-03-16'),
      });
      prisma.refreshToken.deleteMany.mockResolvedValue({});

      const result = await service.requestDeletion('user-1', {});

      expect(result.id).toBe('del-1');
      expect(result.message).toContain('permanently deleted');
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(mailService.sendDeletionRequestedEmail).toHaveBeenCalled();
    });

    it('throws NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.requestDeletion('missing', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if request already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.accountDeletionRequest.findFirst.mockResolvedValue({
        id: 'existing',
      });

      await expect(
        service.requestDeletion('user-1', {}),
      ).rejects.toThrow(ConflictException);
    });

    it('stores optional reason', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.accountDeletionRequest.findFirst.mockResolvedValue(null);
      prisma.accountDeletionRequest.create.mockResolvedValue({
        id: 'del-1',
        gracePeriodEndsAt: new Date('2026-03-16'),
      });
      prisma.refreshToken.deleteMany.mockResolvedValue({});

      await service.requestDeletion('user-1', { reason: 'No longer needed' });

      expect(prisma.accountDeletionRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reason: 'No longer needed' }),
        }),
      );
    });
  });

  describe('cancelDeletion', () => {
    it('cancels an active deletion request', async () => {
      prisma.accountDeletionRequest.findFirst.mockResolvedValue({
        id: 'del-1',
      });
      prisma.accountDeletionRequest.update.mockResolvedValue({});

      const result = await service.cancelDeletion('user-1');

      expect(result.message).toContain('cancelled');
      expect(prisma.accountDeletionRequest.update).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        data: { cancelledAt: expect.any(Date) },
      });
    });

    it('throws NotFoundException if no active request', async () => {
      prisma.accountDeletionRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelDeletion('user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDeletionStatus', () => {
    it('returns active deletion request', async () => {
      const req = { id: 'del-1', gracePeriodEndsAt: new Date() };
      prisma.accountDeletionRequest.findFirst.mockResolvedValue(req);

      const result = await service.getDeletionStatus('user-1');
      expect(result).toEqual(req);
    });

    it('returns null when no active request', async () => {
      prisma.accountDeletionRequest.findFirst.mockResolvedValue(null);

      const result = await service.getDeletionStatus('user-1');
      expect(result).toBeNull();
    });
  });

  describe('purgeUser', () => {
    it('skips if request already purged', async () => {
      prisma.accountDeletionRequest.findUnique.mockResolvedValue({
        id: 'del-1',
        purgedAt: new Date(),
      });

      await service.purgeUser('del-1');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('skips if request already cancelled', async () => {
      prisma.accountDeletionRequest.findUnique.mockResolvedValue({
        id: 'del-1',
        cancelledAt: new Date(),
        purgedAt: null,
      });

      await service.purgeUser('del-1');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('purges child data in transaction', async () => {
      const txMock = createMockPrisma();
      prisma.accountDeletionRequest.findUnique.mockResolvedValue({
        id: 'del-1',
        userId: 'child-1',
        purgedAt: null,
        cancelledAt: null,
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'child-1',
        role: 'child',
        email: null,
      });
      prisma.$transaction.mockImplementation((fn: any) => fn(txMock));

      // Mock all the child data deletions
      txMock.questCompletion.deleteMany.mockResolvedValue({});
      txMock.questAssignment.deleteMany.mockResolvedValue({});
      txMock.playSession.deleteMany.mockResolvedValue({});
      txMock.violation.deleteMany.mockResolvedValue({});
      txMock.violationCounter.deleteMany.mockResolvedValue({});
      txMock.timeBank.deleteMany.mockResolvedValue({});
      txMock.childProgress.deleteMany.mockResolvedValue({});
      txMock.childAchievement.deleteMany.mockResolvedValue({});
      txMock.childEquippedItem.deleteMany.mockResolvedValue({});
      txMock.parentalConsent.deleteMany.mockResolvedValue({});
      txMock.refreshToken.deleteMany.mockResolvedValue({});
      txMock.pushToken.deleteMany.mockResolvedValue({});
      txMock.avatarPackPurchase.deleteMany.mockResolvedValue({});
      txMock.notificationPreference.deleteMany.mockResolvedValue({});
      txMock.policyAcceptance.deleteMany.mockResolvedValue({});
      txMock.user.delete.mockResolvedValue({});
      txMock.deletionAuditLog.create.mockResolvedValue({});
      txMock.accountDeletionRequest.update.mockResolvedValue({});

      await service.purgeUser('del-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(txMock.questCompletion.deleteMany).toHaveBeenCalledWith({
        where: { childId: 'child-1' },
      });
      expect(txMock.user.delete).toHaveBeenCalledWith({
        where: { id: 'child-1' },
      });
      expect(txMock.deletionAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userRole: 'child',
          }),
        }),
      );
    });
  });
});
