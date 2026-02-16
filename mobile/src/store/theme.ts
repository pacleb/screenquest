import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themeService, ThemeData, WeeklyStatsData, ActivityFeedData, BadgeShowcaseData } from '../services/theme';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  card: string;
  textPrimary: string;
  textSecondary: string;
  error: string;
  warning: string;
  border: string;
  xp: string;
  streak: string;
}

interface ThemeState {
  themes: ThemeData[];
  activeTheme: ThemeData | null;
  weeklyStats: WeeklyStatsData | null;
  activityFeed: ActivityFeedData | null;
  showcaseBadges: BadgeShowcaseData[];
  loading: boolean;
  fetchThemes: () => Promise<void>;
  setActiveTheme: (themeId: string) => Promise<void>;
  fetchWeeklyStats: () => Promise<void>;
  fetchActivityFeed: (familyId: string, page?: number) => Promise<void>;
  fetchShowcase: (childId: string) => Promise<void>;
  setShowcase: (badgeIds: string[]) => Promise<void>;
  useStreakFreeze: () => Promise<{ success: boolean; message: string }>;
  reset: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themes: [],
  activeTheme: null,
  weeklyStats: null,
  activityFeed: null,
  showcaseBadges: [],
  loading: false,

  fetchThemes: async () => {
    try {
      set({ loading: true });
      const themes = await themeService.getThemes();
      const active = themes.find((t) => t.isActive) ?? null;
      set({ themes, activeTheme: active, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setActiveTheme: async (themeId) => {
    try {
      await themeService.setActiveTheme(themeId);
      const { themes } = get();
      const theme = themes.find((t) => t.id === themeId) ?? null;
      set({
        activeTheme: theme,
        themes: themes.map((t) => ({
          ...t,
          isActive: t.id === themeId,
        })),
      });
    } catch {
      throw new Error('Failed to set theme');
    }
  },

  fetchWeeklyStats: async () => {
    try {
      const weeklyStats = await themeService.getWeeklyStats();
      set({ weeklyStats });
    } catch {}
  },

  fetchActivityFeed: async (familyId, page = 1) => {
    try {
      const activityFeed = await themeService.getActivityFeed(familyId, page);
      set({ activityFeed });
    } catch {}
  },

  fetchShowcase: async (childId) => {
    try {
      const showcaseBadges = await themeService.getShowcase(childId);
      set({ showcaseBadges });
    } catch {}
  },

  setShowcase: async (badgeIds) => {
    try {
      const showcaseBadges = await themeService.setShowcase(badgeIds);
      set({ showcaseBadges });
    } catch {
      throw new Error('Failed to update showcase');
    }
  },

  useStreakFreeze: async () => {
    try {
      const result = await themeService.useStreakFreeze();
      return result;
    } catch (err: any) {
      const message =
        err?.response?.data?.message || 'Failed to use streak freeze';
      return { success: false, message };
    }
  },

  reset: () =>
    set({
      themes: [],
      activeTheme: null,
      weeklyStats: null,
      activityFeed: null,
      showcaseBadges: [],
      loading: false,
    }),
}));
