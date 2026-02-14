import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../../src/store/auth";
import {
  timeBankService,
  TimeBankBalance,
} from "../../../src/services/timeBank";
import {
  completionService,
  ChildQuest,
} from "../../../src/services/completion";
import {
  violationService,
  ViolationStatus,
} from "../../../src/services/violation";
import { useGamificationStore } from "../../../src/store/gamification";
import {
  colors,
  spacing,
  borderRadius,
  fonts,
  typography,
  useTheme,
} from "../../../src/theme";
import {
  AnimatedHeader,
  MascotWidget,
  TimeBankDisplay,
  QuestCard,
  SectionHeader,
  EmptyState,
  CelebrationModal,
  SkeletonDashboard,
  WeeklyStatsChart,
} from "../../../src/components";
import { useThemeStore } from "../../../src/store/theme";
import { useHaptics } from "../../../src/hooks/useAccessibility";
import { offlineCache } from "../../../src/services/offlineCache";

export default function ChildHome() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { colors: themeColors } = useTheme();
  const { progress, pendingCelebration, fetchProgress, setCelebration } =
    useGamificationStore();
  const { weeklyStats, fetchWeeklyStats } = useThemeStore();
  const haptics = useHaptics();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<TimeBankBalance>({
    stackableMinutes: 0,
    nonStackableMinutes: 0,
    totalMinutes: 0,
  });
  const [quests, setQuests] = useState<ChildQuest[]>([]);
  const [violationStatus, setViolationStatus] =
    useState<ViolationStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [bal, q, vs] = await Promise.all([
        timeBankService.getBalance(user.id),
        completionService.listChildQuests(user.id),
        violationService.getViolationStatus(user.id).catch(() => null),
        fetchProgress(user.id),
        fetchWeeklyStats(),
      ]);
      setBalance(bal);
      setQuests(q.filter((quest) => quest.availableToComplete).slice(0, 5));
      setViolationStatus(vs);
      // Cache for offline use
      offlineCache.setTimeBank(user.id, bal).catch(() => {});
      offlineCache.setQuests(user.id, q).catch(() => {});
    } catch {
      // Try loading from cache
      const [cachedBal, cachedQuests] = await Promise.all([
        offlineCache.getTimeBank<TimeBankBalance>(user.id).catch(() => null),
        offlineCache.getQuests<ChildQuest[]>(user.id).catch(() => null),
      ]);
      if (cachedBal?.data) setBalance(cachedBal.data);
      if (cachedQuests?.data) {
        setQuests(
          cachedQuests.data.filter((q) => q.availableToComplete).slice(0, 5),
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isNegativeBalance = balance.totalMinutes < 0;
  const canPlay = !isNegativeBalance && balance.totalMinutes > 0;

  const completedToday = quests.filter((q) => (q as any).completedToday).length;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      {/* Animated Gradient Header */}
      <AnimatedHeader
        name={user?.name || "Hero"}
        level={progress?.level ?? 1}
        levelName={progress?.levelName ?? "Starter"}
        xpProgress={
          progress
            ? progress.xpProgressInLevel / (progress.xpToNextLevel || 1)
            : 0
        }
        xpToNext={progress?.xpToNextLevel ?? 100}
        totalXp={progress?.totalXp ?? 0}
        streak={progress?.currentStreak ?? 0}
        weeklyXp={progress?.weeklyXp ?? 0}
        onThemePress={() => router.push("/(app)/child/themes")}
        onAvatarPress={() => router.push("/(app)/child/avatar-customize")}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Loading State */}
        {loading && <SkeletonDashboard />}

        {!loading && (
          <>
            {/* Context-Aware Mascot */}
            <MascotWidget
              name={user?.name}
              questsDone={completedToday}
              totalQuests={quests.length + completedToday}
              streak={progress?.currentStreak ?? 0}
              xpToNext={progress?.xpToNextLevel ?? 100}
              level={progress?.level ?? 1}
              onTap={() => haptics.notification("success")}
            />

            {/* Weekly Stats Chart */}
            {weeklyStats && weeklyStats.dailyStats.length > 0 && (
              <WeeklyStatsChart
                dailyStats={weeklyStats.dailyStats}
                accentColor={themeColors.primary}
                textColor={themeColors.textPrimary}
                cardColor={themeColors.card}
              />
            )}

            {/* Violation Indicator */}
            {violationStatus && violationStatus.currentCount > 0 && (
              <View style={styles.violationCard}>
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={colors.accent}
                />
                <View style={styles.violationInfo}>
                  <Text style={styles.violationTitle}>
                    {violationStatus.currentCount}{" "}
                    {violationStatus.currentCount === 1 ? "strike" : "strikes"}
                  </Text>
                  <Text style={styles.violationHint}>
                    Keep up the good work to stay on track!
                  </Text>
                </View>
              </View>
            )}

            {/* Time Bank Display */}
            <TimeBankDisplay
              stackableMinutes={balance.stackableMinutes}
              nonStackableMinutes={balance.nonStackableMinutes}
              totalMinutes={balance.totalMinutes}
            />

            {/* Play Button */}
            <TouchableOpacity
              style={[
                styles.playButton,
                {
                  backgroundColor: themeColors.secondary,
                  shadowColor: themeColors.secondary,
                },
                !canPlay && styles.playButtonDisabled,
              ]}
              onPress={() => {
                haptics.impact("medium");
                router.push("/(app)/child/play");
              }}
              disabled={!canPlay}
              activeOpacity={0.85}
              accessibilityLabel="Start playing"
              accessibilityRole="button"
              accessibilityHint="Opens the play timer screen"
              accessibilityState={{ disabled: !canPlay }}
            >
              <Ionicons
                name="play-circle"
                size={32}
                color={canPlay ? "#FFF" : themeColors.textSecondary}
              />
              <Text
                style={[styles.playText, !canPlay && styles.playTextDisabled]}
              >
                PLAY
              </Text>
            </TouchableOpacity>

            {/* Available Quests */}
            {quests.length > 0 && (
              <View style={styles.questSection}>
                <SectionHeader
                  title="Available Quests"
                  action="See all"
                  onAction={() => router.push("/(app)/child/quests")}
                  childUI
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.questScroll}
                >
                  {quests.map((quest) => (
                    <QuestCard
                      key={quest.id}
                      icon={quest.icon}
                      name={quest.name}
                      rewardMinutes={quest.rewardMinutes}
                      stackingType={
                        quest.stackingType as "stackable" | "non_stackable"
                      }
                      category={(quest as any).category}
                      compact
                      onPress={() => {
                        haptics.impact("light");
                        router.push({
                          pathname: "/(app)/child/quest-detail",
                          params: { id: quest.id },
                        });
                      }}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {quests.length === 0 && (
              <EmptyState
                emoji="📋"
                title="No quests available"
                message="Check back later or ask your parents!"
                childUI
                animated
              />
            )}
          </>
        )}
      </ScrollView>

      {/* Celebration Modal */}
      {pendingCelebration && (
        <CelebrationModal
          event={pendingCelebration}
          onDismiss={() => setCelebration(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.childBg },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  violationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent + "10",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent + "25",
  },
  violationInfo: { flex: 1 },
  violationTitle: {
    fontFamily: fonts.child.bold,
    fontSize: 14,
    color: colors.accent,
  },
  violationHint: {
    fontFamily: fonts.child.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md + 4,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  playButtonDisabled: {
    backgroundColor: colors.textSecondary + "18",
    shadowOpacity: 0,
    elevation: 0,
  },
  playText: {
    fontFamily: fonts.child.extraBold,
    fontSize: 22,
    color: "#FFF",
    letterSpacing: 2,
  },
  playTextDisabled: { color: colors.textSecondary },
  questSection: { marginBottom: spacing.lg },
  questScroll: { paddingRight: spacing.lg },
});
