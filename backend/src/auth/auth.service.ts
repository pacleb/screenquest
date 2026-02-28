import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { nanoid } from 'nanoid';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import { UserRegisteredEvent, UserLoggedInEvent } from '../common/analytics/analytics.events';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ChildLoginDto,
} from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redis: RedisService,
    private mail: MailService,
    private eventEmitter: EventEmitter2,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        role: 'parent',
        authProvider: 'email',
      },
    });

    // Generate email verification token (stored in DB for persistence + Redis for fast lookup)
    const verificationToken = nanoid(32);
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
    });
    await this.redis.set(
      `email-verify:${verificationToken}`,
      user.id,
      'EX',
      86400, // 24 hours
    );

    // Send verification email
    await this.mail.sendVerificationEmail(user.email!, user.name, verificationToken);

    const tokens = await this.generateTokens(user);

    this.eventEmitter.emit('user.registered', new UserRegisteredEvent(user.id, 'parent', user.email!));

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async login(dto: LoginDto) {
    // Check for account lockout
    await this.checkLoginAttempts(dto.email.toLowerCase());

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      await this.recordFailedAttempt(dto.email.toLowerCase());
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.recordFailedAttempt(dto.email.toLowerCase());
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.clearLoginAttempts(dto.email.toLowerCase());

    const tokens = await this.generateTokens(user);

    this.eventEmitter.emit('user.logged_in', new UserLoggedInEvent(user.id, user.role));

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async childLogin(dto: ChildLoginDto) {
    const lockoutKey = `child:${dto.familyCode.toUpperCase()}:${dto.name}`;
    await this.checkLoginAttempts(lockoutKey);

    const family = await this.prisma.family.findUnique({
      where: { familyCode: dto.familyCode.toUpperCase() },
    });

    if (!family) {
      await this.recordFailedAttempt(lockoutKey);
      throw new UnauthorizedException('Invalid family code');
    }

    // Find child by family + name only (PIN is hashed, can't query directly)
    const child = await this.prisma.user.findFirst({
      where: {
        familyId: family.id,
        name: dto.name,
        role: 'child',
      },
    });

    if (!child) {
      await this.recordFailedAttempt(lockoutKey);
      throw new UnauthorizedException('Invalid name');
    }

    // If the child has a PIN set, require it
    if (child.pin) {
      if (!dto.pin) {
        throw new UnauthorizedException('PIN is required');
      }
      const pinValid = await bcrypt.compare(dto.pin, child.pin);
      if (!pinValid) {
        await this.recordFailedAttempt(lockoutKey);
        throw new UnauthorizedException('Invalid name or PIN');
      }
    }

    await this.clearLoginAttempts(lockoutKey);

    const tokens = await this.generateTokens(child);

    return {
      ...tokens,
      user: this.sanitizeUser(child),
    };
  }

  async verifyEmail(token: string) {
    // Try Redis first (fast path), fall back to DB (persistent/reliable)
    let userId = await this.redis.get(`email-verify:${token}`);

    if (!userId) {
      // Redis miss — look up from database (survives Redis restarts/evictions)
      const user = await this.prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpiry: { gte: new Date() },
        },
      });
      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    await this.redis.del(`email-verify:${token}`).catch(() => {});

    return { message: 'Email verified successfully' };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.email) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      return { message: 'Email is already verified' };
    }

    const verificationToken = nanoid(32);
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
    });
    await this.redis.set(
      `email-verify:${verificationToken}`,
      user.id,
      'EX',
      86400, // 24 hours
    );

    await this.mail.sendVerificationEmail(user.email, user.name, verificationToken);

    return { message: 'Verification email sent' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = nanoid(32);
    await this.redis.set(
      `password-reset:${resetToken}`,
      user.id,
      'EX',
      3600, // 1 hour
    );

    // Send password reset email
    await this.mail.sendPasswordResetEmail(user.email!, user.name, resetToken);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await this.redis.get(`password-reset:${token}`);
    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.redis.del(`password-reset:${token}`);

    // Invalidate all refresh tokens for security
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { message: 'Password reset successfully' };
  }

  async refreshToken(dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Delete old refresh token (rotation)
    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    // Generate new tokens
    const tokens = await this.generateTokens(storedToken.user);

    return {
      ...tokens,
      user: this.sanitizeUser(storedToken.user),
    };
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.deleteMany({
      where: { tokenHash },
    });

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { message: 'Logged out of all devices' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  // --- Login attempt tracking for brute-force protection ---

  private async checkLoginAttempts(key: string): Promise<void> {
    const attempts = await this.redis.get(`login_attempts:${key}`);
    if (attempts && parseInt(attempts) >= 5) {
      const ttl = await this.redis.ttl(`login_attempts:${key}`);
      throw new UnauthorizedException(
        `Too many failed attempts. Try again in ${Math.ceil(Math.max(ttl, 0) / 60)} minutes.`,
      );
    }
  }

  private async recordFailedAttempt(key: string): Promise<void> {
    const attemptsKey = `login_attempts:${key}`;
    const current = await this.redis.incr(attemptsKey);
    if (current === 1) {
      await this.redis.expire(attemptsKey, 900); // 15-minute lockout window
    }
  }

  private async clearLoginAttempts(key: string): Promise<void> {
    await this.redis.del(`login_attempts:${key}`);
  }

  private async generateTokens(user: { id: string; email: string | null; role: string; familyId: string | null }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email || '',
      role: user.role,
      familyId: user.familyId,
    };

    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshTokenValue = nanoid(64);
    const tokenHash = this.hashToken(refreshTokenValue);

    const refreshExpiryDays = 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiryDays);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  async updateAvatar(userId: string, emoji: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: emoji },
    });
    return this.sanitizeUser(user);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      familyId: user.familyId,
      age: user.age,
      emailVerified: user.emailVerified,
    };
  }
}
