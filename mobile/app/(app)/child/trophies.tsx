import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../../src/theme';
import { fonts, typography } from '../../../src/theme/typography';
import { Badge, Card, ProgressBar } from '../../../src/components';
import { useAuthStore } from '../../../src/store/auth';
import { useGamificationStore } from '../../../src/store/gamification';

export default function ChildTrophies() {
  const user = useAuthStore((s) => s.user);
  const {
    progress,
    achievements,
    leaderboard,
    leaderboardEnabled,
    fetchProgress,
    fetchAchievements,
    fetchLeaderboard,
  } = useGamificationStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    await Promise.all([
      fetchProgress(user.id),
      fetchAchievements(user.id),
      user.familyId ? fetchLeaderboard(user.familyId) : Promise.resolve(),
    ]);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;
  const totalCount = achievements.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Trophies</Text>
          <Badge variant="purple">
            {unlockedCount}/{totalCount}
          </Badge>
        </View>

        {/* Streak Card */}
        {progress && (
          <Card style={styles.streakCard}>
            <View style={styles.streakRow}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.streakValue}>
                  {progress.currentStreak}-day streak
                </Text>
                <Text style={styles.streakBest}>
                  Best: {progress.longestStreak} days
                </Text>
              </View>
              {progress.currentStreak >= 3 && (
                <Badge variant="warning">On fire!</Badge>
              )}
            </View>
          </Card>
        )}

        {/* Achievements Grid */}
        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={styles.grid}>
          {achievements.map((a) => {
            const unlocked = !!a.unlockedAt;
            return (
              <View
                key={a.id}
                style={[
                  styles.achievementCard,
                  !unlocked && styles.achievementLocked,
                ]}
              >
                <Text style={styles.achievementIcon}>
                  {unlocked ? a.icon : '🔒'}
                </Text>
                <Text
                  style={[
                    styles.achievementName,
                    !unlocked && styles.lockedText,
                  ]}
                  numberOfLines={1}
                >
                  {a.name}
                </Text>
                <Text
                  style={[
                    styles.achievementDesc,
                    !unlocked && styles.lockedText,
                  ]}
                  numberOfLines={2}
                >
                  {a.description}
                </Text>
                {unlocked && a.unlockedAt && (
                  <Text style={styles.unlockedDate}>
                    {new Date(a.unlockedAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Leaderboard */}
        {leaderboardEnabled && leaderboard.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Family Leaderboard</Text>
            <Text style={styles.leaderboardSubtitle}>This week's XP</Text>
            {leaderboard.map((entry) => (
              <Card key={entry.childId} style={styles.leaderboardCard}>
                <View style={styles.leaderboardRow}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>
                      {entry.rank === 1 ? '👑' : `#${entry.rank}`}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leaderboardName}>{entry.name}</Text>
                    <Text style={styles.leaderboardLevel}>
                      Lv.{entry.level} {entry.levelName}
                    </Text>
                  </View>
                  <View style={styles.xpColumn}>
                    <Text style={styles.xpValue}>{entry.weeklyXp}</Text>
                    <Text style={styles.xpLabel}>XP</Text>
                  </View>
                </View>
              </Card>
            ))}
            <Text style={styles.encouragement}>Great job this week! 🎉</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.childBg },
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.childH1,
    color: colors.textPrimary,
  },
  streakCard: { marginBottom: spacing.lg },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  streakEmoji: { fontSize: 40 },
  streakValue: {
    ...typography.childH3,
    color: colors.textPrimary,
  },
  streakBest: {
    ...typography.childCaption,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.childH2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  achievementCard: {
    width: '31%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  achievementLocked: {
    opacity: 0.5,
    backgroundColor: '#F0F0F0',
  },
  achievementIcon: { fontSize: 32, marginBottom: 4 },
  achievementName: {
    fontFamily: fonts.child.bold,
    fontSize: 12,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  achievementDesc: {
    fontFamily: fonts.child.regular,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  lockedText: { color: '#999' },
  unlockedDate: {
    fontFamily: fonts.child.regular,
    fontSize: 9,
    color: colors.secondary,
    marginTop: 4,
  },
  leaderboardSubtitle: {
    ...typography.childCaption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: -spacing.sm,
  },
  leaderboardCard: { marginBottom: spacing.sm },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontFamily: fonts.child.bold,
    fontSize: 16,
    color: colors.purple,
  },
  leaderboardName: {
    ...typography.childBodyBold,
    color: colors.textPrimary,
  },
  leaderboardLevel: {
    ...typography.childCaption,
    color: colors.textSecondary,
  },
  xpColumn: { alignItems: 'center' },
  xpValue: {
    fontFamily: fonts.child.extraBold,
    fontSize: 20,
    color: colors.purple,
  },
  xpLabel: {
    fontFamily: fonts.child.regular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  encouragement: {
    ...typography.childBody,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
