import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useAuthStore } from '../../../src/store/auth';
import { colors, spacing } from '../../../src/theme';

export default function ChildHome() {
  const user = useAuthStore((s) => s.user);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.greeting}>Hi {user?.name}!</Text>
        <Text style={styles.subtitle}>Ready for an adventure?</Text>

        <View style={styles.timeBankCard}>
          <Text style={styles.timeBankLabel}>Your Time Bank</Text>
          <Text style={styles.timeBankValue}>0 min</Text>
          <Text style={styles.timeBankHint}>Complete quests to earn time!</Text>
        </View>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Quest cards and play button coming in Phase 3-4
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.childBg,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  timeBankCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: spacing.xl,
  },
  timeBankLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  timeBankValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary,
  },
  timeBankHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
