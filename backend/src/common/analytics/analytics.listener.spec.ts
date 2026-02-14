import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsListener } from './analytics.listener';
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

describe('AnalyticsListener', () => {
  let listener: AnalyticsListener;
  let analytics: {
    track: jest.Mock;
    trackSignupCompleted: jest.Mock;
    trackFamilyCreated: jest.Mock;
    trackChildAdded: jest.Mock;
    trackQuestCreated: jest.Mock;
    trackQuestCompleted: jest.Mock;
    trackQuestCompletionApproved: jest.Mock;
    trackQuestCompletionDenied: jest.Mock;
    trackPlaySessionStarted: jest.Mock;
    trackPlaySessionCompleted: jest.Mock;
    trackPlaySessionApproved: jest.Mock;
    trackPlaySessionDenied: jest.Mock;
    trackAchievementEarned: jest.Mock;
    trackLevelUp: jest.Mock;
    trackAvatarCustomized: jest.Mock;
    trackViolationRecorded: jest.Mock;
    trackTrialStarted: jest.Mock;
    trackSubscriptionPurchased: jest.Mock;
    trackSubscriptionCancelled: jest.Mock;
  };

  beforeEach(async () => {
    analytics = {
      track: jest.fn(),
      trackSignupCompleted: jest.fn(),
      trackFamilyCreated: jest.fn(),
      trackChildAdded: jest.fn(),
      trackQuestCreated: jest.fn(),
      trackQuestCompleted: jest.fn(),
      trackQuestCompletionApproved: jest.fn(),
      trackQuestCompletionDenied: jest.fn(),
      trackPlaySessionStarted: jest.fn(),
      trackPlaySessionCompleted: jest.fn(),
      trackPlaySessionApproved: jest.fn(),
      trackPlaySessionDenied: jest.fn(),
      trackAchievementEarned: jest.fn(),
      trackLevelUp: jest.fn(),
      trackAvatarCustomized: jest.fn(),
      trackViolationRecorded: jest.fn(),
      trackTrialStarted: jest.fn(),
      trackSubscriptionPurchased: jest.fn(),
      trackSubscriptionCancelled: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsListener,
        { provide: AnalyticsService, useValue: analytics },
      ],
    }).compile();

    listener = module.get<AnalyticsListener>(AnalyticsListener);
  });

  it('forwards user.registered to trackSignupCompleted', () => {
    listener.handleUserRegistered(new UserRegisteredEvent('u1', 'parent', 'test@test.com'));
    expect(analytics.trackSignupCompleted).toHaveBeenCalledWith('u1', { role: 'parent' });
  });

  it('forwards user.logged_in to track', () => {
    listener.handleUserLoggedIn(new UserLoggedInEvent('u1', 'parent'));
    expect(analytics.track).toHaveBeenCalledWith('u1', 'user_logged_in', { role: 'parent' });
  });

  it('forwards family.created to trackFamilyCreated', () => {
    listener.handleFamilyCreated(new FamilyCreatedEvent('u1', 'f1'));
    expect(analytics.trackFamilyCreated).toHaveBeenCalledWith('u1', 'f1');
  });

  it('forwards child.added to trackChildAdded', () => {
    listener.handleChildAdded(new ChildAddedEvent('u1', 'f1', 'c1'));
    expect(analytics.trackChildAdded).toHaveBeenCalledWith('u1', 'f1', 'c1');
  });

  it('forwards quest.created to trackQuestCreated', () => {
    listener.handleQuestCreated(new QuestCreatedEvent('u1', 'f1', 'q1', 'chores', 'custom'));
    expect(analytics.trackQuestCreated).toHaveBeenCalledWith('u1', {
      familyId: 'f1',
      questId: 'q1',
      category: 'chores',
      source: 'custom',
    });
  });

  it('forwards quest.completed to trackQuestCompleted', () => {
    listener.handleQuestCompleted(new QuestCompletedEvent('c1', 'f1', 'q1', 'chores', 30));
    expect(analytics.trackQuestCompleted).toHaveBeenCalledWith('c1', {
      questId: 'q1',
      category: 'chores',
      rewardMinutes: 30,
      familyId: 'f1',
    });
  });

  it('forwards quest.approved to trackQuestCompletionApproved', () => {
    listener.handleQuestApproved(new QuestApprovedEvent('u1', 'comp1', 'c1'));
    expect(analytics.trackQuestCompletionApproved).toHaveBeenCalledWith('u1', 'comp1', 'c1');
  });

  it('forwards quest.denied to trackQuestCompletionDenied', () => {
    listener.handleQuestDenied(new QuestDeniedEvent('u1', 'comp1', 'c1'));
    expect(analytics.trackQuestCompletionDenied).toHaveBeenCalledWith('u1', 'comp1', 'c1');
  });

  it('forwards play_session.started to trackPlaySessionStarted', () => {
    listener.handlePlaySessionStarted(new PlaySessionStartedEvent('c1', 'f1', 's1', 30));
    expect(analytics.trackPlaySessionStarted).toHaveBeenCalledWith('c1', {
      sessionId: 's1',
      durationMinutes: 30,
      familyId: 'f1',
    });
  });

  it('forwards play_session.completed to trackPlaySessionCompleted', () => {
    listener.handlePlaySessionCompleted(new PlaySessionCompletedEvent('c1', 'f1', 's1', 25));
    expect(analytics.trackPlaySessionCompleted).toHaveBeenCalledWith('c1', {
      sessionId: 's1',
      actualMinutes: 25,
      familyId: 'f1',
    });
  });

  it('forwards play_session.approved to trackPlaySessionApproved', () => {
    listener.handlePlaySessionApproved(new PlaySessionApprovedEvent('u1', 's1', 'c1'));
    expect(analytics.trackPlaySessionApproved).toHaveBeenCalledWith('u1', 's1', 'c1');
  });

  it('forwards play_session.denied to trackPlaySessionDenied', () => {
    listener.handlePlaySessionDenied(new PlaySessionDeniedEvent('u1', 's1', 'c1'));
    expect(analytics.trackPlaySessionDenied).toHaveBeenCalledWith('u1', 's1', 'c1');
  });

  it('forwards achievement.earned to trackAchievementEarned', () => {
    listener.handleAchievementEarned(new AchievementEarnedEvent('c1', 'f1', 'first_quest', 'First Quest'));
    expect(analytics.trackAchievementEarned).toHaveBeenCalledWith('c1', {
      achievementKey: 'first_quest',
      achievementName: 'First Quest',
      familyId: 'f1',
    });
  });

  it('forwards level.up to trackLevelUp', () => {
    listener.handleLevelUp(new LevelUpEvent('c1', 'f1', 2, 'Explorer'));
    expect(analytics.trackLevelUp).toHaveBeenCalledWith('c1', {
      newLevel: 2,
      levelName: 'Explorer',
      familyId: 'f1',
    });
  });

  it('forwards avatar.customized to trackAvatarCustomized', () => {
    listener.handleAvatarCustomized(new AvatarCustomizedEvent('c1', 'f1'));
    expect(analytics.trackAvatarCustomized).toHaveBeenCalledWith('c1', 'f1');
  });

  it('forwards violation.recorded to trackViolationRecorded', () => {
    listener.handleViolationRecorded(new ViolationRecordedEvent('u1', 'f1', 'c1'));
    expect(analytics.trackViolationRecorded).toHaveBeenCalledWith('u1', 'f1', 'c1');
  });

  it('forwards trial.started to trackTrialStarted', () => {
    listener.handleTrialStarted(new TrialStartedEvent('u1', 'f1'));
    expect(analytics.trackTrialStarted).toHaveBeenCalledWith('u1', 'f1');
  });

  it('forwards subscription.purchased to trackSubscriptionPurchased', () => {
    listener.handleSubscriptionPurchased(new SubscriptionPurchasedEvent('u1', 'f1', 'monthly', 4.99));
    expect(analytics.trackSubscriptionPurchased).toHaveBeenCalledWith('u1', {
      familyId: 'f1',
      plan: 'monthly',
      price: 4.99,
    });
  });

  it('forwards subscription.cancelled to trackSubscriptionCancelled', () => {
    listener.handleSubscriptionCancelled(new SubscriptionCancelledEvent('u1', 'f1'));
    expect(analytics.trackSubscriptionCancelled).toHaveBeenCalledWith('u1', 'f1');
  });
});
