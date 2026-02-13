# ScreenQuest — Phase 11: Visual Polish, Dynamic Themes & Youth Appeal

> **Prerequisites:** Phases 1–10 complete. The gamification backend (XP, levels, streaks, achievements, avatar items) is already built. This phase is about making the app **visually exciting, rewarding, and irresistible** for kids and teens.
>
> **Goal:** Transform the current clean-but-flat UI into a vibrant, animated, reward-driven experience that keeps kids engaged and motivated.

---

## What to Build in This Phase

### 1. Dynamic Theme System (Child UI)

Currently the app uses a single static color palette. Add a **theme engine** that changes the child's entire UI based on their level, streak, or unlocked cosmetics.

#### 1.1 Theme Data Model

Add to the Prisma schema:

```prisma
model Theme {
  id           String @id @default(uuid()) @db.Uuid
  key          String @unique @db.VarChar(50)
  name         String @db.VarChar(100)
  description  String @db.VarChar(255)
  previewUrl   String? @map("preview_url") @db.VarChar(500)
  unlockType   String @db.VarChar(20)    // 'free' | 'level' | 'streak' | 'achievement' | 'premium'
  unlockValue  Int?   @map("unlock_value")  // e.g., level 5, streak 7
  colors       Json   @db.JsonB           // primary, secondary, accent, background, card, etc.
  gradients    Json?  @db.JsonB           // header gradient, button gradients
  isAnimated   Boolean @default(false) @map("is_animated")
  category     String @db.VarChar(30)     // 'nature', 'space', 'ocean', 'gaming', 'pastel'
  sortOrder    Int    @default(0) @map("sort_order")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz()

  @@map("themes")
}
```

Add `activeThemeId` to the `User` model (nullable, defaults to the base theme).

#### 1.2 Built-in Themes (seed data)

Create at least 8 themes that unlock progressively:

| Theme                   | Unlock                            | Colors                          | Vibe               |
| ----------------------- | --------------------------------- | ------------------------------- | ------------------ |
| **ScreenQuest Classic** | Free (default)                    | Blue + green                    | Clean, friendly    |
| **Sunset Glow**         | Level 3                           | Orange + pink gradient          | Warm, energetic    |
| **Ocean Explorer**      | Level 5                           | Teal + deep blue                | Cool, adventurous  |
| **Neon Arcade**         | Level 8                           | Neon green + purple on dark     | Gaming, exciting   |
| **Candy Land**          | Level 12                          | Pastel pink + mint + lavender   | Sweet, playful     |
| **Space Odyssey**       | Level 15                          | Dark navy + gold stars          | Epic, aspirational |
| **Forest Guardian**     | 7-day streak                      | Earthy greens + brown           | Natural, calm      |
| **Fire Streak**         | 14-day streak                     | Red + orange animated gradients | Intense, rewarding |
| **Diamond Elite**       | 30-day streak                     | Iridescent blue-white shimmer   | Prestigious        |
| **Champion Gold**       | Achievement: Century (100 quests) | Gold + black                    | Exclusive          |

#### 1.3 Theme Provider (Mobile)

```
mobile/src/theme/ThemeProvider.tsx
```

- Create a React Context `ThemeProvider` that wraps the child UI
- Fetches the child's active theme from the API
- Provides dynamic `colors`, `gradients`, and `isAnimated` to all child screens
- Falls back to the default theme if none selected
- Caches theme locally for instant load (AsyncStorage)
- `useTheme()` hook replaces all hardcoded `colors.xxx` references in child screens

#### 1.4 Theme Selection Screen

```
mobile/app/(app)/child/themes.tsx
```

- Grid of theme cards showing preview (gradient swatch + name)
- Locked themes show the unlock requirement with a lock icon overlay
- Unlocked themes show a checkmark; active theme has a highlighted border
- Tapping an unlocked theme applies it immediately (API call + local update)
- Tapping a locked theme shows a motivational toast: "Keep going! Reach Level 8 to unlock Neon Arcade 🎮"
- Animated transition when switching themes (smooth color crossfade)

---

### 2. Enhanced Avatar System

The avatar item backend exists but the frontend needs to be more engaging.

#### 2.1 Avatar Builder Screen (upgrade `avatar-customize.tsx`)

Transform the existing screen into a **full character builder**:

- **Character preview** — large centered avatar with all equipped items rendered in layers
- **Slot tabs** at the bottom: Face, Hair, Hat, Outfit, Accessory, Background
- **Item grid** per slot — scrollable grid of items with:
  - Unlocked items: full color, tappable
  - Locked items: greyed out with lock icon + requirement label ("Lvl 5", "🔥7 streak")
  - Premium items: marked with a ✨ badge (requires subscription)
  - Newly unlocked items: pulsing glow animation + "NEW" badge
- **Live preview** — tapping an item instantly shows it on the character (before saving)
- **Save button** — confirms the full outfit
- **Randomize button** — picks random unlocked items for fun

#### 2.2 Avatar Item Art

Seed the database with at least 40 avatar items across slots:

**Faces (8):** Default, Happy, Cool (sunglasses), Silly, Determined, Sleepy, Excited, Wizard

**Hair (8):** Short, Long, Spiky, Curly, Ponytail, Mohawk, Braids, Rainbow (streak unlock)

**Hats (8):** None, Baseball cap, Crown (lvl 10), Wizard hat, Space helmet, Dino hood, Headband, Party hat (achievement)

**Outfits (8):** Default tee, Superhero cape, Astronaut suit, Knight armor, Lab coat, Sports jersey, Hoodie, Galaxy outfit (premium)

**Accessories (4):** None, Backpack, Shield, Magic wand

**Backgrounds (8):** Solid color, Park, Bedroom, Space, Underwater, Volcano, Rainbow (streak), Disco (premium)

Use emoji or simple vector illustrations (SVG) rendered with `react-native-svg`. For MVP, emoji compositions work great.

#### 2.3 Avatar Unlock Notifications

When a child unlocks a new avatar item (via leveling up, streak, or achievement):

- **Push notification:** "🎉 New avatar item unlocked! You earned the Crown hat!"
- **In-app celebration:** `CelebrationModal` with confetti showing the new item
- **Badge on avatar tab:** Red dot / "NEW" indicator on the profile/avatar tab until they view it

---

### 3. Animated Streak Visuals

Make streaks feel **powerful and visible** throughout the app.

#### 3.1 Streak Fire Animation

- **Dashboard widget:** Show a flame icon next to the streak counter
  - 1–2 day streak: small orange flame 🔥
  - 3–6 day streak: medium flame with gentle animation (flickering)
  - 7–13 day streak: large flame with particle effects
  - 14–29 day streak: blue/purple flame (rare!) with glow
  - 30+ day streak: legendary golden flame with sparkle particles, pulsing glow
- Use `react-native-reanimated` for smooth 60fps animations
- Use `expo-linear-gradient` for the flame color shifts

#### 3.2 Streak Milestone Celebrations

Trigger special celebrations at streak milestones:

| Streak   | Celebration                                                                                   |
| -------- | --------------------------------------------------------------------------------------------- |
| 3 days   | Toast: "🔥 3-day streak! Keep it up!"                                                         |
| 7 days   | Full-screen confetti + "WEEKLY WARRIOR! 🏆" banner + unlock Forest Guardian theme             |
| 14 days  | Epic celebration + unlock Fire Streak theme + special avatar item                             |
| 30 days  | Legendary celebration with fireworks animation + Diamond Elite theme + exclusive avatar frame |
| 50 days  | Custom animated badge on profile visible to family                                            |
| 100 days | 🏅 "Quest Legend" title displayed on leaderboard                                              |

#### 3.3 Streak Freeze (Premium Feature)

- Premium users get 1 "streak freeze" per week
- If they miss a day, the freeze auto-activates and preserves the streak
- Show a ❄️ icon on the frozen day in the streak calendar
- `POST /api/gamification/streak-freeze` — activate manually or auto

---

### 4. Enhanced Dashboard (Child Home Screen)

Redesign `mobile/app/(app)/child/index.tsx` to be more visually exciting:

#### 4.1 Animated Header

- **Gradient background** that reflects the active theme
- **Greeting** with time-of-day awareness: "Good morning, Alex! ☀️" / "Good evening! 🌙"
- **Avatar** displayed prominently (with equipped items)
- **Level badge** with progress ring showing XP to next level
- **Streak flame** with day count

#### 4.2 Quest Cards Redesign

- Add **category color coding** (left border or subtle gradient):
  - Chores: Green 🟢
  - Learning: Blue 🔵
  - Exercise: Orange 🟠
  - Creative: Purple 🟣
  - Kindness: Pink 🩷
  - Custom: Grey ⚪
- Add **reward preview** on each card: "🕐 +15 min"
- Add **difficulty indicator**: ⭐ / ⭐⭐ / ⭐⭐⭐ (based on reward minutes)
- **Completion animation**: card slides away with a satisfying checkmark burst when marked complete
- **Daily quest highlight**: "TODAY'S QUESTS" section with a special frame

#### 4.3 Progress Section

- **XP bar** with animated fill + sparkle effect at milestones
- **"Next unlock"** preview: show what they'll earn at the next level (theme/avatar item)
- **Weekly stats card**: quests completed, minutes earned, mini bar chart
- **Leaderboard preview**: their rank + top 3 family members with avatars

#### 4.4 Motivational Mascot

Expand the existing `MascotWidget`:

- **Context-aware messages:**
  - No quests done today → "Let's get started! Pick a quest! 🚀"
  - All quests done → "Amazing work today! You're a STAR! ⭐"
  - On a streak → "🔥 Day 7! You're on FIRE!"
  - Lost a streak → "No worries! Let's start a new streak today! 💪"
  - Near a level-up → "Almost there! Just 20 XP to Level 8! 🎯"
- **Animated mascot** that reacts (bounces, waves, celebrates) based on achievements
- **Tappable** — tapping shows a fun tip or encouragement

---

### 5. Lottie / Rive Animations

Replace static icons and transitions with smooth animations:

#### 5.1 Key Animations to Add

| Where                   | Animation                       | Library    |
| ----------------------- | ------------------------------- | ---------- |
| Quest completion        | Checkmark burst → confetti      | Lottie     |
| Level up                | Number counter + star explosion | Lottie     |
| Streak increase         | Flame intensifies               | Reanimated |
| Achievement unlock      | Badge drops in with shimmer     | Lottie     |
| Timer complete          | Celebration ring + sparkles     | Lottie     |
| Play session start      | Countdown rocket launch         | Lottie     |
| Empty state (no quests) | Cute character looking around   | Lottie     |
| Loading states          | Bouncing mascot                 | Lottie     |
| Pull-to-refresh         | Custom themed animation         | Lottie     |
| Tab bar icons           | Subtle bounce on active tab     | Reanimated |

#### 5.2 Implementation

- Install `lottie-react-native` for pre-built animations
- Use free animations from [LottieFiles.com](https://lottiefiles.com) (MIT-licensed)
- Store animation JSON files in `mobile/assets/animations/`
- Create a reusable `<LottieAnimation>` wrapper component
- Animations should be **interruptible** and respect reduced motion preferences

---

### 6. Sound Effects (Optional, Premium)

Add satisfying audio feedback:

| Action                | Sound              |
| --------------------- | ------------------ |
| Quest completed       | Bright chime ✨    |
| Level up              | Fanfare 🎺         |
| Achievement unlocked  | Magical sparkle 🪄 |
| Streak milestone      | Power-up sound ⚡  |
| Timer warning (1 min) | Gentle alert 🔔    |
| Timer complete        | Completion bell 🛎️ |
| Button tap            | Soft click         |

- Use `expo-av` for audio playback
- Respect device silent mode
- Add a toggle in child settings: "Sound Effects: On/Off"
- Keep audio files tiny (<50KB each, MP3/WAV)
- Store in `mobile/assets/sounds/`

---

### 7. Parent Dashboard Visual Upgrade

The parent UI should also feel polished (but more "adult" — clean, data-rich):

#### 7.1 Family Overview Card

- **At-a-glance view** of each child:
  - Avatar (with equipped items), name, level badge
  - Today's quest progress: "3/5 quests done"
  - Time Bank balance: "45 min available"
  - Streak: flame + count
  - Status pill: "Playing 🎮" / "Quest time 📋" / "All done ✅"

#### 7.2 Activity Feed

- **Timeline-style** feed of family activity:
  - "Alex completed 'Make Bed' 🛏️ — 5 min ago"
  - "Sam earned a new achievement: Bookworm 📚"
  - "Alex's play session ended — 2h 15m today"
- Each entry has a timestamp, child avatar, and action icon
- Filterable by child

#### 7.3 Charts & Insights

- **Weekly quest completion chart** (bar chart per child, color-coded)
- **Screen time trend** (line chart showing daily play time over the past 2 weeks)
- **Streak calendar** (GitHub-style heatmap showing which days each child completed quests)
- Use `react-native-chart-kit` or `victory-native`

---

### 8. Achievement Badges System

Turn achievements from simple unlocks into **collectible, displayable badges** that kids are proud to show off.

#### 8.1 Badge Visual Design

Each achievement gets a **designed badge** (not just an emoji). Badges have 3 visual tiers:

| Tier       | Appearance                                   | Achievements                                  |
| ---------- | -------------------------------------------- | --------------------------------------------- |
| **Bronze** | Simple icon, muted border                    | First Quest, Streak Starter, Helping Hand     |
| **Silver** | Polished icon, shimmer border, glow          | Super Star, Marathon (7-day streak), Bookworm |
| **Gold**   | Animated icon, particle border, pulsing glow | Unstoppable, Century, Time Master             |

#### 8.2 Badge Data Model

Extend the existing `Achievement` model:

```prisma
// Add fields to Achievement
badgeImageUrl   String?  @map("badge_image_url") @db.VarChar(500)
badgeTier       String   @default("bronze") @map("badge_tier") @db.VarChar(10)  // 'bronze' | 'silver' | 'gold'
badgeColor      String   @default("#CD7F32") @map("badge_color") @db.VarChar(7)  // hex color for the badge border/glow
xpReward        Int      @default(0) @map("xp_reward")  // bonus XP when earned
isSecret        Boolean  @default(false) @map("is_secret")  // hidden until unlocked
```

#### 8.3 Trophy Room / Badge Display Screen

Upgrade `mobile/app/(app)/child/trophies.tsx`:

- **Badge grid** — all achievements displayed as circular badges in a trophy case layout
- **Earned badges** — full color with tier-specific border (bronze/silver/gold ring animation)
- **Unearned badges** — silhouette with "?" icon, tapping shows the requirement hint
- **Secret badges** — completely hidden until unlocked (show as "???" with sparkle)
- **Category tabs** — Milestones, Categories, Streaks, Special
- **Badge detail modal** — tap an earned badge to see:
  - Large badge artwork
  - Achievement name + description
  - Date earned: "Unlocked Feb 10, 2026"
  - Rarity: "12% of ScreenQuest kids have this!"
  - Share button (generates a shareable image for parents to post)
- **Badge counter** in header: "14 / 22 Badges Earned"
- **Progress indicators** on partially-complete badges (e.g., "18/25 quests" for Super Star)

#### 8.4 Profile Badge Showcase

- Children can **pin up to 3 badges** to their profile as a "showcase"
- Pinned badges appear next to their name on the **family leaderboard**
- Pinned badges show on the **parent dashboard** child cards
- API: `PUT /api/gamification/badges/showcase` — set up to 3 badge IDs

#### 8.5 Badge Unlock Experience

When a new badge is earned:

1. **Push notification** with badge image: "🏆 Achievement Unlocked: Super Star!"
2. **Full-screen celebration** — badge drops from top, spins, lands with glow burst + confetti
3. **XP bonus** awarded (shown in the celebration: "+50 XP Bonus!")
4. **Sound effect** — magical achievement sound 🪄
5. **"Add to Showcase?"** prompt — lets them immediately pin it
6. **Red dot** on Trophies tab until they view new badges

#### 8.6 Expanded Achievement List

Add more achievements to make the badge collection deeper:

**Milestones:**

- 🌟 First Quest (1 quest) — Bronze
- ⭐ Super Star (25 quests) — Silver
- 💪 Unstoppable (50 quests) — Silver
- 💯 Century (100 quests) — Gold
- 🏅 Quest Legend (250 quests) — Gold
- 👑 Quest Master (500 quests) — Gold

**Streaks:**

- 🔥 Streak Starter (3-day streak) — Bronze
- 🏃 Marathon (7-day streak) — Silver
- ⚡ Lightning Streak (14-day streak) — Silver
- 🌋 Inferno (30-day streak) — Gold
- 💎 Diamond Streak (50-day streak) — Gold
- ♾️ Unstoppable Force (100-day streak) — Gold, Secret

**Categories:**

- 🤝 Helping Hand (5 chores) — Bronze
- 📚 Bookworm (5 learning) — Bronze
- 🏋️ Fitness Fan (5 exercise) — Bronze
- 🎨 Creative Genius (5 creative) — Bronze
- 💖 Kind Heart (5 kindness) — Bronze
- 🧹 Chore Champion (25 chores) — Silver
- 🎓 Scholar (25 learning) — Silver
- 🏆 All-Rounder (5+ in every category) — Gold

**Special:**

- 🐦 Early Bird (quest before 9 AM) — Bronze
- 🦉 Night Owl (quest after 6 PM) — Bronze
- ⏰ Time Master (500 total minutes earned) — Silver
- 🕐 Time Lord (2000 total minutes earned) — Gold
- 🎯 Perfect Day (complete all assigned quests in a day) — Silver
- 📸 Proof Pro (submit 10 photo proofs) — Bronze
- 🏠 Family Hero (every family member on a streak same day) — Gold, Secret
- 🥚 Easter Egg (tap the mascot 10 times) — Bronze, Secret

---

### 9. Micro-interactions & Polish

Small details that make the app feel premium:

- **Haptic feedback** on key actions (quest complete, timer start, achievement unlock) — use `expo-haptics`
- **Skeleton loading** screens instead of spinners (shimmer placeholders for cards)
- **Smooth page transitions** — slide/fade between screens using `react-native-reanimated` layout animations
- **Pull-to-refresh** with custom animated header on list screens
- **Empty states** with themed illustrations (not just text)
- **Toast notifications** with themed colors and icons (not plain text)
- **Swipe gestures** on quest cards (swipe right to mark complete, swipe left to see details)
- **Long-press** on avatar to quick-change it
- **Easter eggs:** tap the mascot 10 times → funny animation + hidden achievement

---

### 10. Accessibility & Inclusive Design

While making things vibrant, ensure accessibility:

- All animations respect `prefers-reduced-motion` (check `AccessibilityInfo.isReduceMotionEnabled`)
- Minimum contrast ratios (4.5:1) for all theme color combinations
- Screen reader labels on all interactive elements, animations, and icons
- Font scaling support (test with iOS/Android large text settings)
- Color-blind friendly: never rely solely on color to convey information (add icons/labels)
- Test all themes with color blindness simulators

---

### 11. Implementation Order

| Step | Task                                                       | Effort   |
| ---- | ---------------------------------------------------------- | -------- |
| 1    | Theme data model + seed themes + API endpoints             | 1 day    |
| 2    | ThemeProvider + `useTheme()` hook                          | 0.5 day  |
| 3    | Theme selection screen (child)                             | 1 day    |
| 4    | Refactor child screens to use dynamic theme                | 1 day    |
| 5    | Avatar builder screen upgrade                              | 1.5 days |
| 6    | Seed 40+ avatar items                                      | 0.5 day  |
| 7    | Streak fire animation + milestones                         | 1 day    |
| 8    | Child dashboard redesign                                   | 1.5 days |
| 9    | Achievement badge system — data model + tier visuals       | 1 day    |
| 10   | Trophy room / badge display screen + showcase              | 1.5 days |
| 11   | Badge unlock celebration + expanded achievements seed      | 1 day    |
| 12   | Lottie animations (quest complete, level up, achievements) | 1 day    |
| 13   | Parent dashboard visual upgrade                            | 1 day    |
| 14   | Micro-interactions (haptics, skeletons, transitions)       | 1 day    |
| 15   | Sound effects                                              | 0.5 day  |
| 16   | Accessibility audit + fixes                                | 0.5 day  |

**Total estimated effort: ~14.5 days**

---

### NPM Packages to Install (mobile)

```bash
# In the mobile workspace
pnpm add lottie-react-native expo-haptics expo-av expo-linear-gradient react-native-svg react-native-chart-kit
```

> **Note:** `react-native-reanimated` should already be installed with Expo SDK 54. If not, add it.

---

### Backend API Additions

| Endpoint                                  | Method | Description                                  |
| ----------------------------------------- | ------ | -------------------------------------------- |
| `/api/gamification/themes`                | GET    | List all themes with unlock status for child |
| `/api/gamification/themes/active`         | PUT    | Set the child's active theme                 |
| `/api/gamification/streak-freeze`         | POST   | Use a streak freeze (premium)                |
| `/api/gamification/progress/weekly-stats` | GET    | Weekly quest/XP/time stats for charts        |
| `/api/families/:id/activity-feed`         | GET    | Family activity timeline (paginated)         |

---

### Tests to Write

#### Backend Unit Tests

**Theme Service (`backend/src/gamification/theme.service.spec.ts`):**
- `getThemes(childId)` returns all themes with correct `isUnlocked` status based on child's level and streak
- `setActiveTheme(childId, themeId)` succeeds for an unlocked theme
- `setActiveTheme(childId, themeId)` throws for a locked theme
- `setActiveTheme(childId, themeId)` throws for a premium theme without subscription
- Theme unlock status updates correctly when child levels up

**Streak Freeze (`backend/src/gamification/streak.service.spec.ts`):**
- `useStreakFreeze(childId)` succeeds for premium user with freeze available
- `useStreakFreeze(childId)` throws for free user
- `useStreakFreeze(childId)` throws if already used this week
- Streak freeze preserves streak count when a day is missed

**Weekly Stats (`backend/src/gamification/stats.service.spec.ts`):**
- `getWeeklyStats(childId)` returns correct quest count, XP earned, and minutes earned for the past 7 days
- Returns zeroes for a child with no activity

**Activity Feed (`backend/src/family/activity-feed.service.spec.ts`):**
- `getActivityFeed(familyId)` returns paginated entries sorted by most recent
- Feed includes quest completions, achievements, and play sessions
- Feed does not leak data from other families

**Badge Showcase (`backend/src/gamification/badge.service.spec.ts`):**
- `setShowcase(childId, badgeIds)` accepts up to 3 badge IDs
- `setShowcase(childId, badgeIds)` throws if more than 3
- `setShowcase(childId, badgeIds)` throws if child hasn't earned the badge

#### Backend Integration Tests

**Theme Flow (`backend/test/theme.e2e-spec.ts`):**
- `GET /gamification/themes` — returns theme list with unlock status for authenticated child
- `PUT /gamification/themes/active` — sets active theme, returns updated user
- `PUT /gamification/themes/active` with locked theme — returns 403
- Theme endpoints require authentication — returns 401 without token

**Stats & Feed (`backend/test/stats.e2e-spec.ts`):**
- `GET /gamification/progress/weekly-stats` — returns correct stats for authenticated child
- `GET /families/:id/activity-feed` — returns paginated activity for family members
- `GET /families/:id/activity-feed` — returns 403 for non-family member

---

### Success Metrics

After launching Phase 11, measure:

- **Child engagement:** avg daily app opens, time spent in app
- **Avatar customization rate:** % of children who customize their avatar
- **Theme selection rate:** % of children who change their theme
- **Streak length increase:** avg streak length before vs. after
- **Retention lift:** D7/D30 retention improvement
- **Quest completion rate:** daily quests completed per child
