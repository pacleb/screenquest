import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

export interface AnalyticsEventProperties {
  userId?: string;
  familyId?: string;
  childId?: string;
  [key: string]: any;
}

/**
 * Server-side analytics service using PostHog.
 *
 * All child engagement events are tracked here (never from client SDK).
 * Parent funnel events are also tracked server-side for consistency.
 */
@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  private client: PostHog | null = null;
  private readonly enabled: boolean;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('POSTHOG_API_KEY');
    const host = this.config.get<string>('POSTHOG_HOST') || 'https://us.i.posthog.com';

    this.enabled = !!apiKey;

    if (apiKey) {
      this.client = new PostHog(apiKey, {
        host,
        flushAt: 20,
        flushInterval: 10000, // 10 seconds
      });
      this.logger.log('PostHog analytics initialized');
    } else {
      this.logger.warn('PostHog analytics disabled — POSTHOG_API_KEY not set');
    }
  }

  /**
   * Track an analytics event.
   * @param distinctId - The user's unique identifier
   * @param event - Event name (e.g., 'quest_completed', 'signup_completed')
   * @param properties - Additional event properties
   */
  track(distinctId: string, event: string, properties?: AnalyticsEventProperties): void {
    if (!this.client || !this.enabled) return;

    try {
      this.client.capture({
        distinctId,
        event,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          source: 'backend',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to track event "${event}": ${error}`);
    }
  }

  /**
   * Identify a user with properties (for user profiles in PostHog).
   */
  identify(distinctId: string, properties: Record<string, any>): void {
    if (!this.client || !this.enabled) return;

    try {
      this.client.identify({
        distinctId,
        properties,
      });
    } catch (error) {
      this.logger.error(`Failed to identify user: ${error}`);
    }
  }

  /**
   * Associate a user with a group (family).
   */
  groupIdentify(familyId: string, properties: Record<string, any>): void {
    if (!this.client || !this.enabled) return;

    try {
      this.client.groupIdentify({
        groupType: 'family',
        groupKey: familyId,
        properties,
      });
    } catch (error) {
      this.logger.error(`Failed to identify group: ${error}`);
    }
  }

  // ─── Parent Funnel Events ───────────────────────────────────────

  trackSignupCompleted(userId: string, properties?: Record<string, any>): void {
    this.track(userId, 'signup_completed', {
      userId,
      ...properties,
    });
    this.identify(userId, {
      role: properties?.role || 'parent',
      createdAt: new Date().toISOString(),
    });
  }

  trackFamilyCreated(userId: string, familyId: string): void {
    this.track(userId, 'family_created', { userId, familyId });
    this.groupIdentify(familyId, {
      createdAt: new Date().toISOString(),
    });
  }

  trackChildAdded(userId: string, familyId: string, childId: string): void {
    this.track(userId, 'child_added', { userId, familyId, childId });
  }

  trackQuestCreated(
    userId: string,
    properties: { familyId: string; questId: string; category?: string; source?: string },
  ): void {
    this.track(userId, 'quest_created', { userId, ...properties });
  }

  trackQuestCompletionApproved(userId: string, completionId: string, childId: string): void {
    this.track(userId, 'quest_completion_approved', { userId, completionId, childId });
  }

  trackQuestCompletionDenied(userId: string, completionId: string, childId: string): void {
    this.track(userId, 'quest_completion_denied', { userId, completionId, childId });
  }

  trackPlaySessionApproved(userId: string, sessionId: string, childId: string): void {
    this.track(userId, 'play_session_approved', { userId, sessionId, childId });
  }

  trackPlaySessionDenied(userId: string, sessionId: string, childId: string): void {
    this.track(userId, 'play_session_denied', { userId, sessionId, childId });
  }

  trackViolationRecorded(userId: string, familyId: string, childId: string): void {
    this.track(userId, 'violation_recorded', { userId, familyId, childId });
  }

  trackPaywallViewed(userId: string): void {
    this.track(userId, 'paywall_viewed', { userId });
  }

  trackTrialStarted(userId: string, familyId: string): void {
    this.track(userId, 'trial_started', { userId, familyId });
  }

  trackSubscriptionPurchased(
    userId: string,
    properties: { familyId: string; plan: string; price?: number },
  ): void {
    this.track(userId, 'subscription_purchased', { userId, ...properties });
  }

  trackSubscriptionCancelled(userId: string, familyId: string): void {
    this.track(userId, 'subscription_cancelled', { userId, familyId });
  }

  // ─── Child Engagement Events (server-side only) ─────────────────

  trackQuestCompleted(
    childId: string,
    properties: { questId: string; category?: string; rewardSeconds: number; familyId: string },
  ): void {
    this.track(childId, 'quest_completed', { childId, ...properties });
  }

  trackPlaySessionStarted(
    childId: string,
    properties: { sessionId: string; durationSeconds: number; familyId: string },
  ): void {
    this.track(childId, 'play_session_started', { childId, ...properties });
  }

  trackPlaySessionCompleted(
    childId: string,
    properties: { sessionId: string; actualSeconds: number; familyId: string },
  ): void {
    this.track(childId, 'play_session_completed', { childId, ...properties });
  }

  trackAchievementEarned(
    childId: string,
    properties: { achievementKey: string; achievementName: string; familyId: string },
  ): void {
    this.track(childId, 'achievement_earned', { childId, ...properties });
  }

  trackLevelUp(
    childId: string,
    properties: { newLevel: number; levelName: string; familyId: string },
  ): void {
    this.track(childId, 'level_up', { childId, ...properties });
  }

  trackAvatarCustomized(childId: string, familyId: string): void {
    this.track(childId, 'avatar_customized', { childId, familyId });
  }

  // ─── Lifecycle ──────────────────────────────────────────────────

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.shutdown();
      this.logger.log('PostHog analytics shut down');
    }
  }
}
