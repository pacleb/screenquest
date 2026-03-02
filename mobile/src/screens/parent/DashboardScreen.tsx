import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { useAuthStore } from "../../store/auth";
import { useSubscriptionStore } from "../../store/subscription";
import { familyService, FamilyMember } from "../../services/family";
import { timeBankService, TimeBankBalance } from "../../services/timeBank";
import { completionService, QuestCompletion } from "../../services/completion";
import {
  playSessionService,
  PlaySession,
  PendingPlayRequest,
} from "../../services/playSession";
import {
  gamificationService,
  ChildProgressData,
} from "../../services/gamification";
import { themeService, ActivityFeedEntry } from "../../services/theme";
import { formatTimeLabel } from "../../utils/formatTime";
import { colors, spacing, borderRadius, fonts, typography } from "../../theme";
import {
  Card,
  Avatar,
  Badge,
  SectionHeader,
  EmptyState,
  TimeBankDisplay,
  StreakFire,
  ProgressBar,
} from "../../components";
import { WeeklyCompletionChart } from "../../components/ParentCharts";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { AppEvents, eventBus } from "../../utils/eventBus";

interface ChildWeeklyStats {
  questsCompleted: number;
  totalPlaySeconds: number;
  currentStreak: number;
  dailyStats: { date: string; quests: number; playSeconds: number }[];
}

interface ChildData {
  member: FamilyMember;
  balance: TimeBankBalance;
  activeSession: PlaySession | null;
  progress: ChildProgressData | null;
  weeklyStats: ChildWeeklyStats | null;
}

export default function ParentDashboard() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const familyId = user?.familyId;
  const { gracePeriodEndsAt } = useSubscriptionStore();

  const [childrenData, setChildrenData] = useState<ChildData[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<QuestCompletion[]>(
    [],
  );
  const [pendingPlayRequests, setPendingPlayRequests] = useState<
    PendingPlayRequest[]
  >([]);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!familyId) {
      setLoading(false);
      return;
    }
    try {
      const members = await familyService.getMembers(familyId);
      const children = members.filter((m) => m.role === "child");

      // Fetch balance + active session + gamification for each child
      const childDataPromises = children.map(async (child) => {
        const [balance, activeSession, progress, weeklyStats] =
          await Promise.all([
            timeBankService.getBalance(child.id).catch(() => ({
              stackableSeconds: 0,
              nonStackableSeconds: 0,
              totalSeconds: 0,
            })),
            playSessionService.getActiveSession(child.id).catch(() => null),
            gamificationService.getProgress(child.id).catch(() => null),
            gamificationService.getChildWeeklyStats(child.id).catch(() => null),
          ]);
        return { member: child, balance, activeSession, progress, weeklyStats };
      });

      const childData = await Promise.all(childDataPromises);
      setChildrenData(childData);

      // Fetch pending approvals, play requests + activity feed
      const [completions, playRequests, feed] = await Promise.all([
        completionService
          .listFamilyCompletions(familyId, "pending")
          .catch(() => []),
        playSessionService.listPendingRequests(familyId).catch(() => []),
        themeService
          .getActivityFeed(familyId, 1, 5)
          .catch(() => ({ items: [], page: 1, hasMore: false })),
      ]);
      setPendingApprovals(completions.slice(0, 3));
      setPendingPlayRequests(playRequests);
      setActivityFeed(feed.items);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [familyId]);

  useAutoRefresh({
    fetchData,
    events: [
      AppEvents.TIME_BANK_CHANGED,
      AppEvents.PLAY_SESSION_CHANGED,
      AppEvents.QUEST_CHANGED,
      AppEvents.COMPLETION_CHANGED,
      AppEvents.VIOLATION_CHANGED,
      AppEvents.GAMIFICATION_CHANGED,
      AppEvents.FAMILY_CHANGED,
    ],
    intervalMs: 20_000,
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const pendingCount = pendingApprovals.length + pendingPlayRequests.length;
  const CHILD_CHART_COLORS = [
    colors.primary,
    colors.secondary,
    colors.accent,
    "#6B2FA0",
    "#E74C3C",
    "#1ABC9C",
  ];

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
      testID="parent-dashboard-screen"
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
        {/* Header */}
        <Text style={styles.greeting} testID="dashboard-greeting">
          {getGreeting()}, {user?.name}
        </Text>

        {/* Grace Period Banner */}
        {gracePeriodEndsAt && (
          <TouchableOpacity
            style={[styles.trialBanner, styles.graceBanner]}
            onPress={() => navigation.navigate("QuestArchival")}
          >
            <Icon name="warning" size={16} color={colors.error} />
            <Text style={[styles.trialText, { color: colors.error }]}>
              Please choose which quests to keep
            </Text>
            <Icon name="chevron-forward" size={14} color={colors.error} />
          </TouchableOpacity>
        )}

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: spacing.xxl }}
          />
        ) : (
          <>
            {/* Children Overview */}
            <SectionHeader title="Children" />
            {childrenData.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No children yet"
                message="Add a child in the Family tab to get started"
              />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.childScroll}
              >
                {childrenData.map(
                  (
                    { member, balance, activeSession, progress, weeklyStats },
                    idx,
                  ) => (
                    <Card key={member.id} style={styles.childCard}>
                      <Avatar
                        name={member.name}
                        url={member.avatarUrl}
                        size={48}
                      />
                      <Text style={styles.childName} numberOfLines={1}>
                        {member.name}
                      </Text>

                      {/* Level pill */}
                      {progress && (
                        <View style={styles.childStatsRow}>
                          <View style={styles.childLevelPill}>
                            <Text style={styles.childLevelText}>
                              Lv.{progress.level}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Streak row */}
                      {progress && progress.currentStreak > 0 && (
                        <StreakFire streak={progress.currentStreak} size="sm" />
                      )}

                      {/* XP Progress Bar */}
                      {progress && (
                        <View style={styles.childXpRow}>
                          <View style={styles.childXpBar}>
                            <View
                              style={[
                                styles.childXpFill,
                                {
                                  width: `${Math.min(
                                    100,
                                    (progress.xpProgressInLevel /
                                      progress.xpToNextLevel) *
                                      100,
                                  )}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.childXpText}>
                            {progress.weeklyXp} XP
                          </Text>
                        </View>
                      )}

                      {/* Daily activity dots with day labels */}
                      {weeklyStats && weeklyStats.dailyStats.length > 0 && (
                        <View style={styles.weekDotsContainer}>
                          <View style={styles.weekDotsRow}>
                            {weeklyStats.dailyStats.slice(-7).map((d, i) => {
                              const DAY_LABELS = [
                                "Su",
                                "Mo",
                                "Tu",
                                "We",
                                "Th",
                                "Fr",
                                "Sa",
                              ];
                              const dayLabel =
                                DAY_LABELS[
                                  new Date(d.date + "T12:00:00").getDay()
                                ];
                              return (
                                <View key={i} style={styles.weekDayItem}>
                                  <View
                                    style={[
                                      styles.weekDot,
                                      d.quests > 0 && {
                                        backgroundColor:
                                          CHILD_CHART_COLORS[
                                            idx % CHILD_CHART_COLORS.length
                                          ],
                                      },
                                    ]}
                                  />
                                  <Text style={styles.weekDayLabel}>
                                    {dayLabel}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      <TimeBankDisplay
                        stackableSeconds={balance.stackableSeconds}
                        nonStackableSeconds={balance.nonStackableSeconds}
                        totalSeconds={balance.totalSeconds}
                        compact
                      />
                      {activeSession &&
                        (activeSession.status === "active" ||
                          activeSession.status === "paused") && (
                          <View style={styles.activeIndicator}>
                            <View
                              style={[
                                styles.pulseDot,
                                activeSession.status === "paused" &&
                                  styles.pausedDot,
                              ]}
                            />
                            <Text style={styles.activeText}>
                              {activeSession.status === "active"
                                ? `${formatTimeLabel(activeSession.remainingSeconds)} left`
                                : "Paused"}
                            </Text>
                          </View>
                        )}
                      {activeSession &&
                        activeSession.status === "requested" && (
                          <Badge label="Needs Approval" variant="warning" />
                        )}
                    </Card>
                  ),
                )}
              </ScrollView>
            )}

            {/* Pending Play Requests */}
            {pendingPlayRequests.length > 0 && (
              <View style={styles.approvalSection}>
                <SectionHeader
                  title={`Play Requests (${pendingPlayRequests.length})`}
                  action="See all"
                  onAction={() => navigation.navigate("Approvals")}
                />
                {pendingPlayRequests.map((req) => (
                  <Card key={req.id} style={styles.approvalCard}>
                    <View style={styles.approvalTop}>
                      <Avatar
                        name={req.child.name}
                        size={32}
                        bgColor={colors.accent + "30"}
                      />
                      <View style={styles.approvalInfo}>
                        <Text style={styles.approvalChild}>
                          {req.child.name}
                        </Text>
                        <Text style={styles.approvalQuest}>
                          🎮 Wants to start playing
                        </Text>
                      </View>
                    </View>
                    <View style={styles.approvalActions}>
                      <TouchableOpacity
                        style={styles.denyBtn}
                        onPress={async () => {
                          try {
                            await playSessionService.deny(req.id);
                            eventBus.emit(AppEvents.PLAY_SESSION_CHANGED);
                            fetchData();
                          } catch {
                            /* silent */
                          }
                        }}
                        accessibilityLabel="Deny play request"
                        accessibilityRole="button"
                      >
                        <Icon name="close" size={18} color={colors.error} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={async () => {
                          try {
                            await playSessionService.approve(req.id);
                            eventBus.emit(AppEvents.PLAY_SESSION_CHANGED);
                            fetchData();
                          } catch {
                            /* silent */
                          }
                        }}
                        accessibilityLabel="Approve play request"
                        accessibilityRole="button"
                      >
                        <Icon name="checkmark" size={18} color="#FFF" />
                        <Text style={styles.approveBtnText}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))}
              </View>
            )}

            {/* Pending Approvals (quest completions) */}
            {pendingApprovals.length > 0 && (
              <View style={styles.approvalSection}>
                <SectionHeader
                  title={`Pending Approvals (${pendingApprovals.length})`}
                  action="See all"
                  onAction={() => navigation.navigate("Approvals")}
                />
                {pendingApprovals.map((completion) => (
                  <Card key={completion.id} style={styles.approvalCard}>
                    <View style={styles.approvalTop}>
                      <Avatar
                        name={completion.child?.name || "?"}
                        size={32}
                        bgColor={colors.secondary + "30"}
                      />
                      <View style={styles.approvalInfo}>
                        <Text style={styles.approvalChild}>
                          {completion.child?.name}
                        </Text>
                        <Text style={styles.approvalQuest}>
                          {completion.quest.icon} {completion.quest.name}
                        </Text>
                      </View>
                      <Badge
                        label={formatTimeLabel(completion.earnedSeconds)}
                        variant="primary"
                      />
                    </View>
                    {completion.proofImageUrl && (
                      <View style={styles.proofRow}>
                        <Image
                          source={{ uri: completion.proofImageUrl }}
                          style={styles.proofThumb}
                        />
                        <Text style={styles.proofLabel}>
                          Proof photo submitted
                        </Text>
                      </View>
                    )}
                    <View style={styles.approvalActions}>
                      <TouchableOpacity
                        style={styles.denyBtn}
                        onPress={() => navigation.navigate("Approvals")}
                        accessibilityLabel="Deny quest completion"
                        accessibilityRole="button"
                      >
                        <Icon name="close" size={18} color={colors.error} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={async () => {
                          try {
                            await completionService.approveCompletion(
                              completion.id,
                            );
                            eventBus.emit(AppEvents.COMPLETION_CHANGED);
                            eventBus.emit(AppEvents.TIME_BANK_CHANGED);
                            fetchData();
                          } catch {
                            /* silent */
                          }
                        }}
                        accessibilityLabel="Approve quest completion"
                        accessibilityRole="button"
                        accessibilityHint="Approves this quest and awards time"
                      >
                        <Icon name="checkmark" size={18} color="#FFF" />
                        <Text style={styles.approveBtnText}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))}
              </View>
            )}

            {/* Active Sessions */}
            {childrenData.some(
              (c) =>
                c.activeSession &&
                ["active", "paused"].includes(c.activeSession.status),
            ) && (
              <View style={styles.sessionSection}>
                <SectionHeader title="Active Sessions" />
                {childrenData
                  .filter(
                    (c) =>
                      c.activeSession &&
                      ["active", "paused"].includes(c.activeSession!.status),
                  )
                  .map(({ member, activeSession }) => (
                    <Card
                      key={member.id}
                      style={styles.sessionCard}
                      accentColor={
                        activeSession!.status === "active"
                          ? colors.secondary
                          : colors.accent
                      }
                    >
                      <View style={styles.sessionRow}>
                        <Avatar name={member.name} size={36} />
                        <View style={styles.sessionInfo}>
                          <Text style={styles.sessionName}>{member.name}</Text>
                          <Text style={styles.sessionTime}>
                            {formatTimeLabel(activeSession!.remainingSeconds)}{" "}
                            remaining
                          </Text>
                        </View>
                        <View style={styles.sessionActions}>
                          <TouchableOpacity
                            style={styles.sessionActionBtn}
                            onPress={async () => {
                              try {
                                await playSessionService.end(activeSession!.id);
                                eventBus.emit(AppEvents.PLAY_SESSION_CHANGED);
                                eventBus.emit(AppEvents.TIME_BANK_CHANGED);
                                fetchData();
                              } catch {
                                /* silent */
                              }
                            }}
                            accessibilityLabel={`Stop ${member.name}'s play session`}
                            accessibilityRole="button"
                          >
                            <Icon
                              name="stop-circle-outline"
                              size={24}
                              color={colors.error}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Card>
                  ))}
              </View>
            )}

            {/* Quick Stats */}
            <View style={styles.statsRow} testID="dashboard-stats-row">
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{childrenData.length}</Text>
                <Text style={styles.statLabel}>Children</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{pendingCount}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>
                  {
                    childrenData.filter(
                      (c) =>
                        c.activeSession && c.activeSession.status === "active",
                    ).length
                  }
                </Text>
                <Text style={styles.statLabel}>Playing</Text>
              </Card>
            </View>

            {/* Insights Charts */}
            {childrenData.length > 0 && (
              <View style={styles.chartsSection}>
                <SectionHeader title="Weekly Insights" />

                {/* Weekly quest completions per child */}
                <WeeklyCompletionChart
                  children={childrenData
                    .filter((c) => c.weeklyStats)
                    .map((c, idx) => ({
                      childName: c.member.name,
                      questsCompleted: c.weeklyStats!.questsCompleted,
                      color:
                        CHILD_CHART_COLORS[idx % CHILD_CHART_COLORS.length],
                    }))}
                />
              </View>
            )}

            {/* Activity Feed */}
            {activityFeed.length > 0 && (
              <View style={styles.feedSection}>
                <SectionHeader title="Recent Activity" />
                {activityFeed.map((item, idx) => (
                  <View key={idx} style={styles.feedItem}>
                    <View style={styles.feedIconWrap}>
                      <Text style={styles.feedIcon}>{item.icon}</Text>
                    </View>
                    <View style={styles.feedContent}>
                      <Text style={styles.feedMessage}>
                        <Text style={styles.feedChildName}>
                          {item.childName}
                        </Text>{" "}
                        {item.message}
                      </Text>
                      <Text style={styles.feedTime}>
                        {formatTimeAgo(item.timestamp)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  greeting: {
    ...typography.parentH1,
    fontWeight: "bold",
    color: colors.primary,
    textAlign: "left",
    marginBottom: spacing.md,
  },
  childScroll: { paddingRight: spacing.lg, marginBottom: spacing.lg },
  childCard: {
    width: 140,
    alignItems: "center",
    marginRight: spacing.sm,
    paddingVertical: spacing.md,
  },
  childName: {
    fontFamily: fonts.parent.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  childStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.xs,
  },
  childLevelPill: {
    backgroundColor: colors.primary + "15",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  childLevelText: {
    fontFamily: fonts.parent.bold,
    fontSize: 11,
    color: colors.primary,
  },
  childXpRow: {
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.xs,
    gap: 3,
  },
  childXpBar: {
    width: "100%",
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  childXpFill: {
    height: "100%",
    backgroundColor: colors.secondary,
    borderRadius: 2,
  },
  childXpText: {
    fontFamily: fonts.parent.medium,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: "center",
  },
  activeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  pausedDot: { backgroundColor: colors.accent },
  activeText: {
    fontFamily: fonts.parent.medium,
    fontSize: 12,
    color: colors.secondary,
  },
  approvalSection: { marginBottom: spacing.lg },
  approvalCard: { marginBottom: spacing.sm },
  approvalTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  approvalInfo: { flex: 1 },
  approvalChild: {
    fontFamily: fonts.parent.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  approvalQuest: {
    fontFamily: fonts.parent.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
  approvalActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  proofRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  proofThumb: { width: 48, height: 48, borderRadius: borderRadius.sm },
  proofLabel: { fontSize: 12, color: colors.textSecondary },
  denyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.error + "10",
    justifyContent: "center",
    alignItems: "center",
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
  },
  approveBtnText: {
    fontFamily: fonts.parent.semiBold,
    fontSize: 14,
    color: "#FFF",
  },
  sessionSection: { marginBottom: spacing.lg },
  sessionCard: { marginBottom: spacing.sm },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sessionInfo: { flex: 1 },
  sessionName: {
    fontFamily: fonts.parent.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sessionTime: {
    fontFamily: fonts.parent.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  sessionActions: { flexDirection: "row", gap: spacing.sm },
  sessionActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.error + "10",
    justifyContent: "center",
    alignItems: "center",
  },
  trialBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent + "15",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  graceBanner: {
    backgroundColor: colors.error + "10",
  },
  trialText: {
    flex: 1,
    fontFamily: fonts.parent.medium,
    fontSize: 13,
    color: colors.accent,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  statValue: {
    fontFamily: fonts.parent.bold,
    fontSize: 24,
    color: colors.primary,
  },
  statLabel: {
    fontFamily: fonts.parent.medium,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  feedSection: {
    marginTop: spacing.lg,
  },
  chartsSection: {
    marginTop: spacing.lg,
  },
  feedItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  feedIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + "10",
    justifyContent: "center",
    alignItems: "center",
  },
  feedIcon: { fontSize: 16 },
  feedContent: { flex: 1 },
  feedChildName: {
    fontFamily: fonts.parent.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  feedMessage: {
    fontFamily: fonts.parent.regular,
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  feedTime: {
    fontFamily: fonts.parent.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  weekDotsContainer: {
    width: "100%",
    marginBottom: spacing.xs,
  },
  weekDotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 3,
  },
  weekDayItem: {
    alignItems: "center",
    gap: 2,
  },
  weekDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  weekDayLabel: {
    fontFamily: fonts.parent.regular,
    fontSize: 8,
    color: colors.textSecondary,
  },
});
