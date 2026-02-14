import AsyncStorage from '@react-native-async-storage/async-storage';
import { completionService } from './completion';
import { showToast } from './toastBridge';

const QUEUE_KEY = '@sq_offline_queue';

interface QueuedAction {
  id: string;
  type: 'quest_completion';
  payload: {
    childId: string;
    questId: string;
  };
  createdAt: number;
}

async function getQueue(): Promise<QueuedAction[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedAction[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

async function enqueue(action: Omit<QueuedAction, 'id' | 'createdAt'>): Promise<void> {
  const queue = await getQueue();
  // Dedup: skip if same type + childId + questId already queued
  const isDuplicate = queue.some(
    (a) =>
      a.type === action.type &&
      a.payload.childId === action.payload.childId &&
      a.payload.questId === action.payload.questId,
  );
  if (isDuplicate) return;

  queue.push({
    ...action,
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
  });
  await saveQueue(queue);
}

async function flush(): Promise<{ succeeded: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  const remaining: QueuedAction[] = [];

  for (const action of queue) {
    try {
      if (action.type === 'quest_completion') {
        await completionService.completeQuest(
          action.payload.childId,
          action.payload.questId,
        );
        succeeded++;
      }
    } catch (err: any) {
      if (err?.response?.status >= 400 && err?.response?.status < 500) {
        // Client error (e.g. already completed) — drop it
        failed++;
      } else {
        // Network/5xx — keep for next attempt
        remaining.push(action);
        failed++;
      }
    }
  }

  await saveQueue(remaining);

  if (succeeded > 0) {
    showToast(
      `${succeeded} queued quest${succeeded > 1 ? 's' : ''} submitted!`,
      'success',
    );
  }

  return { succeeded, failed };
}

async function getQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export const offlineQueue = { enqueue, flush, getQueueSize, clearQueue };
