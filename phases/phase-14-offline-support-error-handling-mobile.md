# ScreenQuest — Phase 14: Offline Support & Mobile Error Handling

> **Prerequisites:** Phases 1–13 complete.
> **Source:** Extracted from Phase 10 sections 7.2 (Mobile Error Handling) and 8 (Offline Support).
> **Goal:** Add robust mobile error handling, offline caching, and queued action support.

---

## What to Build in This Phase

### 1. Mobile Error Handling (Section 7.2)

- **Global error boundary** — catches JS crashes, shows "Something went wrong" screen with "Retry" and "Report" buttons
- **Network error interceptor** (Axios) — on 401: auto-refresh token; on 5xx: show retry toast; on network error: show offline banner
- **Offline indicator** — persistent banner when device has no connectivity
- **Retry logic** — automatic retry with exponential backoff for failed API calls (max 3 retries)
- **Offline queue** — queue quest completions and play requests when offline, submit when connectivity returns (with conflict resolution)

### 2. Cached Data — Available Offline (Section 8.1)

- Child's quest list (cached on last fetch)
- Time Bank balance (cached, shown with "last updated" timestamp)
- Achievement/badge list
- Family member list

### 3. Queued Actions — Submitted When Online (Section 8.2)

- Quest completion ("I Did It!") — queued locally, submitted on reconnect
- If proof photo required: photo saved locally, uploaded on reconnect

### 4. Not Available Offline (Section 8.3)

- Play timer (requires server as source of truth — show "Connect to internet to play")
- Approval actions (parent must be online)
- Real-time session state

### 5. Implementation (Section 8.4)

- Use **MMKV** or **AsyncStorage** for local caching
- Show clear "Offline" indicator with last-sync timestamp
- Stale data markers: "Updated 5 minutes ago" → "Updated 2 hours ago ⚠️"

---

## Tests to Write

### Mobile Unit Tests (Jest + React Native Testing Library)

**Error Boundary (`mobile/src/components/__tests__/ErrorBoundary.test.tsx`):**

- Renders children normally when no error
- Catches JS error and displays "Something went wrong" screen
- "Retry" button re-renders children
- "Report" button triggers error reporting service

**Network Interceptor (`mobile/src/services/__tests__/api.test.ts`):**

- On 401 response: triggers token refresh and retries original request
- On 401 with expired refresh token: redirects to login
- On 5xx response: retries up to 3 times with exponential backoff
- On network error: queues the request for offline processing
- Shows offline banner when `NetInfo` reports no connectivity

**Offline Queue (`mobile/src/services/__tests__/offlineQueue.test.ts`):**

- Quest completion action is persisted to local storage when offline
- Queued actions are submitted in order when connectivity returns
- Duplicate actions are deduplicated (same quest + timestamp)
- Conflict resolution: server response takes precedence if data diverges
- Queue is cleared after successful submission

**Cached Data (`mobile/src/hooks/__tests__/useOfflineCache.test.ts`):**

- Quest list is cached on successful fetch
- Cached quest list is returned when offline (with "last updated" timestamp)
- Time Bank balance is cached with staleness indicator
- Cache invalidation occurs on successful fresh fetch

---

## Done When

- [ ] Global error boundary catches JS crashes with recovery UI
- [ ] Network errors show appropriate toast/banner feedback
- [ ] Offline indicator appears when device loses connectivity
- [ ] Quest list, time bank balance, achievements, and family members cached locally
- [ ] Quest completions queued offline and submitted on reconnect
- [ ] "Connect to internet to play" shown when offline
