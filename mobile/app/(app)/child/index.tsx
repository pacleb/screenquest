import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth';
import { timeBankService, TimeBankBalance } from '../../../src/services/timeBank';
import { completionService, ChildQuest } from '../../../src/services/completion';
import { colors, spacing, borderRadius } from '../../../src/theme';

export default function ChildHome() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [balance, setBalance] = useState<TimeBankBalance>({ stackableMinutes: 0, nonStackableMinutes: 0, totalMinutes: 0 });
  const [quests, setQuests] = useState<ChildQuest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [bal, q] = await Promise.all([
        timeBankService.getBalance(user.id),
        completionService.listChildQuests(user.id),
      ]);
      setBalance(bal);
      setQuests(q.filter((quest) => quest.availableToComplete).slice(0, 5));
    } catch {
      // Silently handle — screens will show defaults
    } finally {
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const availableCount = quests.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
        }
      >
        {/* Greeting */}
        <Text style={styles.greeting}>Hi {user?.name}!</Text>
        <Text style={styles.subtitle}>Ready for an adventure?</Text>

        {/* Time Bank Card */}
        <View style={styles.timeBankCard}>
          <Text style={styles.timeBankLabel}>Your Time Bank</Text>
          <Text style={styles.timeBankValue}>{balance.totalMinutes} min</Text>
          {balance.nonStackableMinutes > 0 && (
            <View style={styles.expiringRow}>
              <Text style={styles.expiringText}>
                {balance.nonStackableMinutes} min expires today
              </Text>
            </View>
          )}
          {balance.totalMinutes === 0 && (
            <Text style={styles.timeBankHint}>Complete quests to earn time!</Text>
          )}
        </View>

        {/* Play Button (disabled — Phase 4) */}
        <TouchableOpacity style={styles.playButton} disabled>
          <Text style={styles.playText}>PLAY</Text>
          <Text style={styles.playHint}>Coming soon!</Text>
        </TouchableOpacity>

        {/* Available Quests Preview */}
        {availableCount > 0 && (
          <View style={styles.questSection}>
            <View style={styles.questSectionHeader}>
              <Text style={styles.questSectionTitle}>Available Quests</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/child/quests')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {quests.map((quest) => (
              <TouchableOpacity
                key={quest.id}
                style={styles.questCard}
                onPress={() =>
                  router.push({ pathname: '/(app)/child/quest-detail', params: { id: quest.id } })
                }
              >
                <Text style={styles.questIcon}>{quest.icon}</Text>
                <View style={styles.questInfo}>
                  <Text style={styles.questName}>{quest.name}</Text>
                  <Text style={styles.questReward}>{quest.rewardMinutes} min</Text>
                </View>
                <View style={[styles.stackBadge, quest.stackingType === 'stackable' ? styles.stackable : styles.todayOnly]}>
                  <Text style={styles.stackBadgeText}>
                    {quest.stackingType === 'stackable' ? 'Stack' : 'Today'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {availableCount === 0 && (
          <View style={styles.emptyQuests}>
            <Text style={styles.emptyText}>No quests available right now</Text>
            <Text style={styles.emptyHint}>Check back later or ask your parents!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.childBg },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  greeting: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, marginTop: spacing.md },
  subtitle: { fontSize: 18, color: colors.textSecondary, marginBottom: spacing.xl },
  timeBankCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: spacing.lg,
  },
  timeBankLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  timeBankValue: { fontSize: 48, fontWeight: '800', color: colors.primary },
  timeBankHint: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
  expiringRow: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.accent + '15',
    borderRadius: borderRadius.xl,
  },
  expiringText: { fontSize: 13, fontWeight: '600', color: colors.accent },
  playButton: {
    backgroundColor: colors.textSecondary + '20',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
    opacity: 0.6,
  },
  playText: { fontSize: 20, fontWeight: '800', color: colors.textSecondary },
  playHint: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
  questSection: { marginBottom: spacing.lg },
  questSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  questSectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  seeAll: { fontSize: 14, fontWeight: '600', color: colors.primary },
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
  questIcon: { fontSize: 28, marginRight: spacing.md },
  questInfo: { flex: 1 },
  questName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  questReward: { fontSize: 13, fontWeight: '600', color: colors.primary, marginTop: 2 },
  stackBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  stackable: { backgroundColor: '#E8F5E9' },
  todayOnly: { backgroundColor: '#FFF3E0' },
  stackBadgeText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  emptyQuests: { alignItems: 'center', paddingTop: spacing.xl },
  emptyText: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptyHint: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
});
