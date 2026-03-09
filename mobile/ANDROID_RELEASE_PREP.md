# Android Release Prep (Non-Console)

This runbook covers all Android production tasks you can complete outside Google Play Console.

## 1. Secrets and local files

1. Ensure `mobile/.env.production` contains:

- `SENTRY_DSN`
- `REVENUECAT_GOOGLE_KEY`

Current repo status:
- Both keys exist as placeholders and still need real production values.

2. Ensure EAS build environment has:

- `SENTRY_AUTH_TOKEN`
- any API keys used by production build plugins

3. Ensure Android Firebase app config file exists at:

- `mobile/android/app/google-services.json`

Notes:

- The Play Console setup itself is handled separately.
- `google-service-account.json` is already configured for `eas submit` in `mobile/eas.json`.

## 2. Confirm release signing

Release signing is configured in `mobile/android/app/build.gradle` using:

- `SCREENQUEST_KEYSTORE_FILE`
- `SCREENQUEST_KEYSTORE_PASSWORD`
- `SCREENQUEST_KEY_ALIAS`
- `SCREENQUEST_KEY_PASSWORD`

If these are missing, release builds can fall back to debug signing. Set them in CI/EAS secrets before production build.

## 3. Policy-safe permission baseline

Android config has been tightened to avoid policy-risk permissions:

- Removed `READ_EXTERNAL_STORAGE`
- Removed `WRITE_EXTERNAL_STORAGE`
- Removed `SYSTEM_ALERT_WINDOW`

Verify current manifest before release:

```bash
cd /Users/jeromepacleb/Apps/screenquest
grep -n "uses-permission" mobile/android/app/src/main/AndroidManifest.xml
```

## 4. Pre-release quality gates

From repo root:

```bash
pnpm --filter mobile lint
pnpm --filter mobile typecheck
pnpm mobile:e2e:android:build && pnpm mobile:e2e:android
```

Optional backend checks used by mobile flows:

```bash
pnpm test
pnpm test:e2e
```

## 5. Build and submit from CLI

Internal validation build:

```bash
cd /Users/jeromepacleb/Apps/screenquest/mobile
eas build -p android --profile preview
eas submit -p android --profile preview
```

Production build:

```bash
cd /Users/jeromepacleb/Apps/screenquest/mobile
eas build -p android --profile production
eas submit -p android --profile production
```

## 6. Final smoke test checklist

Before rolling out widely:

- Install latest internal/production artifact from Play testing track
- Parent signup/login works
- Child login with family code works
- Quest create/complete/approve flow works
- Play timer request/approve/start/end works
- Push notifications arrive foreground/background/killed
- Subscription purchase and restore flow works (sandbox tester)
- Account deletion flow still works
- Privacy policy URL opens: `https://screenquest.restdayapps.com/privacy`
- Terms URL opens: `https://screenquest.restdayapps.com/terms`

## 7. Versioning and rollout safety

- `mobile/eas.json` production profile already auto-increments Android `versionCode`.
- Start with staged rollout and monitor Sentry after release.
