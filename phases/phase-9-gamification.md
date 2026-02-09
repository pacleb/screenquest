# ScreenQuest — Phase 9: Gamification (Streaks, Badges, Levels)

> **Prerequisites:** Phases 1-8 complete (full app launched with CMS).
> **Context:** Read `screen-time-app-prompt.md` section 5.2 for gamification spec. This is a "fast follow" phase — the app works fully without this, but gamification increases engagement and retention.

---

## What to Build in This Phase

### 1. Database Tables

```sql
-- Achievements / Badges
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,        -- e.g., "Helping Hand"
  description TEXT NOT NULL,          -- e.g., "Complete 10 chores"
  icon_url VARCHAR(500) NOT NULL,
  category VARCHAR(50) NOT NULL,      -- 'streak', 'badge', 'level_up', 'milestone'
  requirement_type VARCHAR(50) NOT NULL,  -- 'quest_count', 'category_count', 'streak_days', 'total_minutes_earned'
  requirement_value INTEGER NOT NULL,     -- e.g., 10 (for 10 chores)
  requirement_category VARCHAR(50),       -- e.g., 'chores' (null if applies to all)
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Earned achievements per child
CREATE TABLE child_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES users(id) NOT NULL,
  achievement_id UUID REFERENCES achievements(id) NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, achievement_id)
);

-- Streaks
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES users(id) UNIQUE NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Levels
CREATE TABLE child_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES users(id) UNIQUE NOT NULL,
  current_level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,   -- experience points (1 quest completion = 10 XP + bonus for streaks)
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Avatar items
CREATE TABLE avatar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,   -- 'hat', 'outfit', 'accessory', 'background', 'pet'
  image_url VARCHAR(500) NOT NULL,
  unlock_type VARCHAR(20) NOT NULL CHECK (unlock_type IN ('free', 'level', 'achievement', 'purchase')),
  unlock_value VARCHAR(100),       -- level number, achievement ID, or IAP product ID
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Child's unlocked/equipped avatar items
CREATE TABLE child_avatar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES users(id) NOT NULL,
  avatar_item_id UUID REFERENCES avatar_items(id) NOT NULL,
  is_equipped BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, avatar_item_id)
);
```

### 2. Streak System

**Logic:**
- Each day a child completes at least 1 quest → streak continues
- If a day passes with no quest completions → streak resets to 0
- Check streak via a daily cron job or on each quest completion

**Streak tracking on quest completion:**
```typescript
async function updateStreak(childId: string) {
  const streak = await getStreak(childId);
  const today = new Date().toISOString().split('T')[0];
  const yesterday = /* yesterday's date */;
  
  if (streak.lastActivityDate === today) {
    // Already completed a quest today, no change
    return;
  } else if (streak.lastActivityDate === yesterday) {
    // Consecutive day — increment streak
    streak.currentStreak += 1;
    streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
  } else {
    // Streak broken — reset
    streak.currentStreak = 1;
  }
  streak.lastActivityDate = today;
  await saveStreak(streak);
}
```

**Streak-based push notifications:**
- "You've completed quests 5 days in a row! 🔥"
- "Don't break your streak! Complete a quest today! 🔥" (if no quest by 6 PM)

### 3. Badge/Achievement System

**Seed achievements:**

| Name | Description | Requirement |
|------|-------------|-------------|
| First Quest | Complete your first quest | 1 quest total |
| Helping Hand | Complete 10 chores | 10 quests in Chores category |
| Bookworm | Complete 20 reading sessions | 20 quests in Reading category |
| Super Star | Complete quests for a full week | 7-day streak |
| Unstoppable | Complete quests for 30 days | 30-day streak |
| Century | Complete 100 quests total | 100 quests total |
| Early Bird | Complete a quest before 9 AM | 1 quest before 9 AM |
| Time Master | Use exactly all earned time | 1 play session using full balance |
| Streak Starter | Get a 3-day streak | 3-day streak |
| Marathon | Get a 14-day streak | 14-day streak |

**Achievement check logic:**
- After each quest completion, check all unearned achievements
- If requirements met → award achievement + push notification + store for celebration animation
- When child opens app after earning: confetti + badge reveal animation

### 4. Level System

**XP and levels:**
- Each quest completion = **10 XP**
- Streak bonus: +2 XP per active streak day (e.g., 5-day streak gives +10 bonus)
- Levels scale progressively:

| Level | Title | XP Required |
|-------|-------|-------------|
| 1 | Starter | 0 |
| 2 | Explorer | 50 |
| 3 | Adventurer | 120 |
| 4 | Helper | 220 |
| 5 | Champion | 350 |
| 6 | Hero | 520 |
| 7 | Super Hero | 730 |
| 8 | Legend | 1000 |
| 9 | Master | 1350 |
| 10 | Quest Master | 1800 |

- Level-up triggers: celebration animation + push notification + unlock avatar items
- Display XP progress bar on child profile

### 5. Avatar Customization

**Avatar system:**
- Child has a customizable avatar displayed throughout the app
- Avatar parts: base character, hat, outfit, accessory, background, pet companion
- Some items are free (available from start)
- Some unlock at specific levels
- Some unlock with badges/achievements
- Some are purchasable (IAP cosmetic packs from Phase 7)

**API:**
- `GET /api/children/:childId/avatar` — get current avatar configuration
- `PUT /api/children/:childId/avatar` — update equipped items
- `GET /api/children/:childId/avatar-items` — list all items (locked + unlocked)
- `POST /api/children/:childId/avatar-items/:itemId/unlock` — unlock an item (if requirements met)

### 6. Weekly Challenges (Optional)

- System generates bonus quests each week worth extra time
- Examples: "Complete 3 quests in one day!", "Try a new category!", "Help someone today!"
- Managed via the CMS (add challenge quests with weekly recurrence)
- Challenges appear in their own section on the Quest Board

### 7. Family Leaderboard

**Optional, toggled by parent:**
- Siblings can see who earned the most XP this week
- Simple ranked list with child avatar, name, XP this week
- Resets weekly (every Monday)
- Parent can disable per family if it causes rivalry

**API:**
- `GET /api/families/:familyId/leaderboard?period=week` — ranked children by XP
- Parent setting: `PUT /api/families/:familyId/settings` — `{ leaderboardEnabled: boolean }`

### 8. Mobile App — Gamification Screens

**Achievements screen (Child):**
- Grid of badge icons
- Earned: colorful, with date earned
- Locked: grayed out, with requirement text ("Complete 10 chores")
- Progress bar for badges close to being earned
- Tap → detail view with larger badge image and description

**Profile screen updates (Child):**
- Level badge with XP progress bar
- Current streak with flame animation (🔥)
- "X/Y badges earned" counter
- Avatar display with "Customize" button
- Avatar customization: dress-up interface — tap a slot (hat, outfit, etc.) → scrollable item picker

**Home screen updates (Child):**
- Level badge next to child name
- Streak counter with flame icon
- New badge notification popup when app opens after earning one

**Leaderboard tab (if enabled):**
- Ranked siblings with XP bars
- Crown icon for #1
- Encouraging copy: "Great job this week! 🎉"

---

## Done When

- [ ] Streak system tracks consecutive days and resets correctly
- [ ] Badges are awarded when requirements are met
- [ ] Celebration animations trigger for new badges and level-ups
- [ ] Leveling system with XP works (quests give XP, streak bonus, progressive thresholds)
- [ ] Avatar customization is functional (equip/unequip items)
- [ ] Items unlock based on level, achievements, and purchases
- [ ] Achievements screen displays earned/locked badges with progress
- [ ] Child profile shows level, XP bar, streak, badge count
- [ ] Family leaderboard works and can be toggled by parent
- [ ] Push notifications fire for streaks, achievements, and level-ups
- [ ] All gamification data persists correctly across sessions
- [ ] Weekly challenge quests can be managed from CMS
