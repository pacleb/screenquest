import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { eventBus } from '../utils/eventBus';

interface UseAutoRefreshOptions {
  /** The fetch function to call on refresh */
  fetchData: () => void | Promise<void>;
  /** Event names to subscribe to for immediate refresh */
  events?: string[];
  /** Polling interval in ms while screen is focused (default: 30 000 — 30 s) */
  intervalMs?: number;
  /** Whether polling is enabled (default: true) */
  pollingEnabled?: boolean;
}

/**
 * Custom hook that keeps screen data fresh by combining three strategies:
 *
 * 1. **Focus refresh** – refetch every time the screen gains navigation focus
 * 2. **Event refresh** – refetch immediately when a relevant EventBus event fires
 * 3. **Polling refresh** – periodically refetch while the screen is focused
 *    (pauses when the app goes to background)
 */
export function useAutoRefresh({
  fetchData,
  events = [],
  intervalMs = 30_000,
  pollingEnabled = true,
}: UseAutoRefreshOptions) {
  const isFocused = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Stable reference so interval/event callbacks always call latest fetchData
  const fetchRef = useRef(fetchData);
  fetchRef.current = fetchData;

  // ── 1. Refetch on navigation focus ───────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      fetchRef.current();

      // Start polling when focused
      if (pollingEnabled && intervalMs > 0) {
        intervalRef.current = setInterval(() => {
          if (appStateRef.current === 'active') {
            fetchRef.current();
          }
        }, intervalMs);
      }

      return () => {
        isFocused.current = false;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [intervalMs, pollingEnabled]),
  );

  // ── 2. Subscribe to EventBus events ──────────────────────────────────
  useEffect(() => {
    if (events.length === 0) return;

    const unsubscribers = events.map((eventName) =>
      eventBus.on(eventName, () => {
        // Only refetch if this screen is currently focused
        if (isFocused.current) {
          fetchRef.current();
        }
      }),
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
    // Events array identity — stringify for stable dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.join(',')]);

  // ── 3. Resume refresh when app comes back to foreground ──────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active' &&
        isFocused.current
      ) {
        fetchRef.current();
      }
      appStateRef.current = nextState;
    });

    return () => sub.remove();
  }, []);
}
