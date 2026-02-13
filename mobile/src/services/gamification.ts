import api from './api';

export interface ChildProgressData {
  totalXp: number;
  level: number;
  levelName: string;
  currentStreak: number;
  longestStreak: number;
  weeklyXp: number;
  xpToNextLevel: number;
  xpProgressInLevel: number;
}

export interface AchievementData {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  unlockedAt: string | null;
}

export interface GamificationEvent {
  xpEarned: number;
  newLevel: { level: number; name: string } | null;
  newAchievements: { key: string; name: string; icon: string }[];
  streakUpdated: boolean;
  currentStreak: number;
}

export interface AvatarItemData {
  id: string;
  key: string;
  name: string;
  icon: string;
  slot: string;
  unlockType: string;
  unlockValue: string | null;
  isUnlocked: boolean;
  isEquipped: boolean;
}

export interface LeaderboardEntry {
  childId: string;
  name: string;
  avatarUrl: string | null;
  weeklyXp: number;
  level: number;
  levelName: string;
  rank: number;
}

export const gamificationService = {
  getProgress: (childId: string) =>
    api.get<ChildProgressData>(`/children/${childId}/gamification/progress`).then((r) => r.data),

  getAchievements: (childId: string) =>
    api.get<AchievementData[]>(`/children/${childId}/gamification/achievements`).then((r) => r.data),

  getAvatarItems: (childId: string) =>
    api.get<AvatarItemData[]>(`/children/${childId}/gamification/avatar/items`).then((r) => r.data),

  getEquippedItems: (childId: string) =>
    api.get(`/children/${childId}/gamification/avatar/equipped`).then((r) => r.data),

  equipItem: (childId: string, avatarItemId: string) =>
    api.put(`/children/${childId}/gamification/avatar/equip`, { avatarItemId }).then((r) => r.data),

  unequipSlot: (childId: string, slot: string) =>
    api.delete(`/children/${childId}/gamification/avatar/slot/${slot}`).then((r) => r.data),

  getLeaderboard: (familyId: string) =>
    api
      .get<{ enabled: boolean; entries: LeaderboardEntry[] }>(
        `/families/${familyId}/gamification/leaderboard`,
      )
      .then((r) => r.data),

  toggleLeaderboard: (familyId: string, enabled: boolean) =>
    api.put(`/families/${familyId}/gamification/leaderboard/toggle`, { enabled }).then((r) => r.data),

  getLeaderboardSetting: (familyId: string) =>
    api
      .get<{ enabled: boolean }>(`/families/${familyId}/gamification/leaderboard/setting`)
      .then((r) => r.data),
};
