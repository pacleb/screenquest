export class SubscriptionStatusDto {
  plan: string;
  subscriptionStatus: string | null;
  expiresAt: string | null;
  isActive: boolean;
  willRenew: boolean;
  period: string | null;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
  gracePeriodEndsAt: string | null;
  activeQuestCount: number;
  questLimit: number | null;
}

export interface RevenueCatWebhookEvent {
  api_version: string;
  event: {
    type: string;
    app_user_id: string;
    product_id: string;
    period_type: string;
    expiration_at_ms: number;
    environment: string;
    store: string;
  };
}

export class ArchiveQuestsDto {
  keepQuestIds: string[];
}
