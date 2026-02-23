import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOfferings,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import api from './api';

const ENTITLEMENT_ID = 'premium';

export interface SubscriptionStatus {
  plan: string;
  subscriptionStatus: string | null;
  expiresAt: string | null;
  isActive: boolean;
  willRenew: boolean;
  period: string | null;
  gracePeriodEndsAt: string | null;
  activeQuestCount: number;
  questLimit: number | null;
}

export const subscriptionService = {
  initRevenueCat: async () => {
    const apiKey = Platform.select({
      ios: process.env.REVENUECAT_APPLE_KEY || '',
      android: process.env.REVENUECAT_GOOGLE_KEY || '',
    });

    if (!apiKey) return;

    Purchases.configure({ apiKey });
  },

  identifyUser: async (familyId: string) => {
    try {
      await Purchases.logIn(familyId);
    } catch {
      // Silent — user identification is best-effort
    }
  },

  logoutUser: async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      if (!info.originalAppUserId.startsWith('$RCAnonymousID')) {
        await Purchases.logOut();
      }
    } catch {
      // Silent
    }
  },

  getOfferings: async (): Promise<PurchasesOfferings | null> => {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings;
    } catch {
      return null;
    }
  },

  purchasePackage: async (pkg: PurchasesPackage): Promise<CustomerInfo | null> => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    } catch (e: any) {
      if (e.userCancelled) return null;
      throw e;
    }
  },

  restorePurchases: async (): Promise<CustomerInfo | null> => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      return customerInfo;
    } catch {
      return null;
    }
  },

  checkEntitlement: async (): Promise<boolean> => {
    try {
      const info = await Purchases.getCustomerInfo();
      return !!info.entitlements.active[ENTITLEMENT_ID];
    } catch {
      return false;
    }
  },

  getSubscriptionStatus: async (familyId: string): Promise<SubscriptionStatus> => {
    const { data } = await api.get<SubscriptionStatus>(
      `/families/${familyId}/subscription`,
    );
    return data;
  },

  archiveQuests: async (familyId: string, keepQuestIds: string[]) => {
    await api.post(`/families/${familyId}/subscription/archive-quests`, {
      keepQuestIds,
    });
  },

  getOwnedPacks: async (userId: string): Promise<string[]> => {
    const { data } = await api.get<{ packs: string[] }>(
      `/users/${userId}/avatar-packs`,
    );
    return data.packs;
  },

  recordPackPurchase: async (userId: string, packId: string) => {
    await api.post(`/users/${userId}/avatar-packs`, { packId });
  },
};
