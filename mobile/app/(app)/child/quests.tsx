import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth';
import { completionService, ChildQuest } from '../../../src/services/completion';
import { colors, spacing, borderRadius, fonts, typography } from '../../../src/theme';
import { EmptyState } from '../../../src/components';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'chores', label: 'Chores' },
  { key: 'studying', label: 'Study' },
  { key: 'exercise', label: 'Exercise' },
  { key: 'reading', label: 'Reading' },
  { key: 'creative', label: 'Creative' },
  { key: 'helping_others', label: 'Helping' },
  { key: 'custom', label: 'Custom' },
];

export default function ChildQuests() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [quests, setQuests] = useState<ChildQuest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

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

  const filteredQuests =
    selectedCategory === 'all'
      ? quests
      : quests.filter((q) => q.category === selectedCategory);

  const availableCount = quests.filter((q) => q.availableToComplete).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Quest Board</Text>
        <Text style={styles.subtitle}>
          {availableCount} quest{availableCount !== 1 ? 's' : ''} available
        </Text>
      </View>

      {/* Category Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.chip, selectedCategory === cat.key && styles.chipActive]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text style={[styles.chipText, selectedCategory === cat.key && styles.chipTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Quest Grid */}
      <FlatList
        data={filteredQuests}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchQuests(); }} />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              emoji="🗺️"
              title="No quests found"
              message={selectedCategory !== 'all' ? 'Try a different category!' : 'Ask your parents to create quests for you!'}
              childUI
            />
          ) : null
        }
        renderItem={({ item: quest }) => (
          <TouchableOpacity
            style={[styles.gridCard, !quest.availableToComplete && styles.gridCardDisabled]}
            onPress={() =>
              router.push({ pathname: '/(app)/child/quest-detail', params: { id: quest.id } })
            }
            activeOpacity={0.85}
          >
            {!quest.availableToComplete && (
              <View style={styles.gridOverlay}>
                <Text style={styles.gridOverlayText}>
                  {quest.statusLabel === 'pending' ? '⏳' : '✅'}
                </Text>
              </View>
            )}
            <Text style={styles.gridIcon}>{quest.icon}</Text>
            <Text style={styles.gridName} numberOfLines={2}>{quest.name}</Text>
            <View style={styles.gridReward}>
              <Text style={styles.gridRewardText}>{quest.rewardMinutes} min</Text>
            </View>
            <View style={[
              styles.gridStack,
              quest.stackingType === 'stackable' ? styles.stackable : styles.todayOnly,
            ]}>
              <Text style={[
                styles.gridStackText,
                quest.stackingType === 'stackable' ? styles.stackableText : styles.todayOnlyText,
              ]}>
                {quest.stackingType === 'stackable' ? 'Stackable' : 'Today'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.childBg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.childH1,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fonts.child.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  chipRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextActive: { color: '#FFF' },
  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  gridCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  gridCardDisabled: { opacity: 0.5 },
  gridIcon: { fontSize: 40, marginBottom: spacing.sm },
  gridName: {
    fontFamily: fonts.child.bold,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    minHeight: 36,
  },
  gridReward: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    backgroundColor: colors.primary + '12',
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  gridRewardText: {
    fontFamily: fonts.child.bold,
    fontSize: 13,
    color: colors.primary,
  },
  gridStack: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  stackable: { backgroundColor: '#E8F5E9' },
  todayOnly: { backgroundColor: '#FFF3E0' },
  gridStackText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 11,
  },
  stackableText: { color: '#388E3C' },
  todayOnlyText: { color: '#E65100' },
  gridOverlay: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
  },
  gridOverlayText: { fontSize: 20 },
});
