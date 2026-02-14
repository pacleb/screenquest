import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

describe('MetricsService', () => {
  let service: MetricsService;
  let prisma: { $queryRaw: jest.Mock };
  let redis: { ping: jest.Mock; info: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    redis = {
      ping: jest.fn().mockResolvedValue('PONG'),
      info: jest.fn().mockResolvedValue('used_memory:1048576\r\n'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordRequest', () => {
    it('stores a request metric', () => {
      service.recordRequest('GET', '/api/health', 200, 15);
      // No public getter, but we can call getSnapshot to verify
    });

    it('does not throw for many requests', () => {
      for (let i = 0; i < 100; i++) {
        service.recordRequest('GET', '/api/test', 200, i * 5);
      }
    });
  });

  describe('getSnapshot', () => {
    it('returns correct shape with no requests', async () => {
      const snapshot = await service.getSnapshot();

      expect(snapshot).toEqual(
        expect.objectContaining({
          uptime: expect.any(Number),
          requests: expect.objectContaining({
            total: 0,
            errorCount: 0,
            errorRate: 0,
            p50: 0,
            p95: 0,
            p99: 0,
          }),
          database: expect.objectContaining({
            status: 'connected',
          }),
          redis: expect.objectContaining({
            status: 'connected',
          }),
          memory: expect.objectContaining({
            heapUsedMB: expect.any(Number),
            heapTotalMB: expect.any(Number),
            rssMB: expect.any(Number),
          }),
        }),
      );
    });

    it('calculates percentiles and error rates correctly', async () => {
      // Add some metrics
      service.recordRequest('GET', '/api/quests', 200, 10);
      service.recordRequest('GET', '/api/quests', 200, 20);
      service.recordRequest('GET', '/api/quests', 200, 30);
      service.recordRequest('GET', '/api/quests', 200, 40);
      service.recordRequest('GET', '/api/quests', 500, 50);

      const snapshot = await service.getSnapshot();

      expect(snapshot.requests.total).toBe(5);
      expect(snapshot.requests.errorCount).toBe(1);
      expect(snapshot.requests.errorRate).toBe(20);
      expect(snapshot.requests.p50).toBeGreaterThan(0);
      expect(snapshot.requests.p95).toBeGreaterThan(0);
      expect(snapshot.requests.p99).toBeGreaterThan(0);
    });

    it('reports database disconnected when query fails', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('DB down'));

      const snapshot = await service.getSnapshot();
      expect(snapshot.database.status).toBe('disconnected');
    });

    it('reports redis disconnected when ping fails', async () => {
      redis.ping.mockRejectedValue(new Error('Redis down'));

      const snapshot = await service.getSnapshot();
      expect(snapshot.redis.status).toBe('disconnected');
    });
  });

  describe('getErrorsByEndpoint', () => {
    it('returns empty when no requests', () => {
      const result = service.getErrorsByEndpoint();
      expect(result).toEqual({});
    });

    it('groups errors by endpoint', () => {
      service.recordRequest('GET', '/api/quests', 200, 10);
      service.recordRequest('GET', '/api/quests', 500, 50);
      service.recordRequest('POST', '/api/quests', 200, 15);
      service.recordRequest('POST', '/api/quests', 500, 100);
      service.recordRequest('POST', '/api/quests', 500, 200);

      const result = service.getErrorsByEndpoint();

      expect(result['GET /api/quests']).toEqual({ total: 2, errors: 1, rate: 50 });
      expect(result['POST /api/quests']).toEqual(
        expect.objectContaining({ total: 3, errors: 2 }),
      );
    });
  });
});
