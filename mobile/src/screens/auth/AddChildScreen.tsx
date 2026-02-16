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
  const [age, setAge] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddChild = async () => {
    if (!name.trim() || !age.trim() || !pin.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 17) {
      Alert.alert("Error", "Age must be between 1 and 17");
      return;
    }

    if (pin.length < 4) {
      Alert.alert("Error", "PIN must be at least 4 digits");
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
        age: ageNum,
        pin,
        consentText:
          "I, the parent/guardian, consent to the collection and use of my child's information as described in the ScreenQuest Privacy Policy, in accordance with COPPA.",
      });

      Alert.alert("Child Added!", `${name} has been added to your family!`, [
        {
          text: "Add Another Child",
          onPress: () => {
            setName("");
            setAge("");
            setPin("");
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
    <SafeAreaView style={styles.container}>
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
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="8"
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PIN (for child login)</Text>
              <TextInput
                style={styles.input}
                placeholder="1234"
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                maxLength={6}
                secureTextEntry
              />
              <Text style={styles.hint}>
                Your child will use this PIN to log in
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAddChild}
              disabled={loading}
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
