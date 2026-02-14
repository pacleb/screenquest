import { Test, TestingModule } from '@nestjs/testing';
import { DeletionScheduler } from './deletion.scheduler';
import { DeletionService } from './deletion.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma, MockPrisma } from '../__mocks__/prisma.mock';

describe('DeletionScheduler', () => {
  let scheduler: DeletionScheduler;
  let prisma: MockPrisma;
  let deletionService: { purgeUser: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    deletionService = { purgeUser: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeletionScheduler,
        { provide: PrismaService, useValue: prisma },
        { provide: DeletionService, useValue: deletionService },
      ],
    }).compile();

    scheduler = module.get<DeletionScheduler>(DeletionScheduler);
  });

  it('does nothing when no expired requests', async () => {
    prisma.accountDeletionRequest.findMany.mockResolvedValue([]);

    await scheduler.handleExpiredGracePeriods();

    expect(deletionService.purgeUser).not.toHaveBeenCalled();
  });

  it('purges each expired request', async () => {
    prisma.accountDeletionRequest.findMany.mockResolvedValue([
      { id: 'del-1' },
      { id: 'del-2' },
    ]);

    await scheduler.handleExpiredGracePeriods();

    expect(deletionService.purgeUser).toHaveBeenCalledTimes(2);
    expect(deletionService.purgeUser).toHaveBeenCalledWith('del-1');
    expect(deletionService.purgeUser).toHaveBeenCalledWith('del-2');
  });

  it('continues processing if one purge fails', async () => {
    prisma.accountDeletionRequest.findMany.mockResolvedValue([
      { id: 'del-1' },
      { id: 'del-2' },
    ]);
    deletionService.purgeUser
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce(undefined);

    await scheduler.handleExpiredGracePeriods();

    expect(deletionService.purgeUser).toHaveBeenCalledTimes(2);
    expect(deletionService.purgeUser).toHaveBeenCalledWith('del-2');
  });

  it('queries for correct filter criteria', async () => {
    prisma.accountDeletionRequest.findMany.mockResolvedValue([]);

    await scheduler.handleExpiredGracePeriods();

    expect(prisma.accountDeletionRequest.findMany).toHaveBeenCalledWith({
      where: {
        gracePeriodEndsAt: { lte: expect.any(Date) },
        purgedAt: null,
        cancelledAt: null,
      },
    });
  });
});
