import api from './api';

export interface Quest {
  id: string;
  familyId: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  rewardMinutes: number;
  stackingType: 'stackable' | 'non_stackable';
  recurrence: string;
  recurrenceDays: string[] | null;
  requiresProof: boolean;
  autoApprove: boolean;
  bonusMultiplier: number;
  isArchived: boolean;
  assignments: QuestAssignment[];
  createdAt: string;
}

export interface QuestAssignment {
  id: string;
  child: { id: string; name: string; avatarUrl: string | null };
}

export interface LibraryQuest {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  suggestedRewardMinutes: number;
  suggestedStackingType: string;
  ageRange: string | null;
}

export interface CreateQuestData {
  name: string;
  description?: string;
  icon?: string;
  category: string;
  rewardMinutes: number;
  stackingType: string;
  recurrence?: string;
  recurrenceDays?: string[];
  requiresProof?: boolean;
  autoApprove?: boolean;
  assignedChildIds: string[];
  libraryQuestId?: string;
}

export interface CreateFromLibraryData {
  rewardMinutes: number;
  stackingType: string;
  assignedChildIds: string[];
  recurrence?: string;
  requiresProof?: boolean;
  autoApprove?: boolean;
}

export const questService = {
  list: (familyId: string, params?: { category?: string; archived?: boolean; childId?: string }) =>
    api.get<Quest[]>(`/families/${familyId}/quests`, { params }).then((r) => r.data),

  get: (familyId: string, questId: string) =>
    api.get<Quest>(`/families/${familyId}/quests/${questId}`).then((r) => r.data),

  create: (familyId: string, data: CreateQuestData) =>
    api.post<Quest>(`/families/${familyId}/quests`, data).then((r) => r.data),

  createFromLibrary: (familyId: string, libraryQuestId: string, data: CreateFromLibraryData) =>
    api.post<Quest>(`/families/${familyId}/quests/from-library/${libraryQuestId}`, data).then((r) => r.data),

  update: (familyId: string, questId: string, data: Partial<CreateQuestData>) =>
    api.put<Quest>(`/families/${familyId}/quests/${questId}`, data).then((r) => r.data),

  remove: (familyId: string, questId: string) =>
    api.delete(`/families/${familyId}/quests/${questId}`).then((r) => r.data),

  archive: (familyId: string, questId: string) =>
    api.post(`/families/${familyId}/quests/${questId}/archive`).then((r) => r.data),

  unarchive: (familyId: string, questId: string) =>
    api.post(`/families/${familyId}/quests/${questId}/unarchive`).then((r) => r.data),

  getCount: (familyId: string) =>
    api.get<{ activeQuests: number; limit: number }>(`/families/${familyId}/quests/count`).then((r) => r.data),

  // Quest Library
  getLibrary: (category?: string) =>
    api.get<LibraryQuest[]>('/quest-library', { params: { category } }).then((r) => r.data),

  getLibraryQuest: (id: string) =>
    api.get<LibraryQuest>(`/quest-library/${id}`).then((r) => r.data),
};
