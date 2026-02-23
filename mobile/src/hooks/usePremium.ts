import { useNavigation } from '@react-navigation/native';
import { useSubscriptionStore } from '../store/subscription';

export function usePremium() {
  const navigation = useNavigation<any>();
  const isActive = useSubscriptionStore((s) => s.isActive);
  const gracePeriodEndsAt = useSubscriptionStore((s) => s.gracePeriodEndsAt);

  const isPremium = isActive;

  const requirePremium = (callback?: () => void): boolean => {
    if (isPremium) {
      callback?.();
      return true;
    }
    navigation.navigate('Paywall');
    return false;
  };

  return {
    isPremium,
    gracePeriodEndsAt,
    requirePremium,
  };
}
