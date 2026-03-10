import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOfferings,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import Config from 'react-native-config';
import api from './api';

const ENTITLEMENT_ID = 'premium';

let revenueCatInitPromise: Promise<boolean> | null = null;
let revenueCatConfigured = false;

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
  initRevenueCat: async (): Promise<boolean> => {
    if (revenueCatConfigured) return true;
    if (revenueCatInitPromise) return revenueCatInitPromise;

    revenueCatInitPromise = (async () => {
      try {
        const apiKey = Platform.select({
          ios: Config.REVENUECAT_APPLE_KEY || '',
          android: Config.REVENUECAT_GOOGLE_KEY || '',
        });

        console.log('[RevenueCat] API key present:', !!apiKey, 'length:', apiKey?.length);

        if (!apiKey) {
          console.warn('[RevenueCat] No API key found — skipping init');
          return false;
        }

        Purchases.configure({ apiKey });
        revenueCatConfigured = true;
        console.log('[RevenueCat] Configured successfully');
        return true;
      } catch (e) {
        console.warn('[RevenueCat] Failed to initialize:', e);
        return false;
      }
    })();

    const configured = await revenueCatInitPromise;
    if (!configured) {
      // Allow retries later if initialization failed.
      revenueCatInitPromise = null;
    }
    return configured;
  },

  identifyUser: async (familyId: string) => {
    try {
      await subscriptionService.initRevenueCat();
      await Purchases.logIn(familyId);
    } catch {
      // Silent — user identification is best-effort
    }
  },

  logoutUser: async () => {
    try {
      await subscriptionService.initRevenueCat();
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
      const configured = await subscriptionService.initRevenueCat();
      if (!configured) return null;
      const offerings = await Purchases.getOfferings();
      console.log('[RevenueCat] Offerings loaded:', JSON.stringify({
        hasCurrent: !!offerings?.current,
        currentId: offerings?.current?.identifier,
        packageCount: offerings?.current?.availablePackages?.length,
        packages: offerings?.current?.availablePackages?.map(p => p.packageType),
      }));
      return offerings;
    } catch (e) {
      console.error('[RevenueCat] Failed to load offerings:', e);
      return null;
    }
  },

  purchasePackage: async (pkg: PurchasesPackage): Promise<CustomerInfo | null> => {
    try {
      const configured = await subscriptionService.initRevenueCat();
      if (!configured) return null;
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    } catch (e: any) {
      if (e.userCancelled) return null;
      throw e;
    }
  },

  restorePurchases: async (): Promise<CustomerInfo | null> => {
    try {
      const configured = await subscriptionService.initRevenueCat();
      if (!configured) return null;
      const customerInfo = await Purchases.restorePurchases();
      return customerInfo;
    } catch {
      return null;
    }
  },

  checkEntitlement: async (): Promise<boolean> => {
    try {
      const configured = await subscriptionService.initRevenueCat();
      if (!configured) return false;
      const info = await Purchases.getCustomerInfo();
      return !!info.entitlements.active[ENTITLEMENT_ID];
    } catch {
      return false;
    }
  },

  getAppUserId: async (): Promise<string | null> => {
    try {
      const configured = await subscriptionService.initRevenueCat();
      if (!configured) return null;
      return await Purchases.getAppUserID();
    } catch {
      return null;
    }
  },

  getSubscriptionStatus: async (familyId: string): Promise<SubscriptionStatus> => {
    const { data } = await api.get<SubscriptionStatus>(
      `/families/${familyId}/subscription`,
    );
    return data;
  },

  syncFromRevenueCat: async (familyId: string): Promise<boolean> => {
    try {
      // Send the current RC app user ID so the backend can query RC
      // even if Purchases.logIn(familyId) silently failed and the
      // subscriber is still registered under an anonymous ID.
      const appUserId = await subscriptionService.getAppUserId();
      const { data } = await api.post<{ synced: boolean }>(
        `/families/${familyId}/subscription/sync`,
        appUserId ? { appUserId } : {},
      );
      return data.synced;
    } catch {
      return false;
    }
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
