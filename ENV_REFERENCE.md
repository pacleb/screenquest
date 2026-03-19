# ScreenQuest Environment Variables Reference

## Backend (`backend/.env`)

### Required

| Variable             | Description                                | Example                                                                     |
| -------------------- | ------------------------------------------ | --------------------------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string               | `postgresql://user:pass@localhost:5432/screenquest`                         |
| `DIRECT_URL`         | Direct DB connection (Supabase migrations) | Same as `DATABASE_URL` for local; direct Supabase URL (port 5432) for cloud |
| `REDIS_URL`          | Redis connection string                    | `redis://localhost:6379`                                                    |
| `JWT_SECRET`         | Access token signing secret                | (random string, 32+ chars)                                                  |
| `JWT_REFRESH_SECRET` | Refresh token signing secret               | (random string, 32+ chars)                                                  |
| `APP_URL`            | Backend API URL                            | `https://api.screenquest.app`                                               |
| `FRONTEND_URL`       | Mobile app URL (for CORS)                  | `http://localhost:8081`                                                     |
| `EMAIL_FROM`         | Sender email address                       | `noreply@screenquest.app`                                                   |

### Optional

| Variable                      | Description                | Default                      |
| ----------------------------- | -------------------------- | ---------------------------- |
| `PORT`                        | Server port                | `3000`                       |
| `NODE_ENV`                    | Environment                | `development`                |
| `JWT_ACCESS_EXPIRY`           | Access token TTL           | `15m`                        |
| `JWT_REFRESH_EXPIRY`          | Refresh token TTL          | `30d`                        |
| `CMS_URL`                     | CMS URL (for CORS)         | `http://localhost:3001`      |
| `RESEND_API_KEY`              | Resend email API key       | (disabled if empty)          |
| `AWS_S3_BUCKET`               | S3 bucket for file uploads | (local disk if empty)        |
| `AWS_S3_REGION`               | S3 region                  | `us-east-1`                  |
| `AWS_ACCESS_KEY_ID`           | AWS access key             | (required if S3 enabled)     |
| `AWS_SECRET_ACCESS_KEY`       | AWS secret key             | (required if S3 enabled)     |
| `SENTRY_DSN`                  | Sentry error tracking DSN  | (disabled if empty)          |
| `POSTHOG_API_KEY`             | PostHog analytics key      | (disabled if empty)          |
| `POSTHOG_HOST`                | PostHog instance URL       | `https://us.i.posthog.com`   |
| `REVENUECAT_WEBHOOK_AUTH_KEY` | RevenueCat webhook auth    | (required for subscriptions) |

### Supabase + Prisma Notes

- If `DATABASE_URL` uses Supabase pooler (host includes `pooler.supabase.com`, usually port `6543`), ensure it includes `?pgbouncer=true`.
- Keep `DIRECT_URL` pointed at Supabase direct Postgres (usually port `5432`) for Prisma migrations.
- Example pooled runtime URL:
  `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require`

## Mobile (`mobile/.env`)

| Variable                | Description                | Default                      |
| ----------------------- | -------------------------- | ---------------------------- |
| `SENTRY_DSN`            | Sentry error tracking DSN  | (disabled if empty)          |
| `REVENUECAT_APPLE_KEY`  | RevenueCat iOS API key     | (required for subscriptions) |
| `REVENUECAT_GOOGLE_KEY` | RevenueCat Android API key | (required for subscriptions) |

## CMS (`cms/.env.local`)

| Variable              | Description             | Example                       |
| --------------------- | ----------------------- | ----------------------------- |
| `NEXT_PUBLIC_API_URL` | Backend API URL         | `https://api.screenquest.app` |
| `NEXTAUTH_SECRET`     | NextAuth session secret | (random string)               |
| `NEXTAUTH_URL`        | CMS public URL          | `https://cms.screenquest.app` |

## GitHub Actions Secrets

Set in GitHub > Settings > Secrets and variables > Actions:

| Secret                          | Description                              | Required? |
| ------------------------------- | ---------------------------------------- | --------- |
| `EXPO_TOKEN`                    | EAS CLI authentication token             | Yes       |
| `SENTRY_AUTH_TOKEN`             | Sentry CLI auth for source map uploads   | Yes       |
| `SENTRY_ORG`                    | Sentry organization slug                 | No        |
| `SENTRY_PROJECT_BACKEND`        | Sentry project slug (backend)            | No        |
| `RENDER_DEPLOY_HOOK_PRODUCTION` | Render.com deploy webhook for production | Yes       |

## Android Signing (for release builds)

Set as environment variables or in `mobile/android/gradle.properties`:

| Variable                        | Description                        |
| ------------------------------- | ---------------------------------- |
| `SCREENQUEST_KEYSTORE_FILE`     | Path to release keystore file      |
| `SCREENQUEST_KEYSTORE_PASSWORD` | Keystore password                  |
| `SCREENQUEST_KEY_ALIAS`         | Key alias (default: `screenquest`) |
| `SCREENQUEST_KEY_PASSWORD`      | Key password                       |

## Sentry Properties

Mobile builds read from `mobile/ios/sentry.properties` and `mobile/android/sentry.properties`:

- `defaults.org` — Sentry organization (update placeholder before first build)
- `defaults.project` — Sentry project slug
- Auth token read from `SENTRY_AUTH_TOKEN` environment variable
