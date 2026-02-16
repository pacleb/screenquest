import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { useAuthStore } from "../../store/auth";
import { familyService, FamilyMember } from "../../services/family";
import {
  violationService,
  Violation,
  ViolationStatus,
} from "../../services/violation";
import { colors, spacing, borderRadius, fonts, typography } from "../../theme";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { AppEvents, eventBus } from "../../utils/eventBus";

export default function ConsequencesScreen() {
  const user = useAuthStore((s) => s.user);
  const familyId = user?.familyId;

  const [children, setChildren] = useState<FamilyMember[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [status, setStatus] = useState<ViolationStatus | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showDescInput, setShowDescInput] = useState(false);
  const [description, setDescription] = useState("");

  // Fetch children
  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }
    familyService
      .getMembers(familyId)
      .then((members) => {
        const kids = members.filter((m) => m.role === "child");
        setChildren(kids);
        if (kids.length > 0) {
          setSelectedChildId(kids[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, [familyId]);

  const fetchData = useCallback(async () => {
    if (!selectedChildId) return;
    try {
      const [s, v] = await Promise.all([
        violationService.getViolationStatus(selectedChildId),
        violationService.listViolations(selectedChildId),
      ]);
      setStatus(s);
      setViolations(v);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedChildId]);

  useAutoRefresh({
    fetchData,
    events: [AppEvents.VIOLATION_CHANGED, AppEvents.TIME_BANK_CHANGED],
    intervalMs: 30_000,
  });

  const handleRecordViolation = async () => {
    if (!selectedChildId) return;
    setRecording(true);
    try {
      const result = await violationService.recordViolation(
        selectedChildId,
        description || undefined,
      );
      Alert.alert(
        "Violation Recorded",
        `Violation #${result.violationNumber}: ${result.penaltyHours}h deducted`,
      );
      setShowDescInput(false);
      setDescription("");
      eventBus.emit(AppEvents.VIOLATION_CHANGED);
      eventBus.emit(AppEvents.TIME_BANK_CHANGED);
      fetchData();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to record violation",
      );
    } finally {
      setRecording(false);
    }
  };

  const handleResetCounter = () => {
    if (!selectedChildId) return;
    Alert.alert(
      "Reset Violation Count",
      "This will reset the violation counter to 0. Penalty levels will start over. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await violationService.resetCounter(selectedChildId);
              eventBus.emit(AppEvents.VIOLATION_CHANGED);
              eventBus.emit(AppEvents.TIME_BANK_CHANGED);
              fetchData();
            } catch {
              Alert.alert("Error", "Failed to reset counter");
            }
          },
        },
      ],
    );
  };

  const handleForgive = (violation: Violation) => {
    const hours = violation.penaltySeconds / 60;
    Alert.alert(
      "Forgive Violation",
      `This will refund ${hours}h back to the Time Bank. Are you sure?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Forgive",
          onPress: async () => {
            try {
              await violationService.forgiveViolation(violation.id);
              eventBus.emit(AppEvents.VIOLATION_CHANGED);
              eventBus.emit(AppEvents.TIME_BANK_CHANGED);
              fetchData();
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to forgive",
              );
            }
          },
        },
      ],
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

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
      >
        <Text style={styles.title}>Consequences</Text>

        {/* Child selector */}
        {children.length > 0 && (
          <View style={styles.childSelector}>
            {children.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={[
                  styles.childChip,
                  selectedChildId === child.id && styles.childChipActive,
                ]}
                onPress={() => setSelectedChildId(child.id)}
              >
                <Text
                  style={[
                    styles.childChipText,
                    selectedChildId === child.id && styles.childChipTextActive,
                  ]}
                >
                  {child.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: spacing.xl }}
          />
        ) : (
          <>
            {/* Status Card */}
            {status && (
              <View style={styles.statusCard}>
                <View style={styles.statusRow}>
                  <View style={styles.statusItem}>
                    <Text style={styles.statusValue}>
                      {status.currentCount}
                    </Text>
                    <Text style={styles.statusLabel}>Violations</Text>
                  </View>
                  <View style={styles.statusDivider} />
                  <View style={styles.statusItem}>
                    <Text style={styles.statusValue}>
                      {status.nextPenaltyHours}h
                    </Text>
                    <Text style={styles.statusLabel}>Next Penalty</Text>
                  </View>
                </View>

                {status.currentCount === 0 && (
                  <View style={styles.cleanBadge}>
                    <Text style={styles.cleanText}>Clean record!</Text>
                  </View>
                )}
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionSection}>
              {!showDescInput ? (
                <TouchableOpacity
                  style={styles.recordBtn}
                  onPress={() => setShowDescInput(true)}
                >
                  <Icon name="warning-outline" size={20} color="#FFF" />
                  <Text style={styles.recordBtnText}>Record Violation</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.recordForm}>
                  <TextInput
                    style={styles.descInput}
                    placeholder="What happened? (optional)"
                    placeholderTextColor={colors.textSecondary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                  />
                  <View style={styles.recordActions}>
                    <TouchableOpacity
                      onPress={() => {
                        setShowDescInput(false);
                        setDescription("");
                      }}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.confirmRecordBtn}
                      onPress={handleRecordViolation}
                      disabled={recording}
                    >
                      {recording ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.confirmRecordText}>Record</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {status && status.currentCount > 0 && (
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={handleResetCounter}
                >
                  <Icon
                    name="refresh-outline"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.resetBtnText}>Reset Count</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Violation History */}
            <Text style={styles.sectionTitle}>History</Text>

            {violations.length === 0 ? (
              <View style={styles.empty}>
                <Icon
                  name="happy-outline"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyText}>No violations yet</Text>
                <Text style={styles.emptyHint}>Great job!</Text>
              </View>
            ) : (
              violations.map((violation) => (
                <View
                  key={violation.id}
                  style={[
                    styles.violationCard,
                    violation.forgiven && styles.violationForgiven,
                  ]}
                >
                  <View style={styles.violationHeader}>
                    <View style={styles.violationBadge}>
                      <Text style={styles.violationNumber}>
                        #{violation.violationNumber}
                      </Text>
                    </View>
                    <Text style={styles.violationDate}>
                      {formatDate(violation.createdAt)}
                    </Text>
                    {violation.forgiven && (
                      <View style={styles.forgivenBadge}>
                        <Text style={styles.forgivenText}>Forgiven</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.penaltyText}>
                    -{violation.penaltySeconds / 60}h penalty
                  </Text>

                  {violation.description && (
                    <Text style={styles.violationDesc}>
                      {violation.description}
                    </Text>
                  )}

                  {!violation.forgiven && (
                    <TouchableOpacity
                      style={styles.forgiveBtn}
                      onPress={() => handleForgive(violation)}
                    >
                      <Text style={styles.forgiveBtnText}>Forgive</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg },
  title: {
    ...typography.parentH1,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  childSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  childChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  childChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  childChipText: {
    fontFamily: fonts.parent.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  childChipTextActive: { color: "#FFF" },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusItem: { flex: 1, alignItems: "center" },
  statusValue: {
    fontFamily: fonts.parent.bold,
    fontSize: 36,
    color: colors.textPrimary,
  },
  statusLabel: {
    fontFamily: fonts.parent.medium,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  cleanBadge: {
    marginTop: spacing.md,
    alignItems: "center",
    paddingVertical: spacing.xs,
    backgroundColor: colors.secondary + "15",
    borderRadius: borderRadius.md,
  },
  cleanText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.secondary,
  },
  actionSection: { marginBottom: spacing.lg },
  recordBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  recordBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
  recordForm: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 60,
    textAlignVertical: "top",
  },
  recordActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
    marginTop: spacing.sm,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  confirmRecordBtn: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 80,
    alignItems: "center",
  },
  confirmRecordText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + "10",
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  sectionTitle: {
    ...typography.parentH2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  empty: { alignItems: "center", paddingTop: spacing.xl },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  violationCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  violationForgiven: { opacity: 0.6 },
  violationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  violationBadge: {
    backgroundColor: colors.error + "15",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  violationNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.error,
  },
  violationDate: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  forgivenBadge: {
    backgroundColor: colors.secondary + "15",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  forgivenText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.secondary,
  },
  penaltyText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.error,
    marginBottom: spacing.xs,
  },
  violationDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  forgiveBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  forgiveBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
});
