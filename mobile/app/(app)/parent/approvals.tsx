import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { colors, spacing } from '../../../src/theme';

export default function ApprovalsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Approvals</Text>
        <Text style={styles.placeholder}>Approval queue coming in Phase 3</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  placeholder: { fontSize: 16, color: colors.textSecondary },
});
