import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { QuestService } from './quest.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createMockPrisma, MockPrisma } from '../__mocks__/prisma.mock';

describe('QuestService', () => {
  let service: QuestService;
  let prisma: MockPrisma;
  let subscriptionService: { isPremium: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    subscriptionService = { isPremium: jest.fn().mockResolvedValue(false) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionService, useValue: subscriptionService },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<QuestService>(QuestService);
  });

  const setupParentAccess = () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'parent-1',
      role: 'parent',
      familyId: 'fam-1',
    });
  };

  describe('create', () => {
    it('creates quest with assignments', async () => {
      setupParentAccess();
      subscriptionService.isPremium.mockResolvedValue(true);
      prisma.user.findMany.mockResolvedValue([
        { id: 'child-1', familyId: 'fam-1', role: 'child' },
      ]);
      prisma.quest.create.mockResolvedValue({
        id: 'quest-1',
        name: 'Clean room',
        category: 'chores',
        rewardMinutes: 30,
      });

      const result = await service.create('fam-1', 'parent-1', {
        name: 'Clean room',
        category: 'chores',
        rewardMinutes: 30,
        stackingType: 'stackable',
        assignedChildIds: ['child-1'],
      });

      expect(result.id).toBe('quest-1');
      expect(prisma.quest.create).toHaveBeenCalled();
    });

    it('throws 402 when free plan exceeds 3 quests', async () => {
      setupParentAccess();
      subscriptionService.isPremium.mockResolvedValue(false);
      prisma.quest.count.mockResolvedValue(3);

      await expect(
        service.create('fam-1', 'parent-1', {
          name: 'New Quest',
          category: 'learning',
          rewardMinutes: 15,
          stackingType: 'stackable',
          assignedChildIds: ['child-1'],
        }),
      ).rejects.toThrow(HttpException);

      try {
        await service.create('fam-1', 'parent-1', {
          name: 'New Quest',
          category: 'learning',
          rewardMinutes: 15,
          stackingType: 'stackable',
          assignedChildIds: ['child-1'],
        });
      } catch (e) {
        expect((e as HttpException).getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
      }
    });

    it('bypasses quest limit for premium families', async () => {
      setupParentAccess();
      subscriptionService.isPremium.mockResolvedValue(true);
      prisma.user.findMany.mockResolvedValue([
        { id: 'child-1', familyId: 'fam-1', role: 'child' },
      ]);
      prisma.quest.create.mockResolvedValue({ id: 'quest-10', name: 'Extra Quest' });

      // Should not throw even with many quests
      const result = await service.create('fam-1', 'parent-1', {
        name: 'Extra Quest',
        category: 'chores',
        rewardMinutes: 15,
        stackingType: 'stackable',
        assignedChildIds: ['child-1'],
      });

      expect(result.id).toBe('quest-10');
      expect(prisma.quest.count).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException for non-parent', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'child-1',
        role: 'child',
        familyId: 'fam-1',
      });

      await expect(
        service.create('fam-1', 'child-1', {
          name: 'Quest',
          category: 'chores',
          rewardMinutes: 10,
          stackingType: 'stackable',
          assignedChildIds: ['child-1'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('archive', () => {
    it('archives an active quest', async () => {
      setupParentAccess();
      prisma.quest.findFirst.mockResolvedValue({
        id: 'quest-1',
        familyId: 'fam-1',
        isArchived: false,
      });
      prisma.quest.update.mockResolvedValue({ id: 'quest-1', isArchived: true });

      const result = await service.archive('fam-1', 'quest-1', 'parent-1');

      expect(prisma.quest.update).toHaveBeenCalledWith({
        where: { id: 'quest-1' },
        data: { isArchived: true },
      });
      expect(result.isArchived).toBe(true);
    });

    it('throws NotFoundException for missing quest', async () => {
      setupParentAccess();
      prisma.quest.findFirst.mockResolvedValue(null);

      await expect(
        service.archive('fam-1', 'quest-999', 'parent-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unarchive', () => {
    it('enforces quest limit on unarchive', async () => {
      setupParentAccess();
      subscriptionService.isPremium.mockResolvedValue(false);
      prisma.quest.count.mockResolvedValue(3);

      await expect(
        service.unarchive('fam-1', 'quest-1', 'parent-1'),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('remove', () => {
    it('deletes a quest', async () => {
      setupParentAccess();
      prisma.quest.findFirst.mockResolvedValue({
        id: 'quest-1',
        familyId: 'fam-1',
      });
      prisma.quest.delete.mockResolvedValue({});

      const result = await service.remove('fam-1', 'quest-1', 'parent-1');

      expect(result.message).toBe('Quest deleted');
      expect(prisma.quest.delete).toHaveBeenCalledWith({ where: { id: 'quest-1' } });
    });
  });
});
