# Phase 17 — Remove Free Trial (Freemium IS the Trial)

## Rationale

The current app offers a **14-day free trial** of Premium via RevenueCat before requiring payment. However, the **Free tier already functions as a trial experience** — users can create a family, add up to 2 children, manage 5 active quests, and use the basic time bank. This gives parents enough functionality to evaluate ScreenQuest before deciding to upgrade.

Maintaining a separate "free trial" of Premium creates:

- **Confusion** — users don't understand the difference between "Free plan" and "Free Trial of Premium"
- **Churn risk** — users who trial Premium and lose features after 14 days feel a downgrade, leading to negative reviews
- **Complexity** — trial state management, reminder crons, grace periods, and webhook handling add unnecessary code paths
- **Inconsistency** — the web FAQ says 7-day trial while mobile says 14-day trial

**New model:** Users start on the Free plan. They can upgrade to Premium at any time via a simple "Upgrade to Premium" CTA — no trial period, no expiry countdown, no forced downgrade.

---

## Scope of Changes

### 1. Mobile App

#### PaywallScreen (`mobile/src/screens/parent/PaywallScreen.tsx`)

- **Remove** the conditional CTA text `"Start 14-Day Free Trial"` → replace with `"Subscribe Now"` or `"Upgrade to Premium"` (always)
- **Remove** fine print: `"Free trial for 14 days, then auto-renews. Cancel anytime."` → replace with `"Auto-renews monthly/yearly. Cancel anytime."`
- Remove any trial-specific copy or callouts on this screen

#### DashboardScreen (`mobile/src/screens/parent/DashboardScreen.tsx`)

- **Remove** the trial banner (`"Free Trial — X day(s) remaining"` around lines 176–188)
- Optionally replace with a subtle "Upgrade to Premium" banner for Free-tier users (non-dismissible or dismissible) — this is a softer upsell, not a countdown

#### Subscription Store (`mobile/src/store/subscription.ts`)

- **Remove** state fields: `isTrialing`, `trialDaysRemaining`
- Keep: `isActive`, `plan`, `gracePeriodEndsAt` (grace period is still useful for billing issues / cancellations)
- Update any derived state or selectors that reference trial fields

#### Subscription Service (`mobile/src/services/subscription.ts`)

- **Remove** `isTrialing` and `trialDaysRemaining` from the `SubscriptionStatus` interface
- Ensure `getSubscriptionStatus()` no longer expects or parses trial fields from the API response

#### usePremium Hook (`mobile/src/hooks/usePremium.ts`)

- **Remove** `isTrialing` and `trialDaysRemaining` from the exposed API
- Keep `isPremium`, `gracePeriodEndsAt`, `requirePremium()`

#### SettingsScreen (`mobile/src/screens/parent/SettingsScreen.tsx`)

- Remove any trial status display (e.g., "Trialing" label)
- Keep "Restore Purchases" functionality

#### QuestArchivalScreen (`mobile/src/screens/parent/QuestArchivalScreen.tsx`)

- Review and keep — post-expiry quest archival is still relevant for cancelled/expired subscriptions (not trial-specific)

---

### 2. Web App

#### Pricing Component (`web/src/components/pricing.tsx`)

- **Change** Premium plan CTA from `"Start Free Trial"` → `"Subscribe Now"` or `"Get Premium"`
- Optionally add a comparison table or feature highlights to motivate the upgrade

#### FAQ Component (`web/src/components/faq.tsx`)

- **Remove** or rewrite the FAQ entry: `"Yes! Premium comes with a 7-day free trial. No credit card required to start."`
- Replace with something like: `"ScreenQuest is free to use with core features. Upgrade to Premium anytime for unlimited quests, analytics, and more — no commitment required, cancel anytime."`

---

### 3. Backend

#### SubscriptionService (`backend/src/subscription/subscription.service.ts`)

- **Remove** trial-specific logic from `getSubscriptionStatus()`:
  - Remove `isTrialing` computation (`subscriptionStatus === 'trialing'`)
  - Remove `trialDaysRemaining` computation
- **Update** `handleWebhookEvent()` → `INITIAL_PURCHASE`:
  - Remove the `period_type === 'TRIAL'` branch that sets `subscriptionStatus: 'trialing'`
  - All initial purchases should set `subscriptionStatus: 'active'`
- Keep all other webhook handlers (RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE) as-is

#### SubscriptionScheduler (`backend/src/subscription/subscription.scheduler.ts`)

- **Remove** the `handleTrialReminders()` cron job entirely (the one that sends "Trial Ending Soon" and "Last Day of Trial!" notifications)
- Keep `handleGracePeriodExpiry()` — still needed for expired subscriptions

#### SubscriptionStatusDto (`backend/src/subscription/dto/subscription.dto.ts`)

- **Remove** `isTrialing: boolean` and `trialDaysRemaining: number | null` from the DTO
- Keep all other fields

#### Prisma Schema (`backend/prisma/schema.prisma`)

- **Remove** `'trialing'` as a valid conceptual value for `subscriptionStatus` (it's a `String?` field, so no enum migration needed — but add a comment documenting valid values: `'active' | 'cancelled' | 'expired' | 'billing_issue'`)
- **Create a data migration** to update any existing families with `subscriptionStatus: 'trialing'` → `'active'` (if they have a valid `subscriptionExpiresAt` in the future) or `'expired'` (if expired)

---

### 4. Shared Types

#### Family Types (`shared/src/types/family.ts`)

- No changes needed to `FamilyPlan` (`'free' | 'premium'`) or `SubscriptionPeriod` — these are still valid
- If a `SubscriptionStatus` type is ever added, exclude `'trialing'`

---

### 5. RevenueCat Dashboard Configuration

- **Remove** the free trial offer from both iOS and Android products in RevenueCat / App Store Connect / Google Play Console
- Ensure the subscription products are configured as **immediate paid subscriptions** (no introductory trial period)
- The webhook will no longer send `period_type: 'TRIAL'` events once the trial offer is removed

---

### 6. Notification Templates

- **Remove** or archive any email/push notification templates related to:
  - "Trial Ending Soon"
  - "Last Day of Trial!"
  - "Your trial has expired"
- Keep notifications for: billing issues, subscription expiry, grace period

---

## Migration Plan

1. **RevenueCat first** — Remove trial offers from App Store Connect / Google Play Console / RevenueCat dashboard so no new trials are created
2. **Backend deploy** — Deploy backend changes; existing `'trialing'` families continue to work (they're treated as `'active'` now)
3. **Data migration** — Run migration to flip `subscriptionStatus: 'trialing'` → `'active'` for all current trialing families
4. **Mobile + Web deploy** — Ship updated UI that no longer references trials

---

## Files to Modify (Summary)

| File                                                 | Action                                             |
| ---------------------------------------------------- | -------------------------------------------------- |
| `mobile/src/screens/parent/PaywallScreen.tsx`        | Remove trial CTA text & fine print                 |
| `mobile/src/screens/parent/DashboardScreen.tsx`      | Remove trial countdown banner                      |
| `mobile/src/store/subscription.ts`                   | Remove `isTrialing`, `trialDaysRemaining`          |
| `mobile/src/services/subscription.ts`                | Remove trial fields from interface                 |
| `mobile/src/hooks/usePremium.ts`                     | Remove trial-related exports                       |
| `mobile/src/screens/parent/SettingsScreen.tsx`       | Remove trial status display                        |
| `web/src/components/pricing.tsx`                     | Change CTA from "Start Free Trial" → "Get Premium" |
| `web/src/components/faq.tsx`                         | Rewrite trial FAQ answer                           |
| `backend/src/subscription/subscription.service.ts`   | Remove trial logic from status & webhook handler   |
| `backend/src/subscription/subscription.scheduler.ts` | Remove `handleTrialReminders()` cron               |
| `backend/src/subscription/dto/subscription.dto.ts`   | Remove trial fields from DTO                       |
| `backend/prisma/schema.prisma`                       | Document valid status values (no `'trialing'`)     |
| Notification templates (if any)                      | Remove trial reminder templates                    |

---

## Testing Checklist

- [ ] New user signs up → lands on Free plan → no trial language anywhere
- [ ] Free user taps "Upgrade to Premium" → PaywallScreen shows `"Subscribe Now"` with no trial mention
- [ ] Successful purchase → `subscriptionStatus` is `'active'` (not `'trialing'`)
- [ ] RevenueCat webhook `INITIAL_PURCHASE` without `period_type: 'TRIAL'` → handled correctly
- [ ] Dashboard does not show trial banner for any user state
- [ ] Existing trialing users (post-migration) show as active Premium
- [ ] Cancellation / expiry flow still works (grace period, quest archival)
- [ ] Web pricing page shows "Get Premium" with no trial mention
- [ ] Web FAQ no longer mentions free trial
- [ ] No trial reminder notifications are sent by the scheduler
- [ ] Settings screen shows correct subscription status (no "Trialing" label)

---

## Out of Scope

- Changing the Free tier feature limits (that's a separate product decision)
- Adding a new onboarding flow for Free users (nice-to-have, separate phase)
- Promotional/time-limited trial offers (can be re-added later via RevenueCat if needed)
