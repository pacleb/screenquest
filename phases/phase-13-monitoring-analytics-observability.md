# ScreenQuest — Phase 13: Monitoring, Analytics & Observability

> **Prerequisites:** Phases 1–12 complete.
> **Source:** Extracted from Phase 10 sections 5 (Monitoring & Observability) and 6 (Analytics & Event Tracking).
> **Goal:** Add production-grade monitoring, structured logging, alerting, and analytics dashboards.

---

## What to Build in This Phase

### 1. Structured Logging (Section 5.2)

- **Pino** (JSON format) with request ID correlation on every log entry
- Log levels: error, warn, info, debug
- Log to stdout → aggregate with CloudWatch / Datadog / Grafana Cloud

### 2. Backend Monitoring (Section 5.2)

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

### 3. Alerting (Section 5.3)

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

### 4. Analytics & Event Tracking (Section 6)

Use **PostHog** (self-hostable, privacy-friendly) or **Mixpanel**:

#### 4.1 Key Events to Track

**Funnel events (parent):**

- `app_opened`, `signup_started`, `signup_completed`
- `family_created`, `child_added`, `first_quest_created`
- `quest_created` (with properties: `source`, `category`, `plan`)
- `quest_completion_approved`, `quest_completion_denied`
- `play_session_approved`, `play_session_denied`
- `violation_recorded`
- `paywall_viewed`, `trial_started`, `subscription_purchased`, `subscription_cancelled`

**Engagement events (child) — server-side only:**

- `quest_completed`, `play_session_started`, `play_session_completed`
- `achievement_earned`, `level_up`, `avatar_customized`

**Important: NO analytics SDKs in the child UI.** Track child engagement events server-side only.

#### 4.2 Dashboards to Build

- **Growth:** DAU/WAU/MAU, new sign-ups, family creation rate
- **Activation funnel:** signup → family created → child added → first quest → first play session
- **Engagement:** quests completed/day, play sessions/day, avg session length
- **Retention:** D1/D7/D30 retention by cohort
- **Revenue:** MRR, subscriber count, trial-to-paid conversion, churn rate
- **Feature adoption:** quest library usage, photo proof usage, gamification engagement

---

## Tests to Write

### Backend Unit Tests

**Structured Logging (`backend/src/common/logging.spec.ts`):**

- Logger outputs valid JSON with `timestamp`, `level`, `message`, and `requestId` fields
- Request ID from incoming header is propagated through the log context
- Log levels filter correctly (e.g., `info` level suppresses `debug` messages)

**Analytics Events (`backend/src/common/analytics.service.spec.ts`):**

- `trackEvent(eventName, properties)` sends event to analytics provider
- Child engagement events are tracked server-side only (no client SDK reference)
- Events include required properties (`userId`, `familyId`, `timestamp`)
- Malformed or missing event name throws validation error

### Backend Integration Tests (`backend/test/monitoring.e2e-spec.ts`)

- `GET /api/health` — returns `{ status: 'ok', db: 'connected', redis: 'connected' }` with 200
- `GET /api/health` — response includes `requestId` header
- All API responses include `X-Request-Id` header for correlation
- Server-side analytics events fire on quest completion (verify via mock/spy)

---

## Done When

- [ ] Structured JSON logging with request ID correlation
- [ ] External uptime monitoring with alerts configured
- [ ] Database and queue monitoring dashboards set up
- [ ] Alert rules configured and tested for all P0/P1 scenarios
- [ ] Analytics events firing for parent funnel and child engagement (server-side)
- [ ] Key dashboards built (growth, activation, engagement, retention, revenue)
