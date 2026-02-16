import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { useAuthStore } from "../../store/auth";
import { questService, Quest } from "../../services/quest";
import { colors, spacing, borderRadius } from "../../theme";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { AppEvents, eventBus } from "../../utils/eventBus";

const CATEGORY_LABELS: Record<string, string> = {
  chores: "Chores",
  studying: "Studying",
  exercise: "Exercise",
  reading: "Reading",
  creative: "Creative",
  helping_others: "Helping Others",
  custom: "Custom",
};

type FilterTab = "all" | "active" | "archived";

export default function QuestsScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("active");
  const [questCount, setQuestCount] = useState({ activeQuests: 0, limit: 3 });

  const familyId = user?.familyId;

  const fetchQuests = useCallback(async () => {
    if (!familyId) return;
    try {
      const archived =
        filter === "archived" ? true : filter === "active" ? false : undefined;
      const [data, count] = await Promise.all([
        questService.list(familyId, { archived }),
        questService.getCount(familyId),
      ]);
      setQuests(data);
      setQuestCount(count);
    } catch {
      Alert.alert("Error", "Failed to load quests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [familyId, filter]);

  useAutoRefresh({
    fetchData: fetchQuests,
    events: [AppEvents.QUEST_CHANGED],
    intervalMs: 30_000,
  });

  const handleArchive = async (quest: Quest) => {
    if (!familyId) return;
    try {
      if (quest.isArchived) {
        await questService.unarchive(familyId, quest.id);
      } else {
        await questService.archive(familyId, quest.id);
      }
      eventBus.emit(AppEvents.QUEST_CHANGED);
      fetchQuests();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Action failed");
    }
  };

  const handleDelete = async (quest: Quest) => {
    if (!familyId) return;
    Alert.alert(
      "Delete Quest",
      `Delete "${quest.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await questService.remove(familyId, quest.id);
              eventBus.emit(AppEvents.QUEST_CHANGED);
              fetchQuests();
            } catch {
              Alert.alert("Error", "Failed to delete quest");
            }
          },
        },
      ],
    );
  };

  const groupedQuests = quests.reduce<Record<string, Quest[]>>((acc, quest) => {
    const cat = quest.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(quest);
    return acc;
  }, {});

  const renderQuest = (quest: Quest) => (
    <TouchableOpacity
      key={quest.id}
      style={styles.questCard}
      onPress={() => navigation.navigate("QuestEdit", { id: quest.id })}
      onLongPress={() => {
        Alert.alert(quest.name, "Choose an action", [
          {
            text: quest.isArchived ? "Unarchive" : "Archive",
            onPress: () => handleArchive(quest),
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => handleDelete(quest),
          },
          { text: "Cancel", style: "cancel" },
        ]);
      }}
    >
      <Text style={styles.questIcon}>{quest.icon}</Text>
      <View style={styles.questInfo}>
        <Text style={styles.questName}>{quest.name}</Text>
        <View style={styles.questMeta}>
          <Text style={styles.questReward}>{quest.rewardSeconds} min</Text>
          <View
            style={[
              styles.badge,
              quest.stackingType === "stackable"
                ? styles.badgeStackable
                : styles.badgeExpires,
            ]}
          >
            <Text style={styles.badgeText}>
              {quest.stackingType === "stackable" ? "Stackable" : "Today Only"}
            </Text>
          </View>
        </View>
        <Text style={styles.assignedText} numberOfLines={1}>
          {quest.assignments.map((a) => a.child.name).join(", ")}
        </Text>
      </View>
      {quest.isArchived && (
        <View style={styles.archivedBadge}>
          <Text style={styles.archivedText}>Archived</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quest Manager</Text>
        <View style={styles.counterRow}>
          <Text style={styles.counter}>
            {questCount.activeQuests}/{questCount.limit} quests
          </Text>
          {questCount.activeQuests >= questCount.limit && (
            <Text style={styles.upgradeHint}>Upgrade for unlimited</Text>
          )}
        </View>
      </View>

      <View style={styles.filterRow}>
        {(["active", "archived", "all"] as FilterTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
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
        ))}
      </View>

      <FlatList
        data={Object.entries(groupedQuests)}
        keyExtractor={([cat]) => cat}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchQuests();
            }}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No quests yet</Text>
            <Text style={styles.emptyHint}>
              Tap + to create your first quest
            </Text>
          </View>
        }
        renderItem={({ item: [category, categoryQuests] }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {CATEGORY_LABELS[category] || category}
            </Text>
            {categoryQuests.map(renderQuest)}
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("QuestEdit", {})}
        accessibilityLabel="Create new quest"
        accessibilityRole="button"
      >
        <Icon name="add" size={28} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { fontSize: 28, fontWeight: "800", color: colors.textPrimary },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  counter: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  upgradeHint: { fontSize: 12, color: colors.accent, fontWeight: "600" },
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
  filterText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  filterTextActive: { color: "#FFF" },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  questCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  questIcon: { fontSize: 32, marginRight: spacing.md },
  questInfo: { flex: 1 },
  questName: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  questMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 2,
  },
  questReward: { fontSize: 14, fontWeight: "600", color: colors.primary },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeStackable: { backgroundColor: "#E8F5E9" },
  badgeExpires: { backgroundColor: "#FFF3E0" },
  badgeText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
  assignedText: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  archivedBadge: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  archivedText: { fontSize: 11, color: colors.textSecondary },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  emptyHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
