import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { useAuthStore } from "../../store/auth";
import { useSubscriptionStore } from "../../store/subscription";
import { familyService, FamilyMember } from "../../services/family";
import { timeBankService, TimeBankBalance } from "../../services/timeBank";
import { completionService, QuestCompletion } from "../../services/completion";
import { playSessionService, PlaySession } from "../../services/playSession";
import {
  gamificationService,
  ChildProgressData,
} from "../../services/gamification";
import { themeService, ActivityFeedEntry } from "../../services/theme";
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
import {
  WeeklyCompletionChart,
  ScreenTimeTrend,
  StreakCalendar,
} from "../../components/ParentCharts";

interface ChildWeeklyStats {
  questsCompleted: number;
  totalPlayMinutes: number;
  currentStreak: number;
  dailyStats: { date: string; quests: number; playMinutes: number }[];
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
  const { isTrialing, trialDaysRemaining, gracePeriodEndsAt } =
    useSubscriptionStore();

  const [childrenData, setChildrenData] = useState<ChildData[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<QuestCompletion[]>(
    [],
  );
  const [activityFeed, setActivityFeed] = useState<ActivityFeedEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!familyId) return;
    try {
      const members = await familyService.getMembers(familyId);
      const children = members.filter((m) => m.role === "child");

      // Fetch balance + active session + gamification for each child
      const childDataPromises = children.map(async (child) => {
        const [balance, activeSession, progress, weeklyStats] =
          await Promise.all([
            timeBankService.getBalance(child.id).catch(() => ({
              stackableMinutes: 0,
              nonStackableMinutes: 0,
              totalMinutes: 0,
            })),
            playSessionService.getActiveSession(child.id).catch(() => null),
            gamificationService.getProgress(child.id).catch(() => null),
            gamificationService.getChildWeeklyStats(child.id).catch(() => null),
          ]);
        return { member: child, balance, activeSession, progress, weeklyStats };
      });

      const childData = await Promise.all(childDataPromises);
      setChildrenData(childData);

      // Fetch pending approvals + activity feed
      const [completions, feed] = await Promise.all([
        completionService
          .listFamilyCompletions(familyId, "pending")
          .catch(() => []),
        themeService
          .getActivityFeed(familyId, 1, 5)
          .catch(() => ({ items: [], page: 1, hasMore: false })),
      ]);
      setPendingApprovals(completions.slice(0, 3));
      setActivityFeed(feed.items);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [familyId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const pendingCount = pendingApprovals.length;
  const CHILD_CHART_COLORS = [
    colors.primary,
    colors.secondary,
    colors.accent,
    "#9B59B6",
    "#E74C3C",
    "#1ABC9C",
  ];

  return (
    <SafeAreaView style={styles.container}>
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
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              {getGreeting()}, {user?.name}
            </Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={logout}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Log out"
            accessibilityRole="button"
          >
            <Icon
              name="log-out-outline"
              size={22}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Trial Banner */}
        {isTrialing && trialDaysRemaining !== null && (
          <TouchableOpacity
            style={styles.trialBanner}
            onPress={() => navigation.navigate("Paywall")}
          >
            <Icon name="sparkles" size={16} color={colors.accent} />
            <Text style={styles.trialText}>
              Free Trial — {trialDaysRemaining} day
              {trialDaysRemaining !== 1 ? "s" : ""} remaining
            </Text>
            <Icon name="chevron-forward" size={14} color={colors.accent} />
          </TouchableOpacity>
        )}

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
                  ({ member, balance, activeSession, progress }) => (
                    <Card key={member.id} style={styles.childCard}>
                      <Avatar
                        name={member.name}
                        url={member.avatarUrl}
                        size={48}
                      />
                      <Text style={styles.childName} numberOfLines={1}>
                        {member.name}
                      </Text>

                      {/* Level + Streak pills */}
                      {progress && (
                        <View style={styles.childStatsRow}>
                          <View style={styles.childLevelPill}>
                            <Text style={styles.childLevelText}>
                              Lv.{progress.level}
                            </Text>
                          </View>
                          {progress.currentStreak > 0 && (
                            <StreakFire
                              streak={progress.currentStreak}
                              size="sm"
                            />
                          )}
                        </View>
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

                      <TimeBankDisplay
                        stackableMinutes={balance.stackableMinutes}
                        nonStackableMinutes={balance.nonStackableMinutes}
                        totalMinutes={balance.totalMinutes}
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
                                ? `${activeSession.remainingMinutes}m left`
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

            {/* Pending Approvals */}
            {pendingCount > 0 && (
              <View style={styles.approvalSection}>
                <SectionHeader
                  title={`Pending Approvals (${pendingCount})`}
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
                        label={`${completion.earnedMinutes}m`}
                        variant="primary"
                      />
                    </View>
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
                            {activeSession!.remainingMinutes} min remaining
                          </Text>
                        </View>
                        <View style={styles.sessionActions}>
                          <TouchableOpacity
                            style={styles.sessionActionBtn}
                            onPress={async () => {
                              try {
                                await playSessionService.end(activeSession!.id);
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
            <View style={styles.statsRow}>
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

                {/* Screen time trend per child */}
                {childrenData.map((c, idx) =>
                  c.weeklyStats && c.weeklyStats.dailyStats.length > 0 ? (
                    <ScreenTimeTrend
                      key={c.member.id}
                      data={c.weeklyStats.dailyStats.map((d) => ({
                        date: d.date,
                        minutesUsed: d.playMinutes,
                      }))}
                      label={`${c.member.name}'s Screen Time`}
                      accentColor={
                        CHILD_CHART_COLORS[idx % CHILD_CHART_COLORS.length]
                      }
                    />
                  ) : null,
                )}

                {/* Streak calendar per child */}
                {childrenData.map((c, idx) =>
                  c.weeklyStats && c.weeklyStats.dailyStats.length > 0 ? (
                    <StreakCalendar
                      key={c.member.id}
                      childName={c.member.name}
                      streakColor={
                        CHILD_CHART_COLORS[idx % CHILD_CHART_COLORS.length]
                      }
                      days={c.weeklyStats.dailyStats.map((d) => ({
                        date: d.date,
                        completed: d.quests > 0,
                      }))}
                    />
                  ) : null,
                )}
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
                      <Text style={styles.feedMessage}>{item.message}</Text>
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
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xl,
  },
  headerLeft: { flex: 1 },
  greeting: {
    ...typography.parentH1,
    color: colors.textPrimary,
  },
  date: {
    fontFamily: fonts.parent.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: "100%",
    marginBottom: spacing.xs,
  },
  childXpBar: {
    flex: 1,
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
});
