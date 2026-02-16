/**
 * App Store / Play Store metadata constants.
 * Used across the app and for store submission reference.
 */
export const APP_STORE = {
  SHORT_DESCRIPTION:
    'Kids earn screen time by completing real-world quests!',
  LONG_DESCRIPTION: `ScreenQuest turns screen time into a rewarding family experience. Children earn minutes of screen time by completing real-world quests set by their parents — like chores, homework, reading, or outdoor activities.

How It Works:
- Parents create quests with time rewards
- Kids complete quests and submit proof
- Parents approve completions
- Kids redeem earned time with a built-in timer

Key Features:
- Customizable quests with photo proof
- Real-time play timer with pause/resume
- Weekday and weekend time limits
- Violation tracking for accountability
- Family leaderboard with XP system
- Push notifications for approvals and requests

ScreenQuest helps families build healthy screen time habits while encouraging kids to stay active and engaged in the real world.

Subscription unlocks premium features including unlimited quests, advanced analytics, and multiple children support.`,
  KEYWORDS: [
    'screen time',
    'parental controls',
    'kids',
    'quests',
    'chores',
    'family',
    'timer',
    'rewards',
    'parenting',
    'children',
  ],
  SUPPORT_URL: 'https://screenquest.app/support',
  PRIVACY_URL: 'https://screenquest.app/privacy',
  TERMS_URL: 'https://screenquest.app/terms',
  AGE_RATING: '4+',
  CATEGORY_IOS: 'Lifestyle',
  CATEGORY_ANDROID: 'Parenting',
  CONTENT_RATING: 'Everyone',
} as const;
