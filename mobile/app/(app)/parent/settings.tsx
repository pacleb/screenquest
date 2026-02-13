import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth';
import { useSubscriptionStore } from '../../../src/store/subscription';
import { familyService, FamilyMember } from '../../../src/services/family';
import { playSessionService, PlaySettings } from '../../../src/services/playSession';
import { subscriptionService } from '../../../src/services/subscription';
import { gamificationService } from '../../../src/services/gamification';
import { colors, spacing, borderRadius, fonts, typography } from '../../../src/theme';
import { Badge } from '../../../src/components';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const familyId = user?.familyId;
  const sub = useSubscriptionStore();
  const [restoringPurchases, setRestoringPurchases] = useState(false);

  const [children, setChildren] = useState<FamilyMember[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [settings, setSettings] = useState<PlaySettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(false);
  const [togglingLeaderboard, setTogglingLeaderboard] = useState(false);

  // Fetch children + leaderboard setting
  useEffect(() => {
    if (!familyId) return;
    familyService.getMembers(familyId).then((members) => {
      const kids = members.filter((m) => m.role === 'child');
      setChildren(kids);
      if (kids.length > 0) setSelectedChildId(kids[0].id);
    });
    gamificationService
      .getLeaderboardSetting(familyId)
      .then((r) => setLeaderboardEnabled(r.enabled))
      .catch(() => {});
  }, [familyId]);

  // Fetch play settings for selected child
  const fetchSettings = useCallback(async () => {
    if (!selectedChildId) return;
    setLoadingSettings(true);
    try {
      const s = await playSessionService.getSettings(selectedChildId);
      setSettings(s);
    } catch {
      // defaults
    } finally {
      setLoadingSettings(false);
    }
  }, [selectedChildId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveSettings = async () => {
    if (!selectedChildId || !settings) return;
    setSaving(true);
    try {
      await playSessionService.updateSettings(selectedChildId, settings);
      Alert.alert('Saved', 'Play settings updated');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof PlaySettings>(key: K, value: PlaySettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Settings</Text>

        {/* Account info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.infoText}>{user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="shield-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.infoText}>Role: {user?.role}</Text>
          </View>
        </View>

        {/* Subscription */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={styles.subCard}>
            <View style={styles.subRow}>
              <Text style={styles.subLabel}>Current Plan</Text>
              <Badge
                label={sub.isTrialing ? 'Trial' : sub.isActive ? 'Premium' : 'Free'}
                variant={sub.isActive ? 'success' : 'muted'}
              />
            </View>
            {sub.isTrialing && sub.trialDaysRemaining !== null && (
              <View style={styles.subRow}>
                <Text style={styles.subLabel}>Trial Ends</Text>
                <Text style={styles.subValue}>
                  {sub.trialDaysRemaining} day{sub.trialDaysRemaining !== 1 ? 's' : ''} remaining
                </Text>
              </View>
            )}
            {sub.isActive && !sub.isTrialing && sub.expiresAt && (
              <>
                <View style={styles.subRow}>
                  <Text style={styles.subLabel}>
                    {sub.willRenew ? 'Renews' : 'Active Until'}
                  </Text>
                  <Text style={styles.subValue}>
                    {new Date(sub.expiresAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.subRow}>
                  <Text style={styles.subLabel}>Period</Text>
                  <Text style={styles.subValue}>
                    {sub.period === 'yearly' ? 'Yearly' : 'Monthly'}
                  </Text>
                </View>
              </>
            )}
            {sub.subscriptionStatus === 'cancelled' && sub.expiresAt && (
              <Text style={styles.cancelledNote}>
                Your premium access is active until {new Date(sub.expiresAt).toLocaleDateString()}
              </Text>
            )}
          </View>

          {sub.isActive ? (
            <TouchableOpacity
              style={styles.subButton}
              onPress={() => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('https://apps.apple.com/account/subscriptions');
                } else {
                  Linking.openURL('https://play.google.com/store/account/subscriptions');
                }
              }}
            >
              <Ionicons name="open-outline" size={16} color={colors.primary} />
              <Text style={styles.subButtonText}>Manage Subscription</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.subButton, styles.upgradeButton]}
              onPress={() => router.push('/(app)/parent/paywall')}
            >
              <Ionicons name="sparkles" size={16} color="#FFF" />
              <Text style={[styles.subButtonText, { color: '#FFF' }]}>Upgrade to Premium</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.restoreButton}
            disabled={restoringPurchases}
            onPress={async () => {
              setRestoringPurchases(true);
              try {
                const info = await subscriptionService.restorePurchases();
                if (info?.entitlements?.active?.premium) {
                  if (familyId) await sub.fetchStatus(familyId);
                  Alert.alert('Restored!', 'Your premium subscription has been restored.');
                } else {
                  Alert.alert('No Purchases', 'No previous purchases found.');
                }
              } catch {
                Alert.alert('Error', 'Could not restore purchases.');
              } finally {
                setRestoringPurchases(false);
              }
            }}
          >
            <Text style={styles.restoreText}>
              {restoringPurchases ? 'Restoring...' : 'Restore Purchases'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Play Settings per child */}
        {children.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Play Settings</Text>

            {/* Child selector */}
            <View style={styles.childSelector}>
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  style={[styles.childChip, selectedChildId === child.id && styles.childChipActive]}
                  onPress={() => setSelectedChildId(child.id)}
                >
                  <Text style={[styles.childChipText, selectedChildId === child.id && styles.childChipTextActive]}>
                    {child.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loadingSettings ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.lg }} />
            ) : settings ? (
              <View style={styles.settingsForm}>
                {/* Approval mode */}
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Require Approval</Text>
                    <Text style={styles.settingDesc}>
                      {settings.playApprovalMode === 'require_approval'
                        ? 'You must approve play requests'
                        : 'Play starts automatically'}
                    </Text>
                  </View>
                  <Switch
                    value={settings.playApprovalMode === 'require_approval'}
                    onValueChange={(val) =>
                      updateSetting('playApprovalMode', val ? 'require_approval' : 'notify_only')
                    }
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>

                {/* Weekday limits */}
                <Text style={styles.subsectionTitle}>Weekdays</Text>
                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>Daily Cap (min)</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={settings.dailyScreenTimeCap != null ? String(settings.dailyScreenTimeCap) : ''}
                      onChangeText={(t) => updateSetting('dailyScreenTimeCap', t ? parseInt(t, 10) || 0 : null)}
                      keyboardType="number-pad"
                      placeholder="No limit"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>Start</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={settings.allowedPlayHoursStart}
                      onChangeText={(t) => updateSetting('allowedPlayHoursStart', t)}
                      placeholder="08:00"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>End</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={settings.allowedPlayHoursEnd}
                      onChangeText={(t) => updateSetting('allowedPlayHoursEnd', t)}
                      placeholder="20:00"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                {/* Weekend limits */}
                <Text style={styles.subsectionTitle}>Weekends</Text>
                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>Daily Cap (min)</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={settings.weekendDailyScreenTimeCap != null ? String(settings.weekendDailyScreenTimeCap) : ''}
                      onChangeText={(t) => updateSetting('weekendDailyScreenTimeCap', t ? parseInt(t, 10) || 0 : null)}
                      keyboardType="number-pad"
                      placeholder="No limit"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>Start</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={settings.weekendPlayHoursStart}
                      onChangeText={(t) => updateSetting('weekendPlayHoursStart', t)}
                      placeholder="09:00"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>End</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={settings.weekendPlayHoursEnd}
                      onChangeText={(t) => updateSetting('weekendPlayHoursEnd', t)}
                      placeholder="21:00"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Settings</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        {/* Family Leaderboard */}
        {children.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Family Leaderboard</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Show Leaderboard</Text>
                <Text style={styles.settingDesc}>
                  Display weekly XP ranking among siblings on the Trophies tab
                </Text>
              </View>
              <Switch
                value={leaderboardEnabled}
                disabled={togglingLeaderboard}
                onValueChange={async (val) => {
                  if (!familyId) return;
                  setTogglingLeaderboard(true);
                  setLeaderboardEnabled(val);
                  try {
                    await gamificationService.toggleLeaderboard(familyId, val);
                  } catch {
                    setLeaderboardEnabled(!val);
                  } finally {
                    setTogglingLeaderboard(false);
                  }
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          </View>
        )}

        {/* Sign out */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.lg },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoText: { fontSize: 15, color: colors.textSecondary },
  childSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  childChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  childChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  childChipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  childChipTextActive: { color: '#FFF' },
  settingsForm: {},
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  settingDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  timeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  timeField: { flex: 1 },
  timeLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  timeInput: {
    height: 40,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  subCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  subLabel: {
    fontFamily: fonts.parent.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  subValue: {
    fontFamily: fonts.parent.semiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  cancelledNote: {
    fontFamily: fonts.parent.regular,
    fontSize: 12,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  subButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.xs,
  },
  subButtonText: {
    fontFamily: fonts.parent.semiBold,
    fontSize: 14,
    color: colors.primary,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  restoreText: {
    fontFamily: fonts.parent.medium,
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  logoutButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  logoutText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
