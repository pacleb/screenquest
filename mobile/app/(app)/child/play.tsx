import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing } from '../../../src/theme';

export default function ChildPlay() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Play Time</Text>

        <TouchableOpacity style={styles.playButton} disabled>
          <Text style={styles.playEmoji}>▶️</Text>
          <Text style={styles.playText}>PLAY</Text>
        </TouchableOpacity>

        <Text style={styles.placeholder}>Play timer coming in Phase 4</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.childBg },
  content: { flex: 1, padding: spacing.lg, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xl },
  playButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  playEmoji: { fontSize: 40 },
  playText: { fontSize: 24, fontWeight: '800', color: colors.textSecondary, marginTop: spacing.xs },
  placeholder: { fontSize: 16, color: colors.textSecondary },
});
