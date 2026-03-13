# ScreenQuest — Phase 7: Subscriptions & In-App Purchases

> **Prerequisites:** Phases 1-6 complete (full app functional and styled).
> **Context:** Read `docs/spec/screen-time-app-prompt.md` section 6 for plan details. This phase adds the payment layer.

---

## What to Build in This Phase

### 1. RevenueCat Integration

Use **RevenueCat** as the subscription management layer (handles both Apple App Store and Google Play billing):

**Setup:**

- Create RevenueCat account and project
- Configure products in App Store Connect and Google Play Console:
  - `screenquest_plus_monthly` — $4.99/month
  - `screenquest_plus_yearly` — $39.99/year
- Configure entitlements in RevenueCat:
  - Entitlement: `premium` — granted by either product
- Install RevenueCat SDK: `react-native-purchases`

### 2. Backend Subscription Sync

**RevenueCat webhook → Backend:**

- Set up RevenueCat webhook endpoint: `POST /api/webhooks/revenuecat`
- Handle events:
  - `INITIAL_PURCHASE` → set family plan to `premium`, set `subscription_expires_at`
  - `RENEWAL` → update `subscription_expires_at`
  - `CANCELLATION` → keep premium active until `subscription_expires_at` (do NOT revoke immediately)
  - `EXPIRATION` → set family plan to `free`, handle quest archival logic
  - `BILLING_ISSUE` → flag for notification
- Verify webhook signature for security

**Subscription status API:**

- `GET /api/families/:familyId/subscription` — get current subscription status
  - Returns: plan, expiresAt, isActive, willRenew, period
- Backend checks `subscription_expires_at` to determine if premium features are available
  - Premium is active if `plan = 'premium' AND subscription_expires_at > NOW()`

### 3. Free Plan Enforcement

Now enforce all free-plan limits across the app:

**Quest limit (already partially done in Phase 2):**

- Free plan: max 3 active (non-archived) quests
- On premium expiration:
  - If parent has > 3 active quests, they are NOT deleted
  - Show a screen: "Your plan has changed to Free. You have {N} quests but the free plan allows 3. Please choose which 3 to keep active — the rest will be archived."
  - Until they choose, all quests remain functional (grace period of 7 days)
  - After 7 days: auto-archive the most recently created quests beyond 3

**Premium-only features — disable on free plan:**

- Photo proof uploads: hide the option, show "Premium" lock badge
- Full history: limit to 7-day history, show "Upgrade to see full history"
- Advanced scheduling (weekend rules, time-of-day restrictions): show simplified version
- Detailed reports: show basic stats, lock detailed charts with premium badge
- Quest marketplace: show with lock icons
- Multi-family: disable
- Data export: disable

### 4. Mobile App — Subscription Screens

**Paywall / Upgrade screen:**

- Triggered when user hits a premium feature or taps "Upgrade" in settings
- Design:
  - "Unlock ScreenQuest Plus! 🚀"
  - Feature comparison list (Free vs. Premium) with checkmarks
  - Prominent benefits: "Unlimited quests", "Photo proof", "Full history", "Reports"
  - Pricing toggle: Monthly ($4.99) | Yearly ($39.99 — "Save 33%!")
  - "Start 14-Day Free Trial" button (for first-time)
  - "Subscribe" button (for returning)
  - Fine print: subscription terms, cancel anytime, auto-renews
  - Restore purchases link
- Show this screen:
  - When parent tries to create 4th quest on free plan
  - When parent taps a premium-locked feature
  - From Settings → "Manage Subscription"

**Subscription Management screen (in Settings):**

- Current plan display
- If premium: expiration date, renewal status, "Manage on App Store/Play Store" link
- If free: "Upgrade to Premium" button
- Restore purchases button
- If cancelled but not expired: "Your premium access is active until {date}"

### 5. Free Trial

- 14-day free trial of Premium for all new sign-ups
- RevenueCat handles trial logic automatically
- Show trial badge in app: "Free Trial — {X} days remaining"
- Send push notification 3 days before trial ends: "Your ScreenQuest trial ends in 3 days — subscribe to keep unlimited quests!"
- Send push notification on last day: "Last day of your free trial! Subscribe now to keep your premium features"

### 6. In-App Purchases (Cosmetic Packs)

**Avatar cosmetic packs:**

- Non-consumable IAPs: $0.99–$2.99 each
- Products:
  - `avatar_pack_space` — space-themed accessories ($1.99)
  - `avatar_pack_animals` — animal costumes ($1.99)
  - `avatar_pack_sports` — sports gear ($0.99)
  - `avatar_pack_fantasy` — wizard/fairy costumes ($2.99)
- Track purchases per user
- Show in Avatar/Profile screen: locked packs with preview + price

### 7. App Store Compliance

**Apple:**

- Subscription terms in app and on purchase screen
- "Restore Purchases" button accessible
- Subscription management links to iOS Settings
- Privacy nutrition labels updated
- Kids Category compliance (no third-party analytics in child UI)

**Google:**

- Designed for Families program compliance
- Subscription disclosure text
- Teacher Approved badge application (if applicable)

---

## Done When

- [ ] RevenueCat SDK integrated and configured
- [ ] Monthly and yearly subscription products created in App Store Connect and Google Play
- [ ] Purchasing flow works on both iOS and Android
- [ ] 14-day free trial works for new users
- [ ] RevenueCat webhook updates backend subscription status in real-time
- [ ] Cancellation keeps premium until billing period ends
- [ ] Post-expiration quest archival flow works (choose 3 to keep)
- [ ] All premium features properly gated with upgrade prompts
- [ ] Paywall screen is polished and converts
- [ ] Subscription management screen shows correct status
- [ ] Restore purchases works
- [ ] Cosmetic avatar packs purchasable
- [ ] Trial expiration notifications send on schedule
- [ ] App Store and Play Store billing compliance met
