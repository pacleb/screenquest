# ScreenQuest — Phase 10: Testing, Deployment, Compliance & Launch Readiness

> **Prerequisites:** Phases 1-9 complete (full app functional, styled, with subscriptions, CMS, and gamification).
> **Context:** Read `docs/spec/screen-time-app-prompt.md` sections 7, 11, 12, and 7.3 for full requirements. This phase prepares the app for production launch — testing, CI/CD, compliance, monitoring, analytics, and app store submission.

---

## What to Build in This Phase

### 1. Testing Strategy

#### 1.1 Backend Unit Tests

Write unit tests for all business logic (use Jest):

- **Time Bank calculations:**
  - Stackable vs. non-stackable crediting
  - Non-stackable expiry at end of day (in the family's timezone)
  - Balance going negative from violations
  - Deduction priority (non-stackable first, then stackable)
  - Refund logic when play session stops early (correct bucket)
- **Play session timer math:**
  - Remaining time calculation (accounting for pauses)
  - Multiple pause/resume cycles
  - Extension during active session
  - Warning job scheduling (5-min, 1-min)
  - Session completion detection
- **Violation escalation:**
  - Penalty doubling: 2h → 4h → 8h → 16h → ...
  - Forgiveness refund + counter decrement
  - Counter reset
  - Negative balance prevention of play requests
- **Quest recurrence logic:**
  - Daily: prevents re-completion same day
  - Weekly: prevents re-completion same week
  - Custom days: only available on specified days
  - One-time: cannot be re-completed ever
- **Free plan limits:**
  - 3-quest cap enforcement on create and unarchive
  - Post-premium-expiration grace period (7 days)
  - Auto-archival after grace period
- **Gamification:**
  - Streak calculation (consecutive days, timezone-aware)
  - XP award with streak bonus
  - Level threshold transitions
  - Achievement requirement checking
- **Auth:**
  - JWT generation and validation
  - Refresh token rotation
  - Role-based access control (parent vs. guardian vs. child)
  - Guardian permission checks
- **Subscription:**
  - RevenueCat webhook event handling (purchase, renewal, cancellation, expiration)
  - Premium feature gating

#### 1.2 Backend Integration Tests

Test API endpoints end-to-end against a test database (use Jest + Supertest):

- **Auth flow:** register → verify email → login → refresh → logout
- **Family flow:** create family → invite guardian → guardian joins → add child → remove member
- **Quest flow:** create quest → assign to child → child sees quest → complete → approve → Time Bank credited
- **Play flow:** request play → approve → timer starts → pause → resume → time expires → session completed
- **Violation flow:** record violation → Time Bank deducted → forgive → Time Bank restored
- **Subscription flow:** mock RevenueCat webhook → plan changes → feature gating updates
- **Free plan enforcement:** create 3 quests → 4th rejected → archive one → create succeeds
- **Edge cases:**
  - Concurrent play session prevention (two requests at once)
  - Race condition on quest completion (double-submit)
  - Expired non-stackable time cannot be used for play
  - Child removed from family mid-play-session

#### 1.3 Mobile E2E Tests

Use **Detox** (React Native E2E testing framework):

- **Critical user flows:**
  - Parent sign-up → create family → add child → create first quest
  - Child login → view quests → complete quest → pending approval
  - Parent approves quest → child Time Bank updates
  - Child requests play → parent approves → timer starts → timer ends
  - Parent records violation → child balance goes negative → play button disabled
- **Navigation:** all tab transitions, deep links from notifications work
- **Error states:** network error during quest completion shows retry UI
- **Accessibility:** automated a11y scan on key screens (axe-react-native or similar)

#### 1.4 Device Testing Matrix

Test on at minimum:

| Device Type    | iOS                 | Android                  |
| -------------- | ------------------- | ------------------------ |
| Small phone    | iPhone SE (3rd gen) | Pixel 4a                 |
| Standard phone | iPhone 14           | Pixel 7                  |
| Large phone    | iPhone 15 Pro Max   | Samsung Galaxy S24 Ultra |
| Tablet         | iPad (10th gen)     | Samsung Galaxy Tab S9    |
| Older OS       | iOS 15 (minimum)    | Android 10 (minimum)     |

Verify:

- Layout doesn't break on any screen size
- Background timer works across all OS versions
- Push notifications deliver in foreground, background, and killed states
- Foreground service (Android) persists through device sleep

---

### 2. CI/CD Pipeline

Set up **GitHub Actions** CI/CD workflows:

#### 2.1 Backend CI (on every MR + push to main)

```yaml
# .github/workflows/ci.yml (backend jobs)
- Checkout code
- Install dependencies (pnpm)
- Lint (ESLint)
- Type check (tsc --noEmit)
- Unit tests (Jest)
- Integration tests (spin up PostgreSQL + Redis via services, run migrations, seed, test)
- Build (nest build)
- Upload test coverage report
```

#### 2.2 Mobile CI (on every MR + push to main)

```yaml
# .github/workflows/ci.yml (mobile jobs)
- Checkout code
- Install dependencies (pnpm)
- Lint (ESLint)
- Type check (tsc --noEmit)
- Unit tests (Jest)
- Build iOS (eas build --platform ios --profile preview --non-interactive)
- Build Android (eas build --platform android --profile preview --non-interactive)
```

#### 2.3 CMS CI (on every MR + push to main)

```yaml
# .github/workflows/ci.yml (cms jobs)
- Checkout code
- Install dependencies (pnpm)
- Lint + Type check
- Build (next build)
```

#### 2.4 Deploy Pipelines (on push to main / release tags)

- **Backend:** Build Docker image → push to container registry → deploy to production
- **CMS:** Auto-deploy to Vercel on push to main (preview deploys on PRs)
- **Mobile:** Use **EAS Build + EAS Submit** for app store submissions
  - `eas build --platform all --profile production`
  - `eas submit --platform ios` / `eas submit --platform android`

#### 2.5 Environment Strategy

| Environment | Purpose     | Backend URL           | Database       |
| ----------- | ----------- | --------------------- | -------------- |
| Local       | Development | http://localhost:3000 | Docker Compose |
| Production  | Live app    | https://api.sq.app    | Production DB  |

- Local and production use separate databases, Redis instances, and Firebase projects
- Database migrations run automatically on deploy (with rollback plan)

---

### 3. Deployment Infrastructure

#### 3.1 Backend Hosting

Deploy the NestJS backend using one of:

- **Option A (recommended for MVP): Railway / Render** — simple PaaS, auto-deploy from Git, managed PostgreSQL + Redis included
- **Option B (scale-ready): AWS ECS Fargate** — containerized, auto-scaling, with RDS PostgreSQL + ElastiCache Redis

Regardless of hosting choice:

- Docker image with multi-stage build (build → production)
- Health check endpoint: `GET /api/health` — returns `{ status: 'ok', db: 'connected', redis: 'connected', version: '1.0.0' }`
- Graceful shutdown handling (finish in-flight requests, close DB connections)
- Auto-scaling: min 2 instances for redundancy
- SSL/TLS termination at load balancer

#### 3.2 File Storage

- **Proof photos:** AWS S3 (or Cloudflare R2 for cost savings)
  - Private bucket, signed URLs for access (expire after 1 hour)
  - Lifecycle rule: delete photos older than 1 year (configurable)
  - Image processing on upload: resize to max 1200px, compress to <500KB (use Sharp)

#### 3.3 Database

- **PostgreSQL 15+** — managed service (RDS, Supabase, Neon, or Railway)
  - Automated daily backups with 30-day retention
  - Point-in-time recovery enabled
  - Connection pooling (PgBouncer) for production
- **Redis 7+** — managed service (ElastiCache, Upstash, or Railway)
  - Used for: BullMQ job queues, session cache, rate limiting
  - Persistence enabled (AOF) for job queue durability

#### 3.4 CDN & Domain

- Custom domain: `screenquest.app` (or similar)
- API: `api.screenquest.app`
- CMS: `admin.screenquest.app`
- CDN for static assets (CloudFront or Cloudflare)

---

### 4. COPPA Compliance (Critical — Legal Requirement)

Since ScreenQuest targets children under 13, **COPPA (Children's Online Privacy Protection Act)** compliance is mandatory for the US market, and similar regulations apply globally (GDPR-K in EU, AADC in UK).

#### 4.1 Parental Consent Flow

- Before a parent creates a child account (under 13), display a **verifiable parental consent** screen:
  - Explain what data is collected about the child (name, age, quest activity, screen time usage)
  - Explain how data is used (only for app functionality, never for advertising)
  - Explain data sharing (none — no third-party sharing)
  - Require explicit consent: "I am this child's parent/guardian and I consent to creating this account" with checkbox + signature/confirmation
- Store consent record:
  ```sql
  CREATE TABLE parental_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES users(id) NOT NULL,
    consenting_parent_id UUID REFERENCES users(id) NOT NULL,
    consent_text TEXT NOT NULL,        -- snapshot of what they consented to
    consented_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(45),
    revoked_at TIMESTAMPTZ             -- NULL unless consent is revoked
  );
  ```
- If consent is revoked → child account must be deactivated and data scheduled for deletion

#### 4.2 Data Minimization for Children

- Children's accounts collect ONLY: name, age, avatar selection, quest/play activity
- No email required for children under 13 (parent-managed account)
- No behavioral analytics collected on child sessions
- No third-party SDKs in child UI that collect data (careful with Firebase Analytics — use only FCM for push, not Analytics)
- No social features exposing children to strangers (family-only leaderboard is fine)

#### 4.3 Account Deletion

Required by **Apple App Store**, **Google Play**, and **GDPR**:

- `DELETE /api/users/:userId/account` — request account deletion
  - For parent/owner: deletes their personal data, transfers or deletes family
  - For child: deletes all child data (completions, Time Bank, achievements, violations, photos)
  - For owner deleting family: cascade-delete all family data
- Store deletion request with 30-day grace period (allow undo)
- After 30 days: permanently purge all personal data
- Delete associated proof photos from S3
- Revoke all tokens
- Log deletion for compliance audit trail (anonymized: "User [hash] deleted on [date]")

**In-app UI:**

- Settings → Account → "Delete My Account" (red, with clear warnings)
- Confirmation dialog explaining what will be deleted
- Email confirmation of deletion request

#### 4.4 Privacy Policy & Terms

- Privacy policy accessible from: login screen, settings, app store listing
- Must clearly state:
  - What data is collected (per user role)
  - How data is used
  - Data retention periods
  - Third-party services used (Firebase for push notifications, RevenueCat for subscriptions)
  - Parent rights (access, delete, revoke consent)
  - Contact information for privacy inquiries
- Terms of Service covering subscription billing, refund policy, acceptable use
- Both documents versioned; users re-accept on material changes

---

### 5. Monitoring & Observability

#### 5.1 Crash Reporting

- **Sentry** — install on both backend and mobile
  - Backend: `@sentry/nestjs` — captures unhandled exceptions, slow transactions
  - Mobile: `sentry-expo` — captures JS crashes, native crashes, ANRs
  - Source maps uploaded on each build for readable stack traces
  - Alert rules: notify on new errors, error spike (>10 in 5 min), P0 crashes

#### 5.2 Backend Monitoring

- **Structured logging** with Pino (JSON format):
  - Request ID on every log entry (correlation)
  - Log levels: error, warn, info, debug
  - Log to stdout → aggregate with CloudWatch / Datadog / Grafana Cloud
- **Request metrics:**
  - Response time (p50, p95, p99)
  - Error rate by endpoint
  - Request volume
- **Health check monitoring:**
  - External uptime monitor (Better Uptime, Pingdom, or UptimeRobot) hitting `/api/health` every 60 seconds
  - Alert if down for >2 minutes
- **Database monitoring:**
  - Connection pool utilization
  - Slow query log (queries >500ms)
  - Disk usage and growth rate
- **Queue monitoring (BullMQ):**
  - Queue depth (jobs waiting)
  - Failed job count
  - Job processing time

#### 5.3 Alerting

Set up alerts for:

| Alert                             | Severity | Channel       |
| --------------------------------- | -------- | ------------- |
| API down (health check fails)     | P0       | PagerDuty/SMS |
| Error rate > 5% for 5 minutes     | P1       | Slack + Email |
| Database connection failures      | P0       | PagerDuty/SMS |
| BullMQ failed jobs > 10           | P1       | Slack         |
| Timer completion jobs not running | P0       | PagerDuty/SMS |
| Disk usage > 80%                  | P2       | Email         |
| Certificate expiration < 14 days  | P2       | Email         |
| Crash spike (Sentry)              | P1       | Slack         |

---

### 6. Analytics & Event Tracking

Use **PostHog** (self-hostable, privacy-friendly) or **Mixpanel**:

#### 6.1 Key Events to Track

**Funnel events (parent):**

- `app_opened`
- `signup_started`, `signup_completed`
- `family_created`
- `child_added`
- `first_quest_created`
- `quest_created` (with properties: `source: 'custom' | 'library'`, `category`, `plan`)
- `quest_completion_approved`, `quest_completion_denied`
- `play_session_approved`, `play_session_denied`
- `violation_recorded`
- `paywall_viewed`, `trial_started`, `subscription_purchased` (with `period`, `price`)
- `subscription_cancelled`

**Engagement events (child):**

- `quest_completed` (with `category`, `reward_minutes`, `stacking_type`)
- `play_session_started` (with `requested_minutes`)
- `play_session_completed`
- `achievement_earned` (with `achievement_name`)
- `level_up` (with `new_level`)
- `avatar_customized`

**Important: NO analytics SDKs in the child UI** if targeting Apple Kids Category or COPPA compliance. Track child engagement events **server-side only** (the backend logs them when API calls are made). The mobile app should NOT include any analytics SDK in child-mode screens.

#### 6.2 Dashboards to Build

- **Growth:** DAU/WAU/MAU, new sign-ups, family creation rate
- **Activation funnel:** signup → family created → child added → first quest → first play session
- **Engagement:** quests completed/day, play sessions/day, avg session length
- **Retention:** D1/D7/D30 retention by cohort
- **Revenue:** MRR, subscriber count, trial-to-paid conversion, churn rate
- **Feature adoption:** quest library usage, photo proof usage, gamification engagement

---

### 7. Error Handling Strategy

#### 7.1 Backend API Error Format

Standardize all API error responses:

```json
{
  "statusCode": 400,
  "error": "BAD_REQUEST",
  "message": "Human-readable error message",
  "details": {
    "field": "rewardMinutes",
    "reason": "Must be a positive integer"
  },
  "requestId": "req_abc123"
}
```

- All errors include `requestId` for debugging
- Validation errors return field-level details
- 500 errors never expose internal details to the client (log internally, return generic message)
- Common error codes: `QUEST_LIMIT_REACHED`, `INSUFFICIENT_BALANCE`, `SESSION_ALREADY_ACTIVE`, `OUTSIDE_PLAY_HOURS`, `NEGATIVE_BALANCE`

#### 7.2 Mobile Error Handling

- **Global error boundary** — catches JS crashes, shows "Something went wrong" screen with "Retry" and "Report" buttons
- **Network error interceptor** (Axios) — on 401: auto-refresh token; on 5xx: show retry toast; on network error: show offline banner
- **Offline indicator** — persistent banner when device has no connectivity
- **Retry logic** — automatic retry with exponential backoff for failed API calls (max 3 retries)
- **Offline queue** — queue quest completions and play requests when offline, submit when connectivity returns (with conflict resolution)

---

### 8. Offline Support

#### 8.1 Cached Data (Available Offline)

- Child's quest list (cached on last fetch)
- Time Bank balance (cached, shown with "last updated" timestamp)
- Achievement/badge list
- Family member list

#### 8.2 Queued Actions (Submitted When Online)

- Quest completion ("I Did It!") — queued locally, submitted on reconnect
- If proof photo required: photo saved locally, uploaded on reconnect

#### 8.3 Not Available Offline

- Play timer (requires server as source of truth — show "Connect to internet to play")
- Approval actions (parent must be online)
- Real-time session state

#### 8.4 Implementation

- Use **MMKV** or **AsyncStorage** for local caching
- Show clear "Offline" indicator with last-sync timestamp
- Stale data markers: "Updated 5 minutes ago" → "Updated 2 hours ago ⚠️"

---

### 9. Data Export (Premium Feature)

- `GET /api/families/:familyId/export?format=csv&range=30d` — export family data
  - Generates CSV with: date, child name, quest name, minutes earned, minutes used, balance
- `GET /api/families/:familyId/export?format=pdf&range=30d` — PDF report
  - Summary stats + charts rendered server-side (use Puppeteer or a PDF library)
- Email the export link to the parent (don't serve large files synchronously)
- Rate limit: 1 export per hour per family

---

### 10. App Store Submission Preparation

#### 10.1 Apple App Store

- **Kids Category compliance:**
  - No third-party advertising
  - No analytics that track children (server-side only)
  - No links out of the app without parental gate
  - Age rating: 4+ (no objectionable content)
  - Privacy nutrition labels accurately reflect data collection
- **App Review preparation:**
  - Demo account credentials in review notes (parent + child test accounts)
  - Explain subscription model clearly
  - Screenshot the parental consent flow
  - Provide privacy policy URL
  - TestFlight beta testing before submission

#### 10.2 Google Play Store

- **Designed for Families program:**
  - Comply with Families Policy requirements
  - No behavioral advertising
  - Target audience: children and parents
  - Content rating: ESRB Everyone
- **Data safety section:**
  - Accurately declare all data types collected
  - Declare encryption in transit
  - Declare data deletion availability
- **Closed testing** before production release (Google Play Console)

#### 10.3 App Store Assets

Prepare for both stores:

- App icon (1024×1024, with rounded corners for iOS)
- Screenshots: 6.7" iPhone, 5.5" iPhone, 12.9" iPad, Android phone, Android tablet (at least 4 screenshots each)
- App preview video (30 seconds showing key flows)
- Short description (80 chars): "Kids earn screen time by completing real-world quests!"
- Long description (4000 chars): feature highlights, how it works, subscription info
- Keywords/tags for search optimization
- What's New text for updates
- Support URL, privacy policy URL, terms of service URL

---

### 11. Pre-Launch Checklist

Final verification before go-live:

- [ ] All unit tests pass (>80% coverage on business logic)
- [ ] All integration tests pass
- [ ] E2E tests pass on iOS and Android
- [ ] CI/CD pipeline builds and deploys successfully
- [ ] Production deploy configuration is validated
- [ ] Health check endpoint responds correctly
- [ ] Sentry captures errors on both backend and mobile
- [ ] Push notifications work in all app states (foreground, background, killed)
- [ ] Background timer persists across app kills on both platforms
- [ ] RevenueCat subscription flow works end-to-end (use sandbox)
- [ ] Account deletion flow works completely (data actually deleted)
- [ ] Parental consent flow displays before child account creation
- [ ] Privacy policy is accessible from login screen and settings
- [ ] All premium features correctly gated for free users
- [ ] Non-stackable time expires correctly at end of day (in family timezone)
- [ ] Rate limiting active on all endpoints
- [ ] SSL certificates valid and auto-renewing
- [ ] Database backups running and verified (test a restore)
- [ ] Monitoring alerts configured and tested
- [ ] Analytics events firing correctly
- [ ] App Store assets (icon, screenshots, descriptions) prepared
- [ ] Demo accounts created for App Store reviewers
- [ ] Legal: privacy policy, terms of service reviewed
- [ ] Performance: API responses <300ms, app launch <2s

---

## What This Phase Does NOT Cover

- Feature additions or new functionality (this is infrastructure + quality)
- Admin web panel beyond the CMS (spec Section 10.6 — post-launch roadmap)
- Home screen widgets (iOS/Android — post-launch feature)
- Apple Watch / Wear OS (post-launch)
- Third-party integrations (Screen Time API, Google Classroom — post-launch)
- Multi-family / shared custody (post-launch premium feature)
- WebSocket real-time layer (should be added to Phase 4 as an amendment — see notes below)

---

## Amendments Recommended for Earlier Phases

These items were identified as gaps in existing phases. They should be added to their respective phase prompts:

| Phase       | Amendment                                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 1** | Add `timezone VARCHAR(50) DEFAULT 'America/New_York'` to the `families` table — required for non-stackable expiry, play hour rules, and streaks |
| **Phase 1** | Add `GET /api/health` endpoint returning DB + Redis connectivity status                                                                         |
| **Phase 1** | Add API versioning: all routes under `/api/v1/...`                                                                                              |
| **Phase 1** | Add structured logging setup (Pino with request ID correlation)                                                                                 |
| **Phase 3** | Add server-side image processing on proof photo upload (resize to max 1200px, compress to <500KB using Sharp)                                   |
| **Phase 3** | Specify that non-stackable expiry uses the family's timezone, not UTC                                                                           |
| **Phase 3** | Add a "revoke" endpoint for auto-approved completions (parent can undo if child didn't actually do it)                                          |
| **Phase 4** | Add WebSocket or SSE support for real-time timer sync and instant approval responses (not just REST polling)                                    |
| **Phase 4** | Specify refund bucket: refunds always go to stackable (since non-stackable may have expired)                                                    |
| **Phase 4** | Reduce cron frequency to every 5 minutes (safety net only); rely on BullMQ delayed jobs for precise timing                                      |
| **Phase 5** | Make violation base penalty and multiplier configurable per family (default: 2h base, 2x multiplier)                                            |
| **Phase 5** | Add optional penalty cap (e.g., max 48 hours) configurable by parent                                                                            |
| **Phase 5** | Add notification throttling: batch multiple quest completions within 5 minutes into a single notification                                       |
| **Phase 5** | Add in-app notification inbox (feed screen) — push notifications are ephemeral and easy to miss                                                 |
| **Phase 6** | Add offline support UI: cached data display, offline indicator, queued action feedback                                                          |
| **Phase 6** | Add tablet/iPad split-view layouts for key screens                                                                                              |
| **Phase 6** | Add haptic feedback on key interactions (quest completion, approval swipe, timer warnings)                                                      |
| **Phase 6** | Explicitly decide on dark mode: implement or defer with documented rationale                                                                    |
| **Phase 7** | Add subscription status caching: if RevenueCat is unreachable, default to last-known premium status for 48 hours                                |
| **Phase 7** | Unify avatar cosmetic packs with Phase 9's `avatar_items` table — shared schema                                                                 |
| **Phase 8** | Add `cms_audit_log` table tracking who changed what and when                                                                                    |
| **Phase 9** | Use family timezone for streak date calculations, not UTC                                                                                       |
| **Phase 9** | Add parent toggle to disable gamification features per family (streaks, leaderboard, level notifications)                                       |
| **Phase 9** | Default leaderboard to OFF — parent must opt in                                                                                                 |

---

## Done When

- [ ] Backend has >80% test coverage on business logic with passing unit + integration tests
- [ ] Mobile has E2E tests for all critical user flows, passing on iOS and Android
- [ ] CI/CD pipeline runs lint, type check, tests, and build on every PR
- [ ] Deploy pipeline pushes production releases successfully
- [ ] Production environment is running with proper config
- [ ] Sentry is capturing errors with source maps on both platforms
- [ ] Monitoring dashboards and alerts are configured and tested
- [ ] Analytics tracks key funnel events (server-side for child activity)
- [ ] COPPA parental consent flow is implemented and consent records stored
- [ ] Account deletion works end-to-end with 30-day grace period
- [ ] Privacy policy and terms of service are published and accessible in-app
- [ ] API error responses follow standardized format with request IDs
- [ ] Offline mode shows cached data and queues actions for child
- [ ] Data export (CSV) works for premium families
- [ ] App Store and Play Store assets are prepared
- [ ] Pre-launch checklist is fully passed
- [ ] App submitted to both stores for review
