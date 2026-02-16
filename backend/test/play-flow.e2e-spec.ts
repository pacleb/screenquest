import { INestApplication } from '@nestjs/common';
import { createApp, cleanDatabase, closeApp, getAgent, registerAndLogin } from './setup';

describe('Play Flow (E2E)', () => {
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

  async function setupWithTimeBalance(agent: any) {
    const { accessToken } = await registerAndLogin(app, {
      email: 'parent@play.com',
      password: 'password123',
      name: 'Play Parent',
    });

    const familyRes = await agent
      .post('/api/families')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Play Family' })
      .expect(201);

    const childRes = await agent
      .post(`/api/families/${familyRes.body.id}/children`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Play Kid', age: 10, pin: '5678', consentText: "I consent to the collection of my child's data for app functionality." })
      .expect(201);

    const childId = childRes.body.id;
    const familyCode = familyRes.body.familyCode;

    // Create and auto-approve a quest to credit time
    const questRes = await agent
      .post(`/api/families/${familyRes.body.id}/quests`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Easy Task',
        category: 'chores',
        rewardSeconds: 3600,
        stackingType: 'stackable',
        recurrence: 'daily',
        autoApprove: true,
        assignedChildIds: [childId],
      })
      .expect(201);

    // Child logs in
    const childLoginRes = await agent
      .post('/api/auth/child-login')
      .send({ familyCode, name: 'Play Kid', pin: '5678' })
      .expect(200);

    const childToken = childLoginRes.body.accessToken;

    // Child completes quest to get time
    await agent
      .post(`/api/children/${childId}/quests/${questRes.body.id}/complete`)
      .set('Authorization', `Bearer ${childToken}`)
      .expect(201);

    return {
      parentToken: accessToken,
      childToken,
      childId,
      familyId: familyRes.body.id,
    };
  }

  describe('Play session lifecycle', () => {
    it('request → auto-start → stop → verify refund', async () => {
      const agent = getAgent(app);
      const { childToken, childId, parentToken } = await setupWithTimeBalance(agent);

      // 1. Request play (notify_only = auto-start)
      const playRes = await agent
        .post(`/api/children/${childId}/play`)
        .set('Authorization', `Bearer ${childToken}`)
        .send({ requestedSeconds: 1800 })
        .expect(201);

      expect(playRes.body.status).toBe('active');
      const sessionId = playRes.body.id;

      // 2. Stop early
      const stopRes = await agent
        .post(`/api/play-sessions/${sessionId}/stop`)
        .set('Authorization', `Bearer ${childToken}`)
        .expect(200);

      expect(stopRes.body.status).toBe('stopped');

      // 3. Balance should have been partially refunded
      const balanceRes = await agent
        .get(`/api/children/${childId}/time-bank`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      // Started with 3600, deducted 1800 for play, refunded ~1800 (stopped immediately)
      expect(balanceRes.body.totalSeconds).toBeGreaterThanOrEqual(3300);
    });

    it('rejects play when balance is zero', async () => {
      const agent = getAgent(app);
      const { accessToken } = await registerAndLogin(app, {
        email: 'broke@play.com',
        password: 'password123',
        name: 'Broke Parent',
      });

      const familyRes = await agent
        .post('/api/families')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Broke Family' })
        .expect(201);

      const childRes = await agent
        .post(`/api/families/${familyRes.body.id}/children`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Broke Kid', age: 8, pin: '0000', consentText: "I consent to the collection of my child's data for app functionality." })
        .expect(201);

      const childLoginRes = await agent
        .post('/api/auth/child-login')
        .send({ familyCode: familyRes.body.familyCode, name: 'Broke Kid', pin: '0000' })
        .expect(200);

      // Try to play with no balance
      await agent
        .post(`/api/children/${childRes.body.id}/play`)
        .set('Authorization', `Bearer ${childLoginRes.body.accessToken}`)
        .send({ requestedSeconds: 900 })
        .expect(400);
    });
  });
});
