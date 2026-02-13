export interface AchievementDefinition {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  criteria: {
    type: string;
    value?: number;
    category?: string;
    beforeHour?: number;
  };
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
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
