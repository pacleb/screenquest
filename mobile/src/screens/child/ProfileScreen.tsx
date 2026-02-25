import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { useAuthStore } from "../../store/auth";
import { useGamificationStore } from "../../store/gamification";
import {
  gamificationService,
  ChildProgressData,
} from "../../services/gamification";
import { completionService, QuestCompletion } from "../../services/completion";
import { playSessionService, PlaySettings } from "../../services/playSession";
import {
  violationService,
  Violation,
  ViolationStatus,
} from "../../services/violation";
import { colors, spacing, borderRadius, fonts } from "../../theme";
import { ProgressBar } from "../../components";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { AppEvents } from "../../utils/eventBus";

export default function ChildProfile() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const { progress, achievements, fetchProgress, fetchAchievements } =
    useGamificationStore();
  const [refreshing, setRefreshing] = useState(false);

  // New state for info sections
  const [childProgress, setChildProgress] = useState<ChildProgressData | null>(
    null,
  );
  const [completions, setCompletions] = useState<QuestCompletion[]>([]);
  const [playSettings, setPlaySettings] = useState<PlaySettings | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [violationStatus, setViolationStatus] =
    useState<ViolationStatus | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    const [
      _base,
      progressRes,
      completionsRes,
      settingsRes,
      violationsRes,
      violationStatusRes,
    ] = await Promise.allSettled([
      Promise.all([fetchProgress(user.id), fetchAchievements(user.id)]),
      gamificationService.getProgress(user.id),
      completionService.listChildCompletions(user.id),
      playSessionService.getSettings(user.id),
      violationService.listViolations(user.id),
      violationService.getViolationStatus(user.id),
    ]);

    if (progressRes.status === "fulfilled") setChildProgress(progressRes.value);
    if (completionsRes.status === "fulfilled")
      setCompletions(completionsRes.value);
    if (settingsRes.status === "fulfilled") setPlaySettings(settingsRes.value);
    if (violationsRes.status === "fulfilled")
      setViolations(violationsRes.value);
    if (violationStatusRes.status === "fulfilled")
      setViolationStatus(violationStatusRes.value);
    setInfoLoading(false);
  }, [user?.id]);

  useAutoRefresh({
    fetchData: loadData,
    events: [AppEvents.GAMIFICATION_CHANGED],
    intervalMs: 60_000,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const recentBadges = achievements
    .filter((a) => a.unlockedAt)
    .sort(
      (a, b) =>
        new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime(),
    )
    .slice(0, 5);

  /* ── helpers ── */
  const formatSeconds = (totalSeconds: number): string => {
    if (totalSeconds <= 0) return "0m";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const to12Hour = (time24: string): string => {
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr, 10);
    const suffix = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return mStr ? `${h}:${mStr} ${suffix}` : `${h} ${suffix}`;
  };

  const relativeTime = (dateStr: string): string => {
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return "yesterday";
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString();
  };

  const statusColor = (status: string): string => {
    switch (status) {
      case "approved":
        return colors.secondary;
      case "denied":
        return colors.error;
      case "pending":
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const sortedCompletions = [...completions]
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    )
    .slice(0, 10);

  const sortedViolations = [...violations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>{user?.avatarUrl || "😊"}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>

          {/* Level + Streak Row */}
          <View style={styles.levelRow}>
            <Text style={styles.level}>
              Level {progress?.level ?? 1} — {progress?.levelName ?? "Starter"}
            </Text>
            {progress && progress.currentStreak > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>
                  🔥 {progress.currentStreak}
                </Text>
              </View>
            )}
          </View>

          {/* XP Progress Bar */}
          {progress && (
            <View style={styles.xpSection}>
              <ProgressBar
                progress={progress.xpProgressInLevel}
                color={colors.purple}
                height={10}
              />
              <Text style={styles.xpText}>
                {progress.xpToNextLevel > 0
                  ? `${progress.xpInLevel} / ${progress.xpForLevel} XP  ·  ${progress.xpToNextLevel} to next level`
                  : `${progress.totalXp} XP  ·  Max level!`}
              </Text>
            </View>
          )}
        </View>

        {/* Recent Badges */}
        {recentBadges.length > 0 && (
          <View style={styles.badgesSection}>
            <View style={styles.badgesHeader}>
              <Text style={styles.sectionTitle}>Badges</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Trophies")}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.badgesRow}>
              {recentBadges.map((badge) => (
                <View key={badge.id} style={styles.badgeItem}>
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                  <Text style={styles.badgeName} numberOfLines={1}>
                    {badge.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Choose Avatar Button */}
        <TouchableOpacity
          style={styles.customizeBtn}
          onPress={() => navigation.navigate("AvatarCustomize")}
          activeOpacity={0.85}
        >
          <Text style={styles.customizeBtnIcon}>{user?.avatarUrl || "😊"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.customizeBtnText}>Choose Avatar</Text>
            <Text style={styles.customizeBtnHint}>
              Pick your favourite icon!
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color={colors.purple} />
        </TouchableOpacity>

        {/* ───── Info Sections ───── */}
        {infoLoading ? (
          <ActivityIndicator
            size="small"
            color={colors.purple}
            style={{ marginVertical: spacing.lg }}
          />
        ) : (
          <>
            {/* ── 1. Progress ── */}
            {childProgress && (
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Icon
                    name="trending-up-outline"
                    size={18}
                    color={colors.purple}
                  />
                  <Text style={styles.infoTitle}>Progress</Text>
                </View>
                <View style={styles.progressGrid}>
                  <View style={styles.progressItem}>
                    <Text style={styles.progressValue}>
                      {childProgress.totalXp}
                    </Text>
                    <Text style={styles.progressLabel}>Total XP</Text>
                  </View>
                  <View style={styles.progressItem}>
                    <Text style={styles.progressValue}>
                      {childProgress.weeklyXp}
                    </Text>
                    <Text style={styles.progressLabel}>Weekly XP</Text>
                  </View>
                  <View style={styles.progressItem}>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text style={{ fontSize: 16 }}>🔥</Text>
                      <Text style={[styles.progressValue, { marginLeft: 2 }]}>
                        {childProgress.currentStreak}
                      </Text>
                    </View>
                    <Text style={styles.progressLabel}>Streak</Text>
                  </View>
                  <View style={styles.progressItem}>
                    <Text style={styles.progressValue}>
                      {childProgress.longestStreak}
                    </Text>
                    <Text style={styles.progressLabel}>Best Streak</Text>
                  </View>
                </View>
                {/* XP bar */}
                <View style={styles.infoXpBar}>
                  <View style={styles.infoXpBarRow}>
                    <Text style={styles.infoXpBarLabel}>
                      Lvl {childProgress.level}
                    </Text>
                    <Text style={styles.infoXpBarLabel}>
                      Lvl {childProgress.level + 1}
                    </Text>
                  </View>
                  <View style={styles.infoXpBarTrack}>
                    <View
                      style={[
                        styles.infoXpBarFill,
                        {
                          width: `${Math.min(childProgress.xpProgressInLevel * 100, 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.infoXpBarSub}>
                    {childProgress.xpInLevel} / {childProgress.xpForLevel} XP
                  </Text>
                </View>
              </View>
            )}

            {/* ── 2. Quest Activity (last 10) ── */}
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Icon
                  name="checkmark-done-outline"
                  size={18}
                  color={colors.secondary}
                />
                <Text style={styles.infoTitle}>
                  Quest Activity ({completions.length})
                </Text>
              </View>
              {sortedCompletions.length === 0 ? (
                <View style={styles.emptySection}>
                  <Icon
                    name="document-text-outline"
                    size={28}
                    color={colors.border}
                  />
                  <Text style={styles.emptyText}>No quest completions yet</Text>
                </View>
              ) : (
                sortedCompletions.map((c) => (
                  <View key={c.id} style={styles.historyItem}>
                    <View style={styles.historyDot}>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: statusColor(c.status) },
                        ]}
                      />
                    </View>
                    <View style={styles.historyContent}>
                      <View style={styles.historyRow}>
                        <Text style={styles.historyTitle} numberOfLines={1}>
                          {c.quest.icon} {c.quest.name}
                        </Text>
                        <Text style={styles.historyTime}>
                          {relativeTime(c.completedAt)}
                        </Text>
                      </View>
                      <View style={styles.completionMeta}>
                        <View
                          style={[
                            styles.statusChip,
                            {
                              backgroundColor: statusColor(c.status) + "20",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusChipText,
                              { color: statusColor(c.status) },
                            ]}
                          >
                            {c.status}
                          </Text>
                        </View>
                        <Text style={styles.historySubtext}>
                          +{formatSeconds(c.earnedSeconds)}
                        </Text>
                      </View>
                      {c.parentNote && (
                        <Text style={styles.parentNote}>
                          Note: {c.parentNote}
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              )}
              {completions.length > 10 && (
                <Text style={styles.showMore}>
                  +{completions.length - 10} more completions
                </Text>
              )}
            </View>

            {/* ── 3. Play Settings (12-hour format) ── */}
            {playSettings && (
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Icon
                    name="game-controller-outline"
                    size={18}
                    color={colors.purple}
                  />
                  <Text style={styles.infoTitle}>Play Settings</Text>
                </View>
                <View style={styles.settingsGrid}>
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Approval Mode</Text>
                    <Text style={styles.settingValue}>
                      {playSettings.playApprovalMode === "require_approval"
                        ? "Require Approval"
                        : "Notify Only"}
                    </Text>
                  </View>
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Daily Cap (Weekday)</Text>
                    <Text style={styles.settingValue}>
                      {playSettings.dailyScreenTimeCap
                        ? formatSeconds(playSettings.dailyScreenTimeCap)
                        : "No limit"}
                    </Text>
                  </View>
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>
                      Allowed Hours (Weekday)
                    </Text>
                    <Text style={styles.settingValue}>
                      {to12Hour(playSettings.allowedPlayHoursStart)} –{" "}
                      {to12Hour(playSettings.allowedPlayHoursEnd)}
                    </Text>
                  </View>
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Daily Cap (Weekend)</Text>
                    <Text style={styles.settingValue}>
                      {playSettings.weekendDailyScreenTimeCap
                        ? formatSeconds(playSettings.weekendDailyScreenTimeCap)
                        : "No limit"}
                    </Text>
                  </View>
                  <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.settingLabel}>
                      Allowed Hours (Weekend)
                    </Text>
                    <Text style={styles.settingValue}>
                      {to12Hour(playSettings.weekendPlayHoursStart)} –{" "}
                      {to12Hour(playSettings.weekendPlayHoursEnd)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* ── 4. Violation Record ── */}
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Icon name="warning-outline" size={18} color={colors.error} />
                <Text style={styles.infoTitle}>Violation Record</Text>
              </View>
              {violationStatus && (
                <View style={styles.violationStatusRow}>
                  <View style={styles.violationCountBadge}>
                    <Text style={styles.violationCountText}>
                      {violationStatus.currentCount}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.violationStatusLabel}>
                      Current violation count
                    </Text>
                    <Text style={styles.violationPenalty}>
                      Next penalty: -
                      {formatSeconds(violationStatus.nextPenaltySeconds)}
                    </Text>
                  </View>
                </View>
              )}
              {sortedViolations.length === 0 ? (
                <View style={styles.emptySection}>
                  <Icon
                    name="shield-checkmark-outline"
                    size={28}
                    color={colors.secondary}
                  />
                  <Text style={styles.emptyText}>
                    No violations recorded 🎉
                  </Text>
                </View>
              ) : (
                sortedViolations.slice(0, 10).map((v) => (
                  <View key={v.id} style={styles.historyItem}>
                    <View style={styles.historyDot}>
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor: v.forgiven
                              ? colors.textSecondary
                              : colors.error,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.historyContent}>
                      <View style={styles.historyRow}>
                        <Text style={styles.historyTitle}>
                          Violation #{v.violationNumber}
                          {v.forgiven && (
                            <Text style={{ color: colors.textSecondary }}>
                              {" "}
                              (forgiven)
                            </Text>
                          )}
                        </Text>
                        <Text style={styles.historyTime}>
                          {relativeTime(v.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.historySubtext}>
                        Penalty: -{formatSeconds(v.penaltySeconds)}
                        {v.description ? ` · ${v.description}` : ""}
                      </Text>
                    </View>
                  </View>
                ))
              )}
              {sortedViolations.length > 10 && (
                <Text style={styles.showMore}>
                  +{sortedViolations.length - 10} more violations
                </Text>
              )}
            </View>
          </>
        )}

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Icon name="log-out-outline" size={18} color="#FFF" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.childBg },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  profileHeader: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarEmoji: { fontSize: 48 },
  name: {
    fontFamily: fonts.child.extraBold,
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  level: {
    fontFamily: fonts.child.semiBold,
    fontSize: 16,
    color: colors.purple,
  },
  streakBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  streakText: {
    fontFamily: fonts.child.bold,
    fontSize: 13,
    color: "#E65100",
  },
  xpSection: {
    width: "100%",
    paddingHorizontal: spacing.xl,
  },
  xpText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  badgesSection: {
    marginBottom: spacing.lg,
  },
  badgesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.child.bold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  seeAll: {
    fontFamily: fonts.child.semiBold,
    fontSize: 14,
    color: colors.purple,
  },
  badgesRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  badgeItem: {
    alignItems: "center",
    width: 56,
  },
  badgeIcon: { fontSize: 28 },
  badgeName: {
    fontFamily: fonts.child.regular,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
  },
  customizeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.purple + "30",
  },
  customizeBtnIcon: { fontSize: 28 },
  customizeBtnText: {
    fontFamily: fonts.child.bold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  customizeBtnHint: {
    fontFamily: fonts.child.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  logoutText: {
    fontFamily: fonts.child.bold,
    color: "#FFF",
    fontSize: 16,
  },

  /* ─── Info Card (shared) ─── */
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  infoTitle: {
    fontFamily: fonts.child.bold,
    fontSize: 16,
    color: colors.textPrimary,
  },

  /* ─── Progress ─── */
  progressGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.sm,
  },
  progressItem: {
    width: "50%",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  progressValue: {
    fontFamily: fonts.child.extraBold,
    fontSize: 20,
    color: colors.purple,
  },
  progressLabel: {
    fontFamily: fonts.child.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoXpBar: {
    marginTop: spacing.xs,
  },
  infoXpBarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  infoXpBarLabel: {
    fontFamily: fonts.child.regular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  infoXpBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  infoXpBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.purple,
  },
  infoXpBarSub: {
    fontFamily: fonts.child.semiBold,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },

  /* ─── Quest Activity / Violation History ─── */
  historyItem: {
    flexDirection: "row",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyDot: {
    width: 24,
    alignItems: "center",
    paddingTop: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyTitle: {
    fontFamily: fonts.child.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  historyTime: {
    fontFamily: fonts.child.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  historySubtext: {
    fontFamily: fonts.child.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  completionMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: spacing.sm,
  },
  statusChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusChipText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 11,
    textTransform: "capitalize",
  },
  parentNote: {
    fontFamily: fonts.child.regular,
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: 4,
  },
  showMore: {
    fontFamily: fonts.child.semiBold,
    fontSize: 12,
    color: colors.purple,
    textAlign: "center",
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  emptySection: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.child.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },

  /* ─── Play Settings ─── */
  settingsGrid: {},
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLabel: {
    fontFamily: fonts.child.regular,
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  settingValue: {
    fontFamily: fonts.child.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
    textAlign: "right",
  },

  /* ─── Violation Record ─── */
  violationStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.error + "08",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  violationCountBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.error + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  violationCountText: {
    fontFamily: fonts.child.extraBold,
    fontSize: 18,
    color: colors.error,
  },
  violationStatusLabel: {
    fontFamily: fonts.child.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  violationPenalty: {
    fontFamily: fonts.child.regular,
    fontSize: 12,
    color: colors.error,
    marginTop: 2,
  },
});
