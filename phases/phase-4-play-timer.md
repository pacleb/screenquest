# ScreenQuest — Phase 4: Persistent Play Timer

> **Prerequisites:** Phase 3 complete (Time Bank working, quest completions crediting balances).
> **Context:** Read `docs/spec/screen-time-app-prompt.md` for full spec. This is the most technically complex phase — the Play timer must persist even when the app is closed.

---

## What to Build in This Phase

### 1. Play Session Database Table

```sql
CREATE TABLE play_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES users(id) NOT NULL,
  requested_minutes INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'denied', 'active', 'paused', 'completed', 'stopped', 'cancelled')),
  approved_by_user_id UUID REFERENCES users(id),
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  total_paused_seconds INTEGER DEFAULT 0,
  ended_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Play Session API

**Child endpoints:**

- `POST /api/children/:childId/play` — request play session
  - Input: `{ requestedMinutes: number }`
  - Validate:
    - Child has enough Time Bank balance (stackable + non_stackable >= requested)
    - No other active/paused play session exists for this child
    - Current time is within allowed play hours (per parent settings)
    - Daily screen time cap not exceeded
    - Time Bank is not negative (violation debt must be cleared first)
  - If parent setting = "auto-start": immediately set status to `active`, deduct from Time Bank, set `started_at`
  - If parent setting = "require approval": set status to `requested`
  - **Deduction priority:** Use non-stackable time FIRST (since it expires), then stackable
- `POST /api/play-sessions/:sessionId/pause` — pause active session
  - Set `paused_at = NOW()`, status = `paused`
- `POST /api/play-sessions/:sessionId/resume` — resume paused session
  - Add pause duration to `total_paused_seconds`, clear `paused_at`, status = `active`
- `POST /api/play-sessions/:sessionId/stop` — child stops session early
  - Calculate remaining unused time → **refund** to Time Bank
  - Set `ended_at = NOW()`, status = `stopped`
- `GET /api/play-sessions/:sessionId` — get session details (including computed remaining time)
- `GET /api/children/:childId/play/active` — get current active/paused session (if any)

**Parent endpoints:**

- `PUT /api/play-sessions/:sessionId/approve` — approve play request
- `PUT /api/play-sessions/:sessionId/deny` — deny play request (refund time)
- `POST /api/play-sessions/:sessionId/extend` — add more time to active session (deduct from Time Bank)
- `POST /api/play-sessions/:sessionId/end` — parent force-ends session (refund remaining)

### 3. Server-Side Timer (Source of Truth)

The **server** is the authoritative source for timer state. The client displays a countdown based on server data and syncs periodically.

**Remaining time calculation (server-side):**

```
IF status = 'active':
  elapsed = NOW() - started_at - total_paused_seconds
  remaining = (requested_minutes * 60) - elapsed

IF status = 'paused':
  elapsed = paused_at - started_at - total_paused_seconds
  remaining = (requested_minutes * 60) - elapsed
```

**Server-side timer completion detection:**

- Use a **scheduled job** (cron or Bull queue) that checks for active sessions where remaining time <= 0
- When a session's time runs out:
  1. Set status = `completed`, `ended_at = NOW()`
  2. Trigger push notification to child: "Time's up! Great job managing your time! 🌟"
  3. Trigger push notification to parent: "{Child} play session ended"
- Run this job frequently (every 30 seconds) for accuracy
- Also schedule individual timers: when a session starts, schedule a job for exactly `requested_minutes` later

**Warning notifications (server-side scheduled):**

- When session starts, schedule two server-side jobs:
  - Job 1: At `started_at + requested_minutes - 5 min` → push notification: "5 minutes left!"
  - Job 2: At `started_at + requested_minutes - 1 min` → push notification: "1 minute left!"
- If session is paused, reschedule these jobs accounting for paused time
- If session is stopped/ended early, cancel pending jobs

### 4. Mobile App — Background Timer Persistence

**The timer must work even when the app is closed.** Strategy:

**Approach: Server-driven + local countdown display**

1. When session starts, client receives `started_at`, `requestedMinutes`, and `status` from API
2. Client calculates remaining time locally and displays countdown
3. Client syncs with server every 30-60 seconds (via REST call) to correct any drift
4. **Even if app is killed, the server tracks the timer** — on next app open, client fetches current session state and resumes the correct countdown
5. All warning/completion notifications are sent **server-side via push notifications** — they arrive regardless of app state

**Platform-specific enhancements:**

- **iOS:** Use `UNNotificationRequest` to schedule local notifications as backup (5-min warning, 1-min warning, time's up) — in case push is delayed
- **Android:** Use a **Foreground Service** with persistent notification showing remaining time in the notification tray — countdown updates in real-time even when app is backgrounded

**Client sync flow on app open:**

```
1. Call GET /api/children/:childId/play/active
2. If active session exists:
   a. Calculate remaining time from server data
   b. Display countdown timer
   c. Start local countdown interval
   d. Sync with server every 60 seconds
3. If no active session:
   a. Show normal Home screen
```

### 5. Mobile App — Play Screen

**Play Request screen:**

- Big "PLAY" button (animated, inviting)
- Time selector:
  - Preset buttons: 15m, 30m, 45m, 1h, 1.5h, 2h
  - Custom slider for other durations
  - Show: "Available: {balance}" above selector
  - Disable amounts exceeding balance
- "Start Playing!" confirmation button
- If approval required: show "Request sent! Waiting for approval… ⏳" state

**Active Timer screen:**

- Large countdown display (fun, visual — circular progress, filling/draining animation)
- Time remaining in large friendly numbers
- Pause button (⏸️)
- Stop button ("I'm Done!" — with confirmation dialog)
- When paused: show "⏸️ Paused" state with Resume button
- Gentle pulsing animation at 5 minutes remaining
- At 0: celebration/encouragement screen

### 6. Parent Settings for Play

Add to the child settings API (`PUT /api/children/:childId/settings`):

```json
{
  "playApprovalMode": "require_approval" | "notify_only",
  "dailyScreenTimeCap": 120,           // max minutes per day, null = unlimited
  "allowedPlayHoursStart": "08:00",     // no play before this time
  "allowedPlayHoursEnd": "20:00",       // no play after this time
  "weekendRules": {
    "dailyScreenTimeCap": 180,
    "allowedPlayHoursStart": "09:00",
    "allowedPlayHoursEnd": "21:00"
  }
}
```

Validate these constraints when a play session is requested.

---

## What NOT to Build Yet

- Push notification infrastructure (Phase 5 — use console.log/placeholders for now, but build the trigger points)
- Consequences system (Phase 5)
- Kid-friendly UI design polish (Phase 6)
- Subscription enforcement (Phase 7)
- CMS (Phase 8)
- Gamification (Phase 9)

---

## Done When

- [ ] Play sessions can be requested, approved/denied, started, paused, resumed, stopped
- [ ] Server correctly calculates remaining time accounting for pauses
- [ ] Time is deducted from Time Bank on play start (non-stackable first)
- [ ] Unused time is refunded when session is stopped early
- [ ] Server-side scheduled jobs detect session completion and trigger notification placeholders
- [ ] Server-side scheduled jobs fire at 5-min and 1-min warnings
- [ ] Parent can extend or force-end sessions remotely
- [ ] Play hours restrictions and daily caps are enforced
- [ ] Weekend vs. weekday rules work correctly
- [ ] Mobile app shows countdown timer using server state
- [ ] On app reopen, timer syncs with server and shows correct remaining time
- [ ] Android Foreground Service shows timer in notification tray
- [ ] iOS schedules local backup notifications for warnings
- [ ] Multiple simultaneous play sessions per child are prevented
- [ ] Negative Time Bank (violation debt) prevents play requests
