# ScreenQuest — Phase 8: Quest Library CMS (Web App)

> **Prerequisites:** Phases 1-7 complete (mobile app fully functional with subscriptions).
> **Context:** Read `screen-time-app-prompt.md` section 10.5 for full CMS spec. This is a simple admin web app for managing the built-in Quest Library.

---

## What to Build in This Phase

### 1. CMS Project Setup

```
screenquest/
├── cms/                        # New — Quest Library CMS
│   ├── src/
│   │   ├── app/                # Next.js app router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx        # Dashboard
│   │   │   ├── login/
│   │   │   ├── quests/
│   │   │   │   ├── page.tsx    # Quest list
│   │   │   │   ├── new/
│   │   │   │   └── [id]/
│   │   │   └── categories/
│   │   ├── components/         # UI components
│   │   ├── lib/                # API client, auth helpers
│   │   └── types/
│   ├── package.json
│   ├── next.config.js
│   └── tailwind.config.js
├── backend/                    # Existing — add admin routes
└── mobile/                     # Existing
```

**Tech stack:**
- **Next.js 14+** (App Router, TypeScript)
- **Tailwind CSS** for styling (simple admin UI — no need for kid-friendly design)
- **shadcn/ui** components (tables, forms, dialogs, toasts)
- Uses the **same backend API** as the mobile app (add admin-only routes)

### 2. Admin Authentication

- Admin role in the backend (extend users table or use a separate flag):
  ```sql
  ALTER TABLE users ADD COLUMN is_app_admin BOOLEAN DEFAULT FALSE;
  ```
- Only `is_app_admin = true` users can access CMS routes
- CMS login page: email + password → JWT (same auth system as mobile)
- Add admin auth middleware to protect all `/api/admin/*` routes

### 3. Backend — Admin API Routes

Add these routes (all require `is_app_admin` auth):

**Quest Library CRUD:**
- `GET /api/admin/quest-library` — list all library quests (published + drafts, with pagination)
- `GET /api/admin/quest-library/:id` — get single quest details
- `POST /api/admin/quest-library` — create library quest
- `PUT /api/admin/quest-library/:id` — update library quest
- `DELETE /api/admin/quest-library/:id` — delete library quest (soft delete)
- `PUT /api/admin/quest-library/:id/publish` — publish a draft quest
- `PUT /api/admin/quest-library/:id/unpublish` — unpublish a quest (hide from parents)
- `PUT /api/admin/quest-library/reorder` — reorder quests (accept array of IDs with sort_order)

**Category Management:**
- `GET /api/admin/categories` — list categories
- `POST /api/admin/categories` — create category
- `PUT /api/admin/categories/:id` — update category
- `DELETE /api/admin/categories/:id` — delete category (only if no quests use it)
- `PUT /api/admin/categories/reorder` — reorder categories

**Bulk Operations:**
- `POST /api/admin/quest-library/bulk-import` — CSV upload
  - Accept CSV with columns: name, description, icon, category, suggested_reward_minutes, suggested_stacking_type, age_range
  - Validate all rows, return errors for invalid rows
  - Create quests in draft status (admin publishes after review)

**Usage Stats:**
- `GET /api/admin/quest-library/stats` — aggregated usage data
  - For each library quest: how many families have added it, total completions
  - Most popular / least popular quests
  - Categories by usage

### 4. CMS Pages

**Login page:**
- Simple email + password form
- "ScreenQuest Admin" branding
- Error handling for invalid credentials

**Dashboard page (/):**
- Total library quests count (published / drafts)
- Total categories
- Top 5 most-used library quests
- Quick actions: "Add Quest", "Import CSV", "View All"

**Quest Library page (/quests):**
- Data table with columns: Icon, Name, Category, Reward, Stacking, Age Range, Status (Published/Draft), Usage Count
- Sortable columns
- Filters: category, status, age range, stacking type
- Search by name
- Row actions: Edit, Publish/Unpublish, Delete
- Drag-to-reorder (within categories)
- "Add Quest" button
- "Bulk Import" button

**Create/Edit Quest page (/quests/new, /quests/[id]):**
- Form fields:
  - Name (text input)
  - Description (textarea)
  - Icon/Emoji picker
  - Category (dropdown — from categories table)
  - Suggested reward minutes (number input with preset buttons: 15, 30, 45, 60, 90, 120)
  - Suggested stacking type (toggle: Stackable / Non-Stackable)
  - Age range (dropdown: Ages 4-7, Ages 8-12, All Ages)
- Preview card: live preview of how the quest will appear in the mobile app
- Save as Draft / Publish buttons
- Delete button (edit mode only)

**Categories page (/categories):**
- List of categories with icon, name, quest count
- Drag-to-reorder
- Add/edit/delete categories
- Inline editing

**Bulk Import page (/quests/import):**
- File upload (CSV only)
- Template download link (empty CSV with correct headers)
- Preview table after upload showing parsed data
- Validation results: green rows (valid), red rows (errors with explanation)
- "Import All Valid" button
- Results summary after import

### 5. CMS Deployment

- Deploy CMS to **Vercel** (free tier works for admin-only usage)
- Or serve from the same server as the backend
- Environment variables: API URL, admin credentials
- No public access — protect behind auth
- Optional: restrict access by IP or add 2FA

---

## Done When

- [ ] CMS project scaffolded with Next.js + Tailwind + shadcn/ui
- [ ] Admin auth works (login, protected routes, admin-only middleware)
- [ ] Quest Library CRUD fully functional (create, edit, delete, publish/unpublish)
- [ ] Categories manageable (CRUD + reorder)
- [ ] Drag-to-reorder works for quests and categories
- [ ] Bulk CSV import works with validation and preview
- [ ] Live preview card shows how quest appears in mobile app
- [ ] Usage stats show which quests are most popular
- [ ] Changes in CMS are immediately reflected in mobile app's Quest Library
- [ ] CMS deployed and accessible (admin only)
- [ ] Mobile app's Quest Library API returns quests ordered and filtered correctly
