import { create } from 'zustand';
import { subscriptionService, SubscriptionStatus } from '../services/subscription';

interface SubscriptionState {
  plan: string;
  subscriptionStatus: string | null;
  isActive: boolean;
  isTrialing: boolean;
  expiresAt: string | null;
  trialDaysRemaining: number | null;
  gracePeriodEndsAt: string | null;
  activeQuestCount: number;
  questLimit: number | null;
  willRenew: boolean;
  period: string | null;
  loaded: boolean;

  isPremium: () => boolean;
  fetchStatus: (familyId: string) => Promise<void>;
  reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  plan: 'free',
  subscriptionStatus: null,
  isActive: false,
  isTrialing: false,
  expiresAt: null,
  trialDaysRemaining: null,
  gracePeriodEndsAt: null,
  activeQuestCount: 0,
  questLimit: 3,
  willRenew: false,
  period: null,
  loaded: false,

  isPremium: () => get().isActive,

  fetchStatus: async (familyId: string) => {
    try {
      const status: SubscriptionStatus =
        await subscriptionService.getSubscriptionStatus(familyId);
      set({
        plan: status.plan,
        subscriptionStatus: status.subscriptionStatus,
        isActive: status.isActive,
        isTrialing: status.isTrialing,
        expiresAt: status.expiresAt,
        trialDaysRemaining: status.trialDaysRemaining,
        gracePeriodEndsAt: status.gracePeriodEndsAt,
        activeQuestCount: status.activeQuestCount,
        questLimit: status.questLimit,
        willRenew: status.willRenew,
        period: status.period,
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },

  reset: () =>
    set({
      plan: 'free',
      subscriptionStatus: null,
      isActive: false,
      isTrialing: false,
      expiresAt: null,
      trialDaysRemaining: null,
      gracePeriodEndsAt: null,
      activeQuestCount: 0,
      questLimit: 3,
      willRenew: false,
      period: null,
      loaded: false,
    }),
}));
