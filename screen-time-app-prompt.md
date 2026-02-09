# AI Prompt: Build a Mobile App — "ScreenQuest"

---

## 1. App Overview

Build a cross-platform mobile app called **"ScreenQuest"** that lets children earn screen time by completing **Quests** — real-world activities like chores, studying, reading, exercise, etc. Parents define the quests and how much screen time each one is worth. Children use the app's built-in timer to start "Play" time using their earned hours, and parents can approve or simply be notified. The app must feel fun, colorful, and kid-friendly while giving parents full control and visibility. **There are no ads anywhere in the app — not for children, not for parents, on any plan.**

---

## 2. Target Platforms

- iOS (iPhone & iPad)
- Android (phones & tablets)
- Use **React Native** (or Flutter — state your recommendation and reasoning) for cross-platform development
- Minimum OS versions: iOS 15+, Android 10+

---

## 3. User Roles & Account System

### 3.1 Account Structure

- All accounts are **email-based** (email + password authentication)
- Support **Sign in with Apple**, **Sign in with Google**, and **email/password**
- A **Family Account** is the top-level entity, created by the first parent who signs up
- Family accounts have a unique **Family Code** that can be shared to invite other parents/guardians

### 3.2 Roles

| Role                  | Description                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Parent / Owner**    | Creates the family account. Full admin privileges. Can manage everything.                                                         |
| **Parent / Guardian** | Invited by the owner. Can manage children, approve requests, create activities. Owner can configure what guardians can/cannot do. |
| **Child**             | Added by a parent. Has a simplified, kid-friendly UI. Cannot modify activities or settings.                                       |

### 3.3 Account Flows

- **Parent sign-up:** Email → verify email → create profile (name, avatar) → create Family Account → land on Parent Dashboard
- **Add another parent/guardian:** Parent sends an invite via email or shares a Family Code → invited user signs up or logs in → joins the family as a Guardian
- **Add a child:** Parent creates a child profile (name, age, avatar, email is optional for children under 13 — if under 13, use a parent-managed sub-account with a PIN or simplified login)
- **Child login:** Email/username + password, or parent-assisted login via QR code scanned from parent device

---

## 4. Core Features

### 4.1 Quest Management (Parent Side)

- Parents can **create, edit, delete, and archive** quests
- **Free plan:** up to **3 quests**. **Premium plan:** **unlimited quests**.
- Each quest has:
  - **Name** (e.g., "Clean your room," "Read for 30 minutes," "Math homework")
  - **Icon/Emoji** chosen from a built-in library
  - **Category** (Chores, Studying, Exercise, Reading, Creative, Helping Others, Custom)
  - **Screen time reward** — selectable in increments:
    - 15 minutes, 30 minutes, 45 minutes, 1 hour, 1.5 hours, 2 hours, or custom
  - **Stacking type:**
    - **Non-Stackable** — earned time from this quest does NOT carry over to the next day; it expires at end of day if unused
    - **Stackable** — earned time carries over indefinitely until used
  - **Recurrence** — one-time, daily, weekly, specific days of the week
  - **Assigned to** — one child, multiple children, or all children
  - **Requires proof** (optional) — child can upload a photo as proof of completion
  - **Auto-approve** (optional) — if enabled, time is credited instantly without parent approval
  - **Bonus multiplier** (optional) — e.g., 2x on weekends
- Parents see a **master list** of all quests grouped by category

### 4.2 Quest Completion (Child Side)

- Child sees a list of **available quests** displayed as colorful, illustrated cards
- Each quest card shows whether it is **Stackable** or **Non-Stackable** (with a clear icon/label)
- Child taps a quest and marks it as **"Done!"**
- If proof is required, child is prompted to take/upload a photo
- Quest goes into **"Pending Approval"** state (unless auto-approve is on)
- Child sees a **fun animation/celebration** when a quest is approved and time is credited
- Earned time is added to the child's **"Time Bank"** (displayed prominently)
- **Non-Stackable** time is visually distinguished in the Time Bank and automatically expires at the end of the day

### 4.3 Time Bank & Play Mode

- Each child has a visible **Time Bank** showing total earned screen time (displayed as a fun meter, piggy bank, or jar filling up)
- The Time Bank shows **Stackable** and **Non-Stackable** balances separately so the child knows which time expires at end of day
- Child taps a big **"PLAY"** button to start screen time
- Child selects **how much time** they want to use (e.g., 30 min, 1 hour — cannot exceed their balance)
- Based on parent settings, the Play request either:
  - **Requires approval** — parent gets a push notification and approves/denies from their phone
  - **Auto-starts** — parent just gets a notification that play time has started
- Once approved/started:
  - The app's **built-in countdown timer** starts and is displayed on the child's device (fun, visual — not stressful)
  - **The timer runs persistently in the background** — even if the app is closed, force-quit, or the device is locked, the timer continues counting down (using background services / background task APIs)
  - Gentle **5-minute warning** and **1-minute warning** with friendly sounds and **push notifications**
  - When time is up: a **push notification is sent to the child** AND a kind, encouraging screen appears when they open the app ("Great job managing your time! 🌟") — NOT a harsh lockout
  - The used time is **deducted from the Time Bank**
- **Pause & Resume**: Child (or parent) can pause the timer if needed (e.g., dinner time)
- Parent can **extend or end** a play session remotely
- **Parent is notified via push notification for ALL timer state changes:**
  - Play session **started**
  - Play session **paused**
  - Play session **resumed**
  - Play session **stopped** (by child or parent)
  - Play session **time reached zero** (completed)
- All notifications are delivered even if either the parent's or child's app is closed

### 4.4 Parent Dashboard

- **Overview screen** showing:
  - Each child's current Time Bank balance
  - Recent activity completions (with approve/deny actions for pending ones)
  - Active play sessions with remaining time
  - Weekly summary stats
- **Approval queue** — swipeable cards: swipe right to approve, left to deny, tap for details
- **Quest manager** — CRUD interface for quests
- **Consequences manager** — view/add violations, reset violation count, forgive violations
- **History/Log** — full history of quests completed, time earned, time used, violations, per child
- **Settings** per child:
  - Daily screen time cap (even if they have balance, max X hours/day)
  - Allowed play hours (e.g., no play time after 8 PM or before homework is done)
  - Weekend vs. weekday rules
  - Play approval mode (require approval vs. notify only)

### 4.5 Consequences System

Parents can enforce agreements with their children through a **Consequences** feature for screen time violations (e.g., child continues playing past timer, uses screens without starting the timer, etc.):

- **Escalating penalty structure** (doubling each time):
  - **1st violation:** Apologize + pay back **2 hours** from Time Bank
  - **2nd violation:** Apologize + pay back **4 hours** from Time Bank
  - **3rd violation:** Apologize + pay back **8 hours** from Time Bank
  - **4th violation:** Apologize + pay back **16 hours** from Time Bank
  - **And so on** — each subsequent violation doubles the payback amount
- If the child doesn't have enough hours in their Time Bank, their **balance goes negative** — they must earn back to positive before they can use Play again
- The parent can **reset the violation count** at any time (e.g., fresh start, good behavior streak)
- Each violation is **logged** with date, description, and penalty applied
- The child sees their **violation count and current penalty level** in a non-scary but clear way (e.g., "⚠️ 1 strike — next time it's 4 hours")
- Parent can **manually add** a violation from their dashboard
- Parent can also **forgive/undo** the most recent violation if it was a mistake

### 4.6 Notifications

- **Parent receives:**
  - Child completed a quest (approve/deny inline from notification)
  - Child requested Play time (approve/deny inline)
  - Play session **started** (timer began)
  - Play session **paused**
  - Play session **resumed**
  - Play session **stopped** (by child)
  - Play session **completed** (timer reached zero)
  - Violation recorded
  - Daily/weekly summary (configurable)
- **Child receives:**
  - Quest approved! + time credited (with fun animation next time they open the app)
  - Quest denied (with optional parent message explaining why)
  - Play request approved
  - Timer warnings (5 min, 1 min remaining) — **delivered as push notifications even if app is closed**
  - Timer expired — **push notification: "Time's up! Great job managing your time! 🌟"**
  - Violation notice
  - Encouragement/reminders ("You have 2 quests available today!")

### 4.7 Family Management

- View all family members and their roles
- Owner can:
  - Promote/demote guardians
  - Remove members
  - Transfer ownership
- Any parent/guardian can:
  - Add/edit child profiles
  - View all children's dashboards
- Support for **multiple families** (e.g., divorced parents — a child can belong to two family accounts, and their Time Bank can be shared or separate per parent preference)

---

## 5. Gamification & Kid-Friendly Design

### 5.1 Visual Design Principles

- **Bright, cheerful color palette** — think blues, greens, oranges, purples, yellows
- **Rounded shapes** everywhere — rounded cards, rounded buttons, bubbly UI
- **Large tap targets** — minimum 48pt, ideally 56pt+ for primary actions
- **Illustrated characters/mascots** — a friendly mascot (e.g., a playful robot, a star character, or a friendly animal) that guides the child through the app
- **Minimal text, maximum icons** — especially for younger children
- **Animations** — micro-animations on every interaction (buttons bounce, stars fly, confetti on achievements)
- **No ads anywhere in the app** — ever, on any plan, for any user role
- **Dark mode** support (optional but nice)
- **Accessibility** — support for larger text, VoiceOver/TalkBack, colorblind-friendly palette

### 5.2 Gamification Elements

- **Streaks** — "You've completed quests 5 days in a row! 🔥"
- **Badges/Achievements** — "Helping Hand" (10 chores), "Bookworm" (20 reading sessions), "Super Star" (first week complete)
- **Levels** — child levels up as they complete more quests (Level 1: Starter, Level 5: Helper, Level 10: Champion, etc.)
- **Avatar customization** — child earns avatar accessories/outfits by completing milestones
- **Weekly challenges** — optional bonus activities worth extra time
- **Leaderboard** (optional, family-only) — siblings can see who earned the most this week (parents can disable if it causes rivalry)

### 5.3 Parent UI Design

- Clean, modern, **adult-oriented design** — professional but warm
- Dashboard-style layout with quick-action cards
- Easy one-tap approve/deny flows
- Minimal friction for daily use (parents won't use it if it's cumbersome)

---

## 6. Free vs. Paid Plans

### 6.1 Free Plan

- Unlimited parent/guardian accounts in the family
- Up to **6 children**
- Up to **3 quests** (parents can create a maximum of 3 quests)
- All categories
- Full Time Bank & Play functionality (including persistent background timer)
- Consequences system
- Push notifications
- Basic avatar options for children
- Standard mascot/theme
- **No ads** — ever

### 6.2 Premium Plan ("ScreenQuest Plus")

**Price: $4.99/month or $39.99/year**

Everything in Free, plus:

- **Unlimited quests** (parents can create as many quests as they want)
- **Photo proof** for quest verification
- **Full history** — unlimited quest and screen time logs
- **Advanced scheduling** — per-day rules, time-of-day restrictions, weekend multipliers
- **Detailed reports & insights** — weekly email reports, charts showing trends
- **Premium avatar items & themes** for children
- **Multiple device support** per child
- **Multi-family support** (shared custody scenarios)
- **Quest marketplace** — pre-built, age-appropriate quest templates curated by child development experts
- **Export data** — CSV/PDF reports for family records
- **Priority support**

### 6.3 Subscription & Cancellation Policy

- **Free trial:** 14-day free trial of Premium for all new sign-ups
- **Cancellation policy:** When a user cancels their subscription, **premium features remain active until the end of the current billing period** (end of the paid month or year). The subscription simply does not renew. After the billing period ends, the account reverts to the Free plan:
  - If the parent has more than 3 quests, existing quests are **not deleted** — they are **archived/frozen**. The parent must choose which 3 to keep active, or re-subscribe.
- **In-app purchases:** Optional cosmetic packs for child avatars ($0.99–$2.99)
- **No ads** — the app is completely ad-free on all plans, for all users
- Comply with **Apple & Google billing** requirements for subscriptions

---

## 7. Technical Requirements

### 7.1 Architecture

- **Frontend:** React Native (Expo managed workflow) OR Flutter
- **Backend:** Node.js with Express or NestJS (REST + WebSocket for real-time updates)
- **Database:** PostgreSQL for relational data + Redis for sessions/caching
- **Authentication:** Firebase Auth or custom JWT-based auth with email verification
- **Push Notifications:** Firebase Cloud Messaging (FCM) for Android, APNs for iOS
- **File Storage:** AWS S3 or Firebase Storage (for proof photos)
- **Real-time:** WebSockets or Firebase Realtime Database for live timer sync and instant approvals
- **API:** RESTful API with OpenAPI/Swagger documentation

### 7.2 Data Models (Core)

```
Family
  - id
  - name
  - plan (free | premium)
  - subscriptionExpiresAt (datetime, nullable — premium features active until this date)
  - subscriptionPeriod (monthly | yearly, nullable)
  - createdAt
  - ownerId (FK → User)

User
  - id
  - email
  - passwordHash
  - name
  - avatarUrl
  - role (parent | guardian | child)
  - familyId (FK → Family)
  - pin (for child accounts)
  - age (for children)
  - createdAt

Quest
  - id
  - familyId (FK → Family)
  - createdByUserId (FK → User)
  - name
  - description
  - icon
  - category
  - rewardMinutes (integer)
  - stackingType (stackable | non_stackable)
  - recurrence (one_time | daily | weekly | custom)
  - recurrenceDays (array)
  - requiresProof (boolean)
  - autoApprove (boolean)
  - bonusMultiplier (float, default 1.0)
  - assignedChildIds (array of FK → User)
  - isArchived (boolean)
  - createdAt

QuestCompletion
  - id
  - questId (FK → Quest)
  - childId (FK → User)
  - status (pending | approved | denied)
  - proofImageUrl (nullable)
  - approvedByUserId (FK → User, nullable)
  - earnedMinutes (integer)
  - stackingType (stackable | non_stackable)
  - expiresAt (datetime, nullable — set to end of day for non-stackable)
  - parentNote (nullable)
  - completedAt
  - reviewedAt

Violation
  - id
  - childId (FK → User)
  - recordedByUserId (FK → User)
  - violationNumber (integer — 1st, 2nd, 3rd, etc.)
  - penaltyMinutes (integer — 120, 240, 480, 960, etc.)
  - description (text)
  - forgiven (boolean, default false)
  - createdAt

TimeBank
  - id
  - childId (FK → User)
  - balanceMinutes (integer)
  - lastUpdated

PlaySession
  - id
  - childId (FK → User)
  - requestedMinutes (integer)
  - status (requested | approved | denied | active | paused | completed | stopped | cancelled)
  - approvedByUserId (FK → User, nullable)
  - startedAt (nullable)
  - pausedAt (nullable)
  - totalPausedSeconds (integer, default 0)
  - endedAt (nullable)
  - backgroundTimerActive (boolean, default true — timer persists even when app is closed)
  - lastSyncedAt (datetime — last time the client synced timer state with server)
  - createdAt

Achievement
  - id
  - childId (FK → User)
  - type (streak | badge | level_up)
  - name
  - description
  - iconUrl
  - earnedAt
```

### 7.3 Security & Privacy

- **COPPA compliance** — critical since the app targets children under 13
  - Parental consent flow before child account creation
  - Minimal data collection for children
  - No behavioral advertising to children
  - Privacy policy clearly stating data practices
- **GDPR compliance** — data deletion requests, data portability
- **Data encryption** — at rest and in transit (TLS 1.3)
- **Rate limiting** on all API endpoints
- **Input validation and sanitization** throughout
- **Secure photo storage** — proof photos are private, accessible only to family members
- **Session management** — JWT with refresh tokens, ability to sign out all devices

### 7.4 Performance Requirements

- App launch to interactive: < 2 seconds
- API response times: < 300ms for standard operations
- Push notification delivery: < 5 seconds
- Timer accuracy: ±1 second sync across devices
- **Background timer persistence:** Timer MUST continue running when the app is backgrounded, closed, or force-quit. Use platform-specific background execution APIs (iOS: Background Tasks, Background App Refresh, silent push notifications; Android: Foreground Service with persistent notification). The server is the source of truth for timer state — the client syncs on app open.
- Offline support: Child can view their Time Bank balance and quest list offline; syncs when back online

---

## 8. Screens / Navigation Map

### Parent App Screens

1. **Onboarding** — Welcome → Sign Up → Create Family → Add First Child → Tour
2. **Dashboard** — Overview of all children, pending approvals, active sessions
3. **Approval Queue** — Swipeable list of pending activity completions and play requests
4. **Quest Manager** — List of all quests, create/edit quest form
5. **Child Detail** — Individual child's Time Bank, history, violations, settings, achievements
6. **Consequences** — Violation history, add violation, reset count, forgive
7. **Family Settings** — Manage members, invite parents, subscription management
8. **Reports** (Premium) — Charts and insights on screen time trends
9. **Profile & Settings** — Account settings, notification preferences, plan management
10. **Notifications Center** — All notifications in a feed

### Child App Screens

1. **Home** — Time Bank display (big, visual, showing stackable and non-stackable balances), mascot greeting, available quests
2. **Quest Board** — Colorful cards of available quests to earn time (shows stackable vs. non-stackable)
3. **Quest Detail** — Instructions, "I Did It!" button, photo upload if required
4. **Play Screen** — Big PLAY button, time selector, countdown timer (when active)
5. **Achievements** — Badges, streaks, level progress
6. **Avatar/Profile** — Avatar customization, name, level display
7. **History** — Simple view of what they've earned and used

---

## 9. Key User Flows (Step by Step)

### Flow 1: Parent Creates a Quest

1. Parent taps "+" on Quest Manager
2. Fills in: name, picks an icon/emoji, selects category
3. Sets reward: chooses time increment (e.g., 30 minutes)
4. Selects **stacking type**: Stackable (carries over) or Non-Stackable (expires end of day)
5. Sets recurrence: one-time or repeating
6. Assigns to child(ren)
7. Toggles optional settings: requires proof, auto-approve
8. Taps "Create Quest"
9. Quest appears on assigned children's quest boards immediately

### Flow 2: Child Completes a Quest

1. Child opens app → sees Home screen with Time Bank and available quests
2. Taps on a quest card (e.g., "Clean your room — 30 min ⭐ [Non-Stackable]")
3. Sees quest detail screen
4. Completes the real-world activity
5. Taps "I Did It!" button
6. (If proof required) Takes a photo with camera
7. Success message: "Awesome! Waiting for parent approval… 🎉"
8. Parent receives push notification: "Timmy completed 'Clean your room' — Approve?"
9. Parent approves (from notification or app)
10. Child's Time Bank increases by 30 minutes with celebration animation
11. If Non-Stackable, that time is marked to expire at end of day

### Flow 3: Child Uses Screen Time

1. Child taps the big "PLAY" button on Home
2. Selects duration: "I want to play for 1 hour" (slider or preset buttons)
3. App checks: Does child have enough balance? Is it within allowed hours? Is balance positive (no outstanding violation debt)?
4. If approval required: request sent to parent → parent approves
5. **App's built-in countdown timer starts** with fun visuals
6. Parent receives push notification: "Timmy started playing (1 hour)"
7. Child can **pause** the timer → parent notified: "Timmy paused play time"
8. Child can **resume** → parent notified: "Timmy resumed play time"
9. At 5 minutes remaining: gentle chime + push notification to child: "5 minutes left!"
10. At 1 minute remaining: push notification to child: "1 minute left!"
11. At 0 minutes: push notification to BOTH child and parent: "Time's up!"
12. App shows friendly "Time's up!" screen with encouragement
13. Time is deducted from Time Bank
14. **All of the above works even if the app is closed or in the background** — the timer runs persistently via background services, and all alerts are delivered as push notifications

### Flow 4: Parent Records a Violation

1. Parent opens Consequences screen
2. Taps "Record Violation" on a child
3. Adds optional description (e.g., "Played iPad without starting timer")
4. System automatically determines penalty based on violation count (1st = 2hrs, 2nd = 4hrs, 3rd = 8hrs, etc.)
5. Penalty is deducted from child's Time Bank (can go negative)
6. Child is notified: "⚠️ Violation recorded — 2 hours deducted"
7. Parent can reset violation count or forgive the last violation at any time

---

## 10. Third-Party Integrations (Future / Nice-to-Have)

- **Apple Screen Time API / Google Family Link** — sync with actual device screen time (if APIs allow)
- **Google Classroom / school LMS** — auto-detect homework completion
- **Alexa / Google Home** — "Hey Google, tell ScreenQuest I finished my chores"
- **Apple Watch / Wear OS** — quick approve/deny from parent's watch
- **Widget support** — iOS/Android home screen widgets showing Time Bank balance

---

## 11. Testing Requirements

- **Unit tests** for all business logic (time calculations, approval flows, plan limits, violation escalation, stacking expiry)
- **Integration tests** for API endpoints
- **E2E tests** for critical user flows (sign-up, create quest, earn time, play with persistent timer, consequence system)
- **Accessibility testing** — VoiceOver/TalkBack pass on all screens
- **Device testing** — test on at least 5 screen sizes (small phone, large phone, tablet)
- **Load testing** — support 10,000+ concurrent families

---

## 12. Deployment & DevOps

- **CI/CD:** GitHub Actions or Bitrise for automated builds and tests
- **App Store / Play Store:** Follow all guidelines, especially for kids' apps
  - Apple: Kids Category requirements
  - Google: Designed for Families program requirements
- **Backend hosting:** AWS (ECS/EKS or Lambda) or Google Cloud Run
- **Monitoring:** Sentry for crash reporting, Datadog or CloudWatch for backend monitoring
- **Analytics:** Privacy-friendly analytics (Mixpanel or PostHog, no third-party trackers in child UI)

---

## 13. Deliverables Expected

When building this app, provide:

1. **Complete folder/project structure** for frontend and backend
2. **All source code** with clean, commented, production-ready code
3. **Database schema/migrations**
4. **API documentation** (OpenAPI spec)
5. **UI component library** with the kid-friendly design system (colors, typography, spacing, components)
6. **Navigation setup** with all screens connected
7. **Authentication flow** (sign-up, login, email verification, password reset)
8. **State management** setup (Redux Toolkit, Zustand, or Riverpod depending on framework)
9. **Push notification** integration
10. **In-app purchase / subscription** integration (RevenueCat recommended)
11. **README** with setup instructions, environment variables, and deployment guide

---

## 14. Design Tokens / Style Guide

```
Colors:
  Primary:        #4A90D9 (friendly blue)
  Secondary:      #7ED321 (success green)
  Accent:         #F5A623 (warm orange)
  Fun Purple:     #9B59B6
  Background:     #F7F9FC (light gray-blue)
  Card BG:        #FFFFFF
  Text Primary:   #2C3E50
  Text Secondary: #7F8C8D
  Error:          #E74C3C

Typography (Child UI):
  Headings:  Rounded sans-serif (e.g., Nunito, Quicksand, or Baloo 2)
  Body:      16-18pt minimum for readability

Typography (Parent UI):
  Headings:  Clean sans-serif (e.g., Inter, SF Pro)
  Body:      14-16pt

Corner Radius:
  Cards:     16px
  Buttons:   24px (pill-shaped)
  Inputs:    12px

Shadows:
  Soft, colorful shadows (e.g., rgba(74, 144, 217, 0.15))

Spacing:
  Base unit:  8px grid system

Animations:
  Duration:   200-400ms
  Easing:     ease-in-out
  Style:      Bouncy, playful spring animations for child UI
```

---

## 15. Tone & Copy Guidelines

- **Child-facing text:** Simple words (age 6-12 reading level). Encouraging, never punishing. Use exclamation marks and emoji. Examples:
  - "You did it! ⭐"
  - "Almost there! Keep going! 💪"
  - "Time's up! Great job managing your time! 🌟"
  - Never: "Access Denied" or "Blocked" or "Violation"

- **Parent-facing text:** Clear, concise, helpful. Professional but warm.
  - "Timmy completed 'Clean room' — would you like to approve?"
  - "Weekly Report: Your kids earned 4.5 hours of screen time this week"

---

_Use this prompt in its entirety. Build all screens, all backend logic, all data models, and all flows described above. Prioritize a working MVP with: authentication, family management, quest CRUD (with 3-quest free limit), quest completion with approval, stackable/non-stackable time, Time Bank, Play with persistent background timer and full notification lifecycle, and the Consequences system. Gamification features (badges, streaks, levels) can be implemented as a fast follow._
