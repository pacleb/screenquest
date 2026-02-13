import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import { createMockPrisma, MockPrisma } from '../__mocks__/prisma.mock';
import { createMockRedis, MockRedis } from '../__mocks__/redis.mock';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: MockPrisma;
  let redis: MockRedis;
  let jwtService: { sign: jest.Mock };
  let mailService: { sendVerificationEmail: jest.Mock; sendPasswordResetEmail: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    redis = createMockRedis();
    jwtService = { sign: jest.fn().mockReturnValue('mock-access-token') };
    mailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: RedisService, useValue: redis },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('hashes password and creates user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'parent',
        familyId: null,
        avatarUrl: null,
        age: null,
        emailVerified: false,
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@example.com');

      // Verify password was hashed
      const createCall = prisma.user.create.mock.calls[0][0];
      expect(createCall.data.passwordHash).not.toBe('password123');
      const isValid = await bcrypt.compare('password123', createCall.data.passwordHash);
      expect(isValid).toBe(true);
    });

    it('throws ConflictException for duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'test@example.com' });

      await expect(
        service.register({ email: 'test@example.com', password: 'pass', name: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });

    it('sends verification email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        role: 'parent',
        familyId: null,
      });
      prisma.refreshToken.create.mockResolvedValue({});

      await service.register({ email: 'test@example.com', password: 'pass', name: 'Test' });

      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Test',
        expect.any(String),
      );
    });

    it('lowercases email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        role: 'parent',
        familyId: null,
      });
      prisma.refreshToken.create.mockResolvedValue({});

      await service.register({ email: 'TEST@Example.COM', password: 'pass', name: 'Test' });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'test@example.com' }),
        }),
      );
    });
  });

  describe('login', () => {
    it('validates bcrypt hash and returns tokens', async () => {
      const hash = await bcrypt.hash('password123', 12);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: hash,
        name: 'Test',
        role: 'parent',
        familyId: 'fam-1',
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({ email: 'test@example.com', password: 'password123' });

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const hash = await bcrypt.hash('correct', 12);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: hash,
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'no@one.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('rotates: deletes old token, creates new', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'hash',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: 'parent',
          familyId: 'fam-1',
          name: 'Test',
        },
      });
      prisma.refreshToken.delete.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshToken({ refreshToken: 'old-token' });

      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
      expect(prisma.refreshToken.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock-access-token');
    });

    it('throws UnauthorizedException for expired token', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(
        service.refreshToken({ refreshToken: 'expired-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('deletes refresh token by hash', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('some-token');

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String) },
      });
      expect(result.message).toBe('Logged out successfully');
    });
  });
});
