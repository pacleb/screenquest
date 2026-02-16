import api from './api';

export interface ThemeData {
  id: string;
  key: string;
  name: string;
  description: string;
  previewUrl: string | null;
  unlockType: string;
  unlockValue: string | null;
  colors: Record<string, string>;
  gradients: Record<string, string[]>;
  isAnimated: boolean;
  category: string;
  isUnlocked: boolean;
  isActive: boolean;
}

export interface WeeklyStatsData {
  questsCompleted: number;
  secondsEarned: number;
  xpEarned: number;
  totalPlaySeconds: number;
  currentStreak: number;
  dailyStats: {
    date: string;
    quests: number;
    seconds: number;
    xp: number;
    playSeconds: number;
  }[];
}

export interface ActivityFeedEntry {
  type: 'quest_completion' | 'achievement' | 'play_session';
  childId: string;
  childName: string;
  childAvatar: string | null;
  message: string;
  icon: string;
  timestamp: string;
}

export interface ActivityFeedData {
  items: ActivityFeedEntry[];
  page: number;
  hasMore: boolean;
}

export interface BadgeShowcaseData {
  id: string;
  name: string;
  icon: string;
  badgeTier: string;
  badgeColor: string;
}

export const themeService = {
  getThemes: () =>
    api.get<ThemeData[]>('/gamification/themes').then((r) => r.data),

  setActiveTheme: (themeId: string) =>
    api.put('/gamification/themes/active', { themeId }).then((r) => r.data),

  getWeeklyStats: () => {
    const tzOffset = -(new Date().getTimezoneOffset());
    return api.get<WeeklyStatsData>('/gamification/progress/weekly-stats', { params: { tzOffset } }).then((r) => r.data);
  },

  getActivityFeed: (familyId: string, page = 1, limit = 20) =>
    api
      .get<ActivityFeedData>(`/families/${familyId}/activity-feed`, { params: { page, limit } })
      .then((r) => r.data),

  getShowcase: (childId: string) =>
    api.get<BadgeShowcaseData[]>(`/gamification/badges/showcase/${childId}`).then((r) => r.data),

  setShowcase: (badgeIds: string[]) =>
    api.put<BadgeShowcaseData[]>('/gamification/badges/showcase', { badgeIds }).then((r) => r.data),

  useStreakFreeze: () =>
    api.post<{ success: boolean; message: string }>('/gamification/streak-freeze').then((r) => r.data),
};
