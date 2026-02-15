# ScreenQuest Mobile App — Visual Redesign Prompt

> **Reference**: The ScreenQuest logo features a friendly cartoon tablet character with a smiling face and a golden "PLAY" button, paired with a glowing green stopwatch showing "1:00". The scene is set against a deep purple/indigo background filled with scattered golden stars, evoking a magical, adventure-ready atmosphere. The overall feel is playful, vibrant, and kid-friendly while still feeling polished and modern.

---

## Design Direction

Redesign the ScreenQuest mobile app's look and feel to match the logo's visual identity. The app manages children's screen time through quests and rewards, and has two distinct user experiences: a **Child UI** (fun, gamified, animated) and a **Parent UI** (clean, trustworthy, streamlined). Both should feel like they belong to the same brand universe established by the logo.

---

## 1. Color Palette

Replace the current blue/green/orange palette with the logo's signature colors:

### Primary Colors

| Token          | Hex       | Usage                                                                           |
| -------------- | --------- | ------------------------------------------------------------------------------- |
| `primary`      | `#6B2FA0` | **Deep Purple** — main brand color, headers, primary buttons, parent active tab |
| `primaryLight` | `#8B5FBF` | Lighter purple — hover/pressed states, secondary elements                       |
| `primaryDark`  | `#4A1D73` | Darker purple — status bar, depth accents                                       |

### Accent Colors

| Token         | Hex       | Usage                                                                        |
| ------------- | --------- | ---------------------------------------------------------------------------- |
| `accent`      | `#F5A623` | **Golden Amber** — CTA buttons ("PLAY"), highlights, child active tab, stars |
| `accentLight` | `#FFD166` | Light gold — XP indicators, star particles, badge glow                       |
| `accentDark`  | `#D4891A` | Deep gold — pressed button states                                            |

### Secondary Colors

| Token            | Hex       | Usage                                                                |
| ---------------- | --------- | -------------------------------------------------------------------- |
| `secondary`      | `#4CD964` | **Bright Green** — stopwatch/timer, success states, quest completion |
| `secondaryLight` | `#7EE89A` | Light green — timer glow, progress bars                              |
| `secondaryDark`  | `#2DA844` | Dark green — completed badges                                        |

### Neutrals

| Token           | Light Mode | Dark Mode | Usage                                      |
| --------------- | ---------- | --------- | ------------------------------------------ |
| `background`    | `#F5F0FA`  | `#15101E` | Slight purple-tinted background            |
| `card`          | `#FFFFFF`  | `#1E1830` | Card surfaces with subtle purple undertone |
| `textPrimary`   | `#2A1B3D`  | `#EDE8F5` | Deep purple-black body text                |
| `textSecondary` | `#6B5B7B`  | `#9B8FB0` | Muted purple-gray secondary text           |
| `border`        | `#E0D6EC`  | `#2E2540` | Soft purple-tinted borders                 |

### Semantic Colors

| Token     | Hex       | Usage                         |
| --------- | --------- | ----------------------------- |
| `error`   | `#E74C3C` | Errors, violations            |
| `warning` | `#F5A623` | Warnings (shares with accent) |
| `xp`      | `#FFD700` | XP gold (keep)                |
| `streak`  | `#FF6B35` | Streak fire (keep)            |

### Child-Specific

| Token          | Hex       | Usage                           |
| -------------- | --------- | ------------------------------- |
| `childBg`      | `#F0E6FF` | Warm lavender child background  |
| `questCard`    | `#E8F5E9` | Keep green tint for quest cards |
| `timerActive`  | `#4CD964` | Green timer (matches stopwatch) |
| `timerWarning` | `#F5A623` | Golden warning                  |
| `timerDanger`  | `#E74C3C` | Red danger                      |

---

## 2. Gradients

Update gradients to reflect the purple-to-gold brand spectrum:

| Key       | Colors                | Usage                        |
| --------- | --------------------- | ---------------------------- |
| `primary` | `#6B2FA0` → `#4A1D73` | Headers, primary surfaces    |
| `brand`   | `#6B2FA0` → `#8B5FBF` | Splash screen, onboarding    |
| `accent`  | `#F5A623` → `#D4891A` | CTA buttons, play button     |
| `magical` | `#4A1D73` → `#1A0A33` | Night/magical backgrounds    |
| `success` | `#4CD964` → `#2DA844` | Timer active, quest complete |
| `header`  | `#6B2FA0` → `#5A2690` | Navigation headers           |
| `card`    | `#FFFFFF` → `#F5F0FA` | Subtle card backgrounds      |
| `streak`  | `#FF6B35` → `#E8521C` | Streak displays (keep)       |

### Dark Mode Gradients

| Key       | Colors                |
| --------- | --------------------- |
| `primary` | `#4A1D73` → `#2A1050` |
| `magical` | `#15101E` → `#0A0510` |
| `header`  | `#2A1050` → `#1E0A3D` |
| `card`    | `#1E1830` → `#15101E` |

---

## 3. Typography

Keep the current font families (Nunito for children, Inter for parents) — they already match the logo's friendly-yet-modern personality. Adjust weights for emphasis:

- **Child UI**: Continue with **Nunito** — its rounded letterforms match the logo's soft, friendly character
- **Parent UI**: Continue with **Inter** — clean and readable for dashboard/settings

### Adjustment

- Increase `childH1` to **36px** (from 32) to feel more impactful and game-like
- Add a new `display` style: Nunito ExtraBold, 56px — for celebrations, level-ups, and the timer countdown

---

## 4. Visual Elements & Patterns

### Stars & Sparkles

- Add **scattered star particles** to key backgrounds (like the logo's golden stars)
- Use animated floating stars on the child dashboard, quest completion, and celebration screens
- Stars should be golden (#FFD166) with subtle glow/twinkle animation
- Density: sparse for normal screens, dense for celebrations

### Glow Effects

- The stopwatch in the logo has a **green glow** — apply similar glow effects to:
  - Active timer ring (green glow when running)
  - XP/reward numbers (golden glow)
  - Primary buttons on hover/press (purple glow)
- Implement using `shadowColor` with increased `shadowRadius` and opacity

### Rounded, Friendly Shapes

- The logo's characters are **soft and rounded** — increase border radii:
  - Cards: `16px` (from 12)
  - Buttons: `16px` (from 12), pill-shaped CTAs use `9999`
  - Input fields: `12px`
  - Tab bar: `24px` top corners
- Avatar frames should be **rounded squares** (borderRadius: 20) not circles

### Screen/Tablet Character

- Consider using the tablet mascot character from the logo as the app's **mascot/guide**
- Show it on empty states, onboarding, loading screens, and error pages
- Different expressions: happy (success), curious (loading), sad (errors), excited (celebrations)

---

## 5. Component-Specific Styling

### Navigation / Tab Bar

- **Child tab bar**: Deep purple background (`#4A1D73`) with golden active indicator and star icon decorations
- **Parent tab bar**: Clean white/light purple with purple active indicator
- Tab icons should have a subtle bounce animation on tap
- Active tab gets a **golden glow dot** underneath (child) or purple underline (parent)

### Cards

- Subtle purple-tinted shadow (`shadowColor: '#6B2FA0'`) instead of gray
- On child screens, quest cards get a faint **star border pattern** or corner star decorations
- Timer card gets a green-glow border when active

### Buttons

- **Primary**: Purple gradient background, white text, subtle glow on press
- **CTA / Play**: Golden gradient (matching the logo's PLAY button), dark text, rounded pill shape
- **Secondary**: Purple outline with transparent background
- **Destructive**: Red, consistent with current

### Timer / Countdown

- The countdown ring should use **green** as its primary color (matching the stopwatch)
- Add a faint green glow around the timer when active
- The center number should use `display` typography (large Nunito ExtraBold)
- When time is low, transition glow from green → amber → red

### Headers

- Use purple gradient backgrounds for screen headers
- Add subtle decorative stars in header corners (child screens only)
- Parent headers stay clean with flat purple or white

### Celebration / Achievement Modals

- Deep purple/indigo (`#1A0A33`) semi-transparent backdrop
- Golden confetti particles + star burst animation
- Golden glowing text for achievement titles
- The tablet mascot character celebrating

---

## 6. Iconography

- Keep **Ionicons** as the base icon set
- For child UI, prefer **filled/solid** icon variants (warmer, more playful)
- For parent UI, prefer **outline** icon variants (cleaner, more professional)
- Key icons to customize:
  - Timer icon → green stopwatch (referencing logo)
  - Play/start icon → golden play triangle
  - Quest icon → purple scroll/shield with star
  - Achievement icon → golden star/trophy

---

## 7. Animations & Motion

- **Star twinkle**: Subtle scale + opacity pulse on decorative stars (2-4s loop, staggered)
- **Button press**: Scale down to 0.95 + glow pulse
- **Tab switch**: Smooth cross-fade with slight slide
- **Timer tick**: Subtle pulse on the countdown ring every second
- **Quest complete**: Star burst + confetti + mascot celebration
- **Level up**: Radial star explosion from center + golden shimmer

---

## 8. Dark Mode Adjustments

Dark mode should feel like a **magical night sky**:

- Background: Very deep purple-black (`#15101E`) — not pure black
- Cards: Dark plum (`#1E1830`) with subtle purple border
- Stars/sparkle decorations become **brighter and more prominent** in dark mode
- Glow effects (green timer, golden accents) should be **more vivid** against the dark background
- Text shifts to light lavender (`#EDE8F5`) for readability
- The overall vibe: looking at a magical night sky full of stars

---

## 9. Splash Screen & Onboarding

- **Splash screen**: Deep purple gradient background with the full logo centered, golden stars floating around it
- **Onboarding slides**: Purple gradient backgrounds with illustrated scenes using the mascot tablet character and golden star accents
- Progress dots: golden filled / purple outline

---

## 10. Summary of Brand Personality

| Attribute       | Expression                                                                |
| --------------- | ------------------------------------------------------------------------- |
| **Playful**     | Rounded shapes, bouncy animations, friendly mascot, stars everywhere      |
| **Magical**     | Purple/indigo palette, star patterns, glow effects, "night sky" dark mode |
| **Rewarding**   | Golden accents for achievements, celebratory animations, shimmer effects  |
| **Trustworthy** | Clean parent UI, consistent spacing, professional Inter typography        |
| **Energetic**   | Green timer (go!), vibrant gradients, animated transitions                |

The goal is for every screen to feel like the child is embarking on a **quest in a magical world** — where completing tasks earns golden stars, time is tracked by a glowing stopwatch, and their friendly tablet companion guides them along the way.
