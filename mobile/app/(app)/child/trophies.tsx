import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { colors, spacing, borderRadius, useTheme } from "../../../src/theme";
import { fonts, typography } from "../../../src/theme/typography";
import { Badge, Card, ProgressBar, StreakFire } from "../../../src/components";
import { useAuthStore } from "../../../src/store/auth";
import { useGamificationStore } from "../../../src/store/gamification";
import { useThemeStore } from "../../../src/store/theme";

export default function ChildTrophies() {
  const user = useAuthStore((s) => s.user);
  const { colors: themeColors } = useTheme();
  const {
    progress,
    achievements,
    leaderboard,
    leaderboardEnabled,
    fetchProgress,
    fetchAchievements,
    fetchLeaderboard,
  } = useGamificationStore();
  const { showcaseBadges, fetchShowcase, setShowcase, useStreakFreeze } =
    useThemeStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedShowcase, setSelectedShowcase] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    await Promise.all([
      fetchProgress(user.id),
      fetchAchievements(user.id),
      fetchShowcase(user.id),
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

  const TIER_ORDER: Record<string, number> = { gold: 0, silver: 1, bronze: 2 };
  const TIER_COLORS: Record<string, string> = {
    gold: "#FFD700",
    silver: "#C0C0C0",
    bronze: "#CD7F32",
  };

  const handleToggleShowcase = async (achievementId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isSelected = selectedShowcase.includes(achievementId);
    let next: string[];
    if (isSelected) {
      next = selectedShowcase.filter((id) => id !== achievementId);
    } else {
      if (selectedShowcase.length >= 3) {
        Alert.alert(
          "Max 3",
          "You can showcase up to 3 badges. Remove one first!",
        );
        return;
      }
      next = [...selectedShowcase, achievementId];
    }
    setSelectedShowcase(next);
    try {
      await setShowcase(next);
    } catch {}
  };

  const handleStreakFreeze = async () => {
    const result = await useStreakFreeze();
    Alert.alert(result.success ? "❄️ Streak Frozen!" : "Oops", result.message);
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>
            🏆 Trophies
          </Text>
          <Badge variant="purple" label={`${unlockedCount}/${totalCount}`} />
        </View>

        {/* Streak Card with Fire */}
        {progress && (
          <Card style={styles.streakCard}>
            <View style={styles.streakRow}>
              <StreakFire streak={progress.currentStreak} size="md" />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.streakValue,
                    { color: themeColors.textPrimary },
                  ]}
                >
                  {progress.currentStreak}-day streak
                </Text>
                <Text style={styles.streakBest}>
                  Best: {progress.longestStreak} days
                </Text>
              </View>
              {progress.currentStreak >= 3 && (
                <Badge variant="warning" label="On fire!" />
              )}
            </View>
            {/* Streak Freeze */}
            <TouchableOpacity
              style={styles.freezeBtn}
              onPress={handleStreakFreeze}
              activeOpacity={0.75}
            >
              <Text style={styles.freezeIcon}>❄️</Text>
              <Text style={styles.freezeText}>Use Streak Freeze</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Badge Showcase */}
        {showcaseBadges.length > 0 && (
          <View style={styles.showcaseSection}>
            <Text
              style={[styles.sectionTitle, { color: themeColors.textPrimary }]}
            >
              ✨ Showcase
            </Text>
            <View style={styles.showcaseRow}>
              {showcaseBadges.map((badge) => (
                <View
                  key={badge.id}
                  style={[
                    styles.showcaseBadge,
                    { borderColor: badge.badgeColor },
                  ]}
                >
                  <Text style={styles.showcaseIcon}>{badge.icon}</Text>
                  <Text
                    style={[
                      styles.showcaseName,
                      { color: themeColors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {badge.name}
                  </Text>
                  <View
                    style={[
                      styles.tierTag,
                      { backgroundColor: badge.badgeColor },
                    ]}
                  >
                    <Text style={styles.tierText}>{badge.badgeTier}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Achievements Grid */}
        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
          Achievements
        </Text>
        <Text
          style={[styles.showcaseHint, { color: themeColors.textSecondary }]}
        >
          Tap earned badges to add to your showcase (max 3)
        </Text>
        <View style={styles.grid}>
          {achievements.map((a, i) => {
            const unlocked = !!a.unlockedAt;
            const isShowcased = selectedShowcase.includes(a.id);
            return (
              <Animated.View
                key={a.id}
                entering={FadeInDown.delay(i * 50).duration(200)}
              >
                <TouchableOpacity
                  style={[
                    styles.achievementCard,
                    { backgroundColor: themeColors.card },
                    !unlocked && styles.achievementLocked,
                    isShowcased && { borderWidth: 2, borderColor: "#FFD700" },
                  ]}
                  onPress={() => unlocked && handleToggleShowcase(a.id)}
                  disabled={!unlocked}
                  activeOpacity={0.75}
                >
                  <Text style={styles.achievementIcon}>
                    {unlocked ? a.icon : "🔒"}
                  </Text>
                  <Text
                    style={[
                      styles.achievementName,
                      { color: themeColors.textPrimary },
                      !unlocked && styles.lockedText,
                    ]}
                    numberOfLines={1}
                  >
                    {a.name}
                  </Text>
                  <Text
                    style={[
                      styles.achievementDesc,
                      { color: themeColors.textSecondary },
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
                  {isShowcased && (
                    <View style={styles.showcaseStar}>
                      <Text style={{ fontSize: 10 }}>⭐</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
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
                      {entry.rank === 1 ? "👑" : `#${entry.rank}`}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.childH1,
    color: colors.textPrimary,
  },
  streakCard: { marginBottom: spacing.lg },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  streakValue: {
    ...typography.childH3,
    color: colors.textPrimary,
  },
  streakBest: {
    ...typography.childCaption,
    color: colors.textSecondary,
  },
  freezeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: "#E3F2FD",
    borderWidth: 1,
    borderColor: "#90CAF9",
  },
  freezeIcon: { fontSize: 16 },
  freezeText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 13,
    color: "#1976D2",
  },
  showcaseSection: { marginBottom: spacing.lg },
  showcaseRow: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "center",
  },
  showcaseBadge: {
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    backgroundColor: "#FFFDE7",
    width: 90,
  },
  showcaseIcon: { fontSize: 36, marginBottom: 4 },
  showcaseName: {
    fontFamily: fonts.child.bold,
    fontSize: 11,
    textAlign: "center",
  },
  tierTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    marginTop: 4,
  },
  tierText: {
    fontFamily: fonts.child.bold,
    fontSize: 9,
    color: "#FFF",
    textTransform: "uppercase",
  },
  showcaseHint: {
    fontFamily: fonts.child.regular,
    fontSize: 12,
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  sectionTitle: {
    ...typography.childH2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  achievementCard: {
    width: 100,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  achievementLocked: {
    opacity: 0.5,
    backgroundColor: "#F0F0F0",
  },
  achievementIcon: { fontSize: 32, marginBottom: 4 },
  achievementName: {
    fontFamily: fonts.child.bold,
    fontSize: 12,
    color: colors.textPrimary,
    textAlign: "center",
  },
  achievementDesc: {
    fontFamily: fonts.child.regular,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
  },
  lockedText: { color: "#999" },
  unlockedDate: {
    fontFamily: fonts.child.regular,
    fontSize: 9,
    color: colors.secondary,
    marginTop: 4,
  },
  showcaseStar: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  leaderboardSubtitle: {
    ...typography.childCaption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: -spacing.sm,
  },
  leaderboardCard: { marginBottom: spacing.sm },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
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
  xpColumn: { alignItems: "center" },
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
    textAlign: "center",
    marginTop: spacing.md,
  },
});
