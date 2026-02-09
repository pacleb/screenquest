# ScreenQuest — Phase 3: Quest Completion & Time Bank

> **Prerequisites:** Phase 2 complete (quests can be created, assigned to children, quest library seeded).
> **Context:** Read `screen-time-app-prompt.md` for full spec. This phase builds the child's quest completion flow and the Time Bank system.

---

## What to Build in This Phase

### 1. Quest Completion Database Table

```sql
CREATE TABLE quest_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID REFERENCES quests(id) NOT NULL,
  child_id UUID REFERENCES users(id) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  proof_image_url VARCHAR(500),
  approved_by_user_id UUID REFERENCES users(id),
  earned_minutes INTEGER NOT NULL,
  stacking_type VARCHAR(20) NOT NULL CHECK (stacking_type IN ('stackable', 'non_stackable')),
  expires_at TIMESTAMPTZ,  -- end of day for non-stackable; NULL for stackable
  parent_note TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- Time Bank
CREATE TABLE time_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES users(id) UNIQUE NOT NULL,
  stackable_balance_minutes INTEGER DEFAULT 0,
  non_stackable_balance_minutes INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Quest Completion API

**Child-facing endpoints:**
- `GET /api/children/:childId/quests` — list available quests for this child (only assigned, active, non-archived quests)
  - For recurring quests: check if already completed today/this week
  - Return quest details + whether it's available to complete now
- `POST /api/children/:childId/quests/:questId/complete` — child marks quest as done
  - Accept optional `proofImage` (multipart upload → S3/Firebase Storage)
  - If quest has `auto_approve = true`: immediately approve + credit Time Bank
  - If quest has `auto_approve = false`: set status to `pending`
  - Validate: quest is assigned to this child, quest is active, not already completed in this period (for recurring)
  - Return completion record with status

**Parent-facing endpoints:**
- `GET /api/families/:familyId/completions?status=pending` — list pending completions (approval queue)
- `PUT /api/completions/:completionId/approve` — approve completion
  - Credit earned minutes to child's Time Bank (stackable or non-stackable bucket)
  - If non-stackable: set `expires_at` to end of current day (11:59:59 PM in family's timezone)
- `PUT /api/completions/:completionId/deny` — deny completion with optional parent note
- `GET /api/children/:childId/completions` — full history of completions for a child

### 3. Time Bank API

- `GET /api/children/:childId/time-bank` — get current Time Bank balance
  - Returns: `{ stackableMinutes, nonStackableMinutes, totalMinutes }`
  - Before returning, **expire any non-stackable time** past its `expires_at`
- Time Bank is auto-created when a child is added to a family

**Non-stackable expiry logic (critical):**
- Run a check whenever Time Bank is queried
- Sum all approved, non-stackable quest completions where `expires_at > NOW()` → that's the non-stackable balance
- Alternatively, use a scheduled job (cron) that runs at midnight per timezone to zero out expired non-stackable balances
- Non-stackable time should be used FIRST when a child plays (since it expires — use it or lose it)

### 4. Photo Proof Upload

- `POST /api/uploads/proof` — upload proof photo
  - Accept image file (JPEG, PNG, max 5MB)
  - Store in S3/Firebase Storage in a private bucket
  - Generate signed URL for viewing (family members only)
  - Return the URL to attach to the quest completion
- Proof photos are only accessible to family members (validate on signed URL generation)

### 5. Mobile App — Child Quest Board

Build these screens (functional, basic styling):

**Child Home screen:**
- Time Bank display prominently at top
  - Show total balance large
  - Below it: "⏳ {X} min expires today" for non-stackable balance (if any)
- List of available quests below the Time Bank
- Big "PLAY" button (disabled for now — built in Phase 4)

**Quest Board screen:**
- Colorful quest cards in a scrollable list/grid
- Each card shows:
  - Quest icon + name
  - Reward: "30 min ⭐"
  - Stacking badge: "📦 Stackable" or "⏰ Today Only"
  - Category tag
  - Status: available / completed today / pending approval
- Tap card → Quest Detail screen

**Quest Detail screen:**
- Quest name, icon, full description
- Reward display
- Stacking type with explanation ("This time carries over!" or "Use it today or it's gone!")
- "I Did It!" button (large, prominent)
  - If requires proof: opens camera/photo picker first, then submits
  - Shows success message after submission
  - If auto-approve: shows celebration animation + Time Bank update
  - If pending: shows "Waiting for approval… 🎉" message

### 6. Mobile App — Parent Approval Queue

**Approval Queue screen:**
- List of pending quest completions as cards
- Each card shows: child name + avatar, quest name, time reward, timestamp
- If proof photo exists: thumbnail preview (tap to view full)
- Swipe right → approve (shows green check animation)
- Swipe left → deny (prompts for optional note)
- Tap card → full detail view
- Also support approve/deny from push notification (notification actions — the push notification infra is Phase 5, but build the approve/deny logic here)

---

## What NOT to Build Yet

- Play timer / countdown (Phase 4)
- Push notifications (Phase 5 — just build the data flow, notifications come later)
- Consequences system (Phase 5)
- Full kid-friendly UI design (Phase 6)
- Subscription checks on proof upload (Phase 7)
- CMS (Phase 8)
- Gamification (Phase 9)

---

## Done When

- [ ] Children can see their assigned quests
- [ ] Children can mark quests as "Done" (with or without proof photo)
- [ ] Auto-approve quests instantly credit Time Bank
- [ ] Pending quests appear in parent's approval queue
- [ ] Parents can approve or deny completions
- [ ] Approved completions credit the correct Time Bank bucket (stackable vs. non-stackable)
- [ ] Non-stackable time has expiry set to end of day
- [ ] Non-stackable expired time is correctly excluded from balance
- [ ] Time Bank API returns accurate balances
- [ ] Photo proof uploads work and are viewable by family members only
- [ ] Recurring quests correctly prevent duplicate completions within their period
- [ ] Mobile app has functional Child Home, Quest Board, Quest Detail, and Approval Queue screens
