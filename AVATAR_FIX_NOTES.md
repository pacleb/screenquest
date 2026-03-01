# Avatar Change Fix — Investigation & Changes (March 1, 2026)

## Problem

"Change avatar doesn't work" — tapping the avatar on the child Home screen or choosing a new emoji on the AvatarCustomize screen was not working reliably.

## Root Causes Found

### 1. AnimatedHeader overlay blocking touches (PRIMARY)

**File:** `mobile/src/components/AnimatedHeader.tsx`

The `LinearGradient` and shimmer `Animated.View` are absolutely-positioned to cover the entire header. Without `pointerEvents="none"`, they intercept all touches **before** they reach the avatar `TouchableOpacity` underneath. This means tapping the avatar circle on the child Home screen did nothing — the navigation to AvatarCustomize never fired.

**Fix:** Added `pointerEvents="none"` to both the `LinearGradient` and the `Animated.View` shimmer overlay.

### 2. AvatarCustomize — saving state not reset on success

**File:** `mobile/src/screens/child/AvatarCustomizeScreen.tsx`

After a successful `updateAvatar()` call, `setSaving(null)` was never called before `navigation.goBack()`. The component unmounted with `saving` still set, meaning:

- The zustand store update may not have fully propagated to subscriber screens
- If the user navigated back quickly, the previous screen could still show the old avatar

**Fix:** Added `setSaving(null)` before `navigation.goBack()` on success.

### 3. AvatarCustomize — back button disabled during save

**File:** `mobile/src/screens/child/AvatarCustomizeScreen.tsx`

The back button had `disabled={!!saving}`, trapping the user if the API call was slow (e.g., Render cold start). This made the screen feel broken/frozen.

**Fix:** Removed `disabled={!!saving}` from the back button.

### 4. ChildDetailScreen — emoji avatar font size (minor/cosmetic)

**File:** `mobile/src/screens/parent/ChildDetailScreen.tsx`

The parent's ChildDetail screen showed the child's avatar emoji at the same font size as text initials (fontSize: 28). Emojis need a larger size to render properly in the circle.

**Fix:** Added conditional `fontSize: 40` when displaying an emoji avatar.

## Flow Overview (for future reference)

```
Child taps avatar → AnimatedHeader.onAvatarPress
  → navigation.navigate("AvatarCustomize")
    → AvatarCustomizeScreen renders emoji grid
      → User taps emoji → handleSelect(emoji)
        → authStore.updateAvatar(emoji)
          → authService.updateAvatar(emoji)
            → POST /api/auth/avatar { emoji }
              → AuthController.updateAvatar()
                → AuthService.updateAvatar(userId, emoji)
                  → prisma.user.update({ avatarUrl: emoji })
                  → returns sanitized user
          → store sets updated user
        → navigation.goBack()
```

## Key Files

| File                                                 | Role                                                  |
| ---------------------------------------------------- | ----------------------------------------------------- |
| `mobile/src/components/AnimatedHeader.tsx`           | Header with avatar circle + touch handler             |
| `mobile/src/screens/child/AvatarCustomizeScreen.tsx` | Emoji picker screen                                   |
| `mobile/src/store/auth.ts`                           | Zustand store with `updateAvatar` action              |
| `mobile/src/services/auth.ts`                        | API call: `POST /auth/avatar { emoji }`               |
| `backend/src/auth/auth.controller.ts`                | Endpoint: `@Post('avatar')` with `JwtAuthGuard`       |
| `backend/src/auth/auth.service.ts`                   | `updateAvatar()` — updates `avatarUrl` in DB          |
| `backend/src/auth/dto/auth.dto.ts`                   | `UpdateAvatarDto` — validates `emoji` string          |
| `mobile/src/navigation/ChildNavigator.tsx`           | Registers `AvatarCustomize` screen                    |
| `mobile/src/screens/child/ProfileScreen.tsx`         | "Choose Avatar" button → navigates to AvatarCustomize |
| `mobile/src/screens/child/HomeScreen.tsx`            | Passes `onAvatarPress` to AnimatedHeader              |
| `mobile/src/screens/parent/ChildDetailScreen.tsx`    | Shows child avatar on parent side                     |

## Things Already Verified Working

- Backend endpoint (`POST /api/auth/avatar`) is correctly guarded, validated, and updates DB
- `@SkipEmailVerification()` is on the entire AuthController — children can use it
- `@SkipThrottle()` is on the avatar endpoint — no rate-limit issues
- Zustand store correctly calls API and sets updated user
- Navigation types include `AvatarCustomize` route
- The `Avatar` component correctly renders emoji strings (non-http URLs)

## If Still Broken After TestFlight

Things to check next:

1. **Network logging** — Add `console.log` in `handleSelect` to confirm the function is even called
2. **API response** — Check if the backend returns the updated user with the new `avatarUrl`
3. **Token issues** — Verify the JWT token is being sent (check `api.ts` interceptor)
4. **Reanimated conflict** — The `Animated.View` shimmer may still intercept touches on some RN versions even with `pointerEvents="none"` — try wrapping the avatar `TouchableOpacity` in a higher `zIndex` view
5. **State persistence** — After avatar update, pull-to-refresh on Home to verify the server actually saved it
