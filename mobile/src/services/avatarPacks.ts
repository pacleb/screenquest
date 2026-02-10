import { subscriptionService } from './subscription';
import Purchases from 'react-native-purchases';

export interface AvatarPack {
  id: string;
  name: string;
  icon: string;
  description: string;
  priceString: string;
  productId: string;
  items: string[];
}

export const AVATAR_PACKS: AvatarPack[] = [
  {
    id: 'avatar_pack_space',
    name: 'Space Explorer',
    icon: '🚀',
    description: 'Space-themed accessories',
    priceString: '$1.99',
    productId: 'avatar_pack_space',
    items: ['🧑‍🚀', '👾', '🛸', '🪐', '⭐', '🌙'],
  },
  {
    id: 'avatar_pack_animals',
    name: 'Animal Costumes',
    icon: '🦁',
    description: 'Dress up as your favorite animal',
    priceString: '$1.99',
    productId: 'avatar_pack_animals',
    items: ['🐱', '🐶', '🦊', '🐼', '🐰', '🦄'],
  },
  {
    id: 'avatar_pack_sports',
    name: 'Sports Gear',
    icon: '⚽',
    description: 'Sports equipment and jerseys',
    priceString: '$0.99',
    productId: 'avatar_pack_sports',
    items: ['⚽', '🏀', '🎾', '🏈', '⚾', '🏐'],
  },
  {
    id: 'avatar_pack_fantasy',
    name: 'Fantasy World',
    icon: '🧙',
    description: 'Wizard and fairy costumes',
    priceString: '$2.99',
    productId: 'avatar_pack_fantasy',
    items: ['🧙', '🧚', '🧝', '🦸', '👸', '🤴'],
  },
];

export const avatarPackService = {
  purchasePack: async (userId: string, packId: string): Promise<boolean> => {
    try {
      const pack = AVATAR_PACKS.find((p) => p.id === packId);
      if (!pack) return false;

      // Get the product from RevenueCat
      const offerings = await Purchases.getOfferings();
      // Non-consumable products may be available outside offerings
      // Try direct product fetch
      const products = await Purchases.getProducts([pack.productId]);
      if (products.length === 0) return false;

      const { customerInfo } = await Purchases.purchaseStoreProduct(products[0]);

      // Record purchase in backend
      await subscriptionService.recordPackPurchase(userId, packId);
      return true;
    } catch (e: any) {
      if (e.userCancelled) return false;
      throw e;
    }
  },

  getOwnedPacks: async (userId: string): Promise<string[]> => {
    return subscriptionService.getOwnedPacks(userId);
  },
};
