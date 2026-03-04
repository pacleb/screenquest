import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { useAuthStore } from "../../store/auth";
import { completionService, QuestCompletion } from "../../services/completion";
import {
  playSessionService,
  PendingPlayRequest,
} from "../../services/playSession";
import { colors, spacing, borderRadius, fonts, typography } from "../../theme";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { AppEvents, eventBus } from "../../utils/eventBus";
import { formatTimeLabel } from "../../utils/formatTime";

type FilterTab = "pending" | "approved" | "denied" | "all";

export default function ApprovalsScreen() {
  const user = useAuthStore((s) => s.user);
  const familyId = user?.familyId;

  const [completions, setCompletions] = useState<QuestCompletion[]>([]);
  const [playRequests, setPlayRequests] = useState<PendingPlayRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyNote, setDenyNote] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchCompletions = useCallback(async () => {
    if (!familyId) return;
    try {
      const status = filter === "all" ? undefined : filter;
      const playFilter =
        filter === "all"
          ? undefined
          : (filter as "pending" | "approved" | "denied");
      const [data, requests] = await Promise.all([
        completionService.listFamilyCompletions(familyId, status),
        playSessionService
          .listFamilyPlaySessions(familyId, playFilter)
          .catch(() => []),
      ]);
      setCompletions(data);
      setPlayRequests(requests);
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load approvals";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [familyId, filter]);

  // Re-fetch immediately whenever the filter tab changes
  useEffect(() => {
    setLoading(true);
    fetchCompletions();
  }, [fetchCompletions]);

  useAutoRefresh({
    fetchData: fetchCompletions,
    events: [AppEvents.COMPLETION_CHANGED, AppEvents.PLAY_SESSION_CHANGED],
    intervalMs: 15_000,
  });

  const handleApprove = async (completion: QuestCompletion) => {
    setProcessing(completion.id);
    try {
      await completionService.approveCompletion(completion.id);
      eventBus.emit(AppEvents.COMPLETION_CHANGED);
      eventBus.emit(AppEvents.TIME_BANK_CHANGED);
      fetchCompletions();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to approve";
      Alert.alert("Error", msg);
    } finally {
      setProcessing(null);
    }
  };

  const handleApprovePlay = async (sessionId: string) => {
    setProcessing(sessionId);
    try {
      await playSessionService.approve(sessionId);
      eventBus.emit(AppEvents.PLAY_SESSION_CHANGED);
      fetchCompletions();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to approve";
      Alert.alert("Error", msg);
    } finally {
      setProcessing(null);
    }
  };

  const handleDenyPlay = async (sessionId: string) => {
    setProcessing(sessionId);
    try {
      await playSessionService.deny(sessionId);
      eventBus.emit(AppEvents.PLAY_SESSION_CHANGED);
      fetchCompletions();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to deny";
      Alert.alert("Error", msg);
    } finally {
      setProcessing(null);
    }
  };

  const handleDeny = async (completionId: string) => {
    setProcessing(completionId);
    try {
      await completionService.denyCompletion(
        completionId,
        denyNote || undefined,
      );
      setDenyingId(null);
      setDenyNote("");
      eventBus.emit(AppEvents.COMPLETION_CHANGED);
      fetchCompletions();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to deny";
      Alert.alert("Error", msg);
    } finally {
      setProcessing(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  };

  const pendingCount =
    completions.filter((c) => c.status === "pending").length +
    playRequests.length;

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right"]}
      testID="parent-approvals-screen"
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Approvals</Text>
        {filter === "pending" && pendingCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{pendingCount}</Text>
          </View>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(["pending", "approved", "denied", "all"] as FilterTab[]).map(
          (tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.filterTab,
                filter === tab && styles.filterTabActive,
              ]}
              onPress={() => setFilter(tab)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === tab && styles.filterTextActive,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </View>

      <FlatList
        data={completions}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchCompletions();
            }}
          />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          playRequests.length > 0 ? (
            <View style={styles.playRequestsSection}>
              <Text style={styles.playRequestsHeading}>
                🎮 Play Sessions ({playRequests.length})
              </Text>
              {playRequests.map((req) => {
                const isApproved = [
                  "active",
                  "paused",
                  "completed",
                  "stopped",
                ].includes(req.status);
                const isDenied = req.status === "denied";
                const isPending = req.status === "requested";
                return (
                  <View key={req.id} style={styles.playRequestCard}>
                    <View style={styles.cardTop}>
                      <View style={styles.childInfo}>
                        <View style={styles.childAvatar}>
                          {req.child.avatarUrl ? (
                            <Text style={styles.avatarEmoji}>
                              {req.child.avatarUrl}
                            </Text>
                          ) : (
                            <Text style={styles.avatarText}>
                              {req.child.name.charAt(0).toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <View>
                          <Text style={styles.childName}>{req.child.name}</Text>
                          <Text style={styles.timestamp}>
                            {formatTime(req.createdAt)}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          isPending && styles.statusPending,
                          isApproved && styles.statusApproved,
                          isDenied && styles.statusDenied,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            isPending && { color: colors.accent },
                            isApproved && { color: colors.secondary },
                            isDenied && { color: colors.error },
                          ]}
                        >
                          {isPending
                            ? "Pending"
                            : isApproved
                              ? "Approved"
                              : "Denied"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.questRow}>
                      <Text style={styles.questIcon}>🎮</Text>
                      <View style={styles.questInfo}>
                        <Text style={styles.questName}>Play Request</Text>
                        <Text style={styles.questReward}>Play Request</Text>
                      </View>
                    </View>
                    {isPending && (
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.denyBtn}
                          onPress={() => handleDenyPlay(req.id)}
                          disabled={processing === req.id}
                        >
                          <Icon
                            name="close-circle-outline"
                            size={20}
                            color={colors.error}
                          />
                          <Text style={styles.denyBtnText}>Deny</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.approveBtn}
                          onPress={() => handleApprovePlay(req.id)}
                          disabled={processing === req.id}
                        >
                          {processing === req.id ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <Icon
                                name="checkmark-circle-outline"
                                size={20}
                                color="#FFF"
                              />
                              <Text style={styles.approveBtnText}>Approve</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading && playRequests.length === 0 ? (
            <View style={styles.empty}>
              <Icon
                name="checkmark-done-circle-outline"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>
                {filter === "pending"
                  ? "No pending approvals"
                  : "No completions found"}
              </Text>
              <Text style={styles.emptyHint}>
                {filter === "pending"
                  ? "All caught up!"
                  : "Quest completions will appear here"}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item: completion }) => (
          <View style={styles.completionCard}>
            {/* Child info + quest info */}
            <View style={styles.cardTop}>
              <View style={styles.childInfo}>
                <View style={styles.childAvatar}>
                  {completion.child?.avatarUrl ? (
                    <Text style={styles.avatarEmoji}>
                      {completion.child.avatarUrl}
                    </Text>
                  ) : (
                    <Text style={styles.avatarText}>
                      {completion.child?.name?.charAt(0).toUpperCase() || "?"}
                    </Text>
                  )}
                </View>
                <View>
                  <Text style={styles.childName}>{completion.child?.name}</Text>
                  <Text style={styles.timestamp}>
                    {formatTime(completion.completedAt)}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  completion.status === "approved" && styles.statusApproved,
                  completion.status === "denied" && styles.statusDenied,
                  completion.status === "pending" && styles.statusPending,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    completion.status === "approved" && {
                      color: colors.secondary,
                    },
                    completion.status === "denied" && { color: colors.error },
                    completion.status === "pending" && { color: colors.accent },
                  ]}
                >
                  {completion.status.charAt(0).toUpperCase() +
                    completion.status.slice(1)}
                </Text>
              </View>
            </View>

            {/* Quest details */}
            <View style={styles.questRow}>
              <Text style={styles.questIcon}>{completion.quest.icon}</Text>
              <View style={styles.questInfo}>
                <Text style={styles.questName}>{completion.quest.name}</Text>
                <Text style={styles.questReward}>
                  {formatTimeLabel(completion.earnedSeconds)}
                  {completion.stackingType === "non_stackable"
                    ? " (Today Only)"
                    : ""}
                </Text>
              </View>
            </View>

            {/* Proof image */}
            {completion.proofImageUrl && (
              <View style={styles.proofContainer}>
                <Image
                  source={{ uri: completion.proofImageUrl }}
                  style={styles.proofImage}
                  resizeMode="cover"
                />
                <Text style={styles.proofLabel}>Proof photo submitted</Text>
              </View>
            )}

            {/* Parent note (if denied) */}
            {completion.parentNote && completion.status === "denied" && (
              <View style={styles.noteRow}>
                <Text style={styles.noteLabel}>Note:</Text>
                <Text style={styles.noteText}>{completion.parentNote}</Text>
              </View>
            )}

            {/* Deny note input */}
            {denyingId === completion.id && (
              <View style={styles.denyForm}>
                <TextInput
                  style={styles.denyInput}
                  placeholder="Add a note (optional)"
                  placeholderTextColor={colors.textSecondary}
                  value={denyNote}
                  onChangeText={setDenyNote}
                  multiline
                />
                <View style={styles.denyActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setDenyingId(null);
                      setDenyNote("");
                    }}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmDenyBtn}
                    onPress={() => handleDeny(completion.id)}
                    disabled={processing === completion.id}
                  >
                    {processing === completion.id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.confirmDenyText}>Deny</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Approve / Deny actions (for pending items) */}
            {completion.status === "pending" && denyingId !== completion.id && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.denyBtn}
                  onPress={() => setDenyingId(completion.id)}
                  testID="approval-deny-btn"
                >
                  <Icon
                    name="close-circle-outline"
                    size={20}
                    color={colors.error}
                  />
                  <Text style={styles.denyBtnText}>Deny</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApprove(completion)}
                  disabled={processing === completion.id}
                  testID="approval-approve-btn"
                >
                  {processing === completion.id ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Icon
                        name="checkmark-circle-outline"
                        size={20}
                        color="#FFF"
                      />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.parentH1,
    fontWeight: "bold",
    color: colors.primary,
    textAlign: "left",
  },
  countBadge: {
    backgroundColor: colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  countText: { fontFamily: fonts.parent.bold, fontSize: 13, color: "#FFF" },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontFamily: fonts.parent.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  filterTextActive: { color: "#FFF" },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyText: {
    fontFamily: fonts.parent.bold,
    fontSize: 18,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyHint: {
    fontFamily: fonts.parent.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  completionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  childInfo: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  childAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary + "30",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700", color: colors.secondary },
  avatarEmoji: { fontSize: 20 },
  childName: {
    fontFamily: fonts.parent.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  timestamp: { fontSize: 12, color: colors.textSecondary },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusPending: { backgroundColor: colors.accent + "20" },
  statusApproved: { backgroundColor: colors.secondary + "20" },
  statusDenied: { backgroundColor: colors.error + "20" },
  statusText: { fontSize: 11, fontWeight: "700" },
  questRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  questIcon: { fontSize: 28, marginRight: spacing.sm },
  questInfo: { flex: 1 },
  questName: {
    fontFamily: fonts.parent.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  questReward: {
    fontFamily: fonts.parent.medium,
    fontSize: 13,
    color: colors.primary,
    marginTop: 2,
  },
  proofContainer: {
    marginBottom: spacing.sm,
  },
  proofImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: borderRadius.md,
  },
  proofLabel: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
  noteRow: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.sm },
  noteLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  noteText: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  denyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error + "10",
    borderWidth: 1,
    borderColor: colors.error + "30",
  },
  denyBtnText: { fontSize: 14, fontWeight: "600", color: colors.error },
  approveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondary,
  },
  approveBtnText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  denyForm: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  denyInput: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 60,
    textAlignVertical: "top",
  },
  denyActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
    marginTop: spacing.sm,
    alignItems: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  confirmDenyBtn: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 70,
    alignItems: "center",
  },
  confirmDenyText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  playRequestsSection: { marginBottom: spacing.lg },
  playRequestsHeading: {
    fontFamily: fonts.parent.bold,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  playRequestCard: {
    backgroundColor: colors.accent + "10",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent + "30",
  },
});
