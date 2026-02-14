# ScreenQuest — Developer Handoff Document

> **Last updated:** Phase 11 complete, Phase 15 done (Feb 2026)
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
│   │   ├── health/        Health check + metrics endpoints
│   │   ├── redis/         Redis service (ioredis)
│   │   ├── prisma/        PrismaService wrapper
│   │   ├── privacy/       COPPA consent, deletion, privacy policy
│   │   └── common/        Logging (Pino), analytics (PostHog), metrics, filters, Sentry
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
- **Logging:** Structured JSON logging via `nestjs-pino` (Pino); request ID correlation via `X-Request-Id` header; `pino-pretty` in dev
- **Analytics:** PostHog server-side tracking via event-driven architecture (`EventEmitter2` → `AnalyticsListener` → PostHog)
- **Metrics:** In-memory request metrics (p50/p95/p99), error rates, DB/Redis health checks; `/health/metrics` endpoint
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
| `ParentalConsent`        | COPPA consent records per child (Phase 12)                           |
| `DeletionRequest`        | Account/data deletion requests with scheduled processing             |

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
POSTHOG_API_KEY       PostHog project API key (analytics disabled if unset)
POSTHOG_HOST          PostHog host (default: https://us.i.posthog.com)
```

---

## Phases Completed

| Phase | What Was Built                                                                                      |
| ----- | --------------------------------------------------------------------------------------------------- |
| 1     | Backend scaffolding, auth (register/login/JWT/refresh), Prisma schema, Docker Compose               |
| 2     | Family CRUD, quest CRUD, child management, invites, guardian permissions                            |
| 3     | Quest completion flow, Time Bank (stackable/non-stackable), approval workflow                       |
| 4     | Play session timer (request→approve→start→pause→resume→end), BullMQ jobs                            |
| 5     | Violations with escalating penalties, push notifications (Expo), email service                      |
| 6     | Mobile UI polish, Expo Router screens, parent/child tab layouts                                     |
| 7     | RevenueCat subscription integration, premium gating, free plan limits (3 quests)                    |
| 8     | Quest library CMS (Next.js), quest categories, template system                                      |
| 9     | Gamification — XP, levels, streaks, achievements, avatar items, leaderboard                         |
| 10    | Backend unit tests, integration tests, CI/CD setup, Sentry error tracking                           |
| 10b   | Security hardening — PIN hashing, rate limiting, auth fixes, webhook idempotency                    |
| 11    | Visual polish — dynamic themes, avatars, streak fire, stats, badges, Lottie, sound, dark mode, a11y |
| 12    | COPPA compliance — parental consent, account deletion, privacy policy endpoints                     |
| 13    | Monitoring — structured logging (Pino), analytics (PostHog), metrics, alerting                      |

---

## Phase 11 — Visual Polish (Complete)

### Previously Completed (by prior AI)

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

### Phase 11 Leftovers (Now Complete)

**Lottie Animations (7 animation JSON files):**

- `mobile/assets/animations/` — 7 hand-crafted Lottie JSON files:
  - `checkmark-burst.json` — Quest completion (green circle + checkmark + particles, 45 frames)
  - `level-up.json` — Level up celebration (spinning gold star + glow ring, 60 frames)
  - `achievement-unlock.json` — Badge drop with bounce + shimmer (60 frames)
  - `timer-complete.json` — Timer ring completion + check (60 frames)
  - `loading-bounce.json` — 3 bouncing colored dots (90 frames, looping)
  - `empty-state.json` — Cute face with blinking eyes + question mark (90 frames, looping)
  - `rocket-launch.json` — Rocket body + flame + sparks (45 frames)
- `mobile/assets/animations/index.ts` — Typed `Animations` export object + `AnimationKey` type
- Integration: `CelebrationModal` (level-up, achievement unlock), `EmptyState` (animated prop), `quest-detail` (checkmark burst on approval), `play.tsx` (timer complete), `child/index.tsx` (animated empty state)

**Sound Effects (7 WAV audio files):**

- `mobile/assets/sounds/` — 7 synthesized WAV files (22050Hz, 16-bit mono PCM):
  - `quest-complete.wav` (880Hz, 300ms), `level-up.wav` (660Hz, 500ms), `achievement.wav` (1047Hz, 400ms)
  - `streak.wav` (784Hz, 350ms), `timer-warning.wav` (440Hz, 250ms), `timer-complete.wav` (523Hz, 400ms), `tap.wav` (1200Hz, 50ms)
- `SoundEffects` service (`soundEffects.ts`) fully wired — `SOUND_ASSETS` map points to actual WAV files
- `useSoundEffects` hook (`hooks/useSoundEffects.ts`) — initializes audio, preloads common sounds
- Integration: `CelebrationModal` (plays per event type), `quest-detail` (questComplete on approval), `play.tsx` (timerComplete at 0s, timerWarning at 60s)
- Sound effects toggle in `parent/settings.tsx` → "App Preferences" section with Switch

**Parent Dashboard Charts:**

- `ParentCharts.tsx` component — 3 pure-RN chart components (no external chart library):
  - `WeeklyCompletionChart` — Horizontal bar chart, weekly quest completions per child, color-coded
  - `ScreenTimeTrend` — Vertical bar chart, daily screen time over past 2 weeks per child
  - `StreakCalendar` — GitHub-style heatmap, 28-day quest completion calendar per child
- Backend: `getWeeklyStats` extended to 28 days with `playMinutes` and `xp` per day
- Backend: New endpoint `GET /children/:childId/gamification/weekly-stats` (parent-accessible)
- Mobile: `gamificationService.getChildWeeklyStats(childId)` added
- Parent dashboard fetches weekly stats per child, renders "Weekly Insights" section

**Dark Mode:**

- `darkColors` palette added to `ThemeContext.tsx` (dark background #121218, card #1E1E2A, etc.)
- `darkGradients` palette for dark mode gradient variants
- `ThemeProvider` uses `useColorScheme()` for system dark mode detection
- `DarkModePreference` type (`'system' | 'light' | 'dark'`) in theme store
- Dark mode preference persisted to AsyncStorage (`@screenquest_dark_mode`)
- `useTheme()` hook now returns `isDark` boolean
- Settings toggle: 3-option selector (System / Light / Dark) with icons in "App Preferences"

**Accessibility Audit & Fixes (20+ elements across 11 files):**

- Child dashboard: Play button — `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, `accessibilityState`
- Play timer: Pause, Resume, Stop buttons — labels + roles; time preset buttons — labels + selected state
- Parent dashboard: Logout, Deny, Approve, Stop session buttons — labels + roles + hints
- Quest detail: Back buttons — labels + roles
- Parent quests: FAB "Create new quest" — label + role
- Family management: Email, name, age, PIN inputs — `accessibilityLabel`; consent checkbox — `accessibilityRole="checkbox"` + `accessibilityState`
- Settings: Require Approval switch, Leaderboard switch — `accessibilityLabel`
- Quest edit: Requires Proof, Auto-Approve switches — `accessibilityLabel`
- `TimeBankDisplay` — `accessibilityRole="summary"` + descriptive label; compact variant — `accessibilityRole="text"`
- `StreakFire` — `accessibilityRole="text"` + `"N day streak"` label
- `Card` — `accessibilityRole="button"` when `onPress` is provided
- All `ParentCharts` components have `accessibilityRole="summary"` + descriptive labels

---

## Phase 12 — COPPA Compliance & Account Deletion

_Implemented by another AI agent._

- `ParentalConsent` model: Records consent per child with parent ID, consent text, IP address
- `DeletionRequest` model: Account/data deletion requests with status tracking
- `PrivacyModule` with `ConsentService`, `DeletionService`, `PolicyService`, `DeletionScheduler`
- Privacy policy and terms of service endpoints
- Account deletion flow with scheduled data purge
- Child email hiding from other children
- Unit tests: `consent.service.spec.ts`, `policy.service.spec.ts`, `deletion.service.spec.ts`, `deletion.scheduler.spec.ts`
- `createChild()` now requires `consentText` field for COPPA compliance

---

## Phase 13 — Monitoring, Analytics & Observability

### Structured Logging (Pino)

- `backend/src/common/logging/logging.module.ts` — `nestjs-pino` configured with:
  - JSON output in production, `pino-pretty` in development
  - Request ID correlation via `X-Request-Id` (generated or propagated)
  - Sensitive field redaction (authorization, cookies, passwords, tokens)
  - Health check request filtering (no noise from `/api/health`)
  - Custom log levels: 5xx → error, 4xx → warn
- `main.ts` updated to use `bufferLogs: true` + `app.useLogger(app.get(Logger))`
- Old `RequestIdInterceptor` replaced by pino-http's built-in request ID handling

### Analytics (PostHog — Server-Side Only)

- `backend/src/common/analytics/analytics.service.ts` — PostHog wrapper with typed methods:
  - **Parent funnel:** `signup_completed`, `family_created`, `child_added`, `quest_created`, `quest_completion_approved/denied`, `play_session_approved/denied`, `violation_recorded`, `paywall_viewed`, `trial_started`, `subscription_purchased/cancelled`
  - **Child engagement:** `quest_completed`, `play_session_started/completed`, `achievement_earned`, `level_up`, `avatar_customized`
- `backend/src/common/analytics/analytics.events.ts` — 19 domain event classes
- `backend/src/common/analytics/analytics.listener.ts` — `@OnEvent` listener bridging domain events → PostHog
- `backend/src/common/analytics/analytics.module.ts` — Global module
- **Architecture:** Event-driven (services emit via `EventEmitter2`, listener forwards to PostHog). Business logic stays clean.
- **Gracefully disabled** when `POSTHOG_API_KEY` is not set.

### Event Wiring (6 services modified)

| Service                   | Events Emitted                                        |
| ------------------------- | ----------------------------------------------------- |
| `auth.service.ts`         | `user.registered`, `user.logged_in`                   |
| `family.service.ts`       | `family.created`, `child.added`                       |
| `quest.service.ts`        | `quest.created` (custom + library)                    |
| `completion.service.ts`   | `quest.completed`, `quest.approved`, `quest.denied`   |
| `gamification.service.ts` | `level.up`, `achievement.earned`, `avatar.customized` |
| `play-session.service.ts` | `play_session.started/approved/denied/completed`      |
| `violation.service.ts`    | `violation.recorded`                                  |

### Backend Metrics

- `backend/src/common/metrics/metrics.service.ts` — In-memory request metrics:
  - Percentiles: p50, p95, p99
  - Error rate calculation (5-minute sliding window)
  - Slow request warnings (>500ms)
  - DB + Redis health status
  - Process memory usage
  - 5-minute cron summary with alerts (high error rate >5%, DB/Redis disconnected)
- `backend/src/common/metrics/metrics.interceptor.ts` — Records request duration, normalizes UUID paths
- `backend/src/common/metrics/metrics.module.ts` — Global module

### Health Endpoints Enhanced

- `GET /api/health` — Added `uptime` field
- `GET /api/health/metrics` — Full MetricsSnapshot (requests, DB, Redis, memory)
- `GET /api/health/metrics/errors` — Per-endpoint error rates

### Dependencies Added

- `nestjs-pino`, `pino`, `pino-http`, `pino-pretty` — Structured logging
- `posthog-node` — Server-side analytics
- `@nestjs/event-emitter` — Decoupled event architecture

### Tests

- `analytics.service.spec.ts` — 20 tests (all event methods gracefully handle no PostHog)
- `analytics.listener.spec.ts` — 19 tests (verifies all event→PostHog forwarding)
- `metrics.service.spec.ts` — 9 tests (percentiles, error rates, DB/Redis status)
- `monitoring.e2e-spec.ts` — 3 tests (health, metrics, error rates endpoints)
- All 7 existing service specs updated with `EventEmitter2` mock
- **222 unit tests passing, 3 monitoring e2e tests passing**

---

## Remaining Phases

| Phase | Focus                                                      |
| ----- | ---------------------------------------------------------- |
| 14    | Offline support — error boundaries, offline queue, caching |
| 16    | Mobile E2E tests, app store submission                     |

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
