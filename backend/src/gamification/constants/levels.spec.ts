import { getLevelForXp, getNextLevel, LEVEL_THRESHOLDS } from './levels';

describe('LEVEL_THRESHOLDS', () => {
  it('should have 10 levels', () => {
    expect(LEVEL_THRESHOLDS).toHaveLength(10);
  });

  it('should start at level 1 with 0 XP', () => {
    expect(LEVEL_THRESHOLDS[0]).toEqual({ level: 1, name: 'Starter', xpRequired: 0 });
  });

  it('should end at level 10', () => {
    expect(LEVEL_THRESHOLDS[9].level).toBe(10);
    expect(LEVEL_THRESHOLDS[9].name).toBe('Quest Master');
  });

  it('should have ascending XP thresholds', () => {
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
      expect(LEVEL_THRESHOLDS[i].xpRequired).toBeGreaterThan(
        LEVEL_THRESHOLDS[i - 1].xpRequired,
      );
    }
  });

  it('should have ascending level numbers', () => {
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
      expect(LEVEL_THRESHOLDS[i].level).toBe(i + 1);
    }
  });
});

describe('getLevelForXp', () => {
  it('returns level 1 for 0 XP', () => {
    const result = getLevelForXp(0);
    expect(result.level).toBe(1);
    expect(result.name).toBe('Starter');
  });

  it('returns level 1 for 49 XP (just below level 2)', () => {
    expect(getLevelForXp(49).level).toBe(1);
  });

  it('returns level 2 for exactly 50 XP', () => {
    expect(getLevelForXp(50).level).toBe(2);
    expect(getLevelForXp(50).name).toBe('Explorer');
  });

  it('returns level 10 for exactly 1800 XP', () => {
    expect(getLevelForXp(1800).level).toBe(10);
    expect(getLevelForXp(1800).name).toBe('Quest Master');
  });

  it('returns level 10 for very high XP (no overflow)', () => {
    expect(getLevelForXp(999999).level).toBe(10);
  });

  it('returns correct level at each threshold boundary', () => {
    for (const threshold of LEVEL_THRESHOLDS) {
      expect(getLevelForXp(threshold.xpRequired).level).toBe(threshold.level);
    }
  });
});

describe('getNextLevel', () => {
  it('returns level 2 when current level is 1', () => {
    const next = getNextLevel(1);
    expect(next).not.toBeNull();
    expect(next!.level).toBe(2);
  });

  it('returns null when at max level (10)', () => {
    expect(getNextLevel(10)).toBeNull();
  });

  it('returns null for levels beyond max', () => {
    expect(getNextLevel(11)).toBeNull();
  });

  it('returns correct next level for each level', () => {
    for (let i = 1; i < 10; i++) {
      const next = getNextLevel(i);
      expect(next).not.toBeNull();
      expect(next!.level).toBe(i + 1);
    }
  });
});
