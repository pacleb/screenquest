# ScreenQuest — Phase 10b: Security Hardening

> **Prerequisites:** Phase 10 complete. Must be done **before Phase 11**.
> **Priority:** HIGH — Several findings are exploitable in the current codebase.
> **Goal:** Fix all CRITICAL and HIGH security vulnerabilities, and address key MEDIUM findings before adding more features.

---

## AI Prompt

You are a senior security engineer. Implement ALL of the following security fixes in the ScreenQuest codebase at `/Users/jeromepacleb/Apps/screenquest`. Each fix includes the finding, affected files, and the exact remediation. Apply all changes, then rebuild the backend and confirm it compiles. Do NOT skip any fix. After implementing, run `pnpm test` to ensure nothing breaks.

---

## Fixes to Implement

### Fix 1 — CRITICAL: Hash Child PINs with bcrypt

**Finding:** Child PINs are stored as plaintext in the database and compared directly in Prisma `where` clauses. Anyone with DB read access can see all PINs.

**Files to change:**

- `backend/src/family/family.service.ts` — where child accounts are created and PINs are set
- `backend/src/auth/auth.service.ts` — `childLogin` method where PINs are compared

**Remediation:**

1. In `family.service.ts`, hash the PIN before storing:

```typescript
import * as bcrypt from "bcrypt";

// When creating a child account or setting a PIN:
const hashedPin = await bcrypt.hash(dto.pin, 10);
// Store hashedPin instead of dto.pin
```

2. In `auth.service.ts` `childLogin()`, change the lookup to find the child by family code + name only (not PIN), then compare the PIN separately:

```typescript
async childLogin(dto: ChildLoginDto) {
  // Step 1: Find the family by code
  const family = await this.prisma.family.findFirst({
    where: { familyCode: dto.familyCode },
  });
  if (!family) throw new UnauthorizedException('Invalid credentials');

  // Step 2: Find the child by name + family (without PIN in the query)
  const child = await this.prisma.user.findFirst({
    where: {
      familyId: family.id,
      name: dto.name,
      role: 'child',
    },
  });
  if (!child || !child.pin) throw new UnauthorizedException('Invalid credentials');

  // Step 3: Compare PIN with bcrypt
  const pinValid = await bcrypt.compare(dto.pin, child.pin);
  if (!pinValid) throw new UnauthorizedException('Invalid credentials');

  // Step 4: Generate tokens as before
  return this.generateTokens(child);
}
```

3. Create a one-time migration script to hash all existing plaintext PINs:

```typescript
// backend/prisma/hash-existing-pins.ts
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

async function hashPins() {
  const prisma = new PrismaClient();
  const children = await prisma.user.findMany({
    where: { role: "child", pin: { not: null } },
  });
  for (const child of children) {
    // Skip if already hashed (bcrypt hashes start with $2b$)
    if (child.pin?.startsWith("$2b$")) continue;
    const hashed = await bcrypt.hash(child.pin!, 10);
    await prisma.user.update({
      where: { id: child.id },
      data: { pin: hashed },
    });
  }
  console.log(`Hashed ${children.length} PINs`);
  await prisma.$disconnect();
}
hashPins();
```

---

### Fix 2 — HIGH: Fix `req.user.sub` → `req.user.id` Mismatch

**Finding:** The JWT strategy returns `{ id: user.id, ... }` but notification and violation controllers reference `req.user.sub`, which is always `undefined`. Authorization checks silently fail.

**Files to change:**

- `backend/src/notification/notification.controller.ts`
- `backend/src/violation/violation.controller.ts`

**Remediation:**

Replace every instance of `req.user.sub` with `req.user.id` in both controllers:

```typescript
// Before (broken):
const userId = req.user.sub;

// After (fixed):
const userId = req.user.id;
```

Also in `notification.controller.ts`, change the error response to throw a proper exception:

```typescript
// Before (returns 200 with error body):
if (req.user.sub !== userId) {
  return { error: "Access denied" };
}

// After (proper 403):
if (req.user.id !== userId) {
  throw new ForbiddenException("Access denied");
}
```

Import `ForbiddenException` from `@nestjs/common`.

---

### Fix 3 — HIGH: Enable Rate Limiting Globally

**Finding:** `ThrottlerModule` is configured in `app.module.ts` but `ThrottlerGuard` is never registered as `APP_GUARD`. All `@Throttle()` decorators are completely non-functional. Login, register, and child-login have zero rate limiting.

**Files to change:**

- `backend/src/app.module.ts`

**Remediation:**

Add `ThrottlerGuard` as a global guard provider:

```typescript
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";

@Module({
  // ... existing config
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

This activates all existing `@Throttle()` decorators on auth endpoints. Verify that the `ThrottlerModule.forRoot()` config has sensible defaults (e.g., 60 requests per 60 seconds globally, with stricter limits on auth endpoints via `@Throttle()`).

Also add `@SkipThrottle()` on the health check endpoint so monitoring isn't rate-limited.

---

### Fix 4 — HIGH: Add Account Lockout on Failed Login

**Finding:** No tracking of failed login attempts. Combined with previously broken rate limiting, attackers could brute-force passwords and PINs without limit.

**Files to change:**

- `backend/src/auth/auth.service.ts`

**Remediation:**

Use Redis to track failed attempts per email/family-code:

```typescript
// In auth.service.ts
private async checkLoginAttempts(key: string): Promise<void> {
  const attempts = await this.redis.get(`login_attempts:${key}`);
  if (attempts && parseInt(attempts) >= 5) {
    const ttl = await this.redis.ttl(`login_attempts:${key}`);
    throw new UnauthorizedException(
      `Too many failed attempts. Try again in ${Math.ceil(ttl / 60)} minutes.`,
    );
  }
}

private async recordFailedAttempt(key: string): Promise<void> {
  const attemptsKey = `login_attempts:${key}`;
  const current = await this.redis.incr(attemptsKey);
  if (current === 1) {
    await this.redis.expire(attemptsKey, 900); // 15-minute lockout window
  }
}

private async clearLoginAttempts(key: string): Promise<void> {
  await this.redis.del(`login_attempts:${key}`);
}
```

In the `login()` method:

```typescript
async login(dto: LoginDto) {
  await this.checkLoginAttempts(dto.email);

  const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
  if (!user || !user.passwordHash) {
    await this.recordFailedAttempt(dto.email);
    throw new UnauthorizedException('Invalid credentials');
  }

  const valid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!valid) {
    await this.recordFailedAttempt(dto.email);
    throw new UnauthorizedException('Invalid credentials');
  }

  await this.clearLoginAttempts(dto.email);
  return this.generateTokens(user);
}
```

Apply the same pattern in `childLogin()` using the family code as the lockout key.

---

### Fix 5 — HIGH: Add Ownership Checks to Subscription Endpoints

**Finding:** Any authenticated user can read/modify any family's subscription and any user's avatar packs. No ownership validation.

**Files to change:**

- `backend/src/subscription/subscription.controller.ts`

**Remediation:**

Add family membership verification to each endpoint:

```typescript
@Get('families/:familyId/subscription')
@UseGuards(JwtAuthGuard)
async getSubscription(@Param('familyId') familyId: string, @Req() req) {
  // Verify the requesting user belongs to this family
  if (req.user.familyId !== familyId) {
    throw new ForbiddenException('Access denied');
  }
  return this.subscriptionService.getSubscription(familyId);
}

@Post('families/:familyId/subscription/archive-quests')
@UseGuards(JwtAuthGuard)
async archiveExcessQuests(@Param('familyId') familyId: string, @Req() req) {
  if (req.user.familyId !== familyId) {
    throw new ForbiddenException('Access denied');
  }
  return this.subscriptionService.archiveExcessQuests(familyId);
}

@Get('users/:userId/avatar-packs')
@UseGuards(JwtAuthGuard)
async getAvatarPacks(@Param('userId') userId: string, @Req() req) {
  if (req.user.id !== userId) {
    throw new ForbiddenException('Access denied');
  }
  return this.subscriptionService.getAvatarPacks(userId);
}

@Post('users/:userId/avatar-packs')
@UseGuards(JwtAuthGuard)
async recordAvatarPackPurchase(@Param('userId') userId: string, @Req() req, @Body() body) {
  if (req.user.id !== userId) {
    throw new ForbiddenException('Access denied');
  }
  return this.subscriptionService.recordAvatarPackPurchase(userId, body.packId);
}
```

---

### Fix 6 — HIGH: Add Authorization to User Profile Endpoint

**Finding:** `GET /users/:id` returns any user's profile with no ownership or family membership check.

**Files to change:**

- `backend/src/user/user.controller.ts`

**Remediation:**

Restrict access so users can only view their own profile or profiles of members in the same family:

```typescript
@Get(':id')
@UseGuards(JwtAuthGuard)
async findOne(@Param('id') id: string, @Req() req) {
  // Allow viewing own profile
  if (req.user.id === id) {
    return this.userService.findById(id);
  }

  // Allow viewing family members' profiles
  const targetUser = await this.userService.findById(id);
  if (!targetUser || targetUser.familyId !== req.user.familyId) {
    throw new ForbiddenException('Access denied');
  }

  return targetUser;
}
```

---

### Fix 7 — HIGH: Make Webhook Auth Key Mandatory in Production

**Finding:** If `REVENUECAT_WEBHOOK_AUTH_KEY` env var is not set, the webhook accepts ALL requests without authentication. Attackers could forge premium subscriptions.

**Files to change:**

- `backend/src/subscription/subscription.controller.ts`
- `backend/src/main.ts` (optional: startup validation)

**Remediation:**

Option A — Fail-closed on missing key:

```typescript
@Post('webhooks/revenuecat')
async handleWebhook(@Req() req, @Body() body: RevenueCatWebhookEvent) {
  const webhookAuthKey = this.configService.get('REVENUECAT_WEBHOOK_AUTH_KEY');

  // ALWAYS verify — reject if key is not configured
  if (!webhookAuthKey) {
    throw new InternalServerErrorException('Webhook auth key not configured');
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${webhookAuthKey}`) {
    throw new UnauthorizedException('Invalid webhook signature');
  }

  return this.subscriptionService.handleWebhookEvent(body);
}
```

Option B — Also validate at startup (add to `main.ts`):

```typescript
// In bootstrap()
if (
  process.env.NODE_ENV === "production" &&
  !process.env.REVENUECAT_WEBHOOK_AUTH_KEY
) {
  throw new Error("REVENUECAT_WEBHOOK_AUTH_KEY is required in production");
}
```

---

### Fix 8 — MEDIUM: Protect Uploaded Files Behind Authentication

**Finding:** `app.useStaticAssets('uploads', { prefix: '/uploads' })` serves all proof photos publicly. Anyone who guesses a filename can access photos of children.

**Files to change:**

- `backend/src/main.ts` — remove static asset serving for uploads
- `backend/src/upload/upload.controller.ts` — add authenticated file retrieval endpoint

**Remediation:**

1. Remove the static asset line from `main.ts`:

```typescript
// REMOVE this line:
// app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
```

2. Add an authenticated endpoint to serve files:

```typescript
// In upload.controller.ts
@Get('uploads/proofs/:filename')
@UseGuards(JwtAuthGuard)
async getProofFile(
  @Param('filename') filename: string,
  @Req() req,
  @Res() res: Response,
) {
  // Sanitize filename to prevent path traversal
  const sanitized = path.basename(filename);
  const filePath = path.join(process.cwd(), 'uploads', 'proofs', sanitized);

  if (!fs.existsSync(filePath)) {
    throw new NotFoundException('File not found');
  }

  // Verify the requesting user has access (belongs to the same family)
  // Look up which quest completion this proof belongs to and check family membership
  // For now, at minimum restrict to authenticated users
  res.sendFile(filePath);
}
```

3. Long-term: migrate to S3/R2 with signed URLs (covered in Phase 15).

---

### Fix 9 — MEDIUM: Disable Swagger in Production

**Finding:** Swagger docs are exposed unconditionally, revealing full API structure in production.

**Files to change:**

- `backend/src/main.ts`

**Remediation:**

Wrap Swagger setup in an environment check:

```typescript
if (process.env.NODE_ENV !== "production") {
  const config = new DocumentBuilder()
    .setTitle("ScreenQuest API")
    .setDescription("API docs")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);
}
```

---

### Fix 10 — MEDIUM: Remove Debug Logging from JWT Strategy

**Finding:** `console.log` in the JWT strategy logs JWT payloads (user IDs, emails, roles) to stdout on every authenticated request.

**Files to change:**

- `backend/src/auth/strategies/jwt.strategy.ts`

**Remediation:**

Remove or guard the debug log:

```typescript
// REMOVE this line:
// console.log('[JWT] validate payload.sub:', payload.sub, ...);

// Or guard it:
if (process.env.NODE_ENV === "development") {
  this.logger.debug(`JWT validate: ${payload.sub}`);
}
```

---

### Fix 11 — MEDIUM: Validate File Upload Magic Bytes

**Finding:** File upload only checks client-supplied MIME type, which can be spoofed. Malicious files could be uploaded with a fake `image/jpeg` content type.

**Files to change:**

- `backend/src/upload/upload.controller.ts`

**Remediation:**

After Multer saves the file, validate magic bytes:

```typescript
import { fileTypeFromFile } from "file-type";

// After upload, verify actual file type
const fileInfo = await fileTypeFromFile(file.path);
const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/heic"];

if (!fileInfo || !allowedMimes.includes(fileInfo.mime)) {
  // Delete the uploaded file
  fs.unlinkSync(file.path);
  throw new BadRequestException("Invalid file type. Only images are allowed.");
}
```

Install the package: `pnpm add file-type`

---

### Fix 12 — MEDIUM: HTML-Escape User Input in Email Templates

**Finding:** User-provided names are interpolated directly into HTML email templates, allowing HTML injection.

**Files to change:**

- `backend/src/mail/templates.ts`

**Remediation:**

Add an escape helper and use it on all user-provided values:

```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Use in templates:
`Welcome, ${escapeHtml(data.name)}! 👋``${escapeHtml(data.inviterName)} invited you to join...`;
```

---

### Fix 13 — MEDIUM: Hide Member Emails from Children

**Finding:** `getMembers()` returns email addresses for all family members, meaning children can see parent/guardian emails.

**Files to change:**

- `backend/src/family/family.service.ts`

**Remediation:**

Conditionally exclude emails when the requesting user is a child:

```typescript
async getMembers(familyId: string, requestingUserRole?: string) {
  const members = await this.prisma.user.findMany({
    where: { familyId },
    select: {
      id: true,
      name: true,
      role: true,
      email: requestingUserRole !== 'child', // Only include email for parent/guardian
      avatarUrl: true,
      level: true,
      xp: true,
    },
  });
  return members;
}
```

Update the controller to pass `req.user.role` to the service method.

---

### Fix 14 — MEDIUM: Add Webhook Idempotency

**Finding:** Webhook events are processed without checking for duplicates. Replayed events could cause unintended state changes.

**Files to change:**

- `backend/src/subscription/subscription.service.ts`

**Remediation:**

Track processed webhook event IDs in Redis:

```typescript
async handleWebhookEvent(event: RevenueCatWebhookEvent) {
  const eventId = event.event?.id;
  if (eventId) {
    const alreadyProcessed = await this.redis.get(`webhook:${eventId}`);
    if (alreadyProcessed) {
      return { status: 'already_processed' };
    }
  }

  // ... process the event ...

  // Mark as processed (expire after 7 days)
  if (eventId) {
    await this.redis.set(`webhook:${eventId}`, '1', 'EX', 604800);
  }

  return { status: 'processed' };
}
```

---

## Implementation Order

| Step | Fix                                         | Severity | Effort |
| ---- | ------------------------------------------- | -------- | ------ |
| 1    | Fix 3 — Enable rate limiting globally       | HIGH     | 15 min |
| 2    | Fix 2 — Fix `req.user.sub` → `req.user.id`  | HIGH     | 15 min |
| 3    | Fix 1 — Hash child PINs                     | CRITICAL | 30 min |
| 4    | Fix 4 — Account lockout                     | HIGH     | 30 min |
| 5    | Fix 5 — Subscription ownership checks       | HIGH     | 20 min |
| 6    | Fix 6 — User profile authorization          | HIGH     | 15 min |
| 7    | Fix 7 — Mandatory webhook auth key          | HIGH     | 15 min |
| 8    | Fix 10 — Remove debug logging               | MEDIUM   | 5 min  |
| 9    | Fix 9 — Disable Swagger in production       | MEDIUM   | 5 min  |
| 10   | Fix 8 — Authenticated file serving          | MEDIUM   | 30 min |
| 11   | Fix 12 — HTML-escape email templates        | MEDIUM   | 15 min |
| 12   | Fix 11 — File upload magic bytes validation | MEDIUM   | 20 min |
| 13   | Fix 13 — Hide emails from children          | MEDIUM   | 15 min |
| 14   | Fix 14 — Webhook idempotency                | MEDIUM   | 20 min |

**Total estimated effort: ~4 hours**

---

## Tests to Write

### Unit Tests (`backend/src/auth/auth.service.spec.ts`)

- **PIN hashing:** child creation stores a bcrypt hash (not plaintext), `childLogin` compares with `bcrypt.compare`
- **Account lockout:** after 5 failed logins, 6th attempt throws `UnauthorizedException` with lockout message
- **Lockout expiry:** after 15 minutes, login attempts are allowed again
- **Lockout clear on success:** successful login resets the attempt counter
- **Child PIN lockout:** same lockout logic applies to `childLogin` using family code as key

### Unit Tests (`backend/src/subscription/subscription.service.spec.ts`)

- **Webhook idempotency:** processing the same event ID twice returns `already_processed` on the second call
- **Webhook without auth key configured:** throws `InternalServerErrorException`
- **Webhook with wrong auth header:** throws `UnauthorizedException`

### Integration Tests (`backend/test/security.e2e-spec.ts`)

- **Rate limiting:** send 11+ requests to `POST /auth/login` within the throttle window → expect 429
- **Subscription ownership:** user A cannot `GET /families/:familyB/subscription` → expect 403
- **Avatar pack ownership:** user A cannot `GET /users/:userB/avatar-packs` → expect 403
- **User profile authorization:** user A cannot `GET /users/:userB` (different family) → expect 403
- **User profile same family:** user A can `GET /users/:userB` (same family) → expect 200
- **Child PIN brute-force:** 5 wrong PINs → 6th attempt returns lockout error
- **Webhook forgery:** `POST /webhooks/revenuecat` without auth header → expect 401
- **File access:** `GET /uploads/proofs/:filename` without auth → expect 401
- **Swagger in production:** `GET /api/docs` with `NODE_ENV=production` → expect 404

### Unit Tests (`backend/src/mail/templates.spec.ts`)

- **HTML escaping:** name containing `<script>` is escaped to `&lt;script&gt;` in email output

### Unit Tests (`backend/src/family/family.service.spec.ts`)

- **Email hiding:** `getMembers` called with `role: 'child'` does not include `email` fields
- **Email visible:** `getMembers` called with `role: 'parent'` includes `email` fields

---

## Done When

- [ ] Child PINs are bcrypt-hashed in the database (run migration script for existing PINs)
- [ ] `req.user.sub` replaced with `req.user.id` in all controllers; proper HTTP exceptions thrown
- [ ] `ThrottlerGuard` registered as `APP_GUARD` — rate limiting is functional
- [ ] Failed login tracking with account lockout (5 attempts → 15-min lockout)
- [ ] All subscription endpoints verify family/user ownership
- [ ] User profile endpoint restricts access to self or family members
- [ ] Webhook auth key required (fail-closed if absent)
- [ ] Uploaded files served via authenticated endpoint (not public static)
- [ ] Swagger docs disabled in production
- [ ] Debug `console.log` removed from JWT strategy
- [ ] File uploads validated by magic bytes, not just MIME type
- [ ] Email templates HTML-escape user input
- [ ] Family member emails hidden from child users
- [ ] Webhook events deduplicated via Redis
- [ ] Backend compiles and all existing tests pass
