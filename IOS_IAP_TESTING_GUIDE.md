# Testing iOS In-App Purchases (RevenueCat + StoreKit)

## Prerequisites

1. **Apple Developer Account** (paid, $99/yr)
2. **Physical iOS device** — IAP does **not** work on the iOS Simulator
3. **App registered in App Store Connect** with bundle ID `com.screenquest.app`
4. **RevenueCat account** with your Apple API key set as `REVENUECAT_APPLE_KEY`

---

## Step 1: Configure Products in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → your app → **Monetization → Subscriptions**
2. Create a **Subscription Group** (e.g., "ScreenQuest Plus")
3. Add two auto-renewable subscriptions:
   - **Product ID:** `screenquest_plus_monthly` — $4.99/month
   - **Product ID:** `screenquest_plus_yearly` — $39.99/year
4. For avatar packs, go to **Monetization → In-App Purchases** and create non-consumables:
   - `avatar_pack_space`, `avatar_pack_animals`, `avatar_pack_sports`, `avatar_pack_fantasy`
5. Set each product's status to **Ready to Submit** (fill in display name, description, screenshot)

---

## Step 2: Configure RevenueCat

1. In the [RevenueCat dashboard](https://app.revenuecat.com):
   - Create a project and add an **Apple App Store** app with bundle ID `com.screenquest.app`
   - Upload your **App Store Connect API Key** (Keys → In-App Purchase) under **Service Credentials**
   - Create **Products** matching your App Store Connect product IDs
   - Create an **Entitlement** called `premium` and attach the two subscription products
   - Create an **Offering** (default) with Monthly and Annual packages
2. Copy your **Apple API Key** from RevenueCat → Project Settings → API Keys
3. Set it in your environment:
   ```bash
   # In your .env or EAS secrets
   REVENUECAT_APPLE_KEY=appl_xxxxxxxxxxxxxxx
   ```

---

## Step 3: Create Sandbox Test Accounts

1. In [App Store Connect](https://appstoreconnect.apple.com) → **Users and Access → Sandbox → Test Accounts**
2. Click **+** to create a Sandbox Apple ID (use a real email you can verify)
3. Set the **Storefront** to your country
4. Set **Subscription renewal rate** — sandbox accelerates renewal times:

   | Real Duration | Sandbox Duration |
   |---|---|
   | 1 week | 3 minutes |
   | 1 month | 5 minutes |
   | 1 year | 1 hour |

---

## Step 4: Build for Physical Device

You need a **development-device** build (not simulator):

```bash
cd mobile

# Build for physical iOS device
eas build --profile development-device --platform ios
```

Once the build completes, install it on your device via:
- Scanning the QR code from the EAS build page, or
- Using `eas device:create` to register your device first if not already registered

---

## Step 5: Sign In with Sandbox Account on Device

1. On your **iPhone**, go to **Settings → App Store**
2. Scroll down and tap **Sandbox Account**
3. Sign in with the Sandbox Apple ID you created in Step 3
4. **Do NOT** sign out of your real Apple ID — sandbox is a separate sign-in

> On iOS 16+, sandbox accounts are managed separately from your main Apple ID.

---

## Step 6: Test the Purchase Flow

1. Launch the dev build on your device
2. Log in as a **parent** user
3. Navigate to the **Paywall screen** (trigger any premium-gated feature or go to settings)
4. The paywall (`mobile/src/screens/parent/PaywallScreen.tsx`) will load offerings from RevenueCat
5. Select Monthly or Yearly → tap **"Upgrade to Premium"**
6. The App Store sandbox payment sheet will appear — confirm with your sandbox account
7. The purchase completes → RevenueCat processes it → your app checks the `premium` entitlement

---

## Step 7: Test the Webhook (Backend)

RevenueCat sends webhook events to your backend at `POST /webhooks/revenuecat`. For local testing:

1. Use **ngrok** or similar to expose your local backend:
   ```bash
   ngrok http 3000
   ```
2. In RevenueCat dashboard → **Project Settings → Webhooks**, set the URL to:
   ```
   https://your-ngrok-url.ngrok.io/webhooks/revenuecat
   ```
3. Set the **Authorization header** to match your `REVENUECAT_WEBHOOK_AUTH_KEY` env var
4. When you make a sandbox purchase, RevenueCat will fire an `INITIAL_PURCHASE` event to your backend
5. Your backend (`backend/src/subscription/subscription.service.ts`) will update the family's `plan` to `premium`

---

## Step 8: Test Key Scenarios

| Scenario | How to Test |
|---|---|
| **New purchase** | Buy a subscription on the paywall |
| **Restore purchases** | Tap "Restore Purchases" on the paywall |
| **Cancellation** | Settings → Apple ID → Subscriptions → Cancel (sandbox) |
| **Renewal** | Wait 5 min (monthly) in sandbox — auto-renews up to 6 times |
| **Expiration** | Cancel and wait for the sandbox period to expire |
| **Billing issue** | Use a sandbox account with payment issues (RevenueCat can simulate this) |
| **Grace period** | After expiration, verify the 7-day grace period logic activates |
| **Quest archiving** | Expire a premium family with >3 quests, verify archive prompt |
| **Avatar pack purchase** | Navigate to avatar customization and buy a pack |

---

## Debugging Tips

- **RevenueCat Dashboard → Customers**: Search by your family ID to see purchase history, entitlements, and events in real-time
- **Sandbox purchases don't charge real money** — all transactions are free
- **If offerings don't load**: Check that your RevenueCat products are linked to the correct App Store product IDs and that your **Paid Applications agreement** is active in App Store Connect
- **Webhook not firing?** Check RevenueCat → Webhooks → Event History for delivery status and errors
- **Sandbox renewal**: Subscriptions auto-renew up to **6 times** in sandbox, then expire automatically
- Check the `environment` field in webhook payloads — sandbox events have `environment: 'SANDBOX'`

---

## Optional: StoreKit Configuration File (Local Testing)

For faster iteration without needing App Store Connect products to be fully configured, you can create a **StoreKit Configuration File**:

1. In Xcode, go to **File → New → File → StoreKit Configuration File**
2. Add your subscription group and products matching the IDs above
3. In your Xcode scheme → **Run → Options → StoreKit Configuration**, select the file
4. This lets you test purchases entirely locally without sandbox accounts

However, this only works for Xcode-launched builds, not EAS builds. It's useful for UI iteration but **always validate with real sandbox testing** before submitting.

---

## Key Files Reference

| File | Purpose |
|---|---|
| `mobile/src/services/subscription.ts` | RevenueCat init, purchase, restore, entitlement check |
| `mobile/src/store/subscription.ts` | Zustand store for subscription state |
| `mobile/src/hooks/usePremium.ts` | Premium gate hook |
| `mobile/src/screens/parent/PaywallScreen.tsx` | Paywall UI |
| `mobile/src/services/avatarPacks.ts` | Avatar pack product IDs and purchase logic |
| `backend/src/subscription/subscription.controller.ts` | Webhook endpoint and subscription API |
| `backend/src/subscription/subscription.service.ts` | Webhook event handling, plan updates |
| `backend/src/subscription/subscription.scheduler.ts` | Daily cron for auto-archiving quests |
