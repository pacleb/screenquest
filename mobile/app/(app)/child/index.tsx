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
import { colors, spacing, borderRadius, fonts, typography } from '../../../src/theme';
import {
  MascotWidget,
  TimeBankDisplay,
  QuestCard,
  SectionHeader,
  EmptyState,
} from '../../../src/components';

export default function ChildHome() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [balance, setBalance] = useState<TimeBankBalance>({
    stackableMinutes: 0,
    nonStackableMinutes: 0,
    totalMinutes: 0,
  });
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

  const isNegativeBalance = balance.totalMinutes < 0;
  const canPlay = !isNegativeBalance && balance.totalMinutes > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Mascot Greeting */}
        <MascotWidget name={user?.name} />

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

        {/* Time Bank Display */}
        <TimeBankDisplay
          stackableMinutes={balance.stackableMinutes}
          nonStackableMinutes={balance.nonStackableMinutes}
          totalMinutes={balance.totalMinutes}
        />

        {/* Play Button */}
        <TouchableOpacity
          style={[styles.playButton, !canPlay && styles.playButtonDisabled]}
          onPress={() => router.push('/(app)/child/play')}
          disabled={!canPlay}
          activeOpacity={0.85}
        >
          <Ionicons
            name="play-circle"
            size={32}
            color={canPlay ? '#FFF' : colors.textSecondary}
          />
          <Text style={[styles.playText, !canPlay && styles.playTextDisabled]}>
            PLAY
          </Text>
        </TouchableOpacity>

        {/* Available Quests */}
        {quests.length > 0 && (
          <View style={styles.questSection}>
            <SectionHeader
              title="Available Quests"
              action="See all"
              onAction={() => router.push('/(app)/child/quests')}
              childUI
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.questScroll}
            >
              {quests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  icon={quest.icon}
                  name={quest.name}
                  rewardMinutes={quest.rewardMinutes}
                  stackingType={quest.stackingType as 'stackable' | 'non_stackable'}
                  compact
                  onPress={() =>
                    router.push({ pathname: '/(app)/child/quest-detail', params: { id: quest.id } })
                  }
                />
              ))}
            </ScrollView>
          </View>
        )}

        {quests.length === 0 && (
          <EmptyState
            emoji="📋"
            title="No quests available"
            message="Check back later or ask your parents!"
            childUI
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.childBg },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  violationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent + '25',
  },
  violationInfo: { flex: 1 },
  violationTitle: {
    fontFamily: fonts.child.bold,
    fontSize: 14,
    color: colors.accent,
  },
  violationHint: {
    fontFamily: fonts.child.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md + 4,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  playButtonDisabled: {
    backgroundColor: colors.textSecondary + '18',
    shadowOpacity: 0,
    elevation: 0,
  },
  playText: {
    fontFamily: fonts.child.extraBold,
    fontSize: 22,
    color: '#FFF',
    letterSpacing: 2,
  },
  playTextDisabled: { color: colors.textSecondary },
  questSection: { marginBottom: spacing.lg },
  questScroll: { paddingRight: spacing.lg },
});
