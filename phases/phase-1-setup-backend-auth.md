# ScreenQuest — Phase 1: Project Setup, Backend Foundation & Authentication

> **Context:** This is Phase 1 of building the ScreenQuest mobile app. Before starting, read the full spec in `screen-time-app-prompt.md` for complete context. This phase focuses on project scaffolding, backend API foundation, and the authentication system.

---

## What to Build in This Phase

### 1. Project Structure

Set up the complete monorepo or multi-repo structure:

```
screenquest/
├── mobile/                  # React Native (Expo) app
│   ├── src/
│   │   ├── components/      # Shared UI components
│   │   ├── screens/         # All screen components
│   │   ├── navigation/      # React Navigation setup
│   │   ├── services/        # API client, auth service
│   │   ├── store/           # State management (Zustand or Redux Toolkit)
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Helpers, constants
│   │   ├── theme/           # Design tokens, colors, typography
│   │   └── types/           # TypeScript types
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── models/          # Database models/entities
│   │   ├── routes/          # API route definitions
│   │   ├── middleware/       # Auth, validation, rate limiting
│   │   ├── services/        # Business logic
│   │   ├── config/          # Environment config
│   │   ├── migrations/      # Database migrations
│   │   └── utils/           # Helpers
│   ├── package.json
│   └── tsconfig.json
├── cms/                     # Quest Library CMS (Phase 8)
│   └── (placeholder)
├── shared/                  # Shared types/constants between mobile & backend
│   └── types/
├── docker-compose.yml       # PostgreSQL + Redis for local dev
└── README.md
```

### 2. Backend API Foundation

- **Framework:** NestJS (TypeScript) — preferred for its modularity and built-in decorators
- **Database:** PostgreSQL with TypeORM or Prisma
- **Cache:** Redis for sessions and caching
- **API style:** RESTful with OpenAPI/Swagger auto-generated docs
- **Environment config:** `.env` file with validation (database URL, JWT secrets, Firebase keys, etc.)
- Set up Docker Compose for local PostgreSQL + Redis

### 3. Database Schema — Auth-Related Tables Only

Create migrations for these tables (from the full spec):

```sql
-- Family table
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  family_code VARCHAR(8) UNIQUE NOT NULL,  -- for inviting members
  plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  subscription_expires_at TIMESTAMPTZ,
  subscription_period VARCHAR(10) CHECK (subscription_period IN ('monthly', 'yearly')),
  owner_id UUID,  -- FK added after users table
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  name VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500),
  role VARCHAR(20) NOT NULL CHECK (role IN ('parent', 'guardian', 'child')),
  family_id UUID REFERENCES families(id),
  pin VARCHAR(6),           -- for child accounts
  age INTEGER,              -- for children
  auth_provider VARCHAR(20) DEFAULT 'email',  -- email, google, apple
  auth_provider_id VARCHAR(255),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK back to families
ALTER TABLE families ADD CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES users(id);

-- Family invites
CREATE TABLE family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) NOT NULL,
  invited_by_user_id UUID REFERENCES users(id) NOT NULL,
  invite_email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'guardian',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh tokens
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  device_info VARCHAR(255),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Authentication System

Build these API endpoints:

**Auth endpoints:**
- `POST /api/auth/register` — email + password sign-up → create user → send verification email
- `POST /api/auth/login` — email + password login → return JWT access token + refresh token
- `POST /api/auth/google` — Google Sign-In (verify Google ID token → create/find user)
- `POST /api/auth/apple` — Apple Sign-In (verify Apple ID token → create/find user)
- `POST /api/auth/verify-email` — verify email with token from email link
- `POST /api/auth/forgot-password` — send password reset email
- `POST /api/auth/reset-password` — reset password with token
- `POST /api/auth/refresh` — exchange refresh token for new access token
- `POST /api/auth/logout` — invalidate refresh token
- `POST /api/auth/logout-all` — invalidate all refresh tokens for user (sign out all devices)

**Auth middleware:**
- JWT verification middleware for protected routes
- Role-based access control middleware (parent vs. guardian vs. child)
- Rate limiting on auth endpoints (prevent brute force)

**JWT structure:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "parent",
  "familyId": "family-uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```
- Access token: 15 min expiry
- Refresh token: 30 day expiry, stored in DB (revocable)

### 5. Family Account Creation

- After parent registers and verifies email:
  - `POST /api/families` — create a Family Account (auto-generate unique 8-char Family Code)
  - The creating user becomes the **owner**
- `GET /api/families/:id` — get family details (members, plan, etc.)
- `POST /api/families/join` — join family via Family Code
- `POST /api/families/invite` — send email invite to join family

### 6. Child Account Creation

- `POST /api/families/:id/children` — parent creates child profile
  - Name, age, avatar (required)
  - Email (optional, only for 13+)
  - PIN (for child login on shared devices)
- `POST /api/auth/child-login` — child logs in via email/username + password, or PIN
- `POST /api/auth/qr-login` — generate QR code on parent device → child scans to log in

### 7. Mobile App Foundation

- Initialize React Native project with Expo (TypeScript template)
- Set up React Navigation (stack + bottom tabs — structure only, placeholder screens)
- Set up state management (Zustand recommended)
- Create API client service (Axios with interceptors for JWT auto-refresh)
- Create auth context/store with:
  - `login()`, `register()`, `logout()`, `refreshToken()`
  - Persist tokens securely (expo-secure-store)
  - Auto-refresh logic
- Build these screens (functional, not yet styled):
  - **Welcome/Landing screen**
  - **Sign Up screen** (email + password, Google, Apple buttons)
  - **Login screen**
  - **Email Verification screen**
  - **Create Family screen** (name → generates Family Code)
  - **Add Child screen** (name, age, avatar, optional email)
  - **Placeholder Dashboard** (just shows "Welcome, {name}" and a logout button)

### 8. Security Baseline

- Password hashing with bcrypt (min 10 rounds)
- Input validation on all endpoints (class-validator or Joi)
- Helmet.js for HTTP headers
- CORS configuration
- Rate limiting (express-rate-limit)
- Environment variable validation on startup

---

## What NOT to Build Yet

- Quest CRUD (Phase 2)
- Quest completion flow (Phase 3)
- Timer / Play mode (Phase 4)
- Consequences system (Phase 5)
- Styled UI / kid-friendly design (Phase 6)
- Subscriptions / IAP (Phase 7)
- Quest Library CMS (Phase 8)
- Gamification (Phase 9)

---

## Done When

- [ ] Backend starts, connects to PostgreSQL + Redis
- [ ] All auth endpoints work (register, login, verify email, Google, Apple, refresh, logout)
- [ ] Protected routes reject unauthenticated/unauthorized requests
- [ ] Family can be created, joined via code, and members listed
- [ ] Child accounts can be created by parents
- [ ] Mobile app boots, navigates between auth screens, and communicates with backend
- [ ] Tokens stored securely on device, auto-refresh works
- [ ] Swagger docs are auto-generated at `/api/docs`
- [ ] Docker Compose runs the full local stack
- [ ] README has setup instructions
