import { IsOptional, IsString } from 'class-validator';

export class SubscriptionStatusDto {
  plan: string;
  subscriptionStatus: string | null;
  expiresAt: string | null;
  isActive: boolean;
  willRenew: boolean;
  period: string | null;
  gracePeriodEndsAt: string | null;
  activeQuestCount: number;
  questLimit: number | null;
}

export interface RevenueCatWebhookEvent {
  api_version: string;
  event: {
    id?: string;
    type: string;
    app_user_id?: string;
    original_app_user_id?: string;
    aliases?: string[];
    transferred_to?: string[];
    transferred_from?: string[];
    product_id?: string;
    period_type?: string;
    expiration_at_ms?: number;
    environment?: string;
    store?: string;
  };
}

export class SyncSubscriptionDto {
  @IsOptional()
  @IsString()
  appUserId?: string;
}

export class ArchiveQuestsDto {
  keepQuestIds: string[];
}
