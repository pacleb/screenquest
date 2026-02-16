import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { useAuthStore } from "../../store/auth";
import { useSubscriptionStore } from "../../store/subscription";
import { questService, Quest } from "../../services/quest";
import { subscriptionService } from "../../services/subscription";
import { colors, spacing, borderRadius, fonts, typography } from "../../theme";
import { Card, Button } from "../../components";
import { eventBus, AppEvents } from "../../utils/eventBus";

const MAX_KEEP = 3;

export default function QuestArchivalScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const familyId = user?.familyId;
  const { gracePeriodEndsAt } = useSubscriptionStore();
  const fetchStatus = useSubscriptionStore((s) => s.fetchStatus);

  const [quests, setQuests] = useState<Quest[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!familyId || !user?.id) return;
    questService
      .list(familyId, { archived: false })
      .then((qs) => {
        setQuests(qs);
        // Pre-select the 3 oldest
        const preselected = qs
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          )
          .slice(0, MAX_KEEP)
          .map((q) => q.id);
        setSelectedIds(new Set(preselected));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [familyId, user?.id]);

  const toggleQuest = (questId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(questId)) {
        next.delete(questId);
      } else if (next.size < MAX_KEEP) {
        next.add(questId);
      } else {
        Alert.alert(
          "Limit Reached",
          `You can only keep ${MAX_KEEP} quests on the free plan.`,
        );
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!familyId) return;
    if (selectedIds.size !== MAX_KEEP) {
      Alert.alert(
        "Select Quests",
        `Please select exactly ${MAX_KEEP} quests to keep.`,
      );
      return;
    }

    setSaving(true);
    try {
      await subscriptionService.archiveQuests(
        familyId,
        Array.from(selectedIds),
      );
      await fetchStatus(familyId);
      eventBus.emit(AppEvents.QUEST_CHANGED);
      Alert.alert("Done", "The remaining quests have been archived.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert("Error", "Failed to archive quests. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const daysRemaining = gracePeriodEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(gracePeriodEndsAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: spacing.xxl }}
        />
      </SafeAreaView>
    );
  }

  if (quests.length <= MAX_KEEP) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.allGood}>
          <Icon name="checkmark-circle" size={64} color={colors.secondary} />
          <Text style={styles.allGoodTitle}>All Good!</Text>
          <Text style={styles.allGoodDesc}>
            You have {quests.length} active quest
            {quests.length !== 1 ? "s" : ""}, which is within the free plan
            limit.
          </Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="secondary"
            size="lg"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.title}>Choose Quests to Keep</Text>
        <Text style={styles.subtitle}>
          Your plan changed to Free. You have {quests.length} active quests but
          the free plan allows {MAX_KEEP}. Please choose which {MAX_KEEP} to
          keep — the rest will be archived.
        </Text>

        {daysRemaining !== null && (
          <View style={styles.countdownBanner}>
            <Icon name="time-outline" size={16} color={colors.accent} />
            <Text style={styles.countdownText}>
              {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} until
              auto-archival
            </Text>
          </View>
        )}

        <Text style={styles.selectionCount}>
          {selectedIds.size}/{MAX_KEEP} selected
        </Text>

        {/* Quest List */}
        {quests.map((quest) => {
          const isSelected = selectedIds.has(quest.id);
          return (
            <TouchableOpacity
              key={quest.id}
              onPress={() => toggleQuest(quest.id)}
            >
              <Card
                style={
                  isSelected
                    ? { ...styles.questCard, ...styles.questCardSelected }
                    : styles.questCard
                }
              >
                <View style={styles.questRow}>
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                    ]}
                  >
                    {isSelected && (
                      <Icon name="checkmark" size={16} color="#FFF" />
                    )}
                  </View>
                  <Text style={styles.questIcon}>{quest.icon}</Text>
                  <View style={styles.questInfo}>
                    <Text style={styles.questName}>{quest.name}</Text>
                    <Text style={styles.questMeta}>
                      {quest.rewardSeconds}m • {quest.category}
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: spacing.lg }} />

        <Button
          title={
            saving
              ? "Archiving..."
              : `Keep ${selectedIds.size} Quests & Archive Rest`
          }
          onPress={handleConfirm}
          disabled={saving || selectedIds.size !== MAX_KEEP}
          size="lg"
        />

        <TouchableOpacity
          style={styles.upgradeLink}
          onPress={() => navigation.navigate("Paywall")}
        >
          <Text style={styles.upgradeLinkText}>
            Or upgrade to Premium to keep all quests
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  backBtn: { marginBottom: spacing.md },
  title: {
    ...typography.parentH1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.parent.regular,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  countdownBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent + "15",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  countdownText: {
    fontFamily: fonts.parent.medium,
    fontSize: 13,
    color: colors.accent,
  },
  selectionCount: {
    fontFamily: fonts.parent.semiBold,
    fontSize: 14,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  questCard: {
    marginBottom: spacing.sm,
  },
  questCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  questRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  questIcon: { fontSize: 24 },
  questInfo: { flex: 1 },
  questName: {
    fontFamily: fonts.parent.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  questMeta: {
    fontFamily: fonts.parent.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  upgradeLink: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  upgradeLinkText: {
    fontFamily: fonts.parent.medium,
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: "underline",
  },
  allGood: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  allGoodTitle: {
    ...typography.parentH1,
    color: colors.secondary,
  },
  allGoodDesc: {
    fontFamily: fonts.parent.regular,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
});
