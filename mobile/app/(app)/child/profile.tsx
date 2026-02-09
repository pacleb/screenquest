import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../../src/store/auth';
import { colors, spacing } from '../../../src/theme';

export default function ChildProfile() {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>😊</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.level}>Level 1 - Starter</Text>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.childBg },
  content: { flex: 1, padding: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarEmoji: { fontSize: 48 },
  name: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.xs },
  level: { fontSize: 16, color: colors.purple, fontWeight: '600', marginBottom: spacing.xxl },
  logoutButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: 24,
    alignItems: 'center',
    position: 'absolute',
    bottom: spacing.xl,
  },
  logoutText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
