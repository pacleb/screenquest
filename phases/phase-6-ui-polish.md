# ScreenQuest — Phase 6: Kid-Friendly UI & Parent Dashboard Polish

> **Prerequisites:** Phases 1-5 complete (all core features functional with basic UI).
> **Context:** Read `screen-time-app-prompt.md` sections 5 (Gamification & Design) and 14 (Design Tokens) for full design spec. This phase transforms all existing screens from functional prototypes into the polished, kid-friendly experience.

---

## What to Build in This Phase

### 1. Design System / Theme Implementation

Create a comprehensive theme module used across the entire app:

```typescript
// theme/colors.ts
export const colors = {
  primary: "#4A90D9", // friendly blue
  secondary: "#7ED321", // success green
  accent: "#F5A623", // warm orange
  purple: "#9B59B6", // fun purple
  background: "#F7F9FC", // light gray-blue
  card: "#FFFFFF",
  textPrimary: "#2C3E50",
  textSecondary: "#7F8C8D",
  error: "#E74C3C",
  warning: "#F39C12",
  // Child-specific
  childBg: "#FFF8E7", // warm cream for child screens
  questCard: "#E8F5E9", // light green for quest cards
  timerActive: "#4A90D9",
  timerWarning: "#F5A623",
  timerDanger: "#E74C3C",
};

// theme/typography.ts — Nunito for children, Inter for parents
// theme/spacing.ts — 8px grid
// theme/shadows.ts — soft colorful shadows
// theme/animations.ts — spring configs for bouncy animations
```

- Install custom fonts: **Nunito** (child UI), **Inter** (parent UI)
- Create reusable animated components with `react-native-reanimated`
- All corner radii: cards 16px, buttons 24px (pill), inputs 12px

### 2. Shared UI Component Library

Build these reusable components following the design spec:

- **Button** — pill-shaped, bouncy press animation, loading state, variants (primary, secondary, danger, ghost)
- **Card** — rounded, soft shadow, optional colored left border by category
- **Avatar** — circular, with fallback initials, optional level badge overlay
- **Badge** — small pill label (e.g., "Stackable", "Today Only", "Pending")
- **TimeBankDisplay** — visual meter/jar showing balance (animated fill level)
- **CountdownTimer** — circular progress with large numbers, color transitions (blue→orange→red)
- **QuestCard** — icon, name, reward, stacking badge, category tag, status indicator
- **SwipeableCard** — for approval queue (swipe right=green/approve, left=red/deny)
- **EmptyState** — illustrated placeholder for empty lists
- **Toast/Snackbar** — for inline feedback
- **ConfettiAnimation** — full-screen confetti burst for celebrations
- **StarBurst** — animated stars flying from a point (for quest approval)
- **MascotWidget** — the app mascot character with speech bubble (greetings, encouragement)
- **BottomSheet** — for pickers and confirmations

### 3. Child UI — Full Design Polish

Apply the kid-friendly design to all child screens:

**Child Home screen:**

- Mascot greeting at top: "Hi {name}! Ready for an adventure? 🚀" (varies by time of day)
- Time Bank as a **visual jar/piggy bank** filling up with animated coins/stars
  - Stackable balance: solid fill
  - Non-stackable balance: pulsing/glowing section with "⏰ Expires tonight!" label
  - Tap jar → shows detailed breakdown
- "PLAY" button — oversized, glowing, bouncy, with play icon (▶️)
  - Disabled state (gray, no glow) if balance is 0 or negative
  - If negative balance: shows "Earn {X} more minutes!" with progress bar toward zero
- Available quests as a horizontal scrollable row of colorful cards
- Violation indicator (if any): subtle "⚠️ 1 strike" badge — warm tone, not scary
- Bottom tab bar with icons: Home 🏠, Quests 📋, Play ▶️, Trophies 🏆, Me 👤

**Quest Board screen:**

- Category filter chips at top (horizontal scroll)
- Quest cards in a 2-column grid:
  - Large icon/emoji
  - Quest name (bold, Nunito)
  - "⭐ 30 min" reward badge
  - Stacking indicator: "📦" or "⏰"
  - Completed today: green check overlay
  - Pending approval: spinning hourglass overlay
- Fun background pattern (subtle stars/dots)

**Quest Detail screen:**

- Large icon at top with category color background
- Quest name in big, fun font
- Reward: large "⭐ 30 minutes" display
- Stacking info with kid-friendly explanation:
  - Stackable: "💾 This time is yours to keep! Use it whenever!"
  - Non-Stackable: "⏰ Use this time today — it resets tomorrow!"
- Description (if any)
- Large "I DID IT!" button (green, bouncy, celebratory)
- Camera button if proof required: "📸 Take a picture!"
- After submission: confetti + "Awesome! Sent to {Parent}! 🎉"

**Play screen:**

- When selecting time: large slider or spinning dial — big touch targets
- Preset buttons as colorful bubbles
- Balance shown prominently: "You have {X}"
- Active timer: large circular countdown, animated progress ring
  - Blue (plenty of time) → Orange (< 5 min) → Red (< 1 min)
  - Fun animated background (subtle moving stars/clouds)
  - Large Pause ⏸️ and Stop ⏹️ buttons
- Paused state: pulsing "Paused" with ice crystal visual ❄️
- Time's up screen: celebration with stars, "Great job! 🌟", mascot giving thumbs up

**History screen:**

- Simple timeline of earned and used time
- Green (+) entries for quests completed, Red (-) entries for play time used
- Violation entries in orange/warning style

### 4. Parent UI — Dashboard Polish

Apply clean, professional design to parent screens:

**Parent Dashboard:**

- Header: "Good morning, {name}" with date
- **Children overview cards** (horizontal scroll if multiple):
  - Child avatar + name
  - Time Bank balance (large number)
  - Active play session indicator (pulsing green dot + remaining time)
  - "N pending" badge for approvals
  - Tap → child detail screen
- **Pending approvals section** — top 3 as swipeable cards, "See all" link
- **Quick stats:** Total quests completed this week, total screen time used
- **Active sessions** section: real-time countdown for each playing child

**Approval Queue:**

- Full-screen swipeable cards
- Satisfying animations: swipe right = green swoosh + ✓, swipe left = red swoosh + ✗
- Each card: child avatar, quest name, time reward, timestamp, proof thumbnail
- Pull-to-refresh

**Quest Manager (parent):**

- Clean list with category section headers
- Drag-to-reorder
- Active quest count indicator: "2/3 quests" (free plan) or "12 quests" (premium)
- Inline archive/unarchive actions

**Child Detail screen (parent):**

- Child avatar + name + age at top
- Time Bank visual + exact numbers
- Recent quests completed (quick list)
- Active play session (if any) with remote controls (extend, end)
- Violation count + quick "Record Violation" button
- Settings button
- Tab: History, Achievements, Settings

**Consequences screen:**

- Per-child cards with traffic light visual for severity
- Clear penalty progression display
- Action buttons with confirmation dialogs

### 5. Onboarding Flow

Build a polished onboarding experience:

1. **Welcome screens** (3 swipeable pages):
   - "Welcome to ScreenQuest! Help your kids earn screen time through real quests! 🏰"
   - "Parents set quests, kids complete them, everyone wins! 🎯"
   - "Get started in just 2 minutes! 🚀"
2. **Sign Up** — clean form with social auth buttons
3. **Create Family** — name input with mascot illustration
4. **Add First Child** — name, age, avatar picker (illustrated faces)
5. **Create First Quest** — guided setup with library suggestions
6. **Tour complete** — "You're ready! 🎉" with confetti

### 6. Animations & Micro-interactions

- All buttons: slightly scale down on press (0.95), spring back on release
- Quest card tap: bounce effect
- Time Bank changes: animated number counting up/down
- Tab bar: icon bounce on select
- Pull-to-refresh: custom mascot animation
- Page transitions: smooth horizontal slides with slight parallax
- Confetti: use `react-native-confetti-cannon` or custom implementation
- Loading states: skeleton screens (not spinners) + mascot animations for longer waits

### 7. Accessibility

- All interactive elements have accessibility labels
- VoiceOver/TalkBack tested on all screens
- Minimum touch targets: 48pt (ideally 56pt for child screens)
- Color contrast ratio: minimum 4.5:1 for text
- Support Dynamic Type (iOS) and font scaling (Android)
- Reduce Motion support: disable spring/bounce animations when system setting is on

---

## Done When

- [ ] Design system theme is implemented with all tokens (colors, fonts, spacing, shadows)
- [ ] Component library is built and used across all screens
- [ ] Child screens are fully styled — colorful, round, animated, kid-friendly
- [ ] Parent screens are fully styled — clean, modern, professional
- [ ] Mascot appears with greetings and encouragement
- [ ] Time Bank is displayed as a visual jar/meter with animations
- [ ] Countdown timer has color transitions and visual polish
- [ ] Confetti/celebratory animations fire on quest approval and achievements
- [ ] Onboarding flow is complete and polished
- [ ] All animations and micro-interactions are implemented
- [ ] Accessibility checklist passes (VoiceOver, TalkBack, contrast, touch targets)
- [ ] App feels fun and engaging for kids, efficient and clear for parents
