# ScreenQuest — Phase 5: Consequences System & Push Notifications

> **Prerequisites:** Phase 4 complete (play timer working, server-side scheduling in place).
> **Context:** Read `docs/spec/screen-time-app-prompt.md` for full spec. This phase adds the violation/consequences system and wires up all push notifications across the entire app.

---

## What to Build in This Phase

### 1. Violations Database Table

```sql
CREATE TABLE violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES users(id) NOT NULL,
  recorded_by_user_id UUID REFERENCES users(id) NOT NULL,
  violation_number INTEGER NOT NULL,  -- 1st, 2nd, 3rd, etc.
  penalty_minutes INTEGER NOT NULL,   -- 120, 240, 480, 960, etc.
  description TEXT,
  forgiven BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track violation count per child (can also be computed, but this is useful for resets)
CREATE TABLE violation_counters (
  child_id UUID REFERENCES users(id) PRIMARY KEY,
  current_count INTEGER DEFAULT 0,
  last_reset_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Consequences API

**Parent endpoints:**

- `POST /api/children/:childId/violations` — record a violation
  - Input: `{ description?: string }`
  - Auto-determine violation number from counter
  - Auto-calculate penalty: `2 * (2 ^ (violationNumber - 1))` hours → converted to minutes (1st=120, 2nd=240, 3rd=480, etc.)
  - Deduct penalty from Time Bank (balance CAN go negative)
  - Increment violation counter
  - Return: violation record with penalty details
- `GET /api/children/:childId/violations` — list all violations for a child (history)
- `POST /api/children/:childId/violations/reset` — reset violation counter to 0
- `PUT /api/violations/:violationId/forgive` — forgive/undo a specific violation
  - Set `forgiven = true`
  - Refund the penalty minutes back to Time Bank
  - Decrement violation counter
- `GET /api/children/:childId/violation-status` — get current violation count and next penalty level
  - Returns: `{ currentCount: 2, nextPenaltyHours: 8, nextPenaltyMinutes: 480 }`

**Child-visible endpoint:**

- `GET /api/children/:childId/violation-status` — child can see their own violation count and current level (non-scary formatting handled by frontend)

### 3. Time Bank Negative Balance Logic

Update Time Bank logic (from Phase 3):

- Time Bank `stackable_balance_minutes` can now go **negative**
- When balance is negative:
  - Child CANNOT request play time
  - Play button shows: "Earn {X} more minutes to play!"
  - As child completes quests, earned time goes toward clearing the debt first
- Update the play session request validation to check `totalBalance > 0`

### 4. Push Notification Infrastructure

**Set up Firebase Cloud Messaging (FCM):**

**Backend:**

- Install Firebase Admin SDK
- Create notification service with methods:
  ```typescript
  sendToUser(userId, { title, body, data });
  sendToFamily(familyId, { title, body, data });
  sendToParents(familyId, { title, body, data });
  ```
- Store device push tokens:
  ```sql
  CREATE TABLE push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    token VARCHAR(500) NOT NULL,
    platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, token)
  );
  ```
- `POST /api/users/:userId/push-token` — register device push token
- `DELETE /api/users/:userId/push-token` — unregister on logout

**Mobile app:**

- Set up `expo-notifications` (or `@react-native-firebase/messaging`)
- Request notification permissions on first login
- Register push token with backend
- Handle incoming notifications (foreground + background + killed state)
- Handle notification tap → navigate to relevant screen

### 5. Wire Up ALL Notifications

Now connect every event in the app to a push notification:

**Quest completions (from Phase 3):**

- Child completes quest → notify all parents: "{Child} completed '{Quest}' — Approve?"
  - Notification action buttons: Approve | Deny
- Parent approves → notify child: "Quest approved! +{X} minutes ⭐"
- Parent denies → notify child: "Quest not approved. {Parent note if any}"

**Play sessions (from Phase 4):**

- Child requests play → notify parents: "{Child} wants to play for {X} minutes — Approve?"
  - Notification action buttons: Approve | Deny
- Play session started → notify parents: "{Child} started playing ({X} minutes)"
- Play session paused → notify parents: "{Child} paused play time"
- Play session resumed → notify parents: "{Child} resumed play time"
- Play session stopped (by child) → notify parents: "{Child} stopped playing ({X} min remaining, refunded)"
- Play session stopped (by parent) → notify child: "Play time ended by parent"
- 5-min warning → notify child: "5 minutes left! ⏰"
- 1-min warning → notify child: "1 minute left! Almost done! 💪"
- Time's up → notify child: "Time's up! Great job managing your time! 🌟"
- Time's up → notify parents: "{Child} play session ended"

**Violations (this phase):**

- Violation recorded → notify child: "⚠️ Violation recorded — {X} hours deducted"
- Violation forgiven → notify child: "Violation forgiven! {X} hours restored ✨"
- Violation count reset → notify child: "Fresh start! Violation count reset 🎉"

**Encouragement (optional daily):**

- Daily reminder → notify child: "You have {X} quests available today! 🌟"
- Streak at risk → notify child: "Complete a quest today to keep your streak! 🔥"

**Notification action handling:**

- When parent taps "Approve" on a quest completion notification → call approve API directly
- When parent taps "Deny" → open app to detail screen for adding a note
- When parent taps "Approve" on a play request → call approve API directly

### 6. Notification Preferences (Parent Settings)

```sql
CREATE TABLE notification_preferences (
  user_id UUID REFERENCES users(id) PRIMARY KEY,
  quest_completions BOOLEAN DEFAULT TRUE,
  play_requests BOOLEAN DEFAULT TRUE,
  play_state_changes BOOLEAN DEFAULT TRUE,
  violations BOOLEAN DEFAULT TRUE,
  daily_summary BOOLEAN DEFAULT TRUE,
  weekly_summary BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- `GET /api/users/:userId/notification-preferences`
- `PUT /api/users/:userId/notification-preferences`
- Check preferences before sending each notification

### 7. Mobile App Screens

**Consequences screen (Parent):**

- Per-child violation summary card:
  - Current violation count
  - "Next penalty: {X} hours"
  - "Record Violation" button
  - "Reset Count" button (with confirmation dialog)
- Violation history list (newest first):
  - Date, description, penalty, forgiven status
  - Swipe to forgive (with confirmation)
- Empty state: "No violations yet — great job! 🎉"

**Violation status display (Child):**

- On child Home screen, show a subtle (non-scary) indicator if violations exist:
  - "⚠️ 1 strike" with small text: "Keep up the good work to stay on track!"
  - NOT: "VIOLATION! YOU ARE IN TROUBLE!"

---

## What NOT to Build Yet

- Full kid-friendly UI polish (Phase 6)
- Subscription enforcement (Phase 7)
- CMS (Phase 8)
- Gamification (Phase 9)

---

## Done When

- [ ] Violations can be recorded with auto-escalating penalties (2h, 4h, 8h, 16h, ...)
- [ ] Time Bank correctly goes negative when penalty exceeds balance
- [ ] Negative Time Bank prevents play requests
- [ ] Violations can be forgiven (refunds penalty, decrements counter)
- [ ] Violation counter can be reset by parent
- [ ] Push notifications deliver on iOS and Android (foreground + background + killed)
- [ ] ALL events trigger the correct push notifications (quests, play, violations)
- [ ] Notification action buttons work (approve/deny from notification)
- [ ] Notification preferences are respected
- [ ] Push tokens are registered/unregistered correctly
- [ ] Consequences screen is functional for parents
- [ ] Violation indicator shows on child Home screen
- [ ] Server-side timer notifications (5-min, 1-min, time's up) deliver even when app is closed
