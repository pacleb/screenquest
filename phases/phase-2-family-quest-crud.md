# ScreenQuest — Phase 2: Family Management & Quest CRUD

> **Prerequisites:** Phase 1 complete (backend running, auth working, family creation working).
> **Context:** Read `docs/spec/screen-time-app-prompt.md` for full spec. This phase adds family management features and the Quest system (parent-side CRUD only — child completion is Phase 3).

---

## What to Build in This Phase

### 1. Family Management API

**Endpoints:**

- `GET /api/families/:id/members` — list all family members with roles
- `PUT /api/families/:id` — update family name/settings (owner only)
- `PUT /api/families/:id/members/:userId/role` — promote/demote guardian (owner only)
- `DELETE /api/families/:id/members/:userId` — remove a member (owner only)
- `POST /api/families/:id/transfer-ownership` — transfer owner role to another parent (owner only)
- `PUT /api/families/:id/children/:childId` — edit child profile (name, age, avatar)
- `DELETE /api/families/:id/children/:childId` — remove child (owner/guardian)

**Guardian permissions:**

- Owner can configure what guardians can/cannot do (e.g., can approve quests but can't remove members)
- Add a `guardian_permissions` JSONB column or separate table

### 2. Quest Database Tables

Create migrations:

```sql
-- Quest Library (built-in quests managed via CMS)
CREATE TABLE quest_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(50) NOT NULL,
  suggested_reward_minutes INTEGER NOT NULL,
  suggested_stacking_type VARCHAR(20) DEFAULT 'stackable' CHECK (suggested_stacking_type IN ('stackable', 'non_stackable')),
  age_range VARCHAR(20),  -- e.g., 'ages_4_7', 'ages_8_12', 'all'
  is_published BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family Quests (quests assigned by parents)
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) NOT NULL,
  created_by_user_id UUID REFERENCES users(id) NOT NULL,
  library_quest_id UUID REFERENCES quest_library(id),  -- NULL if custom
  name VARCHAR(200) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT '⭐',
  category VARCHAR(50) NOT NULL,
  reward_minutes INTEGER NOT NULL,
  stacking_type VARCHAR(20) NOT NULL CHECK (stacking_type IN ('stackable', 'non_stackable')),
  recurrence VARCHAR(20) DEFAULT 'one_time' CHECK (recurrence IN ('one_time', 'daily', 'weekly', 'custom')),
  recurrence_days JSONB,  -- e.g., ["mon", "wed", "fri"]
  requires_proof BOOLEAN DEFAULT FALSE,
  auto_approve BOOLEAN DEFAULT FALSE,
  bonus_multiplier FLOAT DEFAULT 1.0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quest assignments (which children a quest is assigned to)
CREATE TABLE quest_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES users(id) NOT NULL,
  UNIQUE(quest_id, child_id)
);
```

### 3. Quest CRUD API

**Endpoints:**

- `POST /api/families/:familyId/quests` — create a quest (from scratch or from library)
  - Enforce **3-quest limit** for free plan (count active, non-archived quests)
  - Return `402 Payment Required` with message if limit reached
- `GET /api/families/:familyId/quests` — list all quests (with filters: category, archived, assigned child)
- `GET /api/families/:familyId/quests/:questId` — get quest details
- `PUT /api/families/:familyId/quests/:questId` — update quest
- `DELETE /api/families/:familyId/quests/:questId` — delete quest
- `POST /api/families/:familyId/quests/:questId/archive` — archive quest
- `POST /api/families/:familyId/quests/:questId/unarchive` — unarchive quest

**Quest Library API (read-only for parents):**

- `GET /api/quest-library` — list all published library quests (grouped by category)
- `GET /api/quest-library/:id` — get library quest details
- `POST /api/families/:familyId/quests/from-library/:libraryQuestId` — add a library quest to the family (pre-fills fields, parent sets reward + stacking + assigns children)

**Business logic:**

- Free plan: max 3 active quests — check on create and unarchive
- Quest must be assigned to at least one child
- Validate: reward_minutes must be > 0 and in valid increments (15, 30, 45, 60, 90, 120, or custom)
- Validate: category must be one of the allowed values
- Only parent/guardian roles can manage quests
- Archiving doesn't count against the 3-quest limit

### 4. Mobile App — Parent Quest Management Screens

Build these screens (functional, basic styling — full design polish is Phase 6):

**Quest Manager screen:**

- List of all family quests grouped by category
- Each quest card shows: name, icon, reward time, stacking type badge, assigned children
- "+" button to create new quest
- Tap card → edit quest
- Swipe left to archive/delete
- Filter tabs: All, Active, Archived
- Show "3/3 quests used" counter for free plan with upgrade prompt

**Create/Edit Quest screen:**

- Two tabs at top: "Custom Quest" | "Quest Library"
- **Custom Quest tab:**
  - Name input
  - Icon/emoji picker
  - Category selector (chips/dropdown)
  - Reward time picker (preset buttons: 15m, 30m, 45m, 1h, 1.5h, 2h + custom input)
  - Stacking type toggle: Stackable / Non-Stackable (with explanation text)
  - Recurrence selector: One-time, Daily, Weekly, Custom (day picker)
  - Assign to children (multi-select list of family's children)
  - Toggle: Requires proof
  - Toggle: Auto-approve
  - Save button
- **Quest Library tab:**
  - Scrollable list of library quests grouped by category
  - Each card shows: name, icon, category, suggested reward, age range
  - Tap to select → goes to customization screen (pre-filled, parent adjusts reward/stacking/assignment)

**Family Management screen:**

- List of all family members with role badges
- Family Code display with "Copy" and "Share" buttons
- "Invite Parent/Guardian" button
- Tap member → view/edit options (promote, demote, remove — based on permissions)
- "Add Child" button

### 5. Seed Data

Create a seed script that populates the Quest Library with 20-30 starter quests:

```
Chores:        Clean your room, Make your bed, Help with dishes, Take out trash, Fold laundry, Set the table
Studying:      Do math homework, Do reading homework, Practice spelling, Study for test, Complete worksheet
Reading:       Read for 30 minutes, Read a chapter, Visit the library
Exercise:      Play outside for 30 minutes, Ride your bike, Practice a sport, Do stretching/yoga
Creative:      Practice piano/instrument, Draw or paint, Build something, Write a story
Helping Others: Help a sibling, Help a neighbor, Do a kind deed
```

Each with an appropriate icon, category, suggested reward (15-60 min), stacking type, and age range.

---

## What NOT to Build Yet

- Quest completion by children (Phase 3)
- Time Bank (Phase 3)
- Play timer (Phase 4)
- Consequences (Phase 5)
- Kid-friendly UI polish (Phase 6)
- Subscription enforcement / IAP (Phase 7 — just check plan field for now)
- CMS for quest library (Phase 8 — seed data manually for now)

---

## Done When

- [ ] Family members can be listed, roles changed, members removed
- [ ] Guardian permissions are configurable by owner
- [ ] Quest CRUD endpoints all work with proper validation
- [ ] Free plan 3-quest limit is enforced on the API
- [ ] Quest Library returns seeded quests
- [ ] Parents can add library quests to their family with customization
- [ ] Mobile app has functional Quest Manager and Create/Edit Quest screens
- [ ] Mobile app has functional Family Management screen
- [ ] Quest assignments to children work correctly
- [ ] Archiving/unarchiving respects free plan limits
