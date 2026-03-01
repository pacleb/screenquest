import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ParentStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/auth";
import { familyService, FamilyMember } from "../../services/family";
import { timeBankService, TimeBankBalance } from "../../services/timeBank";
import {
  gamificationService,
  ChildProgressData,
  AchievementData,
} from "../../services/gamification";
import {
  violationService,
  Violation,
  ViolationStatus,
} from "../../services/violation";
import { completionService, QuestCompletion } from "../../services/completion";
import {
  playSessionService,
  PlaySession,
  PlaySettings,
} from "../../services/playSession";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../../theme";

type Props = NativeStackScreenProps<ParentStackParamList, "ChildDetail">;

/* ───────── helpers ───────── */

function formatSeconds(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0m";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function relativeTime(dateStr: string): string {
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
}

function statusColor(status: string): string {
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
}

function formatTime12h(time24: string): string {
  const [hourStr, minuteStr] = time24.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr || "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${hour}:${minute} ${ampm}`;
}

/* ───────── types ───────── */

interface ChildWeeklyStats {
  questsCompleted: number;
  secondsEarned: number;
  xpEarned: number;
  totalPlaySeconds: number;
  currentStreak: number;
  dailyStats: {
    date: string;
    quests: number;
    seconds: number;
    xp: number;
    playSeconds: number;
  }[];
}

/* ───────── component ───────── */

export default function ChildDetailScreen({ navigation, route }: Props) {
  const { childId, childName } = route.params;
  const user = useAuthStore((s) => s.user);
  const familyId = user?.familyId;

  // State
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [child, setChild] = useState<FamilyMember | null>(null);
  const [balance, setBalance] = useState<TimeBankBalance | null>(null);
  const [progress, setProgress] = useState<ChildProgressData | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<ChildWeeklyStats | null>(null);
  const [achievements, setAchievements] = useState<AchievementData[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [violationStatus, setViolationStatus] =
    useState<ViolationStatus | null>(null);
  const [completions, setCompletions] = useState<QuestCompletion[]>([]);
  const [activeSession, setActiveSession] = useState<PlaySession | null>(null);
  const [playSettings, setPlaySettings] = useState<PlaySettings | null>(null);

  const fetchData = useCallback(async () => {
    if (!familyId) return;
    try {
      const [
        membersRes,
        balanceRes,
        progressRes,
        weeklyRes,
        achievementsRes,
        violationsRes,
        violationStatusRes,
        completionsRes,
        activeSessionRes,
        playSettingsRes,
      ] = await Promise.allSettled([
        familyService.getMembers(familyId),
        timeBankService.getBalance(childId),
        gamificationService.getProgress(childId),
        gamificationService.getChildWeeklyStats(childId),
        gamificationService.getAchievements(childId),
        violationService.listViolations(childId),
        violationService.getViolationStatus(childId),
        completionService.listChildCompletions(childId),
        playSessionService.getActiveSession(childId),
        playSessionService.getSettings(childId),
      ]);

      if (membersRes.status === "fulfilled") {
        const found = membersRes.value.find((m) => m.id === childId);
        if (found) setChild(found);
      }
      if (balanceRes.status === "fulfilled") setBalance(balanceRes.value);
      if (progressRes.status === "fulfilled") setProgress(progressRes.value);
      if (weeklyRes.status === "fulfilled") setWeeklyStats(weeklyRes.value);
      if (achievementsRes.status === "fulfilled")
        setAchievements(achievementsRes.value.filter((a) => a.unlockedAt));
      if (violationsRes.status === "fulfilled")
        setViolations(violationsRes.value);
      if (violationStatusRes.status === "fulfilled")
        setViolationStatus(violationStatusRes.value);
      if (completionsRes.status === "fulfilled")
        setCompletions(completionsRes.value);
      if (activeSessionRes.status === "fulfilled")
        setActiveSession(activeSessionRes.value);
      if (playSettingsRes.status === "fulfilled")
        setPlaySettings(playSettingsRes.value);
    } catch (err) {
      console.error("ChildDetail fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [familyId, childId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  /* ───── violation actions ───── */

  const handleRecordViolation = useCallback(async () => {
    Alert.alert(
      "Record Violation",
      `Record a screen-time violation for ${childName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Record",
          style: "destructive",
          onPress: async () => {
            try {
              await violationService.recordViolation(childId);
              fetchData();
            } catch {
              Alert.alert("Error", "Failed to record violation.");
            }
          },
        },
      ],
    );
  }, [childId, childName, fetchData]);

  const handleResetViolations = useCallback(async () => {
    Alert.alert(
      "Reset Violations",
      `Reset the violation counter for ${childName}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await violationService.resetCounter(childId);
              fetchData();
            } catch {
              Alert.alert("Error", "Failed to reset violations.");
            }
          },
        },
      ],
    );
  }, [childId, childName, fetchData]);

  const handleForgiveViolation = useCallback(
    async (violationId: string) => {
      try {
        await violationService.forgiveViolation(violationId);
        fetchData();
      } catch {
        Alert.alert("Error", "Failed to forgive violation.");
      }
    },
    [fetchData],
  );

  /* ───── render ───── */

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const sortedCompletions = [...completions].sort(
    (a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );

  const sortedViolations = [...violations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const xpProgress = progress ? progress.xpProgressInLevel : 0;

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
      testID="child-detail-screen"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {childName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ───── Profile Card ───── */}
        <View style={[styles.card, styles.profileCard]}>
          <View style={styles.avatarLarge}>
            <Text
              style={[
                styles.avatarLargeText,
                child?.avatarUrl ? { fontSize: 40 } : undefined,
              ]}
            >
              {child?.avatarUrl || childName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{childName}</Text>
            {child?.age && (
              <Text style={styles.profileAge}>Age {child.age}</Text>
            )}
            {progress && (
              <View style={styles.levelBadge}>
                <Icon name="star" size={14} color={colors.xp} />
                <Text style={styles.levelText}>
                  Lvl {progress.level} • {progress.levelName}
                </Text>
              </View>
            )}
          </View>
          {activeSession && (
            <View style={styles.activeSessionBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.activeSessionText}>Playing</Text>
            </View>
          )}
        </View>

        {/* ───── Time Bank ───── */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Icon name="time-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Time Bank</Text>
            </View>
          </View>
          {balance ? (
            <View style={styles.timeBankGrid}>
              <View style={styles.timeBankItem}>
                <Text style={styles.timeBankValue}>
                  {formatSeconds(balance.totalSeconds)}
                </Text>
                <Text style={styles.timeBankLabel}>Total</Text>
              </View>
              <View style={styles.timeBankDivider} />
              <View style={styles.timeBankItem}>
                <Text
                  style={[styles.timeBankValue, { color: colors.secondary }]}
                >
                  {formatSeconds(balance.stackableSeconds)}
                </Text>
                <Text style={styles.timeBankLabel}>Stackable</Text>
              </View>
              <View style={styles.timeBankDivider} />
              <View style={styles.timeBankItem}>
                <Text style={[styles.timeBankValue, { color: colors.warning }]}>
                  {formatSeconds(balance.nonStackableSeconds)}
                </Text>
                <Text style={styles.timeBankLabel}>Use-it-or-lose-it</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>No time bank data available</Text>
          )}
        </View>

        {/* ───── Active Play Session ───── */}
        {activeSession && (
          <View
            style={[
              styles.card,
              { borderColor: colors.timerActive, borderWidth: 2 },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Icon
                  name="game-controller-outline"
                  size={20}
                  color={colors.timerActive}
                />
                <Text
                  style={[styles.sectionTitle, { color: colors.timerActive }]}
                >
                  Active Session
                </Text>
              </View>
            </View>
            <View style={styles.activeSessionInfo}>
              <View style={styles.sessionStat}>
                <Text style={styles.sessionStatValue}>
                  {formatSeconds(activeSession.remainingSeconds)}
                </Text>
                <Text style={styles.sessionStatLabel}>Remaining</Text>
              </View>
              <View style={styles.sessionStat}>
                <Text style={styles.sessionStatValue}>
                  {formatSeconds(activeSession.requestedSeconds)}
                </Text>
                <Text style={styles.sessionStatLabel}>Requested</Text>
              </View>
              <View style={styles.sessionStat}>
                <Text
                  style={[
                    styles.sessionStatValue,
                    { textTransform: "capitalize" },
                  ]}
                >
                  {activeSession.status}
                </Text>
                <Text style={styles.sessionStatLabel}>Status</Text>
              </View>
            </View>
          </View>
        )}

        {/* ───── XP & Progress ───── */}
        {progress && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Icon
                  name="trending-up-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.sectionTitle}>Progress</Text>
              </View>
            </View>
            <View style={styles.progressGrid}>
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>{progress.totalXp}</Text>
                <Text style={styles.progressLabel}>Total XP</Text>
              </View>
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>{progress.weeklyXp}</Text>
                <Text style={styles.progressLabel}>Weekly XP</Text>
              </View>
              <View style={styles.progressItem}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Icon name="flame" size={18} color={colors.streak} />
                  <Text style={[styles.progressValue, { marginLeft: 4 }]}>
                    {progress.currentStreak}
                  </Text>
                </View>
                <Text style={styles.progressLabel}>Streak</Text>
              </View>
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>
                  {progress.longestStreak}
                </Text>
                <Text style={styles.progressLabel}>Best Streak</Text>
              </View>
            </View>

            {/* XP bar */}
            <View style={styles.xpBarContainer}>
              <View style={styles.xpBarRow}>
                <Text style={styles.xpBarLabel}>Level {progress.level}</Text>
                <Text style={styles.xpBarLabel}>
                  Level {progress.level + 1}
                </Text>
              </View>
              <View style={styles.xpBarTrack}>
                <View
                  style={[
                    styles.xpBarFill,
                    { width: `${Math.min(xpProgress * 100, 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.xpBarSubtext}>
                {progress.totalXp} / {progress.totalXp + progress.xpToNextLevel}{" "}
                XP
              </Text>
            </View>
          </View>
        )}

        {/* ───── Weekly Stats ───── */}
        {weeklyStats && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Icon
                  name="bar-chart-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.sectionTitle}>This Week</Text>
              </View>
            </View>
            <View style={styles.weeklyGrid}>
              <View style={styles.weeklyStat}>
                <Text style={styles.weeklyValue}>
                  {weeklyStats.questsCompleted}
                </Text>
                <Text style={styles.weeklyLabel}>Quests</Text>
              </View>
              <View style={styles.weeklyStat}>
                <Text style={styles.weeklyValue}>
                  {formatSeconds(weeklyStats.secondsEarned)}
                </Text>
                <Text style={styles.weeklyLabel}>Earned</Text>
              </View>
              <View style={styles.weeklyStat}>
                <Text style={styles.weeklyValue}>
                  {formatSeconds(weeklyStats.totalPlaySeconds)}
                </Text>
                <Text style={styles.weeklyLabel}>Played</Text>
              </View>
              <View style={styles.weeklyStat}>
                <Text style={styles.weeklyValue}>{weeklyStats.xpEarned}</Text>
                <Text style={styles.weeklyLabel}>XP</Text>
              </View>
            </View>
          </View>
        )}

        {/* ───── Achievements ───── */}
        {achievements.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Icon name="trophy-outline" size={20} color={colors.xp} />
                <Text style={styles.sectionTitle}>
                  Achievements ({achievements.length})
                </Text>
              </View>
            </View>
            <View style={styles.achievementGrid}>
              {achievements.slice(0, 6).map((a) => (
                <View key={a.id} style={styles.achievementItem}>
                  <Text style={styles.achievementIcon}>{a.icon}</Text>
                  <Text style={styles.achievementName} numberOfLines={1}>
                    {a.name}
                  </Text>
                </View>
              ))}
            </View>
            {achievements.length > 6 && (
              <Text style={styles.showMore}>
                +{achievements.length - 6} more
              </Text>
            )}
          </View>
        )}

        {/* ───── Quest Completion History ───── */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Icon
                name="checkmark-done-outline"
                size={20}
                color={colors.secondary}
              />
              <Text style={styles.sectionTitle}>
                Quest Activity ({completions.length})
              </Text>
            </View>
          </View>

          {sortedCompletions.length === 0 ? (
            <View style={styles.emptySection}>
              <Icon
                name="document-text-outline"
                size={32}
                color={colors.border}
              />
              <Text style={styles.emptyText}>No quest completions yet</Text>
            </View>
          ) : (
            sortedCompletions.slice(0, 15).map((c) => (
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
                        { backgroundColor: statusColor(c.status) + "20" },
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
                    <Text style={styles.parentNote}>Note: {c.parentNote}</Text>
                  )}
                </View>
              </View>
            ))
          )}
          {sortedCompletions.length > 15 && (
            <Text style={styles.showMore}>
              +{sortedCompletions.length - 15} more completions
            </Text>
          )}
        </View>

        {/* ───── Play Settings ───── */}
        {playSettings && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Icon
                  name="settings-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.sectionTitle}>Play Settings</Text>
              </View>
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
                <Text style={styles.settingLabel}>Allowed Hours (Weekday)</Text>
                <Text style={styles.settingValue}>
                  {formatTime12h(playSettings.allowedPlayHoursStart)} –{" "}
                  {formatTime12h(playSettings.allowedPlayHoursEnd)}
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
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Allowed Hours (Weekend)</Text>
                <Text style={styles.settingValue}>
                  {formatTime12h(playSettings.weekendPlayHoursStart)} –{" "}
                  {formatTime12h(playSettings.weekendPlayHoursEnd)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ───── Violation History ───── */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Icon name="warning-outline" size={20} color={colors.error} />
              <Text style={styles.sectionTitle}>Violations</Text>
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleRecordViolation}
              >
                <Icon
                  name="add-circle-outline"
                  size={18}
                  color={colors.error}
                />
              </TouchableOpacity>
              {violations.length > 0 && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleResetViolations}
                >
                  <Icon
                    name="refresh-outline"
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
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
                size={32}
                color={colors.secondary}
              />
              <Text style={styles.emptyText}>No violations recorded</Text>
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
                    {v.description ? ` • ${v.description}` : ""}
                  </Text>
                  {!v.forgiven && (
                    <TouchableOpacity
                      style={styles.forgiveBtn}
                      onPress={() => handleForgiveViolation(v.id)}
                    >
                      <Text style={styles.forgiveBtnText}>Forgive</Text>
                    </TouchableOpacity>
                  )}
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

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────── styles ───────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  headerTitle: {
    ...typography.parentH2,
    color: colors.primary,
    flex: 1,
    textAlign: "center",
  },
  scrollContent: {
    padding: spacing.lg,
  },

  /* Card */
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },

  /* Profile */
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondary + "30",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLargeText: {
    ...typography.parentH1,
    color: colors.secondary,
    fontSize: 24,
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  profileName: {
    ...typography.parentH2,
    color: colors.textPrimary,
  },
  profileAge: {
    ...typography.parentCaption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    backgroundColor: colors.xp + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    alignSelf: "flex-start",
  },
  levelText: {
    ...typography.parentCaption,
    color: colors.textPrimary,
    marginLeft: 4,
  },
  activeSessionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.timerActive + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.timerActive,
    marginRight: 6,
  },
  activeSessionText: {
    ...typography.parentCaption,
    color: colors.timerActive,
    fontWeight: "600",
  },

  /* Section header */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    ...typography.parentH3,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },

  /* Time Bank */
  timeBankGrid: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeBankItem: {
    flex: 1,
    alignItems: "center",
  },
  timeBankValue: {
    ...typography.parentH2,
    color: colors.primary,
    fontWeight: "700",
  },
  timeBankLabel: {
    ...typography.parentSmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timeBankDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },

  /* Active session */
  activeSessionInfo: {
    flexDirection: "row",
  },
  sessionStat: {
    flex: 1,
    alignItems: "center",
  },
  sessionStatValue: {
    ...typography.parentH3,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  sessionStatLabel: {
    ...typography.parentSmall,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* Progress */
  progressGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.md,
  },
  progressItem: {
    width: "50%",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  progressValue: {
    ...typography.parentH2,
    color: colors.primary,
    fontWeight: "700",
  },
  progressLabel: {
    ...typography.parentSmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  xpBarContainer: {
    marginTop: spacing.xs,
  },
  xpBarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  xpBarLabel: {
    ...typography.parentSmall,
    color: colors.textSecondary,
  },
  xpBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  xpBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  xpBarSubtext: {
    ...typography.parentSmall,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },

  /* Weekly */
  weeklyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.sm,
  },
  weeklyStat: {
    width: "25%",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  weeklyValue: {
    ...typography.parentH3,
    color: colors.primary,
    fontWeight: "700",
  },
  weeklyLabel: {
    ...typography.parentSmall,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* Achievements */
  achievementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  achievementItem: {
    width: "33.33%",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  achievementIcon: {
    fontSize: 28,
  },
  achievementName: {
    ...typography.parentSmall,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },

  /* Settings */
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
    ...typography.parentBody,
    color: colors.textSecondary,
    flex: 1,
  },
  settingValue: {
    ...typography.parentBodyBold,
    color: colors.textPrimary,
    textAlign: "right",
  },

  /* Action button */
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Violation status */
  violationStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.error + "08",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  violationCountBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.error + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  violationCountText: {
    ...typography.parentH2,
    color: colors.error,
    fontWeight: "700",
  },
  violationStatusLabel: {
    ...typography.parentBody,
    color: colors.textPrimary,
  },
  violationPenalty: {
    ...typography.parentCaption,
    color: colors.error,
    marginTop: 2,
  },

  /* History items (violations + completions) */
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
    ...typography.parentBody,
    color: colors.textPrimary,
    fontWeight: "600",
    flex: 1,
  },
  historyTime: {
    ...typography.parentSmall,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  historySubtext: {
    ...typography.parentCaption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* Forgive button */
  forgiveBtn: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + "15",
  },
  forgiveBtnText: {
    ...typography.parentSmall,
    color: colors.primary,
    fontWeight: "600",
  },

  /* Completion meta */
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
    ...typography.parentSmall,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  parentNote: {
    ...typography.parentSmall,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: 4,
  },

  /* Empty & misc */
  emptySection: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.parentBody,
    color: colors.textSecondary,
    textAlign: "center",
  },
  showMore: {
    ...typography.parentCaption,
    color: colors.primary,
    textAlign: "center",
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
