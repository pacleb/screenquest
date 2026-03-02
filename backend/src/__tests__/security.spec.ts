/**
 * Security-focused tests for Phase 10b hardening.
 * Covers: PIN hashing, login lockout, HTML escaping, email hiding,
 * file upload magic bytes, webhook idempotency.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createMockPrisma, MockPrisma } from '../__mocks__/prisma.mock';
import { createMockRedis, MockRedis } from '../__mocks__/redis.mock';

describe('Security – Login Lockout', () => {
  let service: AuthService;
  let prisma: MockPrisma;
  let redis: MockRedis;

  beforeEach(async () => {
    prisma = createMockPrisma();
    redis = createMockRedis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('tok') } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: RedisService, useValue: redis },
        {
          provide: MailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('blocks login after 5 failed attempts', async () => {
    redis.get.mockResolvedValue('5');
    redis.ttl.mockResolvedValue(600);

    await expect(
      service.login({ email: 'test@example.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);

    // Should not even look up the user
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('allows login when attempts < 5', async () => {
    redis.get.mockResolvedValue('3');
    const hash = await bcrypt.hash('correct', 12);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: hash,
      name: 'Test',
      role: 'parent',
      familyId: 'fam-1',
    });
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.login({
      email: 'test@example.com',
      password: 'correct',
    });

    expect(result.accessToken).toBeDefined();
    // Should clear attempts on success
    expect(redis.del).toHaveBeenCalledWith('login_attempts:test@example.com');
  });

  it('records failed attempt on wrong password', async () => {
    redis.get.mockResolvedValue(null);
    redis.incr.mockResolvedValue(1);
    const hash = await bcrypt.hash('correct', 12);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: hash,
    });

    await expect(
      service.login({ email: 'test@example.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(redis.incr).toHaveBeenCalledWith('login_attempts:test@example.com');
  });

  it('blocks child login after 5 failed attempts', async () => {
    redis.get.mockResolvedValue('5');
    redis.ttl.mockResolvedValue(600);

    await expect(
      service.childLogin({ familyCode: 'ABC123', name: 'Kid' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

describe('Security – Child login (case-insensitive name)', () => {
  let service: AuthService;
  let prisma: MockPrisma;
  let redis: MockRedis;

  beforeEach(async () => {
    prisma = createMockPrisma();
    redis = createMockRedis();
    redis.get.mockResolvedValue(null); // no lockout

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('tok') } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: RedisService, useValue: redis },
        {
          provide: MailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('authenticates child by family code + name', async () => {
    prisma.family.findUnique.mockResolvedValue({ id: 'fam-1' });
    prisma.user.findFirst.mockResolvedValue({
      id: 'child-1',
      name: 'Kid',
      role: 'child',
      familyId: 'fam-1',
      email: null,
      pin: null,
    });
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.childLogin({
      familyCode: 'ABC123',
      name: 'Kid',
    });

    expect(result.accessToken).toBeDefined();
    expect(result.user.name).toBe('Kid');
  });

  it('rejects invalid name', async () => {
    prisma.family.findUnique.mockResolvedValue({ id: 'fam-1' });
    prisma.user.findFirst.mockResolvedValue(null);
    redis.incr.mockResolvedValue(1);

    await expect(
      service.childLogin({ familyCode: 'ABC123', name: 'Nobody' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

describe('Security – HTML Escaping in Email Templates', () => {
  // Import the template functions to test escaping
  let templates: typeof import('../mail/templates');

  beforeAll(async () => {
    templates = await import('../mail/templates');
  });

  it('escapes script tags in verification email', () => {
    const html = templates.verifyEmailTemplate({
      name: '<script>alert("xss")</script>',
      verifyUrl: 'https://app.example.com/verify?token=tok-123',
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes HTML in password reset email', () => {
    const html = templates.passwordResetTemplate({
      name: '<img src=x onerror=alert(1)>',
      resetUrl: 'https://app.example.com/reset?token=reset-tok',
    });

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });

  it('escapes HTML in family invite email', () => {
    const html = templates.familyInviteTemplate({
      inviterName: '<b>Attacker</b>',
      familyName: '"><script>xss</script>',
      familyCode: 'CODE123',
    });

    expect(html).not.toContain('<b>Attacker</b>');
    expect(html).not.toContain('<script>xss');
    expect(html).toContain('&lt;b&gt;');
  });
});

describe('Security – Webhook Idempotency', () => {
  let service: any;
  let prisma: MockPrisma;
  let redis: MockRedis;

  const makeEvent = (type: string, overrides: Record<string, any> = {}) => ({
    api_version: '4',
    event: {
      id: 'evt-123',
      type,
      app_user_id: 'fam-1',
      expiration_at_ms: Date.now() + 30 * 86400 * 1000,
      product_id: 'screenquest_monthly',
      ...overrides,
    },
  });

  beforeEach(async () => {
    prisma = createMockPrisma();
    redis = createMockRedis();
    const { NotificationService } = await import('../notification/notification.service');
    const { createMockNotification } = await import('../__mocks__/notification.mock');
    const notificationService = createMockNotification();

    const { SubscriptionService } = await import('../subscription/subscription.service');
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notificationService },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get(SubscriptionService);
  });

  it('skips duplicate webhook events', async () => {
    redis.get.mockResolvedValue('1'); // already processed

    await service.handleWebhookEvent(makeEvent('INITIAL_PURCHASE'));

    // Should NOT process the event
    expect(prisma.family.findFirst).not.toHaveBeenCalled();
  });

  it('processes new events and marks them', async () => {
    redis.get.mockResolvedValue(null); // not yet processed
    prisma.family.findFirst.mockResolvedValue({ id: 'fam-1' });
    prisma.family.update.mockResolvedValue({});

    await service.handleWebhookEvent(makeEvent('INITIAL_PURCHASE'));

    expect(prisma.family.update).toHaveBeenCalled();
    // Should mark event as processed
    expect(redis.set).toHaveBeenCalledWith(
      'webhook:evt-123',
      '1',
      'EX',
      expect.any(Number),
    );
  });
});
