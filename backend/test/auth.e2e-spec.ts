import { INestApplication } from '@nestjs/common';
import { createApp, cleanDatabase, closeApp, getAgent, registerAndLogin } from './setup';

describe('Auth (E2E)', () => {
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

  describe('POST /api/auth/register', () => {
    it('registers a new parent and returns tokens', async () => {
      const agent = getAgent(app);

      const res = await agent
        .post('/api/auth/register')
        .send({ email: 'parent@test.com', password: 'password123', name: 'Test Parent' })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe('parent@test.com');
      expect(res.body.user.role).toBe('parent');
    });

    it('returns 409 for duplicate email', async () => {
      const agent = getAgent(app);

      await agent
        .post('/api/auth/register')
        .send({ email: 'dup@test.com', password: 'password123', name: 'First' })
        .expect(201);

      const res = await agent
        .post('/api/auth/register')
        .send({ email: 'dup@test.com', password: 'password456', name: 'Second' })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
    });

    it('returns 400 for missing fields', async () => {
      const agent = getAgent(app);

      await agent
        .post('/api/auth/register')
        .send({ email: 'bad@test.com' })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with correct credentials', async () => {
      await registerAndLogin(app, {
        email: 'login@test.com',
        password: 'password123',
        name: 'Login User',
      });

      const agent = getAgent(app);
      const res = await agent
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'password123' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe('login@test.com');
    });

    it('returns 401 for wrong password', async () => {
      await registerAndLogin(app, {
        email: 'wrong@test.com',
        password: 'correctpass',
        name: 'Wrong Pass',
      });

      const agent = getAgent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'wrong@test.com', password: 'incorrect1' })
        .expect(401);
    });

    it('returns 401 for non-existent user', async () => {
      const agent = getAgent(app);
      await agent
        .post('/api/auth/login')
        .send({ email: 'noone@test.com', password: 'pass' })
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('rotates refresh token', async () => {
      const { refreshToken } = await registerAndLogin(app, {
        email: 'refresh@test.com',
        password: 'password123',
        name: 'Refresh User',
      });

      const agent = getAgent(app);
      const res = await agent
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.refreshToken).not.toBe(refreshToken);
    });

    it('returns 401 for used/invalid refresh token', async () => {
      const { refreshToken } = await registerAndLogin(app, {
        email: 'used@test.com',
        password: 'password123',
        name: 'Used Token',
      });

      const agent = getAgent(app);
      // Use the token once
      await agent
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Reuse the same token — should fail (rotation)
      await agent
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns user profile with valid token', async () => {
      const { accessToken } = await registerAndLogin(app, {
        email: 'me@test.com',
        password: 'password123',
        name: 'Me User',
      });

      const agent = getAgent(app);
      const res = await agent
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe('me@test.com');
      expect(res.body.name).toBe('Me User');
    });

    it('returns 401 without token', async () => {
      const agent = getAgent(app);
      await agent
        .get('/api/auth/me')
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('invalidates refresh token', async () => {
      const { accessToken, refreshToken } = await registerAndLogin(app, {
        email: 'logout@test.com',
        password: 'password123',
        name: 'Logout User',
      });

      const agent = getAgent(app);
      await agent
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      // Refresh token should no longer work
      await agent
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('Error format', () => {
    it('includes requestId and timestamp in error responses', async () => {
      const agent = getAgent(app);
      const res = await agent
        .post('/api/auth/login')
        .send({ email: 'no@one.com', password: 'pass' })
        .expect(401);

      expect(res.body.requestId).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.statusCode).toBe(401);
    });

    it('returns X-Request-Id response header', async () => {
      const agent = getAgent(app);
      const res = await agent
        .get('/api/auth/me')
        .expect(401);

      expect(res.headers['x-request-id']).toBeDefined();
    });
  });
});
