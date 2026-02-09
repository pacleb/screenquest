import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../../src/store/auth';
import { colors, spacing } from '../../../src/theme';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.info}>Signed in as {user?.email}</Text>
        <Text style={styles.info}>Role: {user?.role}</Text>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.lg },
  info: { fontSize: 16, color: colors.textSecondary, marginBottom: spacing.sm },
  logoutButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: spacing.lg,
  },
  logoutText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
