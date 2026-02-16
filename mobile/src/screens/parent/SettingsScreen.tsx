import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { Linking, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../store/auth";
import { useSubscriptionStore } from "../../store/subscription";
import { useThemeStore } from "../../store/theme";
import { familyService, FamilyMember } from "../../services/family";
import { playSessionService, PlaySettings } from "../../services/playSession";
import { subscriptionService } from "../../services/subscription";
import { gamificationService } from "../../services/gamification";
import { privacyService, DeletionStatus } from "../../services/privacy";
import { SoundEffects } from "../../services/soundEffects";
import { colors, spacing, borderRadius, fonts, typography } from "../../theme";
import { Badge, DropdownPicker, DropdownOption } from "../../components";

/* ── Daily-cap dropdown options (values in seconds) ── */
const DAILY_CAP_OPTIONS: DropdownOption<number | null>[] = [
  { label: "No limit", value: null },
  { label: "30 min", value: 1800 },
  { label: "1 hr", value: 3600 },
  { label: "1 hr 30 min", value: 5400 },
  { label: "2 hr", value: 7200 },
  { label: "2 hr 30 min", value: 9000 },
  { label: "3 hr", value: 10800 },
  { label: "3 hr 30 min", value: 12600 },
  { label: "4 hr", value: 14400 },
  { label: "5 hr", value: 18000 },
  { label: "6 hr", value: 21600 },
];

/* ── Time-of-day dropdown options ("HH:mm") ── */
const TIME_OPTIONS: DropdownOption<string>[] = Array.from(
  { length: 48 },
  (_, i) => {
    const h = Math.floor(i / 2);
    const m = i % 2 === 0 ? "00" : "30";
    const value = `${String(h).padStart(2, "0")}:${m}`;
    const ampm = h < 12 ? "AM" : "PM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const label = `${h12}:${m} ${ampm}`;
    return { label, value };
  },
);

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
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
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(
    null,
  );
  const [deletionLoading, setDeletionLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(SoundEffects.isEnabled());

  // Fetch children + leaderboard setting
  useEffect(() => {
    if (!familyId) return;
    familyService.getMembers(familyId).then((members) => {
      const kids = members.filter((m) => m.role === "child");
      setChildren(kids);
      if (kids.length > 0) setSelectedChildId(kids[0].id);
    });
    gamificationService
      .getLeaderboardSetting(familyId)
      .then((r) => setLeaderboardEnabled(r.enabled))
      .catch(() => {});
    privacyService
      .getDeletionStatus()
      .then((s) => setDeletionStatus(s))
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
      Alert.alert("Saved", "Play settings updated");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to save settings",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof PlaySettings>(
    key: K,
    value: PlaySettings[K],
  ) => {
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
            <Icon name="mail-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.infoText}>{user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon
              name="shield-outline"
              size={20}
              color={colors.textSecondary}
            />
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
                label={
                  sub.isTrialing ? "Trial" : sub.isActive ? "Premium" : "Free"
                }
                variant={sub.isActive ? "success" : "muted"}
              />
            </View>
            {sub.isTrialing && sub.trialDaysRemaining !== null && (
              <View style={styles.subRow}>
                <Text style={styles.subLabel}>Trial Ends</Text>
                <Text style={styles.subValue}>
                  {sub.trialDaysRemaining} day
                  {sub.trialDaysRemaining !== 1 ? "s" : ""} remaining
                </Text>
              </View>
            )}
            {sub.isActive && !sub.isTrialing && sub.expiresAt && (
              <>
                <View style={styles.subRow}>
                  <Text style={styles.subLabel}>
                    {sub.willRenew ? "Renews" : "Active Until"}
                  </Text>
                  <Text style={styles.subValue}>
                    {new Date(sub.expiresAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.subRow}>
                  <Text style={styles.subLabel}>Period</Text>
                  <Text style={styles.subValue}>
                    {sub.period === "yearly" ? "Yearly" : "Monthly"}
                  </Text>
                </View>
              </>
            )}
            {sub.subscriptionStatus === "cancelled" && sub.expiresAt && (
              <Text style={styles.cancelledNote}>
                Your premium access is active until{" "}
                {new Date(sub.expiresAt).toLocaleDateString()}
              </Text>
            )}
          </View>

          {sub.isActive ? (
            <TouchableOpacity
              style={styles.subButton}
              onPress={() => {
                if (Platform.OS === "ios") {
                  Linking.openURL(
                    "https://apps.apple.com/account/subscriptions",
                  );
                } else {
                  Linking.openURL(
                    "https://play.google.com/store/account/subscriptions",
                  );
                }
              }}
            >
              <Icon name="open-outline" size={16} color={colors.primary} />
              <Text style={styles.subButtonText}>Manage Subscription</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.subButton, styles.upgradeButton]}
              onPress={() => navigation.navigate("Paywall")}
            >
              <Icon name="sparkles" size={16} color="#FFF" />
              <Text style={[styles.subButtonText, { color: "#FFF" }]}>
                Upgrade to Premium
              </Text>
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
                  Alert.alert(
                    "Restored!",
                    "Your premium subscription has been restored.",
                  );
                } else {
                  Alert.alert("No Purchases", "No previous purchases found.");
                }
              } catch {
                Alert.alert("Error", "Could not restore purchases.");
              } finally {
                setRestoringPurchases(false);
              }
            }}
          >
            <Text style={styles.restoreText}>
              {restoringPurchases ? "Restoring..." : "Restore Purchases"}
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
                  style={[
                    styles.childChip,
                    selectedChildId === child.id && styles.childChipActive,
                  ]}
                  onPress={() => setSelectedChildId(child.id)}
                >
                  <Text
                    style={[
                      styles.childChipText,
                      selectedChildId === child.id &&
                        styles.childChipTextActive,
                    ]}
                  >
                    {child.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loadingSettings ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ marginVertical: spacing.lg }}
              />
            ) : settings ? (
              <View style={styles.settingsForm}>
                {/* Approval mode */}
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Require Approval</Text>
                    <Text style={styles.settingDesc}>
                      {settings.playApprovalMode === "require_approval"
                        ? "You must approve play requests"
                        : "Play starts automatically"}
                    </Text>
                  </View>
                  <Switch
                    value={settings.playApprovalMode === "require_approval"}
                    onValueChange={(val) =>
                      updateSetting(
                        "playApprovalMode",
                        val ? "require_approval" : "notify_only",
                      )
                    }
                    trackColor={{ false: colors.border, true: colors.primary }}
                    accessibilityLabel="Require play approval"
                  />
                </View>

                {/* Weekday limits */}
                <Text style={styles.subsectionTitle}>Weekdays</Text>
                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <DropdownPicker
                      label="Daily Cap"
                      options={DAILY_CAP_OPTIONS}
                      selectedValue={settings.dailyScreenTimeCap}
                      onSelect={(v) => updateSetting("dailyScreenTimeCap", v)}
                      placeholder="No limit"
                    />
                  </View>
                </View>
                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <DropdownPicker
                      label="Start"
                      options={TIME_OPTIONS}
                      selectedValue={settings.allowedPlayHoursStart}
                      onSelect={(v) =>
                        updateSetting("allowedPlayHoursStart", v)
                      }
                      placeholder="08:00"
                    />
                  </View>
                  <View style={styles.timeField}>
                    <DropdownPicker
                      label="End"
                      options={TIME_OPTIONS}
                      selectedValue={settings.allowedPlayHoursEnd}
                      onSelect={(v) => updateSetting("allowedPlayHoursEnd", v)}
                      placeholder="20:00"
                    />
                  </View>
                </View>

                {/* Weekend limits */}
                <Text style={styles.subsectionTitle}>Weekends</Text>
                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <DropdownPicker
                      label="Daily Cap"
                      options={DAILY_CAP_OPTIONS}
                      selectedValue={settings.weekendDailyScreenTimeCap}
                      onSelect={(v) =>
                        updateSetting("weekendDailyScreenTimeCap", v)
                      }
                      placeholder="No limit"
                    />
                  </View>
                </View>
                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <DropdownPicker
                      label="Start"
                      options={TIME_OPTIONS}
                      selectedValue={settings.weekendPlayHoursStart}
                      onSelect={(v) =>
                        updateSetting("weekendPlayHoursStart", v)
                      }
                      placeholder="09:00"
                    />
                  </View>
                  <View style={styles.timeField}>
                    <DropdownPicker
                      label="End"
                      options={TIME_OPTIONS}
                      selectedValue={settings.weekendPlayHoursEnd}
                      onSelect={(v) => updateSetting("weekendPlayHoursEnd", v)}
                      placeholder="21:00"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveSettings}
                  disabled={saving}
                >
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
                accessibilityLabel="Show family leaderboard"
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          </View>
        )}

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate("NotificationPreferences")}
          >
            <Icon
              name="notifications-outline"
              size={20}
              color={colors.textSecondary}
            />
            <Text style={styles.linkText}>Notification Preferences</Text>
            <Icon
              name="chevron-forward"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Privacy & Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Sound Effects</Text>
              <Text style={styles.settingDesc}>
                Play sounds for quest completion, level ups, and timer events
              </Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={(val) => {
                setSoundEnabled(val);
                SoundEffects.setEnabled(val);
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              accessibilityLabel="Toggle sound effects"
            />
          </View>
        </View>

        {/* Privacy & Legal - original */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Legal</Text>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL("https://screenquest.app/privacy")}
          >
            <Icon
              name="document-text-outline"
              size={20}
              color={colors.textSecondary}
            />
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Icon
              name="chevron-forward"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL("https://screenquest.app/terms")}
          >
            <Icon
              name="shield-checkmark-outline"
              size={20}
              color={colors.textSecondary}
            />
            <Text style={styles.linkText}>Terms of Service</Text>
            <Icon
              name="chevron-forward"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Account Deletion */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          {deletionStatus &&
            !deletionStatus.cancelledAt &&
            !deletionStatus.purgedAt && (
              <View style={styles.deletionBanner}>
                <Icon name="warning-outline" size={20} color={colors.error} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.deletionBannerTitle}>
                    Deletion Scheduled
                  </Text>
                  <Text style={styles.deletionBannerText}>
                    Your account will be deleted on{" "}
                    {new Date(
                      deletionStatus.gracePeriodEndsAt,
                    ).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.cancelDeletionBtn}
                  disabled={deletionLoading}
                  onPress={async () => {
                    setDeletionLoading(true);
                    try {
                      await privacyService.cancelDeletion();
                      setDeletionStatus(null);
                      Alert.alert(
                        "Cancelled",
                        "Account deletion has been cancelled.",
                      );
                    } catch {
                      Alert.alert("Error", "Failed to cancel deletion.");
                    } finally {
                      setDeletionLoading(false);
                    }
                  }}
                >
                  <Text style={styles.cancelDeletionText}>
                    {deletionLoading ? "Cancelling..." : "Cancel"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          {(!deletionStatus || deletionStatus.cancelledAt) && (
            <TouchableOpacity
              style={styles.deleteAccountBtn}
              onPress={() => {
                Alert.alert(
                  "Delete Account",
                  "Your account and all associated data will be permanently deleted after a 30-day grace period. This action can be cancelled within 30 days.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete My Account",
                      style: "destructive",
                      onPress: async () => {
                        setDeletionLoading(true);
                        try {
                          const result = await privacyService.requestDeletion();
                          setDeletionStatus({
                            id: result.id,
                            requestedAt: new Date().toISOString(),
                            gracePeriodEndsAt: result.gracePeriodEndsAt,
                            cancelledAt: null,
                            purgedAt: null,
                          });
                          Alert.alert("Scheduled", result.message);
                        } catch (error: any) {
                          Alert.alert(
                            "Error",
                            error.response?.data?.message ||
                              "Failed to request deletion",
                          );
                        } finally {
                          setDeletionLoading(false);
                        }
                      },
                    },
                  ],
                );
              }}
            >
              <Icon name="trash-outline" size={18} color={colors.error} />
              <Text style={styles.deleteAccountText}>Delete My Account</Text>
            </TouchableOpacity>
          )}
        </View>

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
  title: {
    ...typography.parentH1,
    fontWeight: "bold",
    color: colors.primary,
    textAlign: "left",
    marginBottom: spacing.md,
  },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoText: { fontSize: 15, color: colors.textSecondary },
  childSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  childChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  childChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  childChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  childChipTextActive: { color: "#FFF" },
  settingsForm: {},
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  settingDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  subsectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  timeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  timeField: { flex: 1 },
  timeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  timeInput: {
    height: 40,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: "center",
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
  subCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  subRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  restoreText: {
    fontFamily: fonts.parent.medium,
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: "underline",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  linkText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  deletionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.error + "10",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error + "30",
    gap: spacing.sm,
  },
  deletionBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.error,
  },
  deletionBannerText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cancelDeletionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelDeletionText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  deleteAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error + "40",
  },
  deleteAccountText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.error,
  },
  logoutButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  logoutText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
