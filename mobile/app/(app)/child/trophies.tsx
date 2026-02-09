import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { colors, spacing } from '../../../src/theme';

export default function ChildTrophies() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Trophies</Text>
        <Text style={styles.placeholder}>Achievements coming in Phase 9</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.childBg },
  content: { flex: 1, padding: spacing.lg, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  placeholder: { fontSize: 16, color: colors.textSecondary },
});
