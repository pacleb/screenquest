import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TimeBankService } from './time-bank.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma, MockPrisma } from '../__mocks__/prisma.mock';

describe('TimeBankService', () => {
  let service: TimeBankService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeBankService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TimeBankService>(TimeBankService);
  });

  describe('ensureTimeBank', () => {
    it('returns existing time bank record', async () => {
      const existing = { childId: 'child-1', stackableBalanceMinutes: 100, nonStackableBalanceMinutes: 30 };
      prisma.timeBank.findUnique.mockResolvedValue(existing);

      const result = await service.ensureTimeBank('child-1');
      expect(result).toEqual(existing);
      expect(prisma.timeBank.create).not.toHaveBeenCalled();
    });

    it('creates a new time bank if missing', async () => {
      prisma.timeBank.findUnique.mockResolvedValue(null);
      const created = { childId: 'child-1', stackableBalanceMinutes: 0, nonStackableBalanceMinutes: 0 };
      prisma.timeBank.create.mockResolvedValue(created);

      const result = await service.ensureTimeBank('child-1');
      expect(result).toEqual(created);
      expect(prisma.timeBank.create).toHaveBeenCalledWith({ data: { childId: 'child-1' } });
    });
  });

  describe('getBalance', () => {
    it('returns correct balance', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'child-1', role: 'child', familyId: 'fam-1' }) // child
        .mockResolvedValueOnce({ id: 'child-1', role: 'child', familyId: 'fam-1' }); // requester (self)
      prisma.timeBank.findUnique.mockResolvedValue({
        childId: 'child-1',
        stackableBalanceMinutes: 60,
        nonStackableBalanceMinutes: 0,
      });
      prisma.questCompletion.aggregate.mockResolvedValue({
        _sum: { earnedMinutes: 30 },
      });

      const balance = await service.getBalance('child-1', 'child-1');
      expect(balance.stackableMinutes).toBe(60);
      expect(balance.nonStackableMinutes).toBe(30);
      expect(balance.totalMinutes).toBe(90);
    });

    it('throws NotFoundException for non-child users', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'parent-1', role: 'parent', familyId: 'fam-1' });

      await expect(service.getBalance('parent-1', 'parent-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException for unrelated requester', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'child-1', role: 'child', familyId: 'fam-1' })
        .mockResolvedValueOnce({ id: 'other-1', role: 'parent', familyId: 'fam-2' });

      await expect(service.getBalance('child-1', 'other-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows family members to view balance', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'child-1', role: 'child', familyId: 'fam-1' })
        .mockResolvedValueOnce({ id: 'parent-1', role: 'parent', familyId: 'fam-1' });
      prisma.timeBank.findUnique.mockResolvedValue({
        childId: 'child-1',
        stackableBalanceMinutes: 50,
        nonStackableBalanceMinutes: 0,
      });
      prisma.questCompletion.aggregate.mockResolvedValue({
        _sum: { earnedMinutes: 0 },
      });

      const balance = await service.getBalance('child-1', 'parent-1');
      expect(balance.stackableMinutes).toBe(50);
    });
  });

  describe('creditTime', () => {
    it('increments stackable balance', async () => {
      prisma.timeBank.findUnique.mockResolvedValue({
        childId: 'child-1',
        stackableBalanceMinutes: 30,
        nonStackableBalanceMinutes: 0,
      });
      prisma.timeBank.update.mockResolvedValue({});

      await service.creditTime('child-1', 15, 'stackable', null);

      expect(prisma.timeBank.update).toHaveBeenCalledWith({
        where: { childId: 'child-1' },
        data: {
          stackableBalanceMinutes: 45,
          lastUpdated: expect.any(Date),
        },
      });
    });

    it('recalculates non-stackable from active completions', async () => {
      prisma.timeBank.findUnique.mockResolvedValue({
        childId: 'child-1',
        stackableBalanceMinutes: 0,
        nonStackableBalanceMinutes: 0,
      });
      prisma.questCompletion.aggregate.mockResolvedValue({
        _sum: { earnedMinutes: 20 },
      });
      prisma.timeBank.update.mockResolvedValue({});

      await service.creditTime('child-1', 20, 'non_stackable', new Date());

      expect(prisma.timeBank.update).toHaveBeenCalledWith({
        where: { childId: 'child-1' },
        data: {
          nonStackableBalanceMinutes: 20,
          lastUpdated: expect.any(Date),
        },
      });
    });
  });

  describe('deductTime', () => {
    beforeEach(() => {
      // Mock getBalance chain
      prisma.user.findUnique.mockResolvedValue({
        id: 'child-1',
        role: 'child',
        familyId: 'fam-1',
      });
    });

    it('deducts non-stackable first, then stackable', async () => {
      prisma.timeBank.findUnique.mockResolvedValue({
        childId: 'child-1',
        stackableBalanceMinutes: 60,
        nonStackableBalanceMinutes: 0,
      });
      prisma.questCompletion.aggregate.mockResolvedValue({
        _sum: { earnedMinutes: 20 },
      });
      prisma.timeBank.update.mockResolvedValue({});

      const result = await service.deductTime('child-1', 30);

      // Should deduct 20 from non-stackable (all of it), then 10 from stackable
      expect(prisma.timeBank.update).toHaveBeenLastCalledWith({
        where: { childId: 'child-1' },
        data: {
          nonStackableBalanceMinutes: 0,
          stackableBalanceMinutes: 50,
          lastUpdated: expect.any(Date),
        },
      });
      expect(result.totalMinutes).toBe(50);
    });

    it('throws ForbiddenException for insufficient balance', async () => {
      prisma.timeBank.findUnique.mockResolvedValue({
        childId: 'child-1',
        stackableBalanceMinutes: 10,
        nonStackableBalanceMinutes: 0,
      });
      prisma.questCompletion.aggregate.mockResolvedValue({
        _sum: { earnedMinutes: 5 },
      });

      await expect(service.deductTime('child-1', 20)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('handles exact balance deduction', async () => {
      prisma.timeBank.findUnique.mockResolvedValue({
        childId: 'child-1',
        stackableBalanceMinutes: 30,
        nonStackableBalanceMinutes: 0,
      });
      prisma.questCompletion.aggregate.mockResolvedValue({
        _sum: { earnedMinutes: 0 },
      });
      prisma.timeBank.update.mockResolvedValue({});

      const result = await service.deductTime('child-1', 30);
      expect(result.totalMinutes).toBe(0);
    });
  });

  describe('deductPenalty', () => {
    it('deducts non-stackable first, then stackable', async () => {
      prisma.timeBank.findUnique.mockResolvedValue({
        childId: 'child-1',
        stackableBalanceMinutes: 100,
        nonStackableBalanceMinutes: 0,
      });
      prisma.questCompletion.aggregate.mockResolvedValue({
        _sum: { earnedMinutes: 30 },
      });
      prisma.timeBank.update.mockResolvedValue({});

      const result = await service.deductPenalty('child-1', 50);

      // 30 from non-stackable, 20 from stackable
      expect(result.nonStackableMinutes).toBe(0);
      expect(result.stackableMinutes).toBe(80);
    });

    it('allows stackable balance to go negative', async () => {
      prisma.timeBank.findUnique.mockResolvedValue({
        childId: 'child-1',
        stackableBalanceMinutes: 30,
        nonStackableBalanceMinutes: 0,
      });
      prisma.questCompletion.aggregate.mockResolvedValue({
        _sum: { earnedMinutes: 0 },
      });
      prisma.timeBank.update.mockResolvedValue({});

      const result = await service.deductPenalty('child-1', 120);

      expect(result.stackableMinutes).toBe(-90);
      expect(result.totalMinutes).toBe(-90);
    });
  });
});
