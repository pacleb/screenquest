# ScreenQuest — Developer Handoff Document

> **Last updated:** Phase 11 (partial) complete (Feb 14, 2026)
> **Purpose:** Gives any AI agent or developer full context to continue implementation from any phase.

---

## Project Overview

ScreenQuest is a family screen-time management app where **children earn screen time by completing real-world quests** (chores, learning, exercise). Parents create quests, approve completions, and manage play sessions with a built-in timer.

**Stack:** NestJS (backend) + Expo/React Native (mobile) + Next.js (CMS admin) + PostgreSQL + Redis

---

## Repository Structure

```
screenquest/
├── backend/          NestJS API server
│   ├── prisma/       Schema, migrations, seeds
│   ├── src/
│   │   ├── auth/          JWT auth, guards, strategies
│   │   ├── family/        Family CRUD, child management, invites
│   │   ├── quest/         Quest CRUD, assignments, recurrence
│   │   ├── completion/    Quest completion + approval flow
│   │   ├── time-bank/     Stackable/non-stackable time balances
│   │   ├── play-session/  Play timer with pause/resume/extend
│   │   ├── violation/     Violations with escalating penalties
│   │   ├── notification/  Push notifications (Expo)
│   │   ├── subscription/  RevenueCat webhooks, premium gating
│   │   ├── gamification/  XP, levels, streaks, achievements, avatars
│   │   ├── upload/        Proof photo uploads
│   │   ├── mail/          Email templates (Resend)
│   │   ├── health/        Health check endpoint
│   │   ├── redis/         Redis service (ioredis)
│   │   ├── prisma/        PrismaService wrapper
│   │   └── common/        Filters, interceptors, Sentry
│   └── test/         E2E integration tests
├── mobile/           Expo + React Native app
│   ├── app/          Expo Router screens
│   │   ├── (auth)/   Login, register, child-login
│   │   └── (app)/    Authenticated screens (child/parent tabs)
│   └── src/
│       ├── services/ API client (Axios), auth token management
│       ├── store/    Zustand stores (auth, gamification, subscription)
│       ├── hooks/    Custom hooks
│       ├── components/ Reusable UI components
│       └── theme/    Colors, typography
├── cms/              Next.js admin panel for quest library
├── shared/           Shared TypeScript types
└── phases/           Phase planning documents
```

---

## Architecture Patterns

### Backend (NestJS)

- **Module pattern:** Each feature is a NestJS module with controller + service + DTOs + spec
- **Guards:** `JwtAuthGuard` (auth), `RolesGuard` (role-based), `AdminGuard` (app admin)
- **Validation:** `class-validator` DTOs with `ValidationPipe` (whitelist + forbidNonWhitelisted + transform)
- **Global prefix:** All routes start with `/api`
- **Error handling:** `GlobalExceptionFilter` catches all errors, Sentry integration
- **Request ID:** `RequestIdInterceptor` adds correlation IDs
- **Database:** Prisma ORM with PostgreSQL, `PrismaService` extends `PrismaClient`
- **Redis:** `RedisService` extends ioredis `Redis`, `@Global()` module
- **Auth tokens:** JWT access (15min) + refresh token rotation (nanoid(64), SHA-256 hashed, 30-day expiry)
- **Passwords:** bcrypt with 12 salt rounds
- **Rate limiting:** `ThrottlerModule` with 3 tiers (short/medium/long)
- **Scheduled jobs:** `@nestjs/schedule` for cron tasks (e.g., non-stackable time expiry)

### Mobile (Expo + React Native)

- **Router:** Expo Router with file-based routing
- **State:** Zustand stores for auth, gamification, subscription
- **API client:** Axios with interceptors for token attachment + 401 refresh
- **Token storage:** `expo-secure-store` (Keychain/Keystore)
- **Push notifications:** `expo-notifications`
- **Subscriptions:** `react-native-purchases` (RevenueCat)
- **Error tracking:** `@sentry/react-native`
- **Fonts:** Inter + Nunito via Expo Google Fonts

### CMS (Next.js)

- Admin panel for managing the quest library templates
- Separate deployment (Vercel)

---

## Key Data Models (Prisma)

| Model                    | Purpose                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| `Family`                 | Family unit with code, plan, subscription fields, owner              |
| `User`                   | Parents, guardians, children. Role-based. PIN for child login        |
| `Quest`                  | Tasks created by parents. Reward minutes, recurrence, proof settings |
| `QuestAssignment`        | Many-to-many quest↔child                                             |
| `QuestCompletion`        | Completion records with status, proof, earned minutes                |
| `TimeBank`               | Per-child balance (stackable + non-stackable)                        |
| `PlaySession`            | Timer sessions with start/pause/resume/end tracking                  |
| `Violation`              | Penalty records with escalating minutes                              |
| `ViolationCounter`       | Per-child violation counter for escalation                           |
| `ChildProgress`          | XP, level, streak tracking, showcaseBadges, streakFreezeUsedAt       |
| `Achievement`            | Achievement definitions with criteria, badgeTier, xpReward, isSecret |
| `ChildAchievement`       | Earned achievements per child                                        |
| `AvatarItem`             | Cosmetic items (face, hair, hat, outfit, etc.)                       |
| `ChildEquippedItem`      | Currently equipped items per slot                                    |
| `Theme`                  | Dynamic themes with colors, gradients, unlock criteria               |
| `RefreshToken`           | Hashed refresh tokens with expiry                                    |
| `PushToken`              | Device push notification tokens                                      |
| `NotificationPreference` | Per-user notification toggles                                        |
| `FamilyInvite`           | Pending family invitations                                           |
| `QuestLibrary`           | CMS quest templates                                                  |
| `QuestCategory`          | Quest categories (Chores, Learning, etc.)                            |
| `AvatarPackPurchase`     | IAP avatar pack records                                              |

---

## Auth Flow

1. **JWT payload:** `{ sub: userId, email, role, familyId }`
2. **JWT strategy `validate()`:** Looks up user by `payload.sub`, returns `{ id, email, role, familyId, name, isAppAdmin }`
3. **`req.user` shape:** `{ id, email, role, familyId, name, isAppAdmin }` — use `req.user.id` (NOT `req.user.sub`)
4. **Child login:** Family code + child name + PIN (4-6 digits)
5. **Refresh:** Token rotation — old token deleted, new one created

---

## Test Patterns

### Unit Tests (`*.spec.ts` in `src/`)

- Use `@nestjs/testing` `Test.createTestingModule`
- Mock factories in `src/__mocks__/`: `createMockPrisma()`, `createMockRedis()`, `createMockNotification()`
- Provide mocks via `{ provide: ServiceClass, useValue: mock }`
- Jest with ts-jest transformer

### E2E Tests (`*.e2e-spec.ts` in `test/`)

- Use supertest against a real test app with test database
- `test/setup.ts` provides: `createApp()`, `cleanDatabase()`, `closeApp()`, `getAgent()`, `registerAndLogin()`
- `.env.test` for test environment config
- `cleanDatabase()` truncates all tables between tests

### Jest Config

- Two projects: `unit` (rootDir `src`, `*.spec.ts`) and `e2e` (rootDir `test`, `*.e2e-spec.ts`)

---

## Environment Variables

```
DATABASE_URL          PostgreSQL connection string
REDIS_URL             Redis connection string
JWT_SECRET            JWT signing secret
JWT_ACCESS_EXPIRY     Access token TTL (default: 15m)
PORT                  Server port (default: 3000)
NODE_ENV              development | production
APP_URL               Backend URL for email links
FRONTEND_URL          Mobile app URL (CORS)
CMS_URL               CMS URL (CORS)
RESEND_API_KEY        Email service API key
REVENUECAT_WEBHOOK_AUTH_KEY  Webhook verification
SENTRY_DSN            Error tracking
```

---

## Phases Completed

| Phase | What Was Built                                                                        |
| ----- | ------------------------------------------------------------------------------------- |
| 1     | Backend scaffolding, auth (register/login/JWT/refresh), Prisma schema, Docker Compose |
| 2     | Family CRUD, quest CRUD, child management, invites, guardian permissions              |
| 3     | Quest completion flow, Time Bank (stackable/non-stackable), approval workflow         |
| 4     | Play session timer (request→approve→start→pause→resume→end), BullMQ jobs              |
| 5     | Violations with escalating penalties, push notifications (Expo), email service        |
| 6     | Mobile UI polish, Expo Router screens, parent/child tab layouts                       |
| 7     | RevenueCat subscription integration, premium gating, free plan limits (3 quests)      |
| 8     | Quest library CMS (Next.js), quest categories, template system                        |
| 9     | Gamification — XP, levels, streaks, achievements, avatar items, leaderboard           |
| 10    | Backend unit tests, integration tests, CI/CD setup, Sentry error tracking             |
| 10b   | Security hardening — PIN hashing, rate limiting, auth fixes, webhook idempotency      |
| 11\*  | Visual polish — dynamic themes, enhanced avatars, streak fire, weekly stats, badges   |

\*Phase 11 is partially complete. See "Phase 11 Progress" below for details.

---

## Phase 11 Progress (Partial)

### Completed

**Backend:**

- `Theme` model added to Prisma schema (10 themes seeded: Classic, Sunset Glow, Ocean Explorer, Neon Arcade, Candy Land, Space Odyssey, Forest Guardian, Fire Streak, Diamond Elite, Champion Gold)
- `Achievement` model extended with `badgeTier` (bronze/silver/gold), `badgeColor`, `xpReward`, `isSecret` fields; 27 achievements seeded
- `ChildProgress` extended with `showcaseBadges` (String[]) and `streakFreezeUsedAt` (DateTime?)
- `User.activeThemeId` added as FK to Theme
- Migration: `20260214004507_add_themes_badges_showcase`
- `ThemeService` (383 lines): getThemes, setActiveTheme, isThemeUnlocked, useStreakFreeze, setShowcase, getShowcase, getWeeklyStats, getActivityFeed
- 4 new controllers: ThemeController, StreakStatsController, BadgeShowcaseController, ActivityFeedController
- 3 new DTOs: SetActiveThemeDto, SetShowcaseDto, PaginationDto
- 11 unit tests for ThemeService (all passing)
- 51 avatar items across 7 slots (added face, hair)
- Total: 150 unit tests passing, 14 e2e tests still failing (pre-existing assertion mismatches)

**Mobile:**

- Installed: lottie-react-native, expo-haptics, expo-av, expo-linear-gradient, react-native-chart-kit, @react-native-async-storage/async-storage
- `ThemeProvider` + `useTheme()` hook (React Context) with AsyncStorage persistence
- `useThemeStore` (Zustand) for theme state, weekly stats, activity feed, showcase
- Theme API service with all endpoints
- Theme selection screen (`child/themes.tsx`) with gradient cards, haptic feedback, reanimated animations
- Child tab layout uses dynamic theme colors
- Child dashboard: theme button, StreakFire component, WeeklyStatsChart, dynamic colors
- Avatar builder: 7 slots (added face + hair), haptic feedback, dynamic colors
- Trophy room: badge showcase (max 3), streak freeze button, tier tags, animated cards
- `StreakFire` component: pulsing animation, glow for 7+ streaks, tiered emoji display
- `WeeklyStatsChart` component: custom bar chart, today highlighting, summary row
- Mobile TypeScript compiles cleanly (0 errors)

### Remaining Phase 11 Items

- Lottie animation files (actual .json assets for level-up, achievement unlock, etc.)
- expo-av sound effects integration
- Parent dashboard upgrade with activity feed / weekly stats
- Additional micro-interactions (haptic feedback on more components)
- Accessibility labels on all interactive elements
- Dark mode toggle

---

## Remaining Phases

| Phase | Focus                                                                       |
| ----- | --------------------------------------------------------------------------- |
| 11    | Visual polish — remaining: Lottie, sound, parent dashboard, a11y, dark mode |
| 12    | COPPA compliance — parental consent, account deletion, privacy              |
| 13    | Monitoring — structured logging, analytics, alerting                        |
| 14    | Offline support — error boundaries, offline queue, caching                  |
| 15    | Deployment — hosting, S3, database backups, data export                     |
| 16    | Mobile E2E tests, app store submission                                      |

---

## Known Issues / Gotchas

1. **Family code uses `Math.random()`** — not crypto-secure (acceptable for MVP)
2. **`cleanDatabase()` in `test/setup.ts`** references some non-existent tables — may need updating when running e2e tests
3. **E2E tests** — 14 assertion mismatches (status codes, response shapes) deferred; `uuid` ESM transform fixed
4. **Production static file migration** — when deploying, proof uploads should move to S3 (currently disk-based with authenticated GET endpoint)
5. **Run `npx ts-node prisma/hash-existing-pins.ts`** before first deploy after Phase 10b to hash any pre-existing plaintext child PINs

### Issues Resolved in Phase 10b

- ~~`req.user.id` not `req.user.sub`~~ — Fixed in notification + violation controllers
- ~~`ensureFamilyAccess` throws `Error`~~ — Now throws `ForbiddenException` (403)
- ~~`ThrottlerGuard` not globally applied~~ — Registered as `APP_GUARD`
- ~~Debug `console.log` in `jwt.strategy.ts`~~ — Removed
- ~~Uploads served as public static assets~~ — Now authenticated GET endpoint
- ~~Child PINs stored in plaintext~~ — Now bcrypt-hashed (10 rounds)
- ~~No login lockout~~ — Added 5-attempt lockout (15min window) via Redis
- ~~Swagger exposed in production~~ — Disabled when `NODE_ENV=production`
- ~~No webhook idempotency~~ — Duplicate events skipped via Redis key with 7-day TTL
- ~~Email templates vulnerable to HTML injection~~ — `escapeHtml()` applied to all user inputs
- ~~No file upload magic bytes validation~~ — JPEG/PNG/WebP magic byte checks added
- ~~Subscription/user endpoints missing ownership checks~~ — Authorization enforced
- ~~Webhook auth not mandatory~~ — Fails closed when `REVENUECAT_WEBHOOK_AUTH_KEY` not set
- ~~Member emails visible to children~~ — Hidden when requesting user is a child
