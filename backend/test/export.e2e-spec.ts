import { INestApplication } from '@nestjs/common';
import {
  createApp,
  cleanDatabase,
  closeApp,
  getAgent,
  registerAndLogin,
} from './setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';

describe('Data Export (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
  }, 30000);

  afterAll(async () => {
    await cleanDatabase(app);
    await closeApp(app);
  });

  beforeEach(async () => {
    await cleanDatabase(app);
    // Clear any rate limit keys
    const keys = await redis.keys('export_limit:*');
    if (keys.length) await redis.del(...keys);
  });

  async function setupPremiumFamilyWithData(agent: any) {
    // Register parent and create family
    const { accessToken, user } = await registerAndLogin(app, {
      email: 'parent@export.com',
      password: 'password123',
      name: 'Export Parent',
    });

    const familyRes = await agent
      .post('/api/families')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Export Family' })
      .expect(201);

    const familyId = familyRes.body.id;

    // Upgrade to premium
    await prisma.family.update({
      where: { id: familyId },
      data: {
        plan: 'premium',
        subscriptionStatus: 'active',
        subscriptionExpiresAt: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000,
        ),
      },
    });

    // Add child
    const childRes = await agent
      .post(`/api/families/${familyId}/children`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Export Kid',
        age: 8,
        pin: '1234',
        consentText:
          "I consent to the collection of my child's data for app functionality.",
      })
      .expect(201);

    const childId = childRes.body.id;

    // Create quest directly via Prisma
    const quest = await prisma.quest.create({
      data: {
        name: 'Clean Room',
        category: 'chores',
        rewardSeconds: 1800,
        stackingType: 'stackable',
        familyId,
        createdByUserId: user.id,
      },
    });

    // Create an approved quest completion directly via Prisma
    await prisma.questCompletion.create({
      data: {
        questId: quest.id,
        childId,
        status: 'approved',
        earnedSeconds: 1800,
        stackingType: 'stackable',
        completedAt: new Date(),
        reviewedAt: new Date(),
      },
    });

    return {
      parentToken: accessToken,
      familyId,
      childId,
    };
  }

  describe('GET /api/families/:id/export', () => {
    it('returns CSV with correct headers and content type', async () => {
      const agent = getAgent(app);
      const { parentToken, familyId } =
        await setupPremiumFamilyWithData(agent);

      const res = await agent
        .get(`/api/families/${familyId}/export?range=30d`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('.csv');

      // Verify CSV headers
      const lines = res.text.split('\n');
      expect(lines[0]).toContain('Date');
      expect(lines[0]).toContain('Child Name');
      expect(lines[0]).toContain('Activity');
      expect(lines[0]).toContain('Quest Name');
      expect(lines[0]).toContain('Seconds Earned');
      expect(lines[0]).toContain('Seconds Used');

      // Should have at least header + 1 data row
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });

    it('returns 402 for free-tier family', async () => {
      const agent = getAgent(app);
      const { accessToken } = await registerAndLogin(app, {
        email: 'free@export.com',
        password: 'password123',
        name: 'Free Parent',
      });

      const familyRes = await agent
        .post('/api/families')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Free Family' })
        .expect(201);

      const res = await agent
        .get(`/api/families/${familyRes.body.id}/export?range=30d`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(402);

      expect(res.body.statusCode).toBe(402);
    });

    it('returns 403 for non-family member', async () => {
      const agent = getAgent(app);
      const { familyId } = await setupPremiumFamilyWithData(agent);

      // Register a different parent
      const { accessToken: otherToken } = await registerAndLogin(app, {
        email: 'other@export.com',
        password: 'password123',
        name: 'Other Parent',
      });

      await agent
        .get(`/api/families/${familyId}/export?range=30d`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('returns 429 on second export within 1 hour', async () => {
      const agent = getAgent(app);
      const { parentToken, familyId } =
        await setupPremiumFamilyWithData(agent);

      // First export succeeds
      await agent
        .get(`/api/families/${familyId}/export?range=30d`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      // Second export is rate limited
      const res = await agent
        .get(`/api/families/${familyId}/export?range=30d`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(429);

      expect(res.body.statusCode).toBe(429);
    });

    it('CSV contains approved quest completion data', async () => {
      const agent = getAgent(app);
      const { parentToken, familyId } =
        await setupPremiumFamilyWithData(agent);

      const res = await agent
        .get(`/api/families/${familyId}/export?range=all`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      // Should contain the quest completion row
      expect(res.text).toContain('Export Kid');
      expect(res.text).toContain('Quest Completed');
      expect(res.text).toContain('Clean Room');
      expect(res.text).toContain('1800');
    });

    it('returns CSV with headers only when no children exist', async () => {
      const agent = getAgent(app);
      const { accessToken } = await registerAndLogin(app, {
        email: 'empty@export.com',
        password: 'password123',
        name: 'Empty Parent',
      });

      const familyRes = await agent
        .post('/api/families')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Empty Family' })
        .expect(201);

      // Upgrade to premium
      await prisma.family.update({
        where: { id: familyRes.body.id },
        data: {
          plan: 'premium',
          subscriptionStatus: 'active',
          subscriptionExpiresAt: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000,
          ),
        },
      });

      const res = await agent
        .get(`/api/families/${familyRes.body.id}/export?range=30d`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const lines = res.text.trim().split('\n');
      // Only header row
      expect(lines.length).toBe(1);
      expect(lines[0]).toContain('Date');
    });
  });
});
