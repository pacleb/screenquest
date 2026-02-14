import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ExportService } from './export.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { RedisService } from '../redis/redis.service';
import { createMockPrisma } from '../__mocks__/prisma.mock';
import { createMockRedis } from '../__mocks__/redis.mock';
import { ExportRange } from './dto/export.dto';

describe('ExportService', () => {
  let service: ExportService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let redis: ReturnType<typeof createMockRedis>;
  let subscriptionService: { isPremium: jest.Mock };

  const familyId = 'family-1';

  beforeEach(async () => {
    prisma = createMockPrisma();
    redis = createMockRedis();
    subscriptionService = { isPremium: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionService, useValue: subscriptionService },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
  });

  it('should generate valid CSV with correct headers', async () => {
    subscriptionService.isPremium.mockResolvedValue(true);
    redis.get.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([
      { id: 'child-1', name: 'Alice' },
    ]);
    prisma.questCompletion.findMany.mockResolvedValue([
      {
        childId: 'child-1',
        completedAt: new Date('2026-02-10'),
        earnedMinutes: 30,
        quest: { name: 'Clean Room' },
      },
    ]);
    prisma.playSession.findMany.mockResolvedValue([
      {
        childId: 'child-1',
        endedAt: new Date('2026-02-11'),
        createdAt: new Date('2026-02-11'),
        requestedMinutes: 15,
      },
    ]);

    const result = await service.exportCSV(familyId, ExportRange.THIRTY_DAYS);

    expect(result.csv).toContain('Date');
    expect(result.csv).toContain('Child Name');
    expect(result.csv).toContain('Minutes Earned');
    expect(result.csv).toContain('Minutes Used');
    expect(result.csv).toContain('Alice');
    expect(result.csv).toContain('Clean Room');
    expect(result.csv).toContain('30');
    expect(result.csv).toContain('15');
    expect(result.filename).toMatch(/screenquest-export-.*\.csv/);
  });

  it('should filter by 30d range', async () => {
    subscriptionService.isPremium.mockResolvedValue(true);
    redis.get.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([{ id: 'child-1', name: 'Bob' }]);
    prisma.questCompletion.findMany.mockResolvedValue([]);
    prisma.playSession.findMany.mockResolvedValue([]);

    await service.exportCSV(familyId, ExportRange.THIRTY_DAYS);

    const completionCall = prisma.questCompletion.findMany.mock.calls[0][0];
    expect(completionCall.where.completedAt).toBeDefined();
    expect(completionCall.where.completedAt.gte).toBeInstanceOf(Date);

    // Verify the date is roughly 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const filterDate = completionCall.where.completedAt.gte;
    expect(Math.abs(filterDate.getTime() - thirtyDaysAgo.getTime())).toBeLessThan(5000);
  });

  it('should return headers-only CSV when no data', async () => {
    subscriptionService.isPremium.mockResolvedValue(true);
    redis.get.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([]);

    const result = await service.exportCSV(familyId, ExportRange.ALL);

    expect(result.csv).toContain('Date');
    expect(result.csv).toContain('Child Name');
    // Should only have the header line
    const lines = result.csv.trim().split('\n');
    expect(lines.length).toBe(1);
  });

  it('should throw 402 for free-tier families', async () => {
    subscriptionService.isPremium.mockResolvedValue(false);

    try {
      await service.exportCSV(familyId, ExportRange.THIRTY_DAYS);
      fail('Should have thrown');
    } catch (e: any) {
      expect(e).toBeInstanceOf(HttpException);
      expect(e.getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
    }
  });

  it('should throw 429 on second request within 1 hour', async () => {
    subscriptionService.isPremium.mockResolvedValue(true);
    redis.get.mockResolvedValue('1'); // rate limit key exists

    try {
      await service.exportCSV(familyId, ExportRange.THIRTY_DAYS);
      fail('Should have thrown');
    } catch (e: any) {
      expect(e).toBeInstanceOf(HttpException);
      expect(e.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('should only include data from the requesting family', async () => {
    subscriptionService.isPremium.mockResolvedValue(true);
    redis.get.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([
      { id: 'child-1', name: 'Alice' },
    ]);
    prisma.questCompletion.findMany.mockResolvedValue([]);
    prisma.playSession.findMany.mockResolvedValue([]);

    await service.exportCSV(familyId, ExportRange.ALL);

    // Verify children query is scoped to family
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ familyId, role: 'child' }),
      }),
    );

    // Verify completions are scoped to family children only
    expect(prisma.questCompletion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          childId: { in: ['child-1'] },
        }),
      }),
    );
  });

  it('should include both quest completions and play sessions', async () => {
    subscriptionService.isPremium.mockResolvedValue(true);
    redis.get.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([
      { id: 'child-1', name: 'Alice' },
    ]);
    prisma.questCompletion.findMany.mockResolvedValue([
      {
        childId: 'child-1',
        completedAt: new Date('2026-02-10'),
        earnedMinutes: 20,
        quest: { name: 'Homework' },
      },
    ]);
    prisma.playSession.findMany.mockResolvedValue([
      {
        childId: 'child-1',
        endedAt: new Date('2026-02-10'),
        createdAt: new Date('2026-02-10'),
        requestedMinutes: 10,
      },
    ]);

    const result = await service.exportCSV(familyId, ExportRange.THIRTY_DAYS);

    expect(result.csv).toContain('Quest Completed');
    expect(result.csv).toContain('Play Session');
    expect(result.csv).toContain('Homework');
    // 2 data rows + 1 header
    const lines = result.csv.trim().split('\n');
    expect(lines.length).toBe(3);
  });

  it('should set rate limit key after successful export', async () => {
    subscriptionService.isPremium.mockResolvedValue(true);
    redis.get.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([]);

    await service.exportCSV(familyId, ExportRange.ALL);

    expect(redis.setex).toHaveBeenCalledWith(
      `export_limit:${familyId}`,
      3600,
      '1',
    );
  });
});
