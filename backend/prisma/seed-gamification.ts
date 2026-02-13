import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACHIEVEMENT_DEFINITIONS = [
  {
    key: 'first_quest',
    name: 'First Quest',
    description: 'Complete your very first quest',
    icon: '🌟',
    category: 'milestones',
    criteria: { type: 'total_completions', value: 1 },
  },
  {
    key: 'helping_hand',
    name: 'Helping Hand',
    description: 'Complete 5 quests in the Chores category',
    icon: '🤝',
    category: 'categories',
    criteria: { type: 'category_completions', category: 'chores', value: 5 },
  },
  {
    key: 'bookworm',
    name: 'Bookworm',
    description: 'Complete 5 quests in the Learning category',
    icon: '📚',
    category: 'categories',
    criteria: { type: 'category_completions', category: 'learning', value: 5 },
  },
  {
    key: 'super_star',
    name: 'Super Star',
    description: 'Complete 25 quests',
    icon: '⭐',
    category: 'milestones',
    criteria: { type: 'total_completions', value: 25 },
  },
  {
    key: 'unstoppable',
    name: 'Unstoppable',
    description: 'Complete 50 quests',
    icon: '💪',
    category: 'milestones',
    criteria: { type: 'total_completions', value: 50 },
  },
  {
    key: 'century',
    name: 'Century',
    description: 'Complete 100 quests',
    icon: '💯',
    category: 'milestones',
    criteria: { type: 'total_completions', value: 100 },
  },
  {
    key: 'early_bird',
    name: 'Early Bird',
    description: 'Complete a quest before 9 AM',
    icon: '🐦',
    category: 'special',
    criteria: { type: 'early_completion', beforeHour: 9 },
  },
  {
    key: 'time_master',
    name: 'Time Master',
    description: 'Earn 500 total minutes',
    icon: '⏰',
    category: 'milestones',
    criteria: { type: 'total_earned_minutes', value: 500 },
  },
  {
    key: 'streak_starter',
    name: 'Streak Starter',
    description: 'Reach a 3-day streak',
    icon: '🔥',
    category: 'streaks',
    criteria: { type: 'streak', value: 3 },
  },
  {
    key: 'marathon',
    name: 'Marathon',
    description: 'Reach a 7-day streak',
    icon: '🏃',
    category: 'streaks',
    criteria: { type: 'streak', value: 7 },
  },
];

const AVATAR_ITEMS = [
  // Hats
  { key: 'hat_cap', name: 'Baseball Cap', icon: '🧢', slot: 'hat', unlockType: 'free', unlockValue: null, sortOrder: 0 },
  { key: 'hat_top', name: 'Top Hat', icon: '🎩', slot: 'hat', unlockType: 'level', unlockValue: '3', sortOrder: 1 },
  { key: 'hat_crown', name: 'Crown', icon: '👑', slot: 'hat', unlockType: 'level', unlockValue: '5', sortOrder: 2 },
  { key: 'hat_wizard', name: 'Wizard Hat', icon: '🧙', slot: 'hat', unlockType: 'achievement', unlockValue: 'century', sortOrder: 3 },

  // Outfits
  { key: 'outfit_default', name: 'Default', icon: '👕', slot: 'outfit', unlockType: 'free', unlockValue: null, sortOrder: 0 },
  { key: 'outfit_superhero', name: 'Superhero', icon: '🦸', slot: 'outfit', unlockType: 'level', unlockValue: '4', sortOrder: 1 },
  { key: 'outfit_astronaut', name: 'Astronaut', icon: '🧑‍🚀', slot: 'outfit', unlockType: 'purchase', unlockValue: 'avatar_pack_space', sortOrder: 2 },
  { key: 'outfit_ninja', name: 'Ninja', icon: '🥷', slot: 'outfit', unlockType: 'level', unlockValue: '7', sortOrder: 3 },

  // Accessories
  { key: 'acc_sunglasses', name: 'Sunglasses', icon: '🕶️', slot: 'accessory', unlockType: 'free', unlockValue: null, sortOrder: 0 },
  { key: 'acc_shield', name: 'Shield', icon: '🛡️', slot: 'accessory', unlockType: 'level', unlockValue: '6', sortOrder: 1 },
  { key: 'acc_book', name: 'Magic Book', icon: '📖', slot: 'accessory', unlockType: 'achievement', unlockValue: 'bookworm', sortOrder: 2 },
  { key: 'acc_sword', name: 'Sword', icon: '⚔️', slot: 'accessory', unlockType: 'level', unlockValue: '8', sortOrder: 3 },

  // Backgrounds
  { key: 'bg_home', name: 'Home', icon: '🏠', slot: 'background', unlockType: 'free', unlockValue: null, sortOrder: 0 },
  { key: 'bg_forest', name: 'Forest', icon: '🌲', slot: 'background', unlockType: 'level', unlockValue: '3', sortOrder: 1 },
  { key: 'bg_space', name: 'Space', icon: '🌌', slot: 'background', unlockType: 'purchase', unlockValue: 'avatar_pack_space', sortOrder: 2 },
  { key: 'bg_rainbow', name: 'Rainbow', icon: '🌈', slot: 'background', unlockType: 'achievement', unlockValue: 'marathon', sortOrder: 3 },
  { key: 'bg_castle', name: 'Castle', icon: '🏰', slot: 'background', unlockType: 'level', unlockValue: '9', sortOrder: 4 },

  // Pets
  { key: 'pet_cat', name: 'Cat', icon: '🐱', slot: 'pet', unlockType: 'free', unlockValue: null, sortOrder: 0 },
  { key: 'pet_dog', name: 'Dog', icon: '🐶', slot: 'pet', unlockType: 'level', unlockValue: '2', sortOrder: 1 },
  { key: 'pet_dragon', name: 'Dragon', icon: '🐉', slot: 'pet', unlockType: 'level', unlockValue: '8', sortOrder: 2 },
  { key: 'pet_unicorn', name: 'Unicorn', icon: '🦄', slot: 'pet', unlockType: 'purchase', unlockValue: 'avatar_pack_animals', sortOrder: 3 },
];

async function main() {
  console.log('Seeding achievements...');
  for (let i = 0; i < ACHIEVEMENT_DEFINITIONS.length; i++) {
    const def = ACHIEVEMENT_DEFINITIONS[i];
    await prisma.achievement.upsert({
      where: { key: def.key },
      create: { ...def, criteria: def.criteria as any, sortOrder: i },
      update: {
        name: def.name,
        description: def.description,
        icon: def.icon,
        category: def.category,
        criteria: def.criteria as any,
        sortOrder: i,
      },
    });
  }
  console.log(`  ${ACHIEVEMENT_DEFINITIONS.length} achievements seeded`);

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
