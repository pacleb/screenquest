import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ViolationService } from './violation.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimeBankService } from '../time-bank/time-bank.service';
import { NotificationService } from '../notification/notification.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createMockPrisma, MockPrisma } from '../__mocks__/prisma.mock';
import { createMockNotification, MockNotification } from '../__mocks__/notification.mock';

describe('ViolationService', () => {
  let service: ViolationService;
  let prisma: MockPrisma;
  let timeBankService: { deductPenalty: jest.Mock; creditTime: jest.Mock };
  let notificationService: MockNotification;

  beforeEach(async () => {
    prisma = createMockPrisma();
    timeBankService = { deductPenalty: jest.fn(), creditTime: jest.fn() };
    notificationService = createMockNotification();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ViolationService,
        { provide: PrismaService, useValue: prisma },
        { provide: TimeBankService, useValue: timeBankService },
        { provide: NotificationService, useValue: notificationService },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<ViolationService>(ViolationService);
  });

  const setupParentChildAccess = () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'child-1', role: 'child', familyId: 'fam-1' })
      .mockResolvedValueOnce({ id: 'parent-1', role: 'parent', familyId: 'fam-1' });
  };

  describe('recordViolation', () => {
    it('1st violation = 120 min (2h) penalty', async () => {
      setupParentChildAccess();
      prisma.violationCounter.findUnique.mockResolvedValue({ childId: 'child-1', currentCount: 0 });
      prisma.violation.create.mockResolvedValue({ id: 'v-1', violationNumber: 1, penaltySeconds: 7200 });
      prisma.violationCounter.update.mockResolvedValue({});

      const result = await service.recordViolation('child-1', 'parent-1', {});
      expect(result.penaltySeconds).toBe(7200);
      expect(result.penaltyHours).toBe(2);
      expect(timeBankService.deductPenalty).toHaveBeenCalledWith('child-1', 7200);
    });

    it('2nd violation = 240 min (4h) penalty', async () => {
      setupParentChildAccess();
      prisma.violationCounter.findUnique.mockResolvedValue({ childId: 'child-1', currentCount: 1 });
      prisma.violation.create.mockResolvedValue({ id: 'v-2', violationNumber: 2, penaltySeconds: 14400 });
      prisma.violationCounter.update.mockResolvedValue({});

      const result = await service.recordViolation('child-1', 'parent-1', {});
      expect(result.penaltySeconds).toBe(14400);
      expect(result.penaltyHours).toBe(4);
    });

    it('3rd violation = 480 min (8h) penalty', async () => {
      setupParentChildAccess();
      prisma.violationCounter.findUnique.mockResolvedValue({ childId: 'child-1', currentCount: 2 });
      prisma.violation.create.mockResolvedValue({ id: 'v-3', violationNumber: 3, penaltySeconds: 28800 });
      prisma.violationCounter.update.mockResolvedValue({});

      const result = await service.recordViolation('child-1', 'parent-1', {});
      expect(result.penaltySeconds).toBe(28800);
      expect(result.penaltyHours).toBe(8);
    });

    it('4th violation = 960 min (16h) penalty', async () => {
      setupParentChildAccess();
      prisma.violationCounter.findUnique.mockResolvedValue({ childId: 'child-1', currentCount: 3 });
      prisma.violation.create.mockResolvedValue({ id: 'v-4', violationNumber: 4, penaltySeconds: 57600 });
      prisma.violationCounter.update.mockResolvedValue({});

      const result = await service.recordViolation('child-1', 'parent-1', {});
      expect(result.penaltySeconds).toBe(57600);
      expect(result.penaltyHours).toBe(16);
    });

    it('increments violation counter', async () => {
      setupParentChildAccess();
      prisma.violationCounter.findUnique.mockResolvedValue({ childId: 'child-1', currentCount: 0 });
      prisma.violation.create.mockResolvedValue({ id: 'v-1', violationNumber: 1, penaltySeconds: 7200 });
      prisma.violationCounter.update.mockResolvedValue({});

      await service.recordViolation('child-1', 'parent-1', {});

      expect(prisma.violationCounter.update).toHaveBeenCalledWith({
        where: { childId: 'child-1' },
        data: { currentCount: 1, updatedAt: expect.any(Date) },
      });
    });

    it('sends notification to child', async () => {
      setupParentChildAccess();
      prisma.violationCounter.findUnique.mockResolvedValue({ childId: 'child-1', currentCount: 0 });
      prisma.violation.create.mockResolvedValue({ id: 'v-1', violationNumber: 1, penaltySeconds: 7200 });
      prisma.violationCounter.update.mockResolvedValue({});

      await service.recordViolation('child-1', 'parent-1', {});

      expect(notificationService.sendToUser).toHaveBeenCalledWith(
        'child-1',
        expect.objectContaining({ title: 'Violation Recorded' }),
        'violations',
      );
    });
  });

  describe('forgiveViolation', () => {
    it('refunds penalty minutes as stackable time', async () => {
      prisma.violation.findUnique.mockResolvedValue({
        id: 'v-1',
        childId: 'child-1',
        penaltySeconds: 7200,
        forgiven: false,
      });
      setupParentChildAccess();
      prisma.violation.update.mockResolvedValue({ id: 'v-1', forgiven: true });
      prisma.violationCounter.findUnique.mockResolvedValue({ childId: 'child-1', currentCount: 1 });
      prisma.violationCounter.update.mockResolvedValue({});

      await service.forgiveViolation('v-1', 'parent-1');

      expect(timeBankService.creditTime).toHaveBeenCalledWith('child-1', 7200, 'stackable', null);
    });

    it('decrements counter (minimum 0)', async () => {
      prisma.violation.findUnique.mockResolvedValue({
        id: 'v-1',
        childId: 'child-1',
        penaltySeconds: 7200,
        forgiven: false,
      });
      setupParentChildAccess();
      prisma.violation.update.mockResolvedValue({ id: 'v-1', forgiven: true });
      prisma.violationCounter.findUnique.mockResolvedValue({ childId: 'child-1', currentCount: 1 });
      prisma.violationCounter.update.mockResolvedValue({});

      await service.forgiveViolation('v-1', 'parent-1');

      expect(prisma.violationCounter.update).toHaveBeenCalledWith({
        where: { childId: 'child-1' },
        data: { currentCount: 0, updatedAt: expect.any(Date) },
      });
    });

    it('throws BadRequestException if already forgiven', async () => {
      prisma.violation.findUnique.mockResolvedValue({
        id: 'v-1',
        childId: 'child-1',
        penaltySeconds: 7200,
        forgiven: true,
      });
      setupParentChildAccess();

      await expect(service.forgiveViolation('v-1', 'parent-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException if violation does not exist', async () => {
      prisma.violation.findUnique.mockResolvedValue(null);

      await expect(service.forgiveViolation('v-999', 'parent-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('resetCounter', () => {
    it('resets counter to 0', async () => {
      setupParentChildAccess();

      await service.resetCounter('child-1', 'parent-1');

      expect(prisma.violationCounter.upsert).toHaveBeenCalledWith({
        where: { childId: 'child-1' },
        create: expect.objectContaining({ childId: 'child-1', currentCount: 0 }),
        update: expect.objectContaining({ currentCount: 0 }),
      });
    });
  });

  describe('getViolationStatus', () => {
    it('returns correct next penalty calculation', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'child-1',
        role: 'child',
        familyId: 'fam-1',
      });
      prisma.violationCounter.findUnique.mockResolvedValue({
        childId: 'child-1',
        currentCount: 2,
        lastResetAt: null,
      });

      const status = await service.getViolationStatus('child-1', 'child-1');

      expect(status.currentCount).toBe(2);
      // Next violation would be #3: 2 * 2^2 = 8 hours
      expect(status.nextPenaltyHours).toBe(8);
      expect(status.nextPenaltySeconds).toBe(28800);
    });
  });
});
