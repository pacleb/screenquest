import { useRouter } from 'expo-router';
import { useSubscriptionStore } from '../store/subscription';

export function usePremium() {
  const router = useRouter();
  const isActive = useSubscriptionStore((s) => s.isActive);
  const isTrialing = useSubscriptionStore((s) => s.isTrialing);
  const trialDaysRemaining = useSubscriptionStore((s) => s.trialDaysRemaining);
  const gracePeriodEndsAt = useSubscriptionStore((s) => s.gracePeriodEndsAt);

  const isPremium = isActive;

  const requirePremium = (callback?: () => void): boolean => {
    if (isPremium) {
      callback?.();
      return true;
    }
    router.push('/(app)/parent/paywall');
    return false;
  };

  return {
    isPremium,
    isTrialing,
    trialDaysRemaining,
    gracePeriodEndsAt,
    requirePremium,
  };
}
