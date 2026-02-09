import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth';
import { completionService, ChildQuest } from '../../../src/services/completion';
import { colors, spacing, borderRadius } from '../../../src/theme';

const CATEGORY_LABELS: Record<string, string> = {
  chores: 'Chores',
  studying: 'Studying',
  exercise: 'Exercise',
  reading: 'Reading',
  creative: 'Creative',
  helping_others: 'Helping Others',
  custom: 'Custom',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  available: { label: 'Available', color: colors.secondary },
  pending: { label: 'Pending Approval', color: colors.accent },
  completed: { label: 'Completed', color: colors.textSecondary },
  completed_today: { label: 'Done Today', color: colors.textSecondary },
  completed_this_week: { label: 'Done This Week', color: colors.textSecondary },
};

export default function ChildQuests() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [quests, setQuests] = useState<ChildQuest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchQuests = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await completionService.listChildQuests(user.id);
      setQuests(data);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  const groupedQuests = quests.reduce<Record<string, ChildQuest[]>>((acc, quest) => {
    const cat = quest.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(quest);
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quest Board</Text>
        <Text style={styles.subtitle}>
          {quests.filter((q) => q.availableToComplete).length} quests available
        </Text>
      </View>

      <FlatList
        data={Object.entries(groupedQuests)}
        keyExtractor={([cat]) => cat}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchQuests(); }} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No quests assigned yet</Text>
              <Text style={styles.emptyHint}>Ask your parents to create quests for you!</Text>
            </View>
          ) : null
        }
        renderItem={({ item: [category, categoryQuests] }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{CATEGORY_LABELS[category] || category}</Text>
            {categoryQuests.map((quest) => {
              const status = STATUS_CONFIG[quest.statusLabel] || STATUS_CONFIG.available;
              return (
                <TouchableOpacity
                  key={quest.id}
                  style={[styles.questCard, !quest.availableToComplete && styles.questCardDisabled]}
                  onPress={() =>
                    router.push({ pathname: '/(app)/child/quest-detail', params: { id: quest.id } })
                  }
                >
                  <Text style={styles.questIcon}>{quest.icon}</Text>
                  <View style={styles.questInfo}>
                    <Text style={styles.questName}>{quest.name}</Text>
                    <View style={styles.questMeta}>
                      <Text style={styles.questReward}>{quest.rewardMinutes} min</Text>
                      <View style={[styles.stackBadge, quest.stackingType === 'stackable' ? styles.stackable : styles.todayOnly]}>
                        <Text style={styles.stackBadgeText}>
                          {quest.stackingType === 'stackable' ? 'Stackable' : 'Today Only'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.childBg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  questCardDisabled: { opacity: 0.6 },
  questIcon: { fontSize: 32, marginRight: spacing.md },
  questInfo: { flex: 1 },
  questName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  questMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  questReward: { fontSize: 14, fontWeight: '600', color: colors.primary },
  stackBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  stackable: { backgroundColor: '#E8F5E9' },
  todayOnly: { backgroundColor: '#FFF3E0' },
  stackBadgeText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  statusText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptyHint: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
});
