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

  private extractWebhookContext(payload: RevenueCatWebhookEvent) {
    const rawEvent: any = (payload as any)?.event ?? payload;
    const aliases: string[] = Array.isArray(rawEvent?.aliases) ? rawEvent.aliases : [];
    const transferredTo: string[] = Array.isArray(rawEvent?.transferred_to) ? rawEvent.transferred_to : [];
    const transferredFrom: string[] = Array.isArray(rawEvent?.transferred_from)
      ? rawEvent.transferred_from
      : [];

    const candidates = [
      rawEvent?.app_user_id,
      rawEvent?.original_app_user_id,
      ...aliases,
      ...transferredTo,
      ...transferredFrom,
    ]
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map((v) => v.trim());

    // Keep insertion order while removing duplicates.
    const idCandidates = [...new Set(candidates)];

    return {
      rawEvent,
      type: rawEvent?.type as string | undefined,
      eventId: rawEvent?.id as string | undefined,
      expirationAtMs: rawEvent?.expiration_at_ms as number | undefined,
      productId: rawEvent?.product_id as string | undefined,
      idCandidates,
    };
  }

  async isPremium(familyId: string): Promise<boolean> {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      select: { plan: true, subscriptionExpiresAt: true, subscriptionStatus: true },
    });
    if (!family) return false;
    if (family.plan !== 'premium') return false;
    // subscriptionStatus 'active' is set by INITIAL_PURCHASE / RENEWAL webhooks
    // and is a strong signal the subscription is live, even when
    // subscriptionExpiresAt is stale due to a missed RENEWAL webhook.
    if (family.subscriptionStatus === 'active') return true;
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
      (family.subscriptionStatus === 'active' ||
        (!!family.subscriptionExpiresAt &&
          family.subscriptionExpiresAt > new Date()));

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
      gracePeriodEndsAt: family.gracePeriodEndsAt?.toISOString() ?? null,
      activeQuestCount,
      questLimit: isActive ? null : FREE_PLAN_QUEST_LIMIT,
    };
  }

  async handleWebhookEvent(event: RevenueCatWebhookEvent) {
    const {
      rawEvent,
      type,
      eventId,
      expirationAtMs,
      productId,
      idCandidates,
    } = this.extractWebhookContext(event);

    // Idempotency: skip duplicate webhook events
    const eventIdentity = eventId || `${type || 'unknown'}:${idCandidates[0] || 'unknown'}:${expirationAtMs || 'na'}`;
    const idempotencyKey = `webhook:${eventIdentity}`;
    const already = await this.redis.get(idempotencyKey);
    if (already) {
      this.logger.log(`Webhook: duplicate event ${eventIdentity}, skipping`);
      return;
    }

    this.logger.log(
      `Webhook received: type=${type}, idCandidates=[${idCandidates.join(', ')}], product=${productId}`,
    );

    if (idCandidates.length === 0) {
      this.logger.warn(
        `Webhook: no app user id in payload (type=${type || 'unknown'}, keys=${Object.keys(rawEvent || {}).join(',')})`,
      );
      return;
    }

    // RevenueCat recommends checking app_user_id, original_app_user_id, and aliases.
    // We support all of them to handle identity changes and payload variations.
    // Filter to valid UUIDs for the `id` column (Postgres rejects non-UUID
    // strings like "$RCAnonymousID:…" and would throw a 500).
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuidCandidates = idCandidates.filter((c) => UUID_RE.test(c));

    this.logger.log(
      `Webhook: uuidCandidates=[${uuidCandidates.join(', ')}], non-uuid filtered=${idCandidates.length - uuidCandidates.length}`,
    );

    const family = await this.prisma.family.findFirst({
      where: {
        OR: [
          ...(uuidCandidates.length > 0 ? [{ id: { in: uuidCandidates } }] : []),
          { revenuecatAppUserId: { in: idCandidates } },
        ],
      },
    });

    if (!family) {
      this.logger.warn(
        `Webhook: Family not found for ids [${idCandidates.join(', ')}] (uuid candidates: [${uuidCandidates.join(', ')}])`,
      );
      return;
    }

    this.logger.log(`Webhook: matched family ${family.id} (current plan=${(family as any).plan || 'unknown'})`);

    const expiresAt = expirationAtMs ? new Date(expirationAtMs) : null;
    const period = productId?.includes('yearly') ? 'yearly' : 'monthly';

    switch (type) {
      case 'INITIAL_PURCHASE':
      case 'NON_RENEWING_PURCHASE': {
        const rcUserId = idCandidates[0] ?? null;
        await this.prisma.family.update({
          where: { id: family.id },
          data: {
            plan: 'premium',
            subscriptionStatus: 'active',
            subscriptionExpiresAt: expiresAt,
            subscriptionPeriod: period,
            gracePeriodEndsAt: null,
            ...(rcUserId && !family.revenuecatAppUserId
              ? { revenuecatAppUserId: rcUserId }
              : {}),
          },
        });
        this.logger.log(`Family ${family.id}: initial purchase (rc_user=${rcUserId})`);
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

  async syncFromRevenueCat(familyId: string, apiKey: string, overrideAppUserId?: string): Promise<boolean> {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) return false;

    const appUserId = overrideAppUserId || family.revenuecatAppUserId || familyId;
    this.logger.log(`RevenueCat sync: querying subscriber ${appUserId} for family ${familyId}`);

    let subscriberData: any;
    try {
      const response = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );
      if (!response.ok) {
        this.logger.warn(`RevenueCat sync: API returned ${response.status} for family ${familyId} (userId=${appUserId})`);
        return false;
      }
      subscriberData = await response.json();
    } catch (e) {
      this.logger.warn(`RevenueCat sync: fetch failed for family ${familyId}: ${e}`);
      return false;
    }

    const entitlements = subscriberData?.subscriber?.entitlements;
    this.logger.log(
      `RevenueCat sync: entitlements for family ${familyId}: ${JSON.stringify(entitlements ? Object.keys(entitlements) : 'none')}`,
    );

    const entitlement = entitlements?.premium;
    if (!entitlement || !entitlement.expires_date) {
      this.logger.log(`RevenueCat sync: no active premium entitlement for family ${familyId}`);
      return false;
    }

    const expiresAt = new Date(entitlement.expires_date);
    if (expiresAt <= new Date()) {
      this.logger.log(`RevenueCat sync: entitlement expired at ${expiresAt.toISOString()} for family ${familyId}`);
      return false;
    }

    const productId = entitlement.product_identifier ?? '';
    const period = productId.includes('yearly') || productId.includes('annual') ? 'yearly' : 'monthly';

    await this.prisma.family.update({
      where: { id: familyId },
      data: {
        plan: 'premium',
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiresAt,
        subscriptionPeriod: period,
        gracePeriodEndsAt: null,
        // Store the RC user ID so webhook lookups and future syncs work
        ...(!family.revenuecatAppUserId && appUserId !== familyId
          ? { revenuecatAppUserId: appUserId }
          : {}),
      },
    });

    this.logger.log(`RevenueCat sync: updated family ${familyId} to premium, expires ${expiresAt.toISOString()}`);
    return true;
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
