export interface LevelThreshold {
  level: number;
  name: string;
  xpRequired: number;
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, name: 'Starter', xpRequired: 0 },
  { level: 2, name: 'Explorer', xpRequired: 50 },
  { level: 3, name: 'Adventurer', xpRequired: 120 },
  { level: 4, name: 'Helper', xpRequired: 220 },
  { level: 5, name: 'Champion', xpRequired: 350 },
  { level: 6, name: 'Hero', xpRequired: 520 },
  { level: 7, name: 'Super Hero', xpRequired: 730 },
  { level: 8, name: 'Legend', xpRequired: 1000 },
  { level: 9, name: 'Master', xpRequired: 1350 },
  { level: 10, name: 'Quest Master', xpRequired: 1800 },
];

export function getLevelForXp(xp: number): LevelThreshold {
  let result = LEVEL_THRESHOLDS[0];
  for (const t of LEVEL_THRESHOLDS) {
    if (xp >= t.xpRequired) result = t;
    else break;
  }
  return result;
}

export function getNextLevel(currentLevel: number): LevelThreshold | null {
  return LEVEL_THRESHOLDS.find((t) => t.level === currentLevel + 1) || null;
}
