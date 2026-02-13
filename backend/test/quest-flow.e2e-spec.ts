import { INestApplication } from '@nestjs/common';
import { createApp, cleanDatabase, closeApp, getAgent, registerAndLogin } from './setup';

describe('Quest Flow (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  }, 30000);

  afterAll(async () => {
    await cleanDatabase(app);
    await closeApp(app);
  });

  beforeEach(async () => {
    await cleanDatabase(app);
  });

  async function setupFamilyWithChild(agent: any) {
    const { accessToken, user } = await registerAndLogin(app, {
      email: 'parent@quest.com',
      password: 'password123',
      name: 'Quest Parent',
    });

    const familyRes = await agent
      .post('/api/families')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Quest Family' })
      .expect(201);

    const childRes = await agent
      .post(`/api/families/${familyRes.body.id}/children`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Quest Kid', age: 8, pin: '1234' })
      .expect(201);

    return {
      parentToken: accessToken,
      familyId: familyRes.body.id,
      familyCode: familyRes.body.familyCode,
      childId: childRes.body.id,
    };
  }

  describe('Quest lifecycle', () => {
    it('create quest → complete → approve → verify time credited', async () => {
      const agent = getAgent(app);
      const { parentToken, familyId, familyCode, childId } = await setupFamilyWithChild(agent);

      // 1. Create quest
      const questRes = await agent
        .post(`/api/families/${familyId}/quests`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          name: 'Clean Room',
          category: 'chores',
          rewardMinutes: 30,
          stackingType: 'stackable',
          recurrence: 'daily',
          assignedChildIds: [childId],
        })
        .expect(201);

      expect(questRes.body.id).toBeDefined();
      const questId = questRes.body.id;

      // 2. Child logs in
      const childLoginRes = await agent
        .post('/api/auth/child-login')
        .send({ familyCode, name: 'Quest Kid', pin: '1234' })
        .expect(201);

      const childToken = childLoginRes.body.accessToken;

      // 3. Child completes quest
      const completeRes = await agent
        .post(`/api/completions/${questId}/complete`)
        .set('Authorization', `Bearer ${childToken}`)
        .expect(201);

      expect(completeRes.body.status).toBe('pending');
      const completionId = completeRes.body.id;

      // 4. Parent approves
      const approveRes = await agent
        .post(`/api/completions/${completionId}/approve`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({})
        .expect(201);

      expect(approveRes.body.status).toBe('approved');

      // 5. Verify time was credited
      const balanceRes = await agent
        .get(`/api/time-bank/${childId}/balance`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect(balanceRes.body.stackableMinutes).toBeGreaterThanOrEqual(30);
    });
  });

  describe('Free plan quest limit', () => {
    it('blocks 4th quest on free plan', async () => {
      const agent = getAgent(app);
      const { parentToken, familyId, childId } = await setupFamilyWithChild(agent);

      // Create 3 quests (limit)
      for (let i = 1; i <= 3; i++) {
        await agent
          .post(`/api/families/${familyId}/quests`)
          .set('Authorization', `Bearer ${parentToken}`)
          .send({
            name: `Quest ${i}`,
            category: 'chores',
            rewardMinutes: 15,
            stackingType: 'stackable',
            assignedChildIds: [childId],
          })
          .expect(201);
      }

      // 4th quest should fail
      const res = await agent
        .post(`/api/families/${familyId}/quests`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          name: 'Quest 4',
          category: 'learning',
          rewardMinutes: 10,
          stackingType: 'stackable',
          assignedChildIds: [childId],
        })
        .expect(402);

      expect(res.body.statusCode).toBe(402);
    });
  });
});
