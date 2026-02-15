import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let configService: { get: jest.Mock };

  describe('when PostHog is disabled (no API key)', () => {
    beforeEach(async () => {
      configService = { get: jest.fn().mockReturnValue(undefined) };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AnalyticsService,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      service = module.get<AnalyticsService>(AnalyticsService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should not throw when tracking events without PostHog', () => {
      expect(() => service.track('user-1', 'test_event', { foo: 'bar' })).not.toThrow();
    });

    it('should not throw when identifying users without PostHog', () => {
      expect(() => service.identify('user-1', { name: 'Test' })).not.toThrow();
    });

    it('should not throw when group identifying without PostHog', () => {
      expect(() => service.groupIdentify('family-1', { name: 'Fam' })).not.toThrow();
    });

    it('trackSignupCompleted does not throw', () => {
      expect(() => service.trackSignupCompleted('user-1', { role: 'parent' })).not.toThrow();
    });

    it('trackFamilyCreated does not throw', () => {
      expect(() => service.trackFamilyCreated('user-1', 'family-1')).not.toThrow();
    });

    it('trackChildAdded does not throw', () => {
      expect(() => service.trackChildAdded('user-1', 'family-1', 'child-1')).not.toThrow();
    });

    it('trackQuestCreated does not throw', () => {
      expect(() =>
        service.trackQuestCreated('user-1', {
          familyId: 'family-1',
          questId: 'quest-1',
          category: 'chores',
          source: 'custom',
        }),
      ).not.toThrow();
    });

    it('trackQuestCompleted does not throw', () => {
      expect(() =>
        service.trackQuestCompleted('child-1', {
          questId: 'quest-1',
          category: 'chores',
          rewardSeconds: 30,
          familyId: 'family-1',
        }),
      ).not.toThrow();
    });

    it('trackQuestCompletionApproved does not throw', () => {
      expect(() =>
        service.trackQuestCompletionApproved('user-1', 'completion-1', 'child-1'),
      ).not.toThrow();
    });

    it('trackQuestCompletionDenied does not throw', () => {
      expect(() =>
        service.trackQuestCompletionDenied('user-1', 'completion-1', 'child-1'),
      ).not.toThrow();
    });

    it('trackPlaySessionStarted does not throw', () => {
      expect(() =>
        service.trackPlaySessionStarted('child-1', {
          sessionId: 'session-1',
          durationSeconds: 30,
          familyId: 'family-1',
        }),
      ).not.toThrow();
    });

    it('trackPlaySessionCompleted does not throw', () => {
      expect(() =>
        service.trackPlaySessionCompleted('child-1', {
          sessionId: 'session-1',
          actualSeconds: 25,
          familyId: 'family-1',
        }),
      ).not.toThrow();
    });

    it('trackPlaySessionApproved does not throw', () => {
      expect(() =>
        service.trackPlaySessionApproved('user-1', 'session-1', 'child-1'),
      ).not.toThrow();
    });

    it('trackPlaySessionDenied does not throw', () => {
      expect(() =>
        service.trackPlaySessionDenied('user-1', 'session-1', 'child-1'),
      ).not.toThrow();
    });

    it('trackAchievementEarned does not throw', () => {
      expect(() =>
        service.trackAchievementEarned('child-1', {
          achievementKey: 'first_quest',
          achievementName: 'First Quest',
          familyId: 'family-1',
        }),
      ).not.toThrow();
    });

    it('trackLevelUp does not throw', () => {
      expect(() =>
        service.trackLevelUp('child-1', {
          newLevel: 2,
          levelName: 'Explorer',
          familyId: 'family-1',
        }),
      ).not.toThrow();
    });

    it('trackAvatarCustomized does not throw', () => {
      expect(() => service.trackAvatarCustomized('child-1', 'family-1')).not.toThrow();
    });

    it('trackViolationRecorded does not throw', () => {
      expect(() =>
        service.trackViolationRecorded('user-1', 'family-1', 'child-1'),
      ).not.toThrow();
    });

    it('trackTrialStarted does not throw', () => {
      expect(() => service.trackTrialStarted('user-1', 'family-1')).not.toThrow();
    });

    it('trackSubscriptionPurchased does not throw', () => {
      expect(() =>
        service.trackSubscriptionPurchased('user-1', {
          familyId: 'family-1',
          plan: 'monthly',
          price: 4.99,
        }),
      ).not.toThrow();
    });

    it('trackSubscriptionCancelled does not throw', () => {
      expect(() =>
        service.trackSubscriptionCancelled('user-1', 'family-1'),
      ).not.toThrow();
    });

    it('onModuleDestroy does not throw', async () => {
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });
});
