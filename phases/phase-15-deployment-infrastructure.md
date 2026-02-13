# ScreenQuest — Phase 15: Deployment Infrastructure & Data Export

> **Prerequisites:** Phases 1–14 complete.
> **Source:** Extracted from Phase 10 sections 2.4–2.5 (Deploy Pipelines, Environment Strategy), 3 (Deployment Infrastructure), and 9 (Data Export).
> **Goal:** Set up production hosting, file storage, database management, CDN, and data export features.

---

## What to Build in This Phase

### 1. Deploy Pipelines (Section 2.4)

- **Backend:** Build Docker image → push to container registry → deploy to staging → run smoke tests → promote to production
- **CMS:** Auto-deploy to Vercel on push to main (preview deploys on PRs)
- **Mobile:** Use **EAS Build + EAS Submit** for app store submissions
  - `eas build --platform all --profile production`
  - `eas submit --platform ios` / `eas submit --platform android`

### 2. Environment Strategy (Section 2.5)

| Environment | Purpose      | Backend URL                | Database       |
| ----------- | ------------ | -------------------------- | -------------- |
| Local       | Development  | http://localhost:3000      | Docker Compose |
| Staging     | QA + testing | https://api-staging.sq.app | Staging DB     |
| Production  | Live app     | https://api.sq.app         | Production DB  |

- All environments use separate databases, Redis instances, and Firebase projects
- Staging mirrors production config but with test RevenueCat/Stripe keys
- Database migrations run automatically on deploy (with rollback plan)

### 3. Backend Hosting (Section 3.1)

Deploy the NestJS backend using one of:

- **Option A (recommended for MVP): Railway / Render** — simple PaaS, auto-deploy from Git, managed PostgreSQL + Redis included
- **Option B (scale-ready): AWS ECS Fargate** — containerized, auto-scaling, with RDS PostgreSQL + ElastiCache Redis

Regardless of hosting choice:

- Docker image with multi-stage build (build → production)
- Health check endpoint: `GET /api/health`
- Graceful shutdown handling
- Auto-scaling: min 2 instances for redundancy
- SSL/TLS termination at load balancer

### 4. File Storage (Section 3.2)

- **Proof photos:** AWS S3 (or Cloudflare R2 for cost savings)
  - Private bucket, signed URLs for access (expire after 1 hour)
  - Lifecycle rule: delete photos older than 1 year (configurable)
  - Image processing on upload: resize to max 1200px, compress to <500KB (use Sharp)

### 5. Database (Section 3.3)

- **PostgreSQL 15+** — managed service
  - Automated daily backups with 30-day retention
  - Point-in-time recovery enabled
  - Connection pooling (PgBouncer) for production
- **Redis 7+** — managed service
  - Persistence enabled (AOF) for job queue durability

### 6. CDN & Domain (Section 3.4)

- Custom domain: `screenquest.app` (or similar)
- API: `api.screenquest.app`
- CMS: `admin.screenquest.app`
- CDN for static assets (CloudFront or Cloudflare)

### 7. Data Export — Premium Feature (Section 9)

- `GET /api/families/:familyId/export?format=csv&range=30d` — export family data
  - Generates CSV with: date, child name, quest name, minutes earned, minutes used, balance
- `GET /api/families/:familyId/export?format=pdf&range=30d` — PDF report
- Email the export link to the parent (don't serve large files synchronously)
- Rate limit: 1 export per hour per family

---

## Tests to Write

### Backend Unit Tests

**Data Export (`backend/src/family/export.service.spec.ts`):**

- `exportCSV(familyId, range)` generates valid CSV with headers: date, child name, quest name, minutes earned, minutes used, balance
- `exportCSV` with `range=30d` only includes data from the past 30 days
- `exportCSV` with no data returns CSV with headers only
- `exportPDF(familyId, range)` generates valid PDF buffer
- Export requires premium subscription — throws for free users
- Export rate limiting: second request within 1 hour throws `TooManyRequestsException`
- Export only includes data from the requesting family (no cross-tenant leakage)

### Backend Integration Tests (`backend/test/export.e2e-spec.ts`)

- `GET /families/:familyId/export?format=csv&range=30d` — returns CSV file with correct `Content-Type` header
- `GET /families/:familyId/export?format=pdf&range=30d` — returns PDF file
- Export by non-family member → 403
- Export by free-tier user → 403
- Second export within 1 hour → 429

### Infrastructure Tests

- **Docker build:** `docker build -t screenquest-backend .` completes successfully
- **Health check:** deployed container responds to `GET /api/health` within 5 seconds
- **Graceful shutdown:** `SIGTERM` signal allows in-flight requests to complete before exit
- **S3 signed URLs:** generated URL grants read access for 1 hour, then expires

---

## Done When

- [ ] Docker multi-stage build for backend
- [ ] Staging and production environments running with proper config
- [ ] Deploy pipeline pushes to staging automatically and production on release tags
- [ ] S3/R2 configured for proof photo storage with signed URLs
- [ ] Database backups running and verified (test a restore)
- [ ] SSL certificates valid and auto-renewing
- [ ] Data export (CSV) works for premium families
