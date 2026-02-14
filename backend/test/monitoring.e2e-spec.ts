import { INestApplication } from '@nestjs/common';
import { createApp, cleanDatabase, closeApp, getAgent } from './setup';

describe('Monitoring & Health (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  }, 30000);

  afterAll(async () => {
    await cleanDatabase(app);
    await closeApp(app);
  });

  describe('GET /api/health', () => {
    it('returns health status with uptime', async () => {
      const agent = getAgent(app);

      const res = await agent.get('/api/health').expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.uptime).toEqual(expect.any(Number));
      expect(res.body.db).toBeDefined();
      expect(res.body.redis).toBeDefined();
    });
  });

  describe('GET /api/health/metrics', () => {
    it('returns metrics snapshot', async () => {
      const agent = getAgent(app);

      // Make a few requests first to generate metrics
      await agent.get('/api/health').expect(200);
      await agent.get('/api/health').expect(200);

      const res = await agent.get('/api/health/metrics').expect(200);

      expect(res.body.uptime).toEqual(expect.any(Number));
      expect(res.body.requests).toBeDefined();
      expect(res.body.requests.total).toEqual(expect.any(Number));
      expect(res.body.requests.errorRate).toEqual(expect.any(Number));
      expect(res.body.requests.p50).toEqual(expect.any(Number));
      expect(res.body.requests.p95).toEqual(expect.any(Number));
      expect(res.body.requests.p99).toEqual(expect.any(Number));
      expect(res.body.database).toBeDefined();
      expect(res.body.database.status).toBe('connected');
      expect(res.body.redis).toBeDefined();
      expect(res.body.memory).toBeDefined();
      expect(res.body.memory.heapUsedMB).toEqual(expect.any(Number));
    });
  });

  describe('GET /api/health/metrics/errors', () => {
    it('returns error rate by endpoint', async () => {
      const agent = getAgent(app);

      const res = await agent.get('/api/health/metrics/errors').expect(200);

      // Response is an object with endpoint keys
      expect(typeof res.body).toBe('object');
    });
  });
});
