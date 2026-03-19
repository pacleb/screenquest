# ScreenQuest — Tech Stack Reference

## Backend

| Category           | Technology                             | Version                    |
| ------------------ | -------------------------------------- | -------------------------- |
| Runtime            | Node.js                                | 22                         |
| Language           | TypeScript                             | ^5.4.0                     |
| Framework          | NestJS                                 | ^10.4.0                    |
| ORM                | Prisma                                 | ^5.18.0                    |
| Database           | PostgreSQL                             | 16                         |
| Cache / Pub-Sub    | Redis (ioredis)                        | ^5.4.0                     |
| Auth               | Passport + passport-jwt                | ^0.7.0 / ^4.0.1            |
| JWT                | @nestjs/jwt                            | ^10.2.0                    |
| API Docs           | @nestjs/swagger (OpenAPI)              | ^7.3.0                     |
| Rate Limiting      | @nestjs/throttler + express-rate-limit | ^5.2.0 / ^7.4.0            |
| Scheduling         | @nestjs/schedule                       | ^6.1.1                     |
| Events             | @nestjs/event-emitter                  | ^3.0.1                     |
| Logging            | pino / nestjs-pino / pino-http         | ^10.3.1 / ^4.5.0 / ^11.0.0 |
| Email              | Resend                                 | ^4.0.0                     |
| Push Notifications | firebase-admin (FCM)                   | ^13.6.1                    |
| File Upload        | multer + sharp                         | ^2.0.2 / ^0.34.5           |
| Object Storage     | AWS S3 SDK                             | ^3.990.0                   |
| Security           | helmet, bcrypt                         | ^7.1.0 / ^5.1.1            |
| Observability      | Sentry (@sentry/nestjs)                | ^10.38.0                   |
| Analytics          | PostHog (posthog-node)                 | ^5.24.15                   |
| Validation         | class-validator + class-transformer    | ^0.14.1 / ^0.5.1           |
| CSV Export         | csv-stringify                          | ^6.6.0                     |
| Reactive           | RxJS                                   | ^7.8.1                     |
| ID Generation      | nanoid, uuid                           | ^3.3.7 / ^13.0.0           |
| Testing            | Jest + ts-jest + Supertest             | ^29.7.0 / ^29.2.0 / ^7.2.2 |
| Linting            | ESLint + @typescript-eslint            | ^9.0.0 / ^8.0.0            |

## Mobile (React Native — Bare Workflow)

| Category           | Technology                                               | Version                          |
| ------------------ | -------------------------------------------------------- | -------------------------------- |
| Framework          | React Native                                             | 0.81.5                           |
| UI Library         | React                                                    | 19.1.0                           |
| Navigation         | React Navigation (native-stack, bottom-tabs)             | ^7.x                             |
| State Management   | Zustand                                                  | ^4.5.0                           |
| HTTP Client        | Axios                                                    | ^1.7.0                           |
| Animations         | react-native-reanimated + Lottie                         | ^4.1.6 / ^7.3.6                  |
| Push Notifications | @react-native-firebase/messaging + @notifee/react-native | ^21.6.2 / ^9.1.7                 |
| In-App Purchases   | RevenueCat (react-native-purchases)                      | ^9.7.6                           |
| Secure Storage     | react-native-keychain                                    | ^9.2.2                           |
| Async Storage      | @react-native-async-storage/async-storage                | ^2.2.0                           |
| Image Picker       | react-native-image-picker                                | ^7.2.3                           |
| Charts             | react-native-chart-kit                                   | ^6.12.0                          |
| SVG                | react-native-svg                                         | ^15.12.1                         |
| Icons              | react-native-vector-icons                                | ^10.2.0                          |
| Haptics            | react-native-haptic-feedback                             | ^2.3.3                           |
| Sound              | react-native-sound                                       | ^0.11.2                          |
| Confetti           | react-native-confetti-cannon                             | ^1.5.2                           |
| Gradient           | react-native-linear-gradient                             | ^2.8.3                           |
| Splash Screen      | react-native-splash-screen                               | ^3.3.0                           |
| Device Info        | react-native-device-info                                 | ^14.0.4                          |
| Network Detection  | @react-native-community/netinfo                          | ^11.5.2                          |
| Clipboard          | @react-native-clipboard/clipboard                        | ^1.14.3                          |
| Safe Area          | react-native-safe-area-context                           | 5.6.2                            |
| Screens            | react-native-screens                                     | 4.16.0                           |
| Observability      | @sentry/react-native                                     | ^8.0.0                           |
| E2E Testing        | Detox + jest-circus                                      | ^20.47.0 / ^29.7.0               |
| Platforms          | iOS + Android                                            | Bundle ID: `com.screenquest.app` |

## CMS (Quest Library)

| Category    | Technology                                              | Version                  |
| ----------- | ------------------------------------------------------- | ------------------------ |
| Framework   | Next.js (standalone output)                             | ^15.1.0                  |
| UI Library  | React + React DOM                                       | ^19.0.0                  |
| Language    | TypeScript                                              | ^5.7.0                   |
| Styling     | Tailwind CSS + tailwindcss-animate + @tailwindcss/forms | ^3.4.16                  |
| Utility CSS | clsx + tailwind-merge + class-variance-authority (CVA)  | ^2.1.1 / ^2.6.0 / ^0.7.1 |
| Icons       | Lucide React                                            | ^0.468.0                 |
| HTTP Client | Axios                                                   | ^1.7.9                   |
| CSV Parsing | PapaParse                                               | ^5.4.1                   |
| Hosting     | Vercel                                                  | —                        |

## Shared Package

| Category | Technology                                      | Version |
| -------- | ----------------------------------------------- | ------- |
| Language | TypeScript                                      | ^5.4.0  |
| Purpose  | Shared types/constants between backend & mobile | —       |

## Infrastructure / DevOps

| Category         | Technology              | Details                                             |
| ---------------- | ----------------------- | --------------------------------------------------- |
| Monorepo         | pnpm workspaces         | pnpm ^10.x                                          |
| Containerization | Docker (multi-stage)    | node:22-slim base                                   |
| Local Dev        | Docker Compose 3.8      | Postgres 16 + Redis 7 + Backend                     |
| CI/CD            | GitHub Actions          | 3 stages: test → build → deploy                     |
| CI Docker        | Docker (GitHub Actions) | Image pushed to GitHub Container Registry (ghcr.io) |
| Hosting (API)    | Render                  | Docker web service with deploy hooks                |
| Hosting (CMS)    | Vercel                  | Next.js standalone                                  |
| Database         | PostgreSQL              | Production database                                 |
| Cache            | Redis                   | Production cache                                    |
| Source Control   | GitHub                  | github.com/pacleb/screenquest                       |
| Source Maps      | Sentry CLI v3           | Uploads during CI build stage                       |
| Error Tracking   | Sentry                  | Org: pacleb                                         |

## External Services

| Service                        | Purpose                                                    |
| ------------------------------ | ---------------------------------------------------------- |
| AWS S3                         | File/image storage (proof uploads)                         |
| Resend                         | Transactional email                                        |
| Firebase Cloud Messaging (FCM) | Push notifications                                         |
| RevenueCat                     | Subscription / in-app purchase management                  |
| Sentry                         | Error tracking & performance monitoring (backend + mobile) |
| PostHog                        | Product analytics                                          |
| Render                         | Backend hosting + managed PostgreSQL                       |
| Upstash                        | Managed Redis (free tier)                                  |
| Vercel                         | CMS hosting                                                |
| GitHub                         | Source control & CI/CD pipelines (GitHub Actions)          |
| Apple App Store                | iOS distribution                                           |

## Key URLs

| Environment    | URL                                      |
| -------------- | ---------------------------------------- |
| Production API | https://sqapi.restdayapps.com            |
| Health Check   | https://sqapi.restdayapps.com/api/health |
| Sentry         | https://pacleb.sentry.io                 |
| GitHub         | https://github.com/pacleb/screenquest    |
