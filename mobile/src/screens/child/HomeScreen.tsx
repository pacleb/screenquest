import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { useAuthStore } from "../../store/auth";
import { timeBankService, TimeBankBalance } from "../../services/timeBank";
import { completionService, ChildQuest } from "../../services/completion";
import { violationService, ViolationStatus } from "../../services/violation";
import { useGamificationStore } from "../../store/gamification";
import {
  colors,
  spacing,
  borderRadius,
  fonts,
  typography,
  useTheme,
} from "../../theme";
import {
  AnimatedHeader,
  MascotWidget,
  TimeBankDisplay,
  QuestCard,
  SectionHeader,
  EmptyState,
  CelebrationModal,
  SkeletonDashboard,
} from "../../components";
import { useThemeStore } from "../../store/theme";
import { useHaptics } from "../../hooks/useAccessibility";
import { offlineCache } from "../../services/offlineCache";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { AppEvents } from "../../utils/eventBus";

export default function ChildHome() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const { colors: themeColors } = useTheme();
  const { progress, pendingCelebration, fetchProgress, setCelebration } =
    useGamificationStore();
  const { weeklyStats, fetchWeeklyStats } = useThemeStore();
  const haptics = useHaptics();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<TimeBankBalance>({
    stackableSeconds: 0,
    nonStackableSeconds: 0,
    totalSeconds: 0,
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

  useAutoRefresh({
    fetchData,
    events: [
      AppEvents.TIME_BANK_CHANGED,
      AppEvents.PLAY_SESSION_CHANGED,
      AppEvents.QUEST_CHANGED,
      AppEvents.COMPLETION_CHANGED,
      AppEvents.VIOLATION_CHANGED,
      AppEvents.GAMIFICATION_CHANGED,
    ],
    intervalMs: 15_000,
  });

  const isNegativeBalance = balance.totalSeconds < 0;
  const canPlay = !isNegativeBalance && balance.totalSeconds > 0;

  const completedToday = quests.filter((q) => (q as any).completedToday).length;

  return (
    <SafeAreaView
      testID="child-home-screen"
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
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
          onThemePress={() => navigation.navigate("Themes")}
          onAvatarPress={() => navigation.navigate("AvatarCustomize")}
        />

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

            {/* Violation Indicator */}
            {violationStatus && violationStatus.currentCount > 0 && (
              <View style={styles.violationCard}>
                <Icon
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
              stackableSeconds={balance.stackableSeconds}
              nonStackableSeconds={balance.nonStackableSeconds}
              totalSeconds={balance.totalSeconds}
            />

            {/* Play Button */}
            <TouchableOpacity
              testID="child-play-btn"
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
                navigation.navigate("Play");
              }}
              disabled={!canPlay}
              activeOpacity={0.85}
              accessibilityLabel="Start playing"
              accessibilityRole="button"
              accessibilityHint="Opens the play timer screen"
              accessibilityState={{ disabled: !canPlay }}
            >
              <Icon
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
                  onAction={() => navigation.navigate("Quests")}
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
                      rewardSeconds={quest.rewardSeconds}
                      stackingType={
                        quest.stackingType as "stackable" | "non_stackable"
                      }
                      category={(quest as any).category}
                      compact
                      onPress={() => {
                        haptics.impact("light");
                        navigation.navigate("QuestDetail", { id: quest.id });
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
