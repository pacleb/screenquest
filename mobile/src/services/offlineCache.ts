import AsyncStorage from '@react-native-async-storage/async-storage';

interface CachedEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_KEYS = {
  QUESTS: '@sq_cache_quests',
  TIME_BANK: '@sq_cache_timebank',
  ACHIEVEMENTS: '@sq_cache_achievements',
  FAMILY_MEMBERS: '@sq_cache_family_members',
  PROGRESS: '@sq_cache_progress',
} as const;

const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes

async function setCache<T>(key: string, data: T): Promise<void> {
  const entry: CachedEntry<T> = { data, timestamp: Date.now() };
  await AsyncStorage.setItem(key, JSON.stringify(entry));
}

async function getCache<T>(key: string, ttl = DEFAULT_TTL): Promise<{ data: T; timestamp: number } | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    const entry: CachedEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ttl) return null;
    return entry;
  } catch {
    return null;
  }
}

async function clearAllCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((k) => k.startsWith('@sq_cache_'));
  if (cacheKeys.length > 0) {
    await AsyncStorage.multiRemove(cacheKeys);
  }
}

export const offlineCache = {
  setQuests: (childId: string, data: unknown) =>
    setCache(`${CACHE_KEYS.QUESTS}_${childId}`, data),
  getQuests: <T>(childId: string, ttl?: number) =>
    getCache<T>(`${CACHE_KEYS.QUESTS}_${childId}`, ttl),

  setTimeBank: (childId: string, data: unknown) =>
    setCache(`${CACHE_KEYS.TIME_BANK}_${childId}`, data),
  getTimeBank: <T>(childId: string, ttl?: number) =>
    getCache<T>(`${CACHE_KEYS.TIME_BANK}_${childId}`, ttl),

  setAchievements: (childId: string, data: unknown) =>
    setCache(`${CACHE_KEYS.ACHIEVEMENTS}_${childId}`, data),
  getAchievements: <T>(childId: string, ttl?: number) =>
    getCache<T>(`${CACHE_KEYS.ACHIEVEMENTS}_${childId}`, ttl),

  setFamilyMembers: (familyId: string, data: unknown) =>
    setCache(`${CACHE_KEYS.FAMILY_MEMBERS}_${familyId}`, data),
  getFamilyMembers: <T>(familyId: string, ttl?: number) =>
    getCache<T>(`${CACHE_KEYS.FAMILY_MEMBERS}_${familyId}`, ttl),

  setProgress: (childId: string, data: unknown) =>
    setCache(`${CACHE_KEYS.PROGRESS}_${childId}`, data),
  getProgress: <T>(childId: string, ttl?: number) =>
    getCache<T>(`${CACHE_KEYS.PROGRESS}_${childId}`, ttl),

  clearAll: clearAllCache,
};
