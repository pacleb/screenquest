import { ACHIEVEMENT_DEFINITIONS } from './achievements';

describe('ACHIEVEMENT_DEFINITIONS', () => {
  it('should have 10 achievements', () => {
    expect(ACHIEVEMENT_DEFINITIONS).toHaveLength(10);
  });

  it('should have unique keys', () => {
    const keys = ACHIEVEMENT_DEFINITIONS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('should have all required fields', () => {
    for (const achievement of ACHIEVEMENT_DEFINITIONS) {
      expect(achievement.key).toBeTruthy();
      expect(achievement.name).toBeTruthy();
      expect(achievement.description).toBeTruthy();
      expect(achievement.icon).toBeTruthy();
      expect(achievement.category).toBeTruthy();
      expect(achievement.criteria).toBeDefined();
      expect(achievement.criteria.type).toBeTruthy();
    }
  });

  it('should have valid criteria types', () => {
    const validTypes = [
      'total_completions',
      'category_completions',
      'early_completion',
      'total_earned_seconds',
      'streak',
    ];

    for (const achievement of ACHIEVEMENT_DEFINITIONS) {
      expect(validTypes).toContain(achievement.criteria.type);
    }
  });

  it('should have value field for numeric criteria', () => {
    const numericTypes = ['total_completions', 'total_earned_seconds', 'streak'];
    const numericAchievements = ACHIEVEMENT_DEFINITIONS.filter((a) =>
      numericTypes.includes(a.criteria.type),
    );

    for (const achievement of numericAchievements) {
      expect(achievement.criteria.value).toBeDefined();
      expect(achievement.criteria.value).toBeGreaterThan(0);
    }
  });

  it('should have category and value for category_completions criteria', () => {
    const categoryAchievements = ACHIEVEMENT_DEFINITIONS.filter(
      (a) => a.criteria.type === 'category_completions',
    );

    expect(categoryAchievements.length).toBeGreaterThan(0);

    for (const achievement of categoryAchievements) {
      expect(achievement.criteria.category).toBeTruthy();
      expect(achievement.criteria.value).toBeDefined();
      expect(achievement.criteria.value).toBeGreaterThan(0);
    }
  });

  it('should have beforeHour for early_completion criteria', () => {
    const earlyBird = ACHIEVEMENT_DEFINITIONS.find(
      (a) => a.criteria.type === 'early_completion',
    );

    expect(earlyBird).toBeDefined();
    expect(earlyBird!.criteria.beforeHour).toBeDefined();
    expect(earlyBird!.criteria.beforeHour).toBeGreaterThan(0);
    expect(earlyBird!.criteria.beforeHour).toBeLessThan(24);
  });
});
