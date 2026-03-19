# ScreenQuest — Phase 16: Mobile E2E Tests & App Store Submission

> **Prerequisites:** Phases 1–15 complete.
> **Source:** Extracted from Phase 10 sections 1.3 (Mobile E2E Tests), 1.4 (Device Testing Matrix), 10 (App Store Submission), and 11 (Pre-Launch Checklist).
> **Goal:** Final QA, mobile E2E testing, app store asset preparation, and submission to Apple App Store and Google Play Store.

---

## What to Build in This Phase

### 1. Mobile E2E Tests (Section 1.3)

Use **Detox** (React Native E2E testing framework):

- **Critical user flows:**
  - Parent sign-up → create family → add child → create first quest
  - Child login → view quests → complete quest → pending approval
  - Parent approves quest → child Time Bank updates
  - Child requests play → parent approves → timer starts → timer ends
  - Parent records violation → child balance goes negative → play button disabled
- **Navigation:** all tab transitions, deep links from notifications work
- **Error states:** network error during quest completion shows retry UI
- **Accessibility:** automated a11y scan on key screens

### 2. Device Testing Matrix (Section 1.4)

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

### 3. Apple App Store (Section 10.1)

- **Kids Category compliance:**
  - No third-party advertising
  - No analytics that track children (server-side only)
  - No links out of the app without parental gate
  - Age rating: 4+ (no objectionable content)
  - Privacy nutrition labels accurately reflect data collection
- **App Review preparation:**
  - Demo account credentials in review notes
  - Explain subscription model clearly
  - Screenshot the parental consent flow
  - Provide privacy policy URL
  - TestFlight beta testing before submission

### 4. Google Play Store (Section 10.2)

- **Designed for Families program:**
  - Comply with Families Policy requirements
  - No behavioral advertising
  - Target audience: children and parents
  - Content rating: ESRB Everyone
- **Data safety section:**
  - Accurately declare all data types collected
  - Declare encryption in transit
  - Declare data deletion availability
- **Closed testing** before production release

### 5. App Store Assets (Section 10.3)

- App icon (1024x1024, with rounded corners for iOS)
- Screenshots: 6.7" iPhone, 5.5" iPhone, 12.9" iPad, Android phone, Android tablet (at least 4 each)
- App preview video (30 seconds showing key flows)
- Short description (80 chars): "Kids earn screen time by completing real-world quests!"
- Long description (4000 chars): feature highlights, how it works, subscription info
- Keywords/tags for search optimization
- What's New text for updates
- Support URL, privacy policy URL, terms of service URL

### 6. Pre-Launch Checklist (Section 11)

- [ ] All unit tests pass (>80% coverage on business logic)
- [ ] All integration tests pass
- [ ] E2E tests pass on iOS and Android
- [ ] CI/CD pipeline builds and deploys successfully
- [ ] Production deploy configuration is validated
- [ ] Health check endpoint responds correctly
- [ ] Sentry captures errors with source maps on both platforms
- [ ] Push notifications work in all app states
- [ ] Background timer persists across app kills on both platforms
- [ ] RevenueCat subscription flow works end-to-end (sandbox)
- [ ] Account deletion flow works completely
- [ ] Parental consent flow displays before child account creation
- [ ] Privacy policy accessible from login screen and settings
- [ ] All premium features correctly gated for free users
- [ ] Non-stackable time expires correctly at end of day
- [ ] Rate limiting active on all endpoints
- [ ] SSL certificates valid and auto-renewing
- [ ] Database backups running and verified
- [ ] Monitoring alerts configured and tested
- [ ] Analytics events firing correctly
- [ ] App Store assets prepared
- [ ] Demo accounts created for App Store reviewers
- [ ] Legal: privacy policy, terms of service reviewed
- [ ] Performance: API responses <300ms, app launch <2s

---

## Done When

- [ ] Detox E2E tests pass for all critical flows on iOS and Android
- [ ] App tested on full device matrix (no layout breaks, timer works everywhere)
- [ ] App Store and Play Store assets prepared (icon, screenshots, descriptions)
- [ ] App submitted to both stores for review
- [ ] Pre-launch checklist fully passed
