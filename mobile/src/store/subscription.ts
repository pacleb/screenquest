import { create } from 'zustand';
import { subscriptionService, SubscriptionStatus } from '../services/subscription';

interface SubscriptionState {
  plan: string;
  subscriptionStatus: string | null;
  isActive: boolean;
  expiresAt: string | null;
  gracePeriodEndsAt: string | null;
  activeQuestCount: number;
  questLimit: number | null;
  willRenew: boolean;
  period: string | null;
  loaded: boolean;

  isPremium: () => boolean;
  fetchStatus: (familyId: string) => Promise<void>;
  activatePremium: () => void;
  reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  plan: 'free',
  subscriptionStatus: null,
  isActive: false,
  expiresAt: null,
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
        expiresAt: status.expiresAt,
        gracePeriodEndsAt: status.gracePeriodEndsAt,
        activeQuestCount: status.activeQuestCount,
        questLimit: status.questLimit,
        willRenew: status.willRenew,
        period: status.period,
        loaded: true,
      });

      // If backend says free, verify directly with RevenueCat as a fallback.
      // This handles cases where the webhook hasn't been received yet (common
      // in sandbox/TestFlight) or webhook delivery failed entirely.
      if (!status.isActive) {
        const hasPremium = await subscriptionService.checkEntitlement();
        if (hasPremium) {
          // Ask the backend to sync with RevenueCat's REST API so that
          // server-side enforcement (quest limits, etc.) also reflects premium.
          const synced = await subscriptionService.syncFromRevenueCat(familyId);
          if (synced) {
            // Re-fetch so the store reflects the server's updated state
            // (including questLimit: null).
            const updated = await subscriptionService.getSubscriptionStatus(familyId);
            set({
              plan: updated.plan,
              subscriptionStatus: updated.subscriptionStatus,
              isActive: updated.isActive,
              expiresAt: updated.expiresAt,
              gracePeriodEndsAt: updated.gracePeriodEndsAt,
              activeQuestCount: updated.activeQuestCount,
              questLimit: updated.questLimit,
              willRenew: updated.willRenew,
              period: updated.period,
              loaded: true,
            });
          // If sync failed, do nothing — keep the backend's free state.
          // Do not optimistically grant Premium; the entitlement cannot be
          // confirmed server-side and this causes false Premium on new accounts.
        }
      }
    } catch {
      set({ loaded: true });
    }
  },

  activatePremium: () =>
    set({
      plan: 'premium',
      subscriptionStatus: 'active',
      isActive: true,
      willRenew: true,
      loaded: true,
    }),

  reset: () =>
    set({
      plan: 'free',
      subscriptionStatus: null,
      isActive: false,
      expiresAt: null,
      gracePeriodEndsAt: null,
      activeQuestCount: 0,
      questLimit: 3,
      willRenew: false,
      period: null,
      loaded: false,
    }),
}));
