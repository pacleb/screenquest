import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../store/auth";
import { familyService } from "../../services/family";
import { colors, spacing, borderRadius } from "../../theme";

export default function AddChildScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddChild = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a name");
      return;
    }

    if (!consentChecked) {
      Alert.alert(
        "Consent Required",
        "You must provide parental consent to add a child.",
      );
      return;
    }

    if (!user?.familyId) {
      Alert.alert("Error", "No family found. Please create a family first.");
      return;
    }

    setLoading(true);
    try {
      await familyService.createChild(user.familyId, {
        name: name.trim(),
        consentText:
          "I, the parent/guardian, consent to the collection and use of my child's information as described in the ScreenQuest Privacy Policy, in accordance with COPPA.",
      });

      Alert.alert("Child Added!", `${name} has been added to your family!`, [
        {
          text: "Add Another Child",
          onPress: () => {
            setName("");
            setConsentChecked(false);
          },
        },
        {
          text: "Go to Dashboard",
          onPress: () =>
            navigation.reset({ index: 0, routes: [{ name: "App" }] }),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to add child",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="add-child-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.emoji}>👶</Text>
          <Text style={styles.title}>Add a Child</Text>
          <Text style={styles.subtitle}>
            Create a profile for your child so they can start earning screen
            time
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Child's Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Timmy"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                testID="add-child-name-input"
              />
            </View>

            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setConsentChecked(!consentChecked)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consentChecked }}
              accessibilityLabel="COPPA parental consent"
              testID="add-child-consent-checkbox"
            >
              <Text style={styles.consentCheckbox}>
                {consentChecked ? "☑" : "☐"}
              </Text>
              <Text style={styles.consentText}>
                I consent to ScreenQuest collecting my child's data as described
                in the Privacy Policy (COPPA).
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAddChild}
              disabled={loading}
              testID="add-child-submit-btn"
            >
              <Text style={styles.buttonText}>
                {loading ? "Adding..." : "Add Child"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={() =>
                navigation.reset({ index: 0, routes: [{ name: "App" }] })
              }
              testID="add-child-skip-btn"
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
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
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
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
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  consentRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  consentCheckbox: {
    fontSize: 22,
    color: colors.primary,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
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
  skipButton: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  skipButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});
