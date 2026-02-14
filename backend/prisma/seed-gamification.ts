import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ───────────────────── THEMES ─────────────────────

const THEME_DEFINITIONS = [
  {
    key: 'classic',
    name: 'ScreenQuest Classic',
    description: 'The default blue & green look',
    unlockType: 'free',
    unlockValue: null,
    category: 'starter',
    sortOrder: 0,
    isAnimated: false,
    colors: {
      primary: '#4A90D9', secondary: '#7ED321', accent: '#F5A623',
      background: '#FFF8E7', card: '#FFFFFF', textPrimary: '#2C3E50',
      textSecondary: '#7F8C8D', border: '#E8ECF0',
    },
    gradients: { header: ['#4A90D9', '#7ED321'] },
  },
  {
    key: 'sunset_glow',
    name: 'Sunset Glow',
    description: 'Warm orange & pink vibes',
    unlockType: 'level',
    unlockValue: 3,
    category: 'nature',
    sortOrder: 1,
    isAnimated: false,
    colors: {
      primary: '#FF6B6B', secondary: '#FFA07A', accent: '#FFD93D',
      background: '#FFF5F5', card: '#FFFFFF', textPrimary: '#4A2C2A',
      textSecondary: '#8B6F6F', border: '#FFE0E0',
    },
    gradients: { header: ['#FF6B6B', '#FFA07A'] },
  },
  {
    key: 'ocean_explorer',
    name: 'Ocean Explorer',
    description: 'Cool teal & deep blue depths',
    unlockType: 'level',
    unlockValue: 5,
    category: 'ocean',
    sortOrder: 2,
    isAnimated: false,
    colors: {
      primary: '#00B4D8', secondary: '#0077B6', accent: '#90E0EF',
      background: '#F0FAFF', card: '#FFFFFF', textPrimary: '#023E8A',
      textSecondary: '#5A8FA8', border: '#CAF0F8',
    },
    gradients: { header: ['#00B4D8', '#0077B6'] },
  },
  {
    key: 'neon_arcade',
    name: 'Neon Arcade',
    description: 'Neon green & purple on dark – gaming mode!',
    unlockType: 'level',
    unlockValue: 8,
    category: 'gaming',
    sortOrder: 3,
    isAnimated: true,
    colors: {
      primary: '#39FF14', secondary: '#BF40BF', accent: '#FF6EC7',
      background: '#0D0D1A', card: '#1A1A2E', textPrimary: '#E0E0E0',
      textSecondary: '#A0A0B0', border: '#2A2A3E',
    },
    gradients: { header: ['#39FF14', '#BF40BF'] },
  },
  {
    key: 'candy_land',
    name: 'Candy Land',
    description: 'Pastel pink, mint & lavender sweetness',
    unlockType: 'level',
    unlockValue: 12,
    category: 'pastel',
    sortOrder: 4,
    isAnimated: false,
    colors: {
      primary: '#FFB3D9', secondary: '#B8F3D4', accent: '#D4B3FF',
      background: '#FFF5FA', card: '#FFFFFF', textPrimary: '#5C3D5E',
      textSecondary: '#9B7A9D', border: '#F0D0E8',
    },
    gradients: { header: ['#FFB3D9', '#D4B3FF'] },
  },
  {
    key: 'space_odyssey',
    name: 'Space Odyssey',
    description: 'Dark navy & gold stars – epic & aspirational',
    unlockType: 'level',
    unlockValue: 15,
    category: 'space',
    sortOrder: 5,
    isAnimated: true,
    colors: {
      primary: '#FFD700', secondary: '#1B1464', accent: '#FF6F61',
      background: '#0B0B2B', card: '#141432', textPrimary: '#ECECEC',
      textSecondary: '#8888AA', border: '#222244',
    },
    gradients: { header: ['#1B1464', '#FFD700'] },
  },
  {
    key: 'forest_guardian',
    name: 'Forest Guardian',
    description: 'Earthy greens & brown – calm & natural',
    unlockType: 'streak',
    unlockValue: 7,
    category: 'nature',
    sortOrder: 6,
    isAnimated: false,
    colors: {
      primary: '#2D6A4F', secondary: '#95D5B2', accent: '#D4A373',
      background: '#F5F5DC', card: '#FFFFFF', textPrimary: '#1B4332',
      textSecondary: '#6B8F71', border: '#D8E2DC',
    },
    gradients: { header: ['#2D6A4F', '#95D5B2'] },
  },
  {
    key: 'fire_streak',
    name: 'Fire Streak',
    description: 'Red & orange animated gradients – intense!',
    unlockType: 'streak',
    unlockValue: 14,
    category: 'gaming',
    sortOrder: 7,
    isAnimated: true,
    colors: {
      primary: '#FF4500', secondary: '#FF8C00', accent: '#FFD700',
      background: '#1A0A00', card: '#2A1500', textPrimary: '#FFE4C4',
      textSecondary: '#CC9966', border: '#3D1F00',
    },
    gradients: { header: ['#FF4500', '#FF8C00', '#FFD700'] },
  },
  {
    key: 'diamond_elite',
    name: 'Diamond Elite',
    description: 'Iridescent blue-white shimmer – prestigious',
    unlockType: 'streak',
    unlockValue: 30,
    category: 'special',
    sortOrder: 8,
    isAnimated: true,
    colors: {
      primary: '#B9D5FF', secondary: '#E8F0FE', accent: '#7EB8FF',
      background: '#F0F4FF', card: '#FFFFFF', textPrimary: '#1A365D',
      textSecondary: '#4A6FA5', border: '#D0E0FF',
    },
    gradients: { header: ['#B9D5FF', '#E8F0FE', '#7EB8FF'] },
  },
  {
    key: 'champion_gold',
    name: 'Champion Gold',
    description: 'Gold & black – for the Century achiever',
    unlockType: 'achievement',
    unlockValue: null, // special: requires 'century' achievement key
    category: 'special',
    sortOrder: 9,
    isAnimated: true,
    colors: {
      primary: '#FFD700', secondary: '#1A1A1A', accent: '#DAA520',
      background: '#0D0D0D', card: '#1A1A1A', textPrimary: '#FFD700',
      textSecondary: '#BFA730', border: '#333300',
    },
    gradients: { header: ['#FFD700', '#DAA520', '#B8860B'] },
  },
];

const ACHIEVEMENT_DEFINITIONS = [
  // Milestones
  { key: 'first_quest', name: 'First Quest', description: 'Complete your very first quest', icon: '🌟', category: 'milestones', criteria: { type: 'total_completions', value: 1 }, badgeTier: 'bronze', badgeColor: '#CD7F32', xpReward: 10 },
  { key: 'super_star', name: 'Super Star', description: 'Complete 25 quests', icon: '⭐', category: 'milestones', criteria: { type: 'total_completions', value: 25 }, badgeTier: 'silver', badgeColor: '#C0C0C0', xpReward: 25 },
  { key: 'unstoppable', name: 'Unstoppable', description: 'Complete 50 quests', icon: '💪', category: 'milestones', criteria: { type: 'total_completions', value: 50 }, badgeTier: 'silver', badgeColor: '#C0C0C0', xpReward: 50 },
  { key: 'century', name: 'Century', description: 'Complete 100 quests', icon: '💯', category: 'milestones', criteria: { type: 'total_completions', value: 100 }, badgeTier: 'gold', badgeColor: '#FFD700', xpReward: 100 },
  { key: 'quest_legend', name: 'Quest Legend', description: 'Complete 250 quests', icon: '🏅', category: 'milestones', criteria: { type: 'total_completions', value: 250 }, badgeTier: 'gold', badgeColor: '#FFD700', xpReward: 200 },
  { key: 'quest_master', name: 'Quest Master', description: 'Complete 500 quests', icon: '👑', category: 'milestones', criteria: { type: 'total_completions', value: 500 }, badgeTier: 'gold', badgeColor: '#FFD700', xpReward: 500 },
  // Streaks
  { key: 'streak_starter', name: 'Streak Starter', description: 'Reach a 3-day streak', icon: '🔥', category: 'streaks', criteria: { type: 'streak', value: 3 }, badgeTier: 'bronze', badgeColor: '#CD7F32', xpReward: 10 },
  { key: 'marathon', name: 'Marathon', description: 'Reach a 7-day streak', icon: '🏃', category: 'streaks', criteria: { type: 'streak', value: 7 }, badgeTier: 'silver', badgeColor: '#C0C0C0', xpReward: 25 },
  { key: 'lightning_streak', name: 'Lightning Streak', description: 'Reach a 14-day streak', icon: '⚡', category: 'streaks', criteria: { type: 'streak', value: 14 }, badgeTier: 'silver', badgeColor: '#C0C0C0', xpReward: 50 },
  { key: 'inferno', name: 'Inferno', description: 'Reach a 30-day streak', icon: '🌋', category: 'streaks', criteria: { type: 'streak', value: 30 }, badgeTier: 'gold', badgeColor: '#FFD700', xpReward: 100 },
  { key: 'diamond_streak', name: 'Diamond Streak', description: 'Reach a 50-day streak', icon: '💎', category: 'streaks', criteria: { type: 'streak', value: 50 }, badgeTier: 'gold', badgeColor: '#FFD700', xpReward: 200 },
  { key: 'unstoppable_force', name: 'Unstoppable Force', description: 'Reach a 100-day streak', icon: '♾️', category: 'streaks', criteria: { type: 'streak', value: 100 }, badgeTier: 'gold', badgeColor: '#FFD700', xpReward: 500, isSecret: true },
  // Categories
  { key: 'helping_hand', name: 'Helping Hand', description: 'Complete 5 Chores quests', icon: '🤝', category: 'categories', criteria: { type: 'category_completions', category: 'chores', value: 5 }, badgeTier: 'bronze', badgeColor: '#CD7F32', xpReward: 10 },
  { key: 'bookworm', name: 'Bookworm', description: 'Complete 5 Learning quests', icon: '📚', category: 'categories', criteria: { type: 'category_completions', category: 'learning', value: 5 }, badgeTier: 'bronze', badgeColor: '#CD7F32', xpReward: 10 },
  { key: 'fitness_fan', name: 'Fitness Fan', description: 'Complete 5 Exercise quests', icon: '🏋️', category: 'categories', criteria: { type: 'category_completions', category: 'exercise', value: 5 }, badgeTier: 'bronze', badgeColor: '#CD7F32', xpReward: 10 },
  { key: 'creative_genius', name: 'Creative Genius', description: 'Complete 5 Creative quests', icon: '🎨', category: 'categories', criteria: { type: 'category_completions', category: 'creative', value: 5 }, badgeTier: 'bronze', badgeColor: '#CD7F32', xpReward: 10 },
  { key: 'kind_heart', name: 'Kind Heart', description: 'Complete 5 Kindness quests', icon: '💖', category: 'categories', criteria: { type: 'category_completions', category: 'kindness', value: 5 }, badgeTier: 'bronze', badgeColor: '#CD7F32', xpReward: 10 },
  { key: 'chore_champion', name: 'Chore Champion', description: 'Complete 25 Chores quests', icon: '🧹', category: 'categories', criteria: { type: 'category_completions', category: 'chores', value: 25 }, badgeTier: 'silver', badgeColor: '#C0C0C0', xpReward: 25 },
  { key: 'scholar', name: 'Scholar', description: 'Complete 25 Learning quests', icon: '🎓', category: 'categories', criteria: { type: 'category_completions', category: 'learning', value: 25 }, badgeTier: 'silver', badgeColor: '#C0C0C0', xpReward: 25 },
  { key: 'all_rounder', name: 'All-Rounder', description: 'Complete 5+ quests in every category', icon: '🏆', category: 'categories', criteria: { type: 'all_categories', value: 5 }, badgeTier: 'gold', badgeColor: '#FFD700', xpReward: 100 },
  // Special
  { key: 'early_bird', name: 'Early Bird', description: 'Complete a quest before 9 AM', icon: '🐦', category: 'special', criteria: { type: 'early_completion', beforeHour: 9 }, badgeTier: 'bronze', badgeColor: '#CD7F32', xpReward: 10 },
  { key: 'night_owl', name: 'Night Owl', description: 'Complete a quest after 6 PM', icon: '🦉', category: 'special', criteria: { type: 'late_completion', afterHour: 18 }, badgeTier: 'bronze', badgeColor: '#CD7F32', xpReward: 10 },
  { key: 'time_master', name: 'Time Master', description: 'Earn 500 total minutes', icon: '⏰', category: 'milestones', criteria: { type: 'total_earned_minutes', value: 500 }, badgeTier: 'silver', badgeColor: '#C0C0C0', xpReward: 50 },
  { key: 'time_lord', name: 'Time Lord', description: 'Earn 2000 total minutes', icon: '🕐', category: 'milestones', criteria: { type: 'total_earned_minutes', value: 2000 }, badgeTier: 'gold', badgeColor: '#FFD700', xpReward: 200 },
  { key: 'perfect_day', name: 'Perfect Day', description: 'Complete all assigned quests in a day', icon: '🎯', category: 'special', criteria: { type: 'perfect_day' }, badgeTier: 'silver', badgeColor: '#C0C0C0', xpReward: 25 },
  { key: 'proof_pro', name: 'Proof Pro', description: 'Submit 10 photo proofs', icon: '📸', category: 'special', criteria: { type: 'photo_proofs', value: 10 }, badgeTier: 'bronze', badgeColor: '#CD7F32', xpReward: 10 },
  { key: 'easter_egg', name: 'Easter Egg', description: 'Find the hidden secret!', icon: '🥚', category: 'special', criteria: { type: 'easter_egg' }, badgeTier: 'bronze', badgeColor: '#CD7F32', xpReward: 10, isSecret: true },
];

const AVATAR_ITEMS = [
  // Faces
  { key: 'face_default', name: 'Default', icon: '😊', slot: 'face', unlockType: 'free', unlockValue: null, sortOrder: 0 },
  { key: 'face_happy', name: 'Happy', icon: '😄', slot: 'face', unlockType: 'free', unlockValue: null, sortOrder: 1 },
  { key: 'face_cool', name: 'Cool', icon: '😎', slot: 'face', unlockType: 'level', unlockValue: '2', sortOrder: 2 },
  { key: 'face_silly', name: 'Silly', icon: '🤪', slot: 'face', unlockType: 'level', unlockValue: '4', sortOrder: 3 },
  { key: 'face_determined', name: 'Determined', icon: '😤', slot: 'face', unlockType: 'level', unlockValue: '6', sortOrder: 4 },
  { key: 'face_sleepy', name: 'Sleepy', icon: '😴', slot: 'face', unlockType: 'achievement', unlockValue: 'night_owl', sortOrder: 5 },
  { key: 'face_excited', name: 'Excited', icon: '🤩', slot: 'face', unlockType: 'level', unlockValue: '8', sortOrder: 6 },
  { key: 'face_wizard', name: 'Wizard', icon: '🧙', slot: 'face', unlockType: 'level', unlockValue: '10', sortOrder: 7 },

  // Hair
  { key: 'hair_short', name: 'Short', icon: '💇', slot: 'hair', unlockType: 'free', unlockValue: null, sortOrder: 0 },
  { key: 'hair_long', name: 'Long', icon: '💇‍♀️', slot: 'hair', unlockType: 'free', unlockValue: null, sortOrder: 1 },
  { key: 'hair_spiky', name: 'Spiky', icon: '🦔', slot: 'hair', unlockType: 'level', unlockValue: '3', sortOrder: 2 },
  { key: 'hair_curly', name: 'Curly', icon: '🐑', slot: 'hair', unlockType: 'level', unlockValue: '5', sortOrder: 3 },
  { key: 'hair_ponytail', name: 'Ponytail', icon: '🎀', slot: 'hair', unlockType: 'level', unlockValue: '4', sortOrder: 4 },
  { key: 'hair_mohawk', name: 'Mohawk', icon: '🐓', slot: 'hair', unlockType: 'level', unlockValue: '7', sortOrder: 5 },
  { key: 'hair_braids', name: 'Braids', icon: '🧶', slot: 'hair', unlockType: 'level', unlockValue: '6', sortOrder: 6 },
  { key: 'hair_rainbow', name: 'Rainbow', icon: '🌈', slot: 'hair', unlockType: 'streak', unlockValue: '14', sortOrder: 7 },

  // Hats
  { key: 'hat_cap', name: 'Baseball Cap', icon: '🧢', slot: 'hat', unlockType: 'free', unlockValue: null, sortOrder: 0 },
  { key: 'hat_top', name: 'Top Hat', icon: '🎩', slot: 'hat', unlockType: 'level', unlockValue: '3', sortOrder: 1 },
  { key: 'hat_crown', name: 'Crown', icon: '👑', slot: 'hat', unlockType: 'level', unlockValue: '10', sortOrder: 2 },
  { key: 'hat_wizard', name: 'Wizard Hat', icon: '🧙‍♂️', slot: 'hat', unlockType: 'achievement', unlockValue: 'century', sortOrder: 3 },
  { key: 'hat_space', name: 'Space Helmet', icon: '🪖', slot: 'hat', unlockType: 'purchase', unlockValue: 'avatar_pack_space', sortOrder: 4 },
  { key: 'hat_dino', name: 'Dino Hood', icon: '🦕', slot: 'hat', unlockType: 'level', unlockValue: '6', sortOrder: 5 },
  { key: 'hat_headband', name: 'Headband', icon: '🥋', slot: 'hat', unlockType: 'level', unlockValue: '4', sortOrder: 6 },
  { key: 'hat_party', name: 'Party Hat', icon: '🥳', slot: 'hat', unlockType: 'achievement', unlockValue: 'super_star', sortOrder: 7 },

  // Outfits
  { key: 'outfit_default', name: 'Default Tee', icon: '👕', slot: 'outfit', unlockType: 'free', unlockValue: null, sortOrder: 0 },
  { key: 'outfit_superhero', name: 'Superhero Cape', icon: '🦸', slot: 'outfit', unlockType: 'level', unlockValue: '4', sortOrder: 1 },
  { key: 'outfit_astronaut', name: 'Astronaut Suit', icon: '🧑‍🚀', slot: 'outfit', unlockType: 'purchase', unlockValue: 'avatar_pack_space', sortOrder: 2 },
  { key: 'outfit_knight', name: 'Knight Armor', icon: '⚔️', slot: 'outfit', unlockType: 'level', unlockValue: '7', sortOrder: 3 },
  { key: 'outfit_labcoat', name: 'Lab Coat', icon: '🥼', slot: 'outfit', unlockType: 'achievement', unlockValue: 'bookworm', sortOrder: 4 },
  { key: 'outfit_jersey', name: 'Sports Jersey', icon: '🏈', slot: 'outfit', unlockType: 'achievement', unlockValue: 'fitness_fan', sortOrder: 5 },
  { key: 'outfit_hoodie', name: 'Hoodie', icon: '🧥', slot: 'outfit', unlockType: 'level', unlockValue: '5', sortOrder: 6 },
  { key: 'outfit_galaxy', name: 'Galaxy Outfit', icon: '🌌', slot: 'outfit', unlockType: 'premium', unlockValue: null, sortOrder: 7 },

  // Accessories
  { key: 'acc_sunglasses', name: 'Sunglasses', icon: '🕶️', slot: 'accessory', unlockType: 'free', unlockValue: null, sortOrder: 0 },
  { key: 'acc_shield', name: 'Shield', icon: '🛡️', slot: 'accessory', unlockType: 'level', unlockValue: '6', sortOrder: 1 },
  { key: 'acc_book', name: 'Magic Book', icon: '📖', slot: 'accessory', unlockType: 'achievement', unlockValue: 'bookworm', sortOrder: 2 },
  { key: 'acc_sword', name: 'Sword', icon: '⚔️', slot: 'accessory', unlockType: 'level', unlockValue: '8', sortOrder: 3 },
  { key: 'acc_backpack', name: 'Backpack', icon: '🎒', slot: 'accessory', unlockType: 'free', unlockValue: null, sortOrder: 4 },
  { key: 'acc_wand', name: 'Magic Wand', icon: '🪄', slot: 'accessory', unlockType: 'level', unlockValue: '9', sortOrder: 5 },

  // Backgrounds
  { key: 'bg_home', name: 'Home', icon: '🏠', slot: 'background', unlockType: 'free', unlockValue: null, sortOrder: 0 },
  { key: 'bg_park', name: 'Park', icon: '🌳', slot: 'background', unlockType: 'level', unlockValue: '2', sortOrder: 1 },
  { key: 'bg_forest', name: 'Forest', icon: '🌲', slot: 'background', unlockType: 'level', unlockValue: '3', sortOrder: 2 },
  { key: 'bg_space', name: 'Space', icon: '🌌', slot: 'background', unlockType: 'purchase', unlockValue: 'avatar_pack_space', sortOrder: 3 },
  { key: 'bg_underwater', name: 'Underwater', icon: '🐠', slot: 'background', unlockType: 'level', unlockValue: '5', sortOrder: 4 },
  { key: 'bg_rainbow', name: 'Rainbow', icon: '🌈', slot: 'background', unlockType: 'achievement', unlockValue: 'marathon', sortOrder: 5 },
  { key: 'bg_volcano', name: 'Volcano', icon: '🌋', slot: 'background', unlockType: 'level', unlockValue: '7', sortOrder: 6 },
  { key: 'bg_castle', name: 'Castle', icon: '🏰', slot: 'background', unlockType: 'level', unlockValue: '9', sortOrder: 7 },
  { key: 'bg_disco', name: 'Disco', icon: '🪩', slot: 'background', unlockType: 'premium', unlockValue: null, sortOrder: 8 },

  // Pets
  { key: 'pet_cat', name: 'Cat', icon: '🐱', slot: 'pet', unlockType: 'free', unlockValue: null, sortOrder: 0 },
  { key: 'pet_dog', name: 'Dog', icon: '🐶', slot: 'pet', unlockType: 'level', unlockValue: '2', sortOrder: 1 },
  { key: 'pet_dragon', name: 'Dragon', icon: '🐉', slot: 'pet', unlockType: 'level', unlockValue: '8', sortOrder: 2 },
  { key: 'pet_unicorn', name: 'Unicorn', icon: '🦄', slot: 'pet', unlockType: 'purchase', unlockValue: 'avatar_pack_animals', sortOrder: 3 },
];

async function main() {
  // ── Themes ──
  console.log('Seeding themes...');
  for (const theme of THEME_DEFINITIONS) {
    await prisma.theme.upsert({
      where: { key: theme.key },
      create: {
        key: theme.key,
        name: theme.name,
        description: theme.description,
        unlockType: theme.unlockType,
        unlockValue: theme.unlockValue,
        category: theme.category,
        sortOrder: theme.sortOrder,
        isAnimated: theme.isAnimated,
        colors: theme.colors as any,
        gradients: theme.gradients as any,
      },
      update: {
        name: theme.name,
        description: theme.description,
        unlockType: theme.unlockType,
        unlockValue: theme.unlockValue,
        category: theme.category,
        sortOrder: theme.sortOrder,
        isAnimated: theme.isAnimated,
        colors: theme.colors as any,
        gradients: theme.gradients as any,
      },
    });
  }
  console.log(`  ${THEME_DEFINITIONS.length} themes seeded`);

  // ── Achievements ──
  console.log('Seeding achievements...');
  for (let i = 0; i < ACHIEVEMENT_DEFINITIONS.length; i++) {
    const def = ACHIEVEMENT_DEFINITIONS[i];
    await prisma.achievement.upsert({
      where: { key: def.key },
      create: {
        key: def.key,
        name: def.name,
        description: def.description,
        icon: def.icon,
        category: def.category,
        criteria: def.criteria as any,
        sortOrder: i,
        badgeTier: def.badgeTier,
        badgeColor: def.badgeColor,
        xpReward: def.xpReward,
        isSecret: (def as any).isSecret ?? false,
      },
      update: {
        name: def.name,
        description: def.description,
        icon: def.icon,
        category: def.category,
        criteria: def.criteria as any,
        sortOrder: i,
        badgeTier: def.badgeTier,
        badgeColor: def.badgeColor,
        xpReward: def.xpReward,
        isSecret: (def as any).isSecret ?? false,
      },
    });
  }
  console.log(`  ${ACHIEVEMENT_DEFINITIONS.length} achievements seeded`);

  // ── Avatar Items ──
  console.log('Seeding avatar items...');
  for (const item of AVATAR_ITEMS) {
    await prisma.avatarItem.upsert({
      where: { key: item.key },
      create: item,
      update: {
        name: item.name,
        icon: item.icon,
        slot: item.slot,
        unlockType: item.unlockType,
        unlockValue: item.unlockValue,
        sortOrder: item.sortOrder,
      },
    });
  }
  console.log(`  ${AVATAR_ITEMS.length} avatar items seeded`);

  console.log('Gamification seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
