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
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/auth';
import { timeBankService, TimeBankBalance } from '../../../src/services/timeBank';
import { completionService, ChildQuest } from '../../../src/services/completion';
import { violationService, ViolationStatus } from '../../../src/services/violation';
import { colors, spacing, borderRadius } from '../../../src/theme';

export default function ChildHome() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [balance, setBalance] = useState<TimeBankBalance>({ stackableMinutes: 0, nonStackableMinutes: 0, totalMinutes: 0 });
  const [quests, setQuests] = useState<ChildQuest[]>([]);
  const [violationStatus, setViolationStatus] = useState<ViolationStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [bal, q, vs] = await Promise.all([
        timeBankService.getBalance(user.id),
        completionService.listChildQuests(user.id),
        violationService.getViolationStatus(user.id).catch(() => null),
      ]);
      setBalance(bal);
      setQuests(q.filter((quest) => quest.availableToComplete).slice(0, 5));
      setViolationStatus(vs);
    } catch {
      // Silently handle
    } finally {
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const availableCount = quests.length;
  const isNegativeBalance = balance.totalMinutes < 0;
  const deficit = Math.abs(balance.totalMinutes);

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

        {/* Violation Indicator */}
        {violationStatus && violationStatus.currentCount > 0 && (
          <View style={styles.violationCard}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.accent} />
            <View style={styles.violationInfo}>
              <Text style={styles.violationTitle}>
                {violationStatus.currentCount} {violationStatus.currentCount === 1 ? 'strike' : 'strikes'}
              </Text>
              <Text style={styles.violationHint}>Keep up the good work to stay on track!</Text>
            </View>
          </View>
        )}

        {/* Time Bank Card */}
        <View style={[styles.timeBankCard, isNegativeBalance && styles.timeBankNegative]}>
          <Text style={styles.timeBankLabel}>Your Time Bank</Text>
          <Text style={[styles.timeBankValue, isNegativeBalance && styles.timeBankValueNegative]}>
            {balance.totalMinutes} min
          </Text>
          {isNegativeBalance && (
            <Text style={styles.deficitHint}>
              Earn {deficit} more minutes to play!
            </Text>
          )}
          {!isNegativeBalance && balance.nonStackableMinutes > 0 && (
            <View style={styles.expiringRow}>
              <Text style={styles.expiringText}>
                {balance.nonStackableMinutes} min expires today
              </Text>
            </View>
          )}
          {!isNegativeBalance && balance.totalMinutes === 0 && (
            <Text style={styles.timeBankHint}>Complete quests to earn time!</Text>
          )}
        </View>

        {/* Play Button */}
        <TouchableOpacity
          style={[styles.playButton, (isNegativeBalance || balance.totalMinutes <= 0) && styles.playButtonDisabled]}
          onPress={() => router.push('/(app)/child/play')}
          disabled={isNegativeBalance || balance.totalMinutes <= 0}
        >
          <Ionicons
            name="play-circle"
            size={28}
            color={isNegativeBalance || balance.totalMinutes <= 0 ? colors.textSecondary : '#FFF'}
          />
          <Text style={[styles.playText, (isNegativeBalance || balance.totalMinutes <= 0) && styles.playTextDisabled]}>
            PLAY
          </Text>
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
  violationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent + '12',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  violationInfo: { flex: 1 },
  violationTitle: { fontSize: 14, fontWeight: '700', color: colors.accent },
  violationHint: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
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
  timeBankNegative: {
    shadowColor: colors.error,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  timeBankLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  timeBankValue: { fontSize: 48, fontWeight: '800', color: colors.primary },
  timeBankValueNegative: { color: colors.error },
  timeBankHint: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
  deficitHint: { fontSize: 14, fontWeight: '600', color: colors.error, marginTop: spacing.xs },
  expiringRow: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.accent + '15',
    borderRadius: borderRadius.xl,
  },
  expiringText: { fontSize: 13, fontWeight: '600', color: colors.accent },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md + 4,
    marginBottom: spacing.xl,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  playButtonDisabled: {
    backgroundColor: colors.textSecondary + '20',
    shadowOpacity: 0,
    elevation: 0,
  },
  playText: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  playTextDisabled: { color: colors.textSecondary },
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
