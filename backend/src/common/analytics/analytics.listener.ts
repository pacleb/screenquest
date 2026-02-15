import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AnalyticsService } from './analytics.service';
import {
  UserRegisteredEvent,
  UserLoggedInEvent,
  FamilyCreatedEvent,
  ChildAddedEvent,
  QuestCreatedEvent,
  QuestCompletedEvent,
  QuestApprovedEvent,
  QuestDeniedEvent,
  PlaySessionStartedEvent,
  PlaySessionCompletedEvent,
  PlaySessionApprovedEvent,
  PlaySessionDeniedEvent,
  AchievementEarnedEvent,
  LevelUpEvent,
  AvatarCustomizedEvent,
  ViolationRecordedEvent,
  TrialStartedEvent,
  SubscriptionPurchasedEvent,
  SubscriptionCancelledEvent,
} from './analytics.events';

/**
 * Listens to domain events and forwards them to PostHog analytics.
 * This decouples analytics from business logic — services just emit events.
 */
@Injectable()
export class AnalyticsListener {
  private readonly logger = new Logger(AnalyticsListener.name);

  constructor(private readonly analytics: AnalyticsService) {}

  // ─── Auth ───────────────────────────────────────────────────

  @OnEvent('user.registered')
  handleUserRegistered(event: UserRegisteredEvent) {
    this.analytics.trackSignupCompleted(event.userId, { role: event.role });
  }

  @OnEvent('user.logged_in')
  handleUserLoggedIn(event: UserLoggedInEvent) {
    this.analytics.track(event.userId, 'user_logged_in', { role: event.role });
  }

  // ─── Family ─────────────────────────────────────────────────

  @OnEvent('family.created')
  handleFamilyCreated(event: FamilyCreatedEvent) {
    this.analytics.trackFamilyCreated(event.userId, event.familyId);
  }

  @OnEvent('child.added')
  handleChildAdded(event: ChildAddedEvent) {
    this.analytics.trackChildAdded(event.userId, event.familyId, event.childId);
  }

  // ─── Quests ─────────────────────────────────────────────────

  @OnEvent('quest.created')
  handleQuestCreated(event: QuestCreatedEvent) {
    this.analytics.trackQuestCreated(event.userId, {
      familyId: event.familyId,
      questId: event.questId,
      category: event.category,
      source: event.source,
    });
  }

  @OnEvent('quest.completed')
  handleQuestCompleted(event: QuestCompletedEvent) {
    this.analytics.trackQuestCompleted(event.childId, {
      questId: event.questId,
      category: event.category,
      rewardSeconds: event.rewardSeconds,
      familyId: event.familyId,
    });
  }

  @OnEvent('quest.approved')
  handleQuestApproved(event: QuestApprovedEvent) {
    this.analytics.trackQuestCompletionApproved(event.userId, event.completionId, event.childId);
  }

  @OnEvent('quest.denied')
  handleQuestDenied(event: QuestDeniedEvent) {
    this.analytics.trackQuestCompletionDenied(event.userId, event.completionId, event.childId);
  }

  // ─── Play Sessions ─────────────────────────────────────────

  @OnEvent('play_session.started')
  handlePlaySessionStarted(event: PlaySessionStartedEvent) {
    this.analytics.trackPlaySessionStarted(event.childId, {
      sessionId: event.sessionId,
      durationSeconds: event.durationSeconds,
      familyId: event.familyId,
    });
  }

  @OnEvent('play_session.completed')
  handlePlaySessionCompleted(event: PlaySessionCompletedEvent) {
    this.analytics.trackPlaySessionCompleted(event.childId, {
      sessionId: event.sessionId,
      actualSeconds: event.actualSeconds,
      familyId: event.familyId,
    });
  }

  @OnEvent('play_session.approved')
  handlePlaySessionApproved(event: PlaySessionApprovedEvent) {
    this.analytics.trackPlaySessionApproved(event.userId, event.sessionId, event.childId);
  }

  @OnEvent('play_session.denied')
  handlePlaySessionDenied(event: PlaySessionDeniedEvent) {
    this.analytics.trackPlaySessionDenied(event.userId, event.sessionId, event.childId);
  }

  // ─── Gamification ──────────────────────────────────────────

  @OnEvent('achievement.earned')
  handleAchievementEarned(event: AchievementEarnedEvent) {
    this.analytics.trackAchievementEarned(event.childId, {
      achievementKey: event.achievementKey,
      achievementName: event.achievementName,
      familyId: event.familyId,
    });
  }

  @OnEvent('level.up')
  handleLevelUp(event: LevelUpEvent) {
    this.analytics.trackLevelUp(event.childId, {
      newLevel: event.newLevel,
      levelName: event.levelName,
      familyId: event.familyId,
    });
  }

  @OnEvent('avatar.customized')
  handleAvatarCustomized(event: AvatarCustomizedEvent) {
    this.analytics.trackAvatarCustomized(event.childId, event.familyId);
  }

  // ─── Violations ────────────────────────────────────────────

  @OnEvent('violation.recorded')
  handleViolationRecorded(event: ViolationRecordedEvent) {
    this.analytics.trackViolationRecorded(event.userId, event.familyId, event.childId);
  }

  // ─── Subscriptions ─────────────────────────────────────────

  @OnEvent('trial.started')
  handleTrialStarted(event: TrialStartedEvent) {
    this.analytics.trackTrialStarted(event.userId, event.familyId);
  }

  @OnEvent('subscription.purchased')
  handleSubscriptionPurchased(event: SubscriptionPurchasedEvent) {
    this.analytics.trackSubscriptionPurchased(event.userId, {
      familyId: event.familyId,
      plan: event.plan,
      price: event.price,
    });
  }

  @OnEvent('subscription.cancelled')
  handleSubscriptionCancelled(event: SubscriptionCancelledEvent) {
    this.analytics.trackSubscriptionCancelled(event.userId, event.familyId);
  }
}
