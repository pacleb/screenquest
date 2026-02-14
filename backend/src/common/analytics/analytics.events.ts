/**
 * Domain events emitted throughout the app.
 * The AnalyticsListener subscribes to these events and forwards them to PostHog.
 */

// ─── Auth Events ──────────────────────────────────────────────

export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly role: string,
    public readonly email: string,
  ) {}
}

export class UserLoggedInEvent {
  constructor(
    public readonly userId: string,
    public readonly role: string,
  ) {}
}

// ─── Family Events ────────────────────────────────────────────

export class FamilyCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly familyId: string,
  ) {}
}

export class ChildAddedEvent {
  constructor(
    public readonly userId: string,
    public readonly familyId: string,
    public readonly childId: string,
  ) {}
}

// ─── Quest Events ─────────────────────────────────────────────

export class QuestCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly familyId: string,
    public readonly questId: string,
    public readonly category: string,
    public readonly source: string, // 'custom' or 'library'
  ) {}
}

export class QuestCompletedEvent {
  constructor(
    public readonly childId: string,
    public readonly familyId: string,
    public readonly questId: string,
    public readonly category: string,
    public readonly rewardMinutes: number,
  ) {}
}

export class QuestApprovedEvent {
  constructor(
    public readonly userId: string,
    public readonly completionId: string,
    public readonly childId: string,
  ) {}
}

export class QuestDeniedEvent {
  constructor(
    public readonly userId: string,
    public readonly completionId: string,
    public readonly childId: string,
  ) {}
}

// ─── Play Session Events ──────────────────────────────────────

export class PlaySessionStartedEvent {
  constructor(
    public readonly childId: string,
    public readonly familyId: string,
    public readonly sessionId: string,
    public readonly durationMinutes: number,
  ) {}
}

export class PlaySessionCompletedEvent {
  constructor(
    public readonly childId: string,
    public readonly familyId: string,
    public readonly sessionId: string,
    public readonly actualMinutes: number,
  ) {}
}

export class PlaySessionApprovedEvent {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly childId: string,
  ) {}
}

export class PlaySessionDeniedEvent {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly childId: string,
  ) {}
}

// ─── Gamification Events ──────────────────────────────────────

export class AchievementEarnedEvent {
  constructor(
    public readonly childId: string,
    public readonly familyId: string,
    public readonly achievementKey: string,
    public readonly achievementName: string,
  ) {}
}

export class LevelUpEvent {
  constructor(
    public readonly childId: string,
    public readonly familyId: string,
    public readonly newLevel: number,
    public readonly levelName: string,
  ) {}
}

export class AvatarCustomizedEvent {
  constructor(
    public readonly childId: string,
    public readonly familyId: string,
  ) {}
}

// ─── Violation Events ─────────────────────────────────────────

export class ViolationRecordedEvent {
  constructor(
    public readonly userId: string,
    public readonly familyId: string,
    public readonly childId: string,
  ) {}
}

// ─── Subscription Events ──────────────────────────────────────

export class TrialStartedEvent {
  constructor(
    public readonly userId: string,
    public readonly familyId: string,
  ) {}
}

export class SubscriptionPurchasedEvent {
  constructor(
    public readonly userId: string,
    public readonly familyId: string,
    public readonly plan: string,
    public readonly price?: number,
  ) {}
}

export class SubscriptionCancelledEvent {
  constructor(
    public readonly userId: string,
    public readonly familyId: string,
  ) {}
}
