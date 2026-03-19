# ScreenQuest — Project History

## Overview

ScreenQuest is a family screen-time management app where children earn screen time by completing real-world quests (chores, learning, exercise). Parents create and approve quests; children complete them to unlock a built-in play timer.

---

## Timeline

### Feb 9, 2026 — Project Kickoff

- Initial commit: full app specification written as a structured AI prompt
- Concept defined: kids earn screen time through real-world quests, parents approve
- Tech stack chosen: NestJS + Prisma + PostgreSQL + Redis (backend), React Native + Expo (mobile), Next.js (CMS admin panel)
- Monorepo structure set up with pnpm workspaces

### Feb 9–10, 2026 — Core Backend & Mobile (Phases 1–8)

- **Phase 1:** Project scaffolding, NestJS backend, JWT authentication with refresh token rotation
- **Phase 2:** Family management and quest CRUD system
- **Phase 3:** Quest completion flow and time bank (stackable vs. non-stackable time)
- **Phase 4:** Play session timer with background persistence (pause/resume/stop)
- **Phase 5:** Violations system with escalating penalties and push notifications
- **Phase 6:** Mobile UI polish, parent and child tab layouts
- **Phase 7:** RevenueCat subscription integration and in-app purchases (iOS + Android)
- **Phase 8:** Quest library CMS (Next.js admin panel for curated quest templates)

### Feb 13, 2026 — Gamification (Phase 9)

- XP points, leveling system, and daily/weekly streaks
- Achievements and badge unlocks
- Custom emoji avatars for children
- Leaderboard support

### Feb 14, 2026 — Hardening, Polish & Compliance (Phases 10–14)

- **Phase 10:** Testing infrastructure and deployment preparation
- **Phase 10b:** Security hardening — PIN hashing (bcrypt), rate limiting (ThrottlerGuard with 3 tiers), webhook idempotency, auth fixes
- **Phase 11:** Visual polish — dynamic themes, dark mode, Lottie animations, sound effects, accessibility improvements
- **Phase 12:** COPPA compliance — parental consent flow, account deletion (30-day grace period), privacy policy pages
- **Phase 13:** Monitoring and observability — structured logging (Pino), PostHog server-side analytics, Sentry error tracking with source maps
- **Phase 14:** Offline support and error handling for mobile (network-aware UI, retry logic)

### Feb 16, 2026 — Deployment Infrastructure & Pre-Launch (Phases 15–16)

- **Phase 15:** Production infrastructure — Docker, GitHub Actions CI/CD, Render.com (backend), Vercel (CMS)
- **Phase 16:** Pre-launch readiness — EAS Build configured, pre-launch checklist documented, Sentry source map uploads, environment variable reference finalized
- Production deployment pipeline finalized

### Feb 17, 2026 — Environment & Build Config

- `react-native-config` integrated for environment-safe API URL handling
- `.env.production` added for release builds
- iOS build number bumped to 2

### Mar 1, 2026 — Avatar Bug Fix (TestFlight)

- Discovered and fixed avatar change not working due to `AnimatedHeader` overlay intercepting touches
- Fixed saving state not being reset on success in `AvatarCustomizeScreen`
- Fixed back button being trapped during save
- Minor emoji avatar display size fix in `ChildDetailScreen`

### Mar 2–4, 2026 — Firebase Push Notifications & iOS Fixes

- Fixed Firebase pod install issue with modular headers config plugin
- Added `FirebaseApp.configure()` and explicit APNs token forwarding
- Added `aps-environment` entitlement for iOS push notifications
- iOS AppDelegate updated for correct FCM token registration
- Added FCM diagnostic endpoint for debugging push delivery
- iOS build and archive script updated

### Mar 3, 2026 — COPPA & Legal Pages

- COPPA consent page added to web/CMS
- Terms of Service and Privacy Policy pages added
- Store constants updated with legal links pointing to `restdayapps.com`

### Mar 4–7, 2026 — Subscription Refinements

- Paywall screen improved with backend sync on navigation
- Subscription store refactored for cleaner state management
- Premium feature sync on app navigation (gating re-validated on every tab change)
- Subscription store resets correctly on logout

### Mar 9, 2026 — RevenueCat Webhooks & Android Release Prep

- RevenueCat webhook signature validation added (auth + secret keys)
- Webhook handler updated to support non-UUID IDs and filter valid UUIDs
- `SyncSubscriptionDto` added with optional `appUserId` for RevenueCat user identification
- Family subscription sync script added
- Firebase config files removed from git tracking (security hardening)
- Android release preparation guide documented (`docs/release/ANDROID_RELEASE_PREP.md`)
- All public URLs migrated to `restdayapps.com`
- Android permissions updated for release build

### Mar 11–12, 2026 — iOS App Store Submission

- Final RevenueCat entitlement expiration logic improved
- Session time breakdown added (planned vs. saved seconds) to `ChildHome` and `ChildPlay` screens
- Balance calculation updated to combine stackable and non-stackable seconds correctly
- Quest count display logic refined to include subscription loading state
- **iOS app submitted to the Apple App Store for review**

---

## Key Statistics

| Metric             | Value                                                             |
| ------------------ | ----------------------------------------------------------------- |
| Project start      | Feb 9, 2026                                                       |
| iOS submission     | Mar 11, 2026                                                      |
| Build duration     | ~30 days                                                          |
| Development phases | 16 phases + Phase 17 planned                                      |
| Backend modules    | 15 NestJS modules                                                 |
| Mobile screens     | Parent + Child tab navigators                                     |
| External services  | RevenueCat, Firebase/FCM, Sentry, PostHog, Resend, Render, Vercel |

---

## Milestones

| Date         | Milestone                                                   |
| ------------ | ----------------------------------------------------------- |
| Feb 9, 2026  | Initial commit — project born                               |
| Feb 10, 2026 | Full core feature set implemented (Phases 1–8)              |
| Feb 13, 2026 | Gamification system live (Phase 9)                          |
| Feb 14, 2026 | Security hardening, COPPA compliance, monitoring complete   |
| Feb 16, 2026 | Production infrastructure deployed (Render + Vercel)        |
| Mar 1, 2026  | TestFlight testing — avatar bug found and fixed             |
| Mar 3, 2026  | iOS push notifications working end-to-end                   |
| Mar 9, 2026  | RevenueCat webhooks hardened; Android release prep complete |
| Mar 11, 2026 | **iOS App Store submission**                                |

---

## What's Next

- **iOS review:** Awaiting Apple App Store review and approval
- **Phase 17:** Remove free trial — transition from 14-day trial to freemium model (planned)
- **Android submission:** Android release prep is documented and ready (`docs/release/ANDROID_RELEASE_PREP.md`)
- **Mobile E2E tests:** Detox test suite (Phase 16 remainder) for CI regression coverage
