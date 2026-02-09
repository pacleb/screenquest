import api from './api';

export interface QuestCompletion {
  id: string;
  questId: string;
  childId: string;
  status: 'pending' | 'approved' | 'denied';
  proofImageUrl: string | null;
  earnedMinutes: number;
  stackingType: 'stackable' | 'non_stackable';
  expiresAt: string | null;
  parentNote: string | null;
  completedAt: string;
  reviewedAt: string | null;
  quest: {
    id: string;
    name: string;
    icon: string;
    category: string;
    rewardMinutes: number;
  };
  child?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface ChildQuest {
  id: string;
  familyId: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  rewardMinutes: number;
  stackingType: 'stackable' | 'non_stackable';
  recurrence: string;
  requiresProof: boolean;
  autoApprove: boolean;
  bonusMultiplier: number;
  availableToComplete: boolean;
  statusLabel: 'available' | 'pending' | 'completed' | 'completed_today' | 'completed_this_week';
}

export const completionService = {
  // Child endpoints
  listChildQuests: (childId: string) =>
    api.get<ChildQuest[]>(`/children/${childId}/quests`).then((r) => r.data),

  completeQuest: (childId: string, questId: string, proofImageUrl?: string) =>
    api
      .post<QuestCompletion>(`/children/${childId}/quests/${questId}/complete`, {
        proofImageUrl,
      })
      .then((r) => r.data),

  listChildCompletions: (childId: string) =>
    api.get<QuestCompletion[]>(`/children/${childId}/completions`).then((r) => r.data),

  // Parent endpoints
  listFamilyCompletions: (familyId: string, status?: string) =>
    api
      .get<QuestCompletion[]>(`/families/${familyId}/completions`, {
        params: status ? { status } : undefined,
      })
      .then((r) => r.data),

  approveCompletion: (completionId: string, parentNote?: string) =>
    api
      .put<QuestCompletion>(`/completions/${completionId}/approve`, { parentNote })
      .then((r) => r.data),

  denyCompletion: (completionId: string, parentNote?: string) =>
    api
      .put<QuestCompletion>(`/completions/${completionId}/deny`, { parentNote })
      .then((r) => r.data),
};
