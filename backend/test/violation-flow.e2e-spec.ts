import { INestApplication } from '@nestjs/common';
import { createApp, cleanDatabase, closeApp, getAgent, registerAndLogin } from './setup';

describe('Violation Flow (E2E)', () => {
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

  async function setupFamily(agent: any) {
    const { accessToken } = await registerAndLogin(app, {
      email: 'parent@violation.com',
      password: 'password123',
      name: 'Violation Parent',
    });

    const familyRes = await agent
      .post('/api/families')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Violation Family' })
      .expect(201);

    const childRes = await agent
      .post(`/api/families/${familyRes.body.id}/children`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Bad Kid', age: 12, pin: '9999' })
      .expect(201);

    return {
      parentToken: accessToken,
      familyId: familyRes.body.id,
      childId: childRes.body.id,
    };
  }

  describe('Violation lifecycle', () => {
    it('record violation → penalty deducted → forgive → refund', async () => {
      const agent = getAgent(app);
      const { parentToken, childId } = await setupFamily(agent);

      // 1. Record violation
      const violationRes = await agent
        .post(`/api/violations/${childId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ reason: 'Used phone without permission' })
        .expect(201);

      expect(violationRes.body.penaltySeconds).toBe(7200); // 1st: 2h
      expect(violationRes.body.violationNumber).toBe(1);
      const violationId = violationRes.body.id;

      // 2. Check time bank went negative
      const balanceRes = await agent
        .get(`/api/time-bank/${childId}/balance`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect(balanceRes.body.totalSeconds).toBeLessThan(0);

      // 3. Forgive violation
      const forgiveRes = await agent
        .post(`/api/violations/${violationId}/forgive`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(201);

      expect(forgiveRes.body.forgiven).toBe(true);

      // 4. Balance should be restored (back to 0 or close)
      const afterForgiveRes = await agent
        .get(`/api/time-bank/${childId}/balance`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect(afterForgiveRes.body.totalSeconds).toBeGreaterThanOrEqual(0);
    });

    it('escalating penalties: 2h → 4h → 8h', async () => {
      const agent = getAgent(app);
      const { parentToken, childId } = await setupFamily(agent);

      // 1st violation: 7200 sec (2h)
      const v1 = await agent
        .post(`/api/violations/${childId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({})
        .expect(201);
      expect(v1.body.penaltySeconds).toBe(7200);

      // 2nd violation: 14400 sec (4h)
      const v2 = await agent
        .post(`/api/violations/${childId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({})
        .expect(201);
      expect(v2.body.penaltySeconds).toBe(14400);

      // 3rd violation: 28800 sec (8h)
      const v3 = await agent
        .post(`/api/violations/${childId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({})
        .expect(201);
      expect(v3.body.penaltySeconds).toBe(28800);
    });
  });
});
