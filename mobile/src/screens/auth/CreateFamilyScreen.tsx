import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../store/auth";
import { familyService } from "../../services/family";
import { colors, spacing, borderRadius } from "../../theme";

export default function CreateFamilyScreen() {
  const navigation = useNavigation<any>();
  const { user, setUser } = useAuthStore();

  const [familyName, setFamilyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"create" | "join">("create");
  const [familyCode, setFamilyCode] = useState("");

  const handleCreate = async () => {
    if (!familyName.trim()) {
      Alert.alert("Error", "Please enter a family name");
      return;
    }

    setLoading(true);
    try {
      const family = await familyService.create(familyName.trim());
      Alert.alert(
        "Family Created!",
        `Your family code is: ${family.familyCode}\n\nShare this code with other parents/guardians to invite them.\n\nYou can add children from the Family tab.`,
        [
          {
            text: "OK",
            onPress: () => {
              // Setting familyId triggers RootNavigator to switch to AppNavigator
              if (user) setUser({ ...user, familyId: family.id });
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to create family",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!familyCode.trim()) {
      Alert.alert("Error", "Please enter a family code");
      return;
    }

    setLoading(true);
    try {
      const family = await familyService.join(familyCode.trim());
      Alert.alert("Joined!", `You joined ${family.name}!`, [
        {
          text: "OK",
          onPress: () => {
            // Setting familyId triggers RootNavigator to switch to AppNavigator
            if (user) setUser({ ...user, familyId: family.id });
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Invalid family code",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>👨‍👩‍👧‍👦</Text>
        <Text style={styles.title}>Set Up Your Family</Text>

        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeTab, mode === "create" && styles.modeTabActive]}
            onPress={() => setMode("create")}
          >
            <Text
              style={[
                styles.modeTabText,
                mode === "create" && styles.modeTabTextActive,
              ]}
            >
              Create New
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === "join" && styles.modeTabActive]}
            onPress={() => setMode("join")}
          >
            <Text
              style={[
                styles.modeTabText,
                mode === "join" && styles.modeTabTextActive,
              ]}
            >
              Join Family
            </Text>
          </TouchableOpacity>
        </View>

        {mode === "create" ? (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Family Name</Text>
              <TextInput
                style={styles.input}
                placeholder="The Smith Family"
                value={familyName}
                onChangeText={setFamilyName}
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Creating..." : "Create Family"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Family Code</Text>
              <TextInput
                style={styles.input}
                placeholder="ABC12345"
                value={familyCode}
                onChangeText={setFamilyCode}
                autoCapitalize="characters"
                maxLength={8}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleJoin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Joining..." : "Join Family"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "center",
  },
  emoji: {
    fontSize: 64,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: borderRadius.md,
  },
  modeTabActive: {
    backgroundColor: colors.primary,
  },
  modeTabText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  modeTabTextActive: {
    color: "#FFFFFF",
  },
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
