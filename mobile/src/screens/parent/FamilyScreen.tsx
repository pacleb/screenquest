import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Share,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import Clipboard from "@react-native-clipboard/clipboard";
import { useAuthStore } from "../../store/auth";
import { familyService, Family, FamilyMember } from "../../services/family";
import { colors, spacing, borderRadius } from "../../theme";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { AppEvents, eventBus } from "../../utils/eventBus";

const ROLE_LABELS: Record<string, string> = {
  parent: "Parent",
  guardian: "Guardian",
  child: "Child",
};

const ROLE_COLORS: Record<string, string> = {
  parent: colors.primary,
  guardian: colors.purple,
  child: colors.secondary,
};

export default function FamilyScreen() {
  const user = useAuthStore((s) => s.user);
  const familyId = user?.familyId;

  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Child form
  const [showAddChild, setShowAddChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [addingChild, setAddingChild] = useState(false);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!familyId) {
      setLoading(false);
      return;
    }
    try {
      const [familyData, membersData] = await Promise.all([
        familyService.get(familyId),
        familyService.getMembers(familyId),
      ]);
      setFamily(familyData);
      setMembers(membersData);
    } catch {
      Alert.alert("Error", "Failed to load family data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [familyId]);

  useAutoRefresh({
    fetchData,
    events: [AppEvents.FAMILY_CHANGED],
    intervalMs: 60_000,
  });

  const handleCopyCode = async () => {
    if (!family) return;
    await Clipboard.setString(family.familyCode);
    Alert.alert("Copied!", "Family code copied to clipboard");
  };

  const handleShareCode = async () => {
    if (!family) return;
    try {
      await Share.share({
        message: `Join our family on ScreenQuest! Use code: ${family.familyCode}`,
      });
    } catch {
      // User cancelled
    }
  };

  const handleAddChild = async () => {
    if (!familyId) return;
    if (!childName.trim()) {
      Alert.alert("Validation", "Child name is required");
      return;
    }
    if (!consentChecked) {
      Alert.alert(
        "Consent Required",
        "You must provide parental consent to add a child.",
      );
      return;
    }

    setAddingChild(true);
    try {
      await familyService.createChild(familyId, {
        name: childName.trim(),
        consentText:
          "I, the parent/guardian, consent to the collection and use of my child's information as described in the ScreenQuest Privacy Policy, in accordance with COPPA.",
      });
      setChildName("");
      setConsentChecked(false);
      setShowAddChild(false);
      eventBus.emit(AppEvents.FAMILY_CHANGED);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to add child";
      Alert.alert("Error", msg);
    } finally {
      setAddingChild(false);
    }
  };

  const handleInvite = async () => {
    if (!familyId) return;
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      Alert.alert("Validation", "Please enter a valid email");
      return;
    }

    setInviting(true);
    try {
      await familyService.invite(familyId, inviteEmail.trim());
      Alert.alert("Invited!", `Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setShowInvite(false);
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to send invite";
      Alert.alert("Error", msg);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveChild = (child: FamilyMember) => {
    if (!familyId) return;
    Alert.alert("Remove Child", `Remove ${child.name} from the family?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await familyService.removeChild(familyId, child.id);
            eventBus.emit(AppEvents.FAMILY_CHANGED);
            fetchData();
          } catch {
            Alert.alert("Error", "Failed to remove child");
          }
        },
      },
    ]);
  };

  const parents = members.filter(
    (m) => m.role === "parent" || m.role === "guardian",
  );
  const childMembers = members.filter((m) => m.role === "child");

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 100 }}
        />
      </SafeAreaView>
    );
  }

  if (!familyId || !family) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyChildren}>
          <Text style={styles.emptyText}>No Family Set Up</Text>
          <Text style={styles.emptyHint}>
            Create or join a family to see your family code and manage members.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
          />
        }
      >
        {/* Family Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{family?.name || "My Family"}</Text>
          <View style={styles.planBadge}>
            <Text style={styles.planText}>
              {family?.plan === "premium" ? "Premium" : "Free Plan"}
            </Text>
          </View>
        </View>

        {/* Family Code Card */}
        <View style={styles.codeCard}>
          <View style={styles.codeHeader}>
            <Icon name="key-outline" size={20} color={colors.primary} />
            <Text style={styles.codeLabel}>Family Code</Text>
          </View>
          <Text style={styles.codeValue}>{family?.familyCode}</Text>
          <Text style={styles.codeHint}>
            Share this code with family members to join
          </Text>
          <View style={styles.codeActions}>
            <TouchableOpacity style={styles.codeBtn} onPress={handleCopyCode}>
              <Icon name="copy-outline" size={18} color={colors.primary} />
              <Text style={styles.codeBtnText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.codeBtn} onPress={handleShareCode}>
              <Icon name="share-outline" size={18} color={colors.primary} />
              <Text style={styles.codeBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Parents & Guardians */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Parents & Guardians</Text>
            <TouchableOpacity onPress={() => setShowInvite(!showInvite)}>
              <Icon
                name="person-add-outline"
                size={22}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {showInvite && (
            <View style={styles.addForm}>
              <TextInput
                style={styles.formInput}
                placeholder="Email address"
                placeholderTextColor={colors.textSecondary}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel="Email address for invitation"
              />
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowInvite(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleInvite}
                  disabled={inviting}
                >
                  {inviting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Send Invite</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {parents.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberAvatar}>
                <Text style={styles.avatarText}>
                  {member.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {member.name}
                  {member.id === family?.ownerId && (
                    <Text style={styles.ownerBadge}> (Owner)</Text>
                  )}
                </Text>
                <Text style={styles.memberEmail}>{member.email}</Text>
              </View>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: ROLE_COLORS[member.role] + "20" },
                ]}
              >
                <Text
                  style={[styles.roleText, { color: ROLE_COLORS[member.role] }]}
                >
                  {ROLE_LABELS[member.role] || member.role}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Children */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Children ({childMembers.length}/6)
            </Text>
            <TouchableOpacity onPress={() => setShowAddChild(!showAddChild)}>
              <Icon
                name="add-circle-outline"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {showAddChild && (
            <View style={styles.addForm}>
              <TextInput
                style={styles.formInput}
                placeholder="Child's name"
                placeholderTextColor={colors.textSecondary}
                value={childName}
                onChangeText={setChildName}
                accessibilityLabel="Child's name"
              />
              <TouchableOpacity
                style={styles.consentRow}
                onPress={() => setConsentChecked(!consentChecked)}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: consentChecked }}
                accessibilityLabel="COPPA parental consent"
              >
                <Icon
                  name={consentChecked ? "checkbox" : "square-outline"}
                  size={22}
                  color={consentChecked ? colors.primary : colors.textSecondary}
                />
                <Text style={styles.consentText}>
                  I consent to ScreenQuest collecting my child's data as
                  described in the Privacy Policy (COPPA).
                </Text>
              </TouchableOpacity>
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowAddChild(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleAddChild}
                  disabled={addingChild}
                >
                  {addingChild ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Add Child</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {childMembers.length === 0 ? (
            <View style={styles.emptyChildren}>
              <Text style={styles.emptyText}>No children added yet</Text>
              <Text style={styles.emptyHint}>
                Tap + to add your first child
              </Text>
            </View>
          ) : (
            childMembers.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={styles.memberCard}
                onLongPress={() => handleRemoveChild(child)}
              >
                <View
                  style={[
                    styles.memberAvatar,
                    { backgroundColor: colors.secondary + "30" },
                  ]}
                >
                  <Text
                    style={[styles.avatarText, { color: colors.secondary }]}
                  >
                    {child.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{child.name}</Text>
                  {child.age && (
                    <Text style={styles.memberEmail}>Age {child.age}</Text>
                  )}
                </View>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: ROLE_COLORS.child + "20" },
                  ]}
                >
                  <Text style={[styles.roleText, { color: ROLE_COLORS.child }]}>
                    Child
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.textPrimary },
  planBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.accent + "20",
  },
  planText: { fontSize: 12, fontWeight: "700", color: colors.accent },
  codeCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  codeLabel: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  codeValue: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 4,
    textAlign: "center",
    marginVertical: spacing.sm,
  },
  codeHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  codeActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
  },
  codeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + "10",
  },
  codeBtnText: { fontSize: 14, fontWeight: "600", color: colors.primary },
  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: colors.primary },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  memberEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  ownerBadge: { fontSize: 12, fontWeight: "600", color: colors.accent },
  roleBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  roleText: { fontSize: 12, fontWeight: "700" },
  addForm: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },
  formInput: {
    height: 44,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  formRow: { flexDirection: "row", gap: spacing.sm },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  submitBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    minWidth: 100,
    alignItems: "center",
  },
  submitBtnText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  emptyChildren: { alignItems: "center", paddingVertical: spacing.xl },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  emptyHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
