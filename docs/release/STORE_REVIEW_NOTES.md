# ScreenQuest — App Store Review Notes

## Demo Accounts

### Parent Account
- **Email:** review@screenquest.app
- **Password:** ReviewPass123!
- **Family Code:** (auto-generated on first login)

### Child Account
- **Family Code:** (use the code from the parent dashboard)
- **Child Name:** Demo Kid

> Create these accounts before submission by running the app and registering through the normal flow, or seed them via the backend API.

## How to Test Key Flows

### 1. Parent Registration & Family Setup
1. Open app → tap "Get Started"
2. Register with the parent demo credentials above
3. Create a new family (e.g., "Review Family")
4. Add a child (e.g., "Demo Kid") — note the COPPA consent checkbox

### 2. Quest Creation (Parent)
1. Log in as parent
2. Go to "Quests" tab → tap the + button
3. Create a quest (e.g., "Read for 15 minutes", reward: 15 min)
4. Quest appears in the quest list

### 3. Quest Completion (Child)
1. Log in as child using the family code + child name
2. Go to "Quests" tab → tap a quest
3. Tap "I Did It!" → optionally attach a proof photo
4. Quest status changes to "Pending"

### 4. Approval (Parent)
1. Log in as parent
2. Go to "Approvals" tab
3. Tap "Approve" on the pending quest
4. Child's time bank updates with the reward

### 5. Play Session (Child)
1. Log in as child
2. Tap "Play" tab → tap "Start Playing!"
3. If approval is required, parent must approve from their dashboard
4. Timer counts down from earned balance
5. Pause/resume/stop controls available

### 6. Subscription
- Subscription is powered by RevenueCat
- Free tier: 1 child, 3 active quests
- Premium tier: unlimited children, unlimited quests, analytics
- Use sandbox test accounts to verify subscription flow

## Compliance

### Kids Category (Apple) / Designed for Families (Google)
- **No advertising** — zero ad SDKs integrated
- **No user tracking** — Sentry is error reporting only, no behavioral analytics
- **Parental gate** — all external links (privacy policy, terms, subscription management) require solving a math problem before opening the browser
- **COPPA consent** — parent must explicitly consent before adding a child
- **Privacy manifest** (iOS) — `NSPrivacyTracking: false`, all API reasons declared
- **Age rating:** 4+ (no objectionable content)

### Data Collection
- **Email & name:** Parent only, for authentication
- **Child name:** Display name only, no email required
- **Photos:** Optional proof photos for quest completion (stored server-side, deletable)
- **Push tokens:** For notifications only, not shared with third parties
- **No location data, no contacts, no browsing data**

### Account Deletion
- Available in Settings → "Delete My Account"
- 30-day grace period with ability to cancel
- All data permanently purged after grace period

## Technical Notes
- **Bundle ID:** com.screenquest.app
- **Backend API:** HTTPS only (TLS 1.2+)
- **Min iOS:** 12.0
- **Min Android:** API 24 (Android 7.0)
- **Architecture:** React Native 0.81 with Hermes engine
