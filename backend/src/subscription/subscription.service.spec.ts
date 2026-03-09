import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { RedisService } from '../redis/redis.service';
import { createMockPrisma, MockPrisma } from '../__mocks__/prisma.mock';
import { createMockNotification, MockNotification } from '../__mocks__/notification.mock';
import { createMockRedis, MockRedis } from '../__mocks__/redis.mock';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prisma: MockPrisma;
  let notificationService: MockNotification;
  let redis: MockRedis;

  beforeEach(async () => {
    prisma = createMockPrisma();
    notificationService = createMockNotification();
    redis = createMockRedis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notificationService },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  describe('isPremium', () => {
    it('returns true for premium with valid expiry', async () => {
      const future = new Date(Date.now() + 30 * 86400 * 1000);
      prisma.family.findUnique.mockResolvedValue({
        plan: 'premium',
        subscriptionExpiresAt: future,
      });

      expect(await service.isPremium('fam-1')).toBe(true);
    });

    it('returns false for free plan', async () => {
      prisma.family.findUnique.mockResolvedValue({
        plan: 'free',
        subscriptionExpiresAt: null,
      });

      expect(await service.isPremium('fam-1')).toBe(false);
    });

    it('returns false for expired premium', async () => {
      const past = new Date(Date.now() - 86400 * 1000);
      prisma.family.findUnique.mockResolvedValue({
        plan: 'premium',
        subscriptionExpiresAt: past,
      });

      expect(await service.isPremium('fam-1')).toBe(false);
    });

    it('returns true when subscriptionStatus is active even if expiry is stale', async () => {
      const past = new Date(Date.now() - 86400 * 1000);
      prisma.family.findUnique.mockResolvedValue({
        plan: 'premium',
        subscriptionStatus: 'active',
        subscriptionExpiresAt: past,
      });

      expect(await service.isPremium('fam-1')).toBe(true);
    });

    it('returns false for non-existent family', async () => {
      prisma.family.findUnique.mockResolvedValue(null);

      expect(await service.isPremium('fam-999')).toBe(false);
    });
  });

  describe('handleWebhookEvent', () => {
    const makeEvent = (type: string, overrides: Record<string, any> = {}) => ({
      api_version: '4',
      event: {
        type,
        app_user_id: 'fam-1',
        expiration_at_ms: Date.now() + 30 * 86400 * 1000,
        product_id: 'screenquest_monthly',
        ...overrides,
      },
    } as any);

    beforeEach(() => {
      prisma.family.findFirst.mockResolvedValue({ id: 'fam-1' });
    });

    it('handles INITIAL_PURCHASE — sets premium', async () => {
      prisma.family.update.mockResolvedValue({});

      await service.handleWebhookEvent(makeEvent('INITIAL_PURCHASE'));

      expect(prisma.family.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'fam-1' },
          data: expect.objectContaining({
            plan: 'premium',
            subscriptionStatus: 'active',
          }),
        }),
      );
    });

    it('handles trial purchase with period_type=TRIAL — treated as active (Phase 17)', async () => {
      prisma.family.update.mockResolvedValue({});

      await service.handleWebhookEvent(
        makeEvent('INITIAL_PURCHASE', { period_type: 'TRIAL' }),
      );

      expect(prisma.family.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subscriptionStatus: 'active',
          }),
        }),
      );
    });

    it('handles RENEWAL — keeps premium active', async () => {
      prisma.family.update.mockResolvedValue({});

      await service.handleWebhookEvent(makeEvent('RENEWAL'));

      expect(prisma.family.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'premium',
            subscriptionStatus: 'active',
          }),
        }),
      );
    });

    it('handles CANCELLATION — marks cancelled', async () => {
      prisma.family.update.mockResolvedValue({});

      await service.handleWebhookEvent(makeEvent('CANCELLATION'));

      expect(prisma.family.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subscriptionStatus: 'cancelled',
          }),
        }),
      );
    });

    it('handles EXPIRATION — downgrades to free with grace period if over limit', async () => {
      prisma.family.update.mockResolvedValue({});
      prisma.quest.count.mockResolvedValue(5); // over 3-quest limit

      await service.handleWebhookEvent(makeEvent('EXPIRATION'));

      expect(prisma.family.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'free',
            subscriptionStatus: 'expired',
            gracePeriodEndsAt: expect.any(Date),
          }),
        }),
      );
      expect(notificationService.sendToParents).toHaveBeenCalled();
    });

    it('handles EXPIRATION — no grace period if under limit', async () => {
      prisma.family.update.mockResolvedValue({});
      prisma.quest.count.mockResolvedValue(2);

      await service.handleWebhookEvent(makeEvent('EXPIRATION'));

      expect(prisma.family.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'free',
            gracePeriodEndsAt: null,
          }),
        }),
      );
    });

    it('handles BILLING_ISSUE — notifies parents', async () => {
      prisma.family.update.mockResolvedValue({});

      await service.handleWebhookEvent(makeEvent('BILLING_ISSUE'));

      expect(prisma.family.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { subscriptionStatus: 'billing_issue' },
        }),
      );
      expect(notificationService.sendToParents).toHaveBeenCalledWith(
        'fam-1',
        expect.objectContaining({ title: 'Payment Issue' }),
      );
    });

    it('ignores events for unknown families', async () => {
      prisma.family.findFirst.mockResolvedValue(null);

      await service.handleWebhookEvent(makeEvent('INITIAL_PURCHASE'));

      expect(prisma.family.update).not.toHaveBeenCalled();
    });

    it('handles non-UUID ids (e.g. $RCAnonymousID) without crashing', async () => {
      prisma.family.update.mockResolvedValue({});

      await service.handleWebhookEvent(
        makeEvent('INITIAL_PURCHASE', {
          app_user_id: '550e8400-e29b-41d4-a716-446655440000',
          original_app_user_id: '$RCAnonymousID:abc123xyz',
        }),
      );

      // Non-UUID anonymous IDs should be filtered from the UUID column query
      expect(prisma.family.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { revenuecatAppUserId: { in: expect.arrayContaining(['$RCAnonymousID:abc123xyz']) } },
            ]),
          }),
        }),
      );
      expect(prisma.family.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ plan: 'premium' }),
        }),
      );
    });

    it('detects yearly products', async () => {
      prisma.family.update.mockResolvedValue({});

      await service.handleWebhookEvent(
        makeEvent('INITIAL_PURCHASE', { product_id: 'screenquest_yearly' }),
      );

      expect(prisma.family.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subscriptionPeriod: 'yearly',
          }),
        }),
      );
    });
  });

  describe('getSubscriptionStatus', () => {
    it('returns status for premium family', async () => {
      const future = new Date(Date.now() + 30 * 86400 * 1000);
      prisma.family.findUnique.mockResolvedValue({
        plan: 'premium',
        subscriptionStatus: 'active',
        subscriptionExpiresAt: future,
        subscriptionPeriod: 'monthly',
        gracePeriodEndsAt: null,
      });
      prisma.quest.count.mockResolvedValue(5);

      const status = await service.getSubscriptionStatus('fam-1');

      expect(status.isActive).toBe(true);
      expect(status.questLimit).toBeNull();
      expect(status.activeQuestCount).toBe(5);
    });

    it('returns quest limit for free families', async () => {
      prisma.family.findUnique.mockResolvedValue({
        plan: 'free',
        subscriptionStatus: null,
        subscriptionExpiresAt: null,
        subscriptionPeriod: null,
        gracePeriodEndsAt: null,
      });
      prisma.quest.count.mockResolvedValue(2);

      const status = await service.getSubscriptionStatus('fam-1');

      expect(status.isActive).toBe(false);
      expect(status.questLimit).toBe(3);
    });

    it('throws NotFoundException for missing family', async () => {
      prisma.family.findUnique.mockResolvedValue(null);

      await expect(
        service.getSubscriptionStatus('fam-999'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
