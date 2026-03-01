/**
 * Lightweight EventBus for cross-screen real-time communication.
 *
 * Screens emit events after mutations (quest created, play stopped, etc.)
 * and other screens subscribe to refresh when relevant events fire.
 */

type EventCallback = () => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  /** Subscribe to an event. Returns an unsubscribe function. */
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /** Emit an event, notifying all subscribers. */
  emit(event: string): void {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb();
      } catch {
        // swallow errors from individual callbacks
      }
    });
  }
}

export const eventBus = new EventBus();

// ── Event name constants ──────────────────────────────────────────────
export const AppEvents = {
  /** Fired when a quest is created, updated, archived, or deleted */
  QUEST_CHANGED: 'quest:changed',
  /** Fired when a play session starts, pauses, resumes, stops, or completes */
  PLAY_SESSION_CHANGED: 'play:changed',
  /** Fired when a child's time bank balance changes (play stop, quest reward, violation) */
  TIME_BANK_CHANGED: 'timeBank:changed',
  /** Fired when a quest completion is submitted, approved, or denied */
  COMPLETION_CHANGED: 'completion:changed',
  /** Fired when a violation is recorded or reset */
  VIOLATION_CHANGED: 'violation:changed',
  /** Fired when family membership changes (child added, member removed) */
  FAMILY_CHANGED: 'family:changed',
  /** Fired when gamification data changes (XP, level, badges) */
  GAMIFICATION_CHANGED: 'gamification:changed',
  /** Fired when the session is expired and the user must be logged out */
  AUTH_SESSION_EXPIRED: 'auth:sessionExpired',
} as const;

/**
 * Emit the appropriate EventBus events based on a backend notification `type` string.
 * Call this whenever a new push/in-app notification arrives so subscribed screens
 * refresh immediately instead of waiting for the next polling cycle.
 */
export function emitEventsForNotificationType(type: string | undefined) {
  if (!type) return;
  switch (type) {
    case 'play_started':
    case 'play_request':
    case 'play_approved':
    case 'play_denied':
    case 'play_paused':
    case 'play_resumed':
    case 'play_stopped':
    case 'play_ended_by_parent':
      eventBus.emit(AppEvents.PLAY_SESSION_CHANGED);
      break;
    case 'quest_completion':
    case 'quest_approved':
    case 'completion_approved':
    case 'quest_denied':
    case 'completion_denied':
      eventBus.emit(AppEvents.COMPLETION_CHANGED);
      eventBus.emit(AppEvents.TIME_BANK_CHANGED);
      break;
  }
}
