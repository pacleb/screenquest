import { INestApplication } from '@nestjs/common';
import { createApp, cleanDatabase, closeApp, getAgent, registerAndLogin } from './setup';

describe('Family (E2E)', () => {
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

  describe('Family lifecycle', () => {
    it('create family → add child → list members → remove child', async () => {
      const agent = getAgent(app);

      // 1. Register parent
      const { accessToken } = await registerAndLogin(app, {
        email: 'parent@family.com',
        password: 'password123',
        name: 'Family Parent',
      });

      // 2. Create family
      const familyRes = await agent
        .post('/api/families')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Family' })
        .expect(201);

      expect(familyRes.body.id).toBeDefined();
      expect(familyRes.body.familyCode).toBeDefined();
      const familyId = familyRes.body.id;

      // 3. Add child
      const childRes = await agent
        .post(`/api/families/${familyId}/children`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Child', age: 10, pin: '1234' })
        .expect(201);

      expect(childRes.body.name).toBe('Test Child');
      expect(childRes.body.role).toBe('child');
      const childId = childRes.body.id;

      // 4. List members
      const membersRes = await agent
        .get(`/api/families/${familyId}/members`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(membersRes.body.length).toBeGreaterThanOrEqual(2);

      // 5. Remove child
      await agent
        .delete(`/api/families/${familyId}/members/${childId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 6. Verify removal
      const afterRemoval = await agent
        .get(`/api/families/${familyId}/members`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const childStillExists = afterRemoval.body.find((m: any) => m.id === childId);
      expect(childStillExists).toBeUndefined();
    });
  });
});
