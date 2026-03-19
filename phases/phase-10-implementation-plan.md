# Phase 10: Testing, Deployment, Compliance & Launch Readiness — Implementation Plan

## Current State Summary

- **Health check**: Already exists at `GET /api/health` (DB + Redis checks)
- **Error handling**: Uses default NestJS exceptions; no global filter, no request IDs
- **Logging**: Mix of `console.log` and NestJS `Logger`; no Pino or structured logging
- **Testing**: Jest configured but 0 test files; `supertest` not installed
- **COPPA**: No parental consent flow, no account deletion endpoint, no privacy links
- **CI/CD**: GitHub Actions workflows in `.github/workflows/`
- **Monitoring**: No Sentry integration
- **Mobile**: No error boundary, no offline support, no caching layer
- **Docker**: Dockerfile + docker-compose already exist

## Implementation Steps (15 steps)

### Step 1: Global Exception Filter + Request IDs

- Install `nanoid` or use `uuid` (already installed) for request IDs
- Create `backend/src/common/filters/http-exception.filter.ts` — catches all exceptions, returns standardized format:
  ```json
  {
    "statusCode": 400,
    "error": "BAD_REQUEST",
    "message": "...",
    "details": {},
    "requestId": "req_abc123"
  }
  ```
- Create `backend/src/common/middleware/request-id.middleware.ts` — generates request ID, attaches to `req.headers['x-request-id']`
- Register filter globally in `main.ts`
- 500 errors return generic message (details logged internally only)

### Step 2: Structured Logging (Pino)

- Install `nestjs-pino`, `pino`, `pino-pretty` (dev)
- Configure `LoggerModule` in `app.module.ts` as the NestJS logger with request ID correlation
- Replace `console.log` in `main.ts` with Pino logger
- Existing `Logger` calls in services (violation, play-session, gamification schedulers, notification) will automatically route through Pino

### Step 3: COPPA Schema Updates

- Add `ParentalConsent` model — tracks consent for each child account
- Add `DataDeletionRequest` model — 30-day grace period, status enum
- Add proper `onDelete: Cascade` for child-related data (completions, time bank, achievements, violations, progress, equipped items)
- Run `prisma generate`

### Step 4: Parental Consent Service + Controller

- Create `backend/src/compliance/` module
- `compliance.service.ts`: `recordConsent(childId, parentId, consentText, ipAddress)`, `revokeConsent(childId, parentId)`, `getConsent(childId)`
- Modify `family.service.ts` `createChild()` to require consent text parameter
- `compliance.controller.ts`: `GET /compliance/consent/:childId`, `DELETE /compliance/consent/:childId`
- DTO validation for consent fields

### Step 5: Account Deletion Service + Controller + Scheduler

- `compliance.service.ts`: `requestDeletion(userId)`, `cancelDeletion(userId)`, `executeDeletion(userId)` (purges all personal data)
- Deletion cascade: user data, completions, time bank, achievements, violations, progress, push tokens, photos
- `compliance.scheduler.ts`: daily cron to process deletions past 30-day grace period
- Controller: `POST /users/:userId/account/delete`, `POST /users/:userId/account/cancel-deletion`
- Send confirmation email on deletion request

### Step 6: Backend Unit Tests — Core Business Logic

- Install `supertest` as dev dep
- Create test helpers: `backend/src/test/helpers.ts` (mock PrismaService, mock RedisService)
- **TimeBankService tests** (`time-bank/time-bank.service.spec.ts`):
  - Credit stackable adds to stackable balance
  - Credit non-stackable recalculates from active completions
  - Deduction uses non-stackable first, then stackable
  - Penalty deduction allows negative balance
  - Insufficient balance throws on deductTime
- **ViolationService tests** (`violation/violation.service.spec.ts`):
  - Penalty escalation: 1st=120min, 2nd=240min, 3rd=480min
  - Forgiveness refunds penalty to stackable bucket
  - Forgiveness decrements counter (min 0)
  - Double-forgive throws BadRequestException
  - Counter reset sets to 0
- **GamificationService tests** (`gamification/gamification.service.spec.ts`):
  - XP calculation: 10 base + min(streak \* 2, 20) bonus
  - Level thresholds: 0→Starter, 50→Explorer, etc.
  - Level-up detection when crossing threshold
  - Streak increment on consecutive days
  - Achievement criteria checking (total_completions, streak, etc.)

### Step 7: Backend Integration Tests

- Create `backend/test/` directory with test setup
- `backend/test/jest-e2e.json` — separate Jest config for integration tests
- `backend/test/app.e2e-spec.ts` — test setup with `@nestjs/testing`
- **Auth flow test**: register → login → get profile → refresh → logout
- **Quest flow test**: create quest → assign → child completes → parent approves → balance credited
- **Violation flow test**: record violation → balance deducted → forgive → balance restored
- Add `test:e2e` script to package.json

### Step 8: Data Export Endpoint

- Create `backend/src/export/` module
- `export.service.ts`: generates CSV from family's quest completions, time usage, and balances over a date range
- `export.controller.ts`: `GET /families/:familyId/export?format=csv&range=30d`
- Premium-gated (check subscription status)
- Rate limit: 1 export/hour/family
- Returns CSV directly as a download (Content-Disposition header)

### Step 9: Server-side Analytics Service

- Create `backend/src/analytics/analytics.service.ts` — event tracking abstraction
- Methods: `trackEvent(userId, eventName, properties)` — logs events in structured format via Pino
- Hook into existing services: auth (signup/login), family (child_added), completion (quest_completed, approved), play-session (started, completed), subscription (purchased, cancelled), gamification (achievement_earned, level_up)
- No child-facing SDK — all server-side per COPPA
- Analytics module registered in app.module.ts
- Events are logged as structured JSON; can be piped to PostHog/Mixpanel later via log aggregation

### Step 10: CI/CD GitHub Actions

- `.github/workflows/ci.yml` with jobs: backend (lint, type-check, unit tests, integration tests with PostgreSQL + Redis services, build, coverage upload), mobile (lint, type-check), cms (build)
- `.github/workflows/deploy.yml` for production releases (tags)
- Triggered on PRs + push to main

### Step 11: Sentry Integration

- **Backend**: Install `@sentry/nestjs`, configure in `main.ts` with DSN from env, capture unhandled exceptions, attach request IDs
- **Mobile**: Install `@sentry/react-native`, configure in root `_layout.tsx`, capture JS crashes
- DSN values from environment variables (placeholder in .env.example)

### Step 12: Mobile Error Boundary

- Create `mobile/src/components/ErrorBoundary.tsx` — React class component error boundary
- Shows "Something went wrong" screen with "Retry" and "Report" buttons
- Wrap root layout children with ErrorBoundary
- Reports to Sentry if configured

### Step 13: Mobile Offline Support

- Install `@react-native-community/netinfo`
- Create `mobile/src/hooks/useNetworkStatus.ts` — returns `{ isConnected, isInternetReachable }`
- Create `mobile/src/components/OfflineBanner.tsx` — persistent banner when offline
- Add OfflineBanner to root layout (shows above all content)
- Add data caching in gamification store and auth store using expo-secure-store for last-known state

### Step 14: Mobile COPPA UI

- **Parental consent on add-child**: Update `mobile/app/(auth)/add-child.tsx` to show consent text + checkbox before creating child
- **Account deletion**: Add "Delete Account" section to parent settings with confirmation dialog
- **Legal links**: Add Privacy Policy + Terms of Service links (Linking.openURL) to:
  - Login screen (footer)
  - Register screen (footer)
  - Parent settings (new "Legal" section)
- Use placeholder URLs (`https://screenquest.app/privacy`, `https://screenquest.app/terms`)

### Step 15: Migration + Verification

- Run `npx prisma migrate dev --name phase10_compliance`
- Run backend build (`pnpm exec nest build`)
- Run backend unit tests (`pnpm exec jest`)
- Run mobile type-check (`npx tsc --noEmit`)
- Verify all new endpoints in Swagger docs

## Files Created/Modified Summary

**New files (~25):**

- `backend/src/common/filters/http-exception.filter.ts`
- `backend/src/common/middleware/request-id.middleware.ts`
- `backend/src/compliance/compliance.module.ts`
- `backend/src/compliance/compliance.service.ts`
- `backend/src/compliance/compliance.controller.ts`
- `backend/src/compliance/compliance.scheduler.ts`
- `backend/src/compliance/dto/compliance.dto.ts`
- `backend/src/export/export.module.ts`
- `backend/src/export/export.service.ts`
- `backend/src/export/export.controller.ts`
- `backend/src/analytics/analytics.module.ts`
- `backend/src/analytics/analytics.service.ts`
- `backend/src/time-bank/time-bank.service.spec.ts`
- `backend/src/violation/violation.service.spec.ts`
- `backend/src/gamification/gamification.service.spec.ts`
- `backend/test/jest-e2e.json`
- `backend/test/app.e2e-spec.ts`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `mobile/src/components/ErrorBoundary.tsx`
- `mobile/src/components/OfflineBanner.tsx`
- `mobile/src/hooks/useNetworkStatus.ts`

**Modified files (~10):**

- `backend/prisma/schema.prisma` — ParentalConsent + DataDeletionRequest models
- `backend/src/main.ts` — exception filter, Pino logger, Sentry init
- `backend/src/app.module.ts` — LoggerModule, ComplianceModule, ExportModule, AnalyticsModule
- `backend/src/family/family.service.ts` — consent requirement on createChild
- `backend/src/family/dto/family.dto.ts` — consent fields on CreateChildDto
- `backend/package.json` — new deps + test:e2e script
- `mobile/app/_layout.tsx` — ErrorBoundary wrapper, OfflineBanner, Sentry init
- `mobile/app/(auth)/add-child.tsx` — parental consent UI
- `mobile/app/(auth)/login.tsx` — legal links
- `mobile/app/(auth)/register.tsx` — legal links
- `mobile/app/(app)/parent/settings.tsx` — account deletion + legal section
- `mobile/src/components/index.ts` — new exports
