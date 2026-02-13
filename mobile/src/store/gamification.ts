import { create } from 'zustand';
import {
  gamificationService,
  ChildProgressData,
  AchievementData,
  GamificationEvent,
  LeaderboardEntry,
} from '../services/gamification';

interface GamificationState {
  progress: ChildProgressData | null;
  achievements: AchievementData[];
  leaderboard: LeaderboardEntry[];
  leaderboardEnabled: boolean;
  loaded: boolean;
  pendingCelebration: GamificationEvent | null;

  fetchProgress: (childId: string) => Promise<void>;
  fetchAchievements: (childId: string) => Promise<void>;
  fetchLeaderboard: (familyId: string) => Promise<void>;
  fetchLeaderboardSetting: (familyId: string) => Promise<void>;
  setCelebration: (event: GamificationEvent | null) => void;
  reset: () => void;
}

export const useGamificationStore = create<GamificationState>((set) => ({
  progress: null,
  achievements: [],
  leaderboard: [],
  leaderboardEnabled: false,
  loaded: false,
  pendingCelebration: null,

  fetchProgress: async (childId) => {
    try {
      const progress = await gamificationService.getProgress(childId);
      set({ progress, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  fetchAchievements: async (childId) => {
    try {
      const achievements = await gamificationService.getAchievements(childId);
      set({ achievements });
    } catch {}
  },

  fetchLeaderboard: async (familyId) => {
    try {
      const data = await gamificationService.getLeaderboard(familyId);
      set({ leaderboard: data.entries, leaderboardEnabled: data.enabled });
    } catch {}
  },

  fetchLeaderboardSetting: async (familyId) => {
    try {
      const { enabled } = await gamificationService.getLeaderboardSetting(familyId);
      set({ leaderboardEnabled: enabled });
    } catch {}
  },

  setCelebration: (event) => set({ pendingCelebration: event }),

  reset: () =>
    set({
      progress: null,
      achievements: [],
      leaderboard: [],
      leaderboardEnabled: false,
      loaded: false,
      pendingCelebration: null,
    }),
}));
