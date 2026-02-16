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
} as const;
