import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { RedisService } from '../redis/redis.service';
import { RevenueCatWebhookEvent, SubscriptionStatusDto } from './dto/subscription.dto';

const FREE_PLAN_QUEST_LIMIT = 3;
const GRACE_PERIOD_DAYS = 7;
const WEBHOOK_IDEMPOTENCY_TTL = 60 * 60 * 24 * 7; // 7 days

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private redis: RedisService,
  ) {}

  async isPremium(familyId: string): Promise<boolean> {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: { plan: true, subscriptionExpiresAt: true },
    });
    if (!family) return false;
    if (family.plan !== 'premium') return false;
    if (!family.subscriptionExpiresAt) return false;
    return family.subscriptionExpiresAt > new Date();
  }

  async getSubscriptionStatus(familyId: string): Promise<SubscriptionStatusDto> {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    });
    if (!family) throw new NotFoundException('Family not found');

    const isActive =
      family.plan === 'premium' &&
      !!family.subscriptionExpiresAt &&
      family.subscriptionExpiresAt > new Date();

    const isTrialing = family.subscriptionStatus === 'trialing' && isActive;

    let trialDaysRemaining: number | null = null;
    if (isTrialing && family.subscriptionExpiresAt) {
      trialDaysRemaining = Math.max(
        0,
        Math.ceil(
          (family.subscriptionExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      );
    }

    const activeQuestCount = await this.prisma.quest.count({
      where: { familyId, isArchived: false },
    });

    return {
      plan: family.plan,
      subscriptionStatus: family.subscriptionStatus,
      expiresAt: family.subscriptionExpiresAt?.toISOString() ?? null,
      isActive,
      willRenew: family.subscriptionStatus === 'active',
      period: family.subscriptionPeriod,
      isTrialing,
      trialDaysRemaining,
      gracePeriodEndsAt: family.gracePeriodEndsAt?.toISOString() ?? null,
      activeQuestCount,
      questLimit: isActive ? null : FREE_PLAN_QUEST_LIMIT,
    };
  }

  async handleWebhookEvent(event: RevenueCatWebhookEvent) {
    const { type, app_user_id, expiration_at_ms, product_id } = event.event;

    // Idempotency: skip duplicate webhook events
    const eventId = event.event.id || `${type}:${app_user_id}:${expiration_at_ms}`;
    const idempotencyKey = `webhook:${eventId}`;
    const already = await this.redis.get(idempotencyKey);
    if (already) {
      this.logger.log(`Webhook: duplicate event ${eventId}, skipping`);
      return;
    }

    // app_user_id is the familyId we set during RevenueCat identification
    const family = await this.prisma.family.findFirst({
      where: {
        OR: [
          { id: app_user_id },
          { revenuecatAppUserId: app_user_id },
        ],
      },
    });

    if (!family) {
      this.logger.warn(`Webhook: Family not found for app_user_id ${app_user_id}`);
      return;
    }

    const expiresAt = expiration_at_ms ? new Date(expiration_at_ms) : null;
    const period = product_id?.includes('yearly') ? 'yearly' : 'monthly';

    switch (type) {
      case 'INITIAL_PURCHASE':
      case 'NON_RENEWING_PURCHASE': {
        const isTrialing = event.event.period_type === 'TRIAL';
        await this.prisma.family.update({
          where: { id: family.id },
          data: {
            plan: 'premium',
            subscriptionStatus: isTrialing ? 'trialing' : 'active',
            subscriptionExpiresAt: expiresAt,
            subscriptionPeriod: period,
            gracePeriodEndsAt: null,
          },
        });
        this.logger.log(`Family ${family.id}: initial purchase (${isTrialing ? 'trial' : 'paid'})`);
        break;
      }

      case 'RENEWAL': {
        await this.prisma.family.update({
          where: { id: family.id },
          data: {
            plan: 'premium',
            subscriptionStatus: 'active',
            subscriptionExpiresAt: expiresAt,
            gracePeriodEndsAt: null,
          },
        });
        this.logger.log(`Family ${family.id}: renewed`);
        break;
      }

      case 'CANCELLATION': {
        await this.prisma.family.update({
          where: { id: family.id },
          data: {
            subscriptionStatus: 'cancelled',
          },
        });
        this.logger.log(`Family ${family.id}: cancelled (active until ${expiresAt?.toISOString()})`);
        break;
      }

      case 'EXPIRATION': {
        const gracePeriodEndsAt = new Date();
        gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + GRACE_PERIOD_DAYS);

        const activeQuestCount = await this.prisma.quest.count({
          where: { familyId: family.id, isArchived: false },
        });

        await this.prisma.family.update({
          where: { id: family.id },
          data: {
            plan: 'free',
            subscriptionStatus: 'expired',
            gracePeriodEndsAt:
              activeQuestCount > FREE_PLAN_QUEST_LIMIT ? gracePeriodEndsAt : null,
          },
        });

        if (activeQuestCount > FREE_PLAN_QUEST_LIMIT) {
          await this.notificationService.sendToParents(family.id, {
            title: 'Subscription Expired',
            body: `Your premium plan has ended. You have ${activeQuestCount} active quests but the free plan allows ${FREE_PLAN_QUEST_LIMIT}. Please choose which quests to keep within ${GRACE_PERIOD_DAYS} days.`,
            data: { screen: 'quest-archival' },
          });
        }

        this.logger.log(`Family ${family.id}: expired, grace period until ${gracePeriodEndsAt.toISOString()}`);
        break;
      }

      case 'BILLING_ISSUE': {
        await this.prisma.family.update({
          where: { id: family.id },
          data: { subscriptionStatus: 'billing_issue' },
        });

        await this.notificationService.sendToParents(family.id, {
          title: 'Payment Issue',
          body: 'There was a problem with your ScreenQuest subscription payment. Please update your payment method to keep premium features.',
        });

        this.logger.log(`Family ${family.id}: billing issue`);
        break;
      }

      default:
        this.logger.log(`Webhook: unhandled event type ${type}`);
    }

    // Mark event as processed for idempotency
    await this.redis.set(idempotencyKey, '1', 'EX', WEBHOOK_IDEMPOTENCY_TTL);
  }

  async archiveExcessQuests(familyId: string, keepQuestIds?: string[]) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) throw new NotFoundException('Family not found');

    const activeQuests = await this.prisma.quest.findMany({
      where: { familyId, isArchived: false },
      orderBy: { createdAt: 'desc' },
    });

    if (activeQuests.length <= FREE_PLAN_QUEST_LIMIT) return;

    let toKeep: string[];
    if (keepQuestIds && keepQuestIds.length === FREE_PLAN_QUEST_LIMIT) {
      // Validate that all keepQuestIds belong to this family
      const validIds = activeQuests.map((q: { id: string }) => q.id);
      const allValid = keepQuestIds.every((id) => validIds.includes(id));
      if (!allValid) throw new BadRequestException('Invalid quest IDs');
      toKeep = keepQuestIds;
    } else {
      // Auto-archive: keep the 3 oldest (most established)
      toKeep = activeQuests
        .sort((a: { createdAt: Date }, b: { createdAt: Date }) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(0, FREE_PLAN_QUEST_LIMIT)
        .map((q: { id: string }) => q.id);
    }

    const toArchive = activeQuests.filter((q: { id: string }) => !toKeep.includes(q.id)).map((q: { id: string }) => q.id);

    await this.prisma.quest.updateMany({
      where: { id: { in: toArchive } },
      data: { isArchived: true },
    });

    // Clear grace period
    await this.prisma.family.update({
      where: { id: familyId },
      data: { gracePeriodEndsAt: null },
    });

    this.logger.log(`Family ${familyId}: archived ${toArchive.length} quests`);
  }

  async linkRevenueCatUser(familyId: string, revenuecatAppUserId: string) {
    await this.prisma.family.update({
      where: { id: familyId },
      data: { revenuecatAppUserId },
    });
  }

  // Avatar pack purchases
  async purchaseAvatarPack(userId: string, packId: string) {
    return this.prisma.avatarPackPurchase.create({
      data: { userId, packId },
    });
  }

  async getOwnedPacks(userId: string): Promise<string[]> {
    const purchases = await this.prisma.avatarPackPurchase.findMany({
      where: { userId },
      select: { packId: true },
    });
    return purchases.map((p: { packId: string }) => p.packId);
  }
}
