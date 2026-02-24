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
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuthStore } from "../../store/auth";
import { colors, spacing, borderRadius } from "../../theme";

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { login, childLogin } = useAuthStore();

  const [isChildMode, setIsChildMode] = useState(
    route.params?.mode === "child",
  );

  // Parent login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Child login
  const [familyCode, setFamilyCode] = useState("");
  const [childName, setChildName] = useState("");

  const [loading, setLoading] = useState(false);

  const handleParentLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      // RootNavigator automatically switches to App/Setup when isAuthenticated becomes true
    } catch (error: any) {
      Alert.alert("Sign In Failed", "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChildLogin = async () => {
    if (!familyCode.trim() || !childName.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await childLogin(familyCode.trim(), childName.trim());
      // RootNavigator automatically switches to App/Setup when isAuthenticated becomes true
    } catch (error: any) {
      Alert.alert("Sign In Failed", "Invalid family code or name. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="login-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Welcome Back!</Text>

          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeTab, !isChildMode && styles.modeTabActive]}
              onPress={() => setIsChildMode(false)}
              testID="login-parent-tab"
            >
              <Text
                style={[
                  styles.modeTabText,
                  !isChildMode && styles.modeTabTextActive,
                ]}
              >
                Parent
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, isChildMode && styles.modeTabActive]}
              onPress={() => setIsChildMode(true)}
              testID="login-child-tab"
            >
              <Text
                style={[
                  styles.modeTabText,
                  isChildMode && styles.modeTabTextActive,
                ]}
              >
                Child
              </Text>
            </TouchableOpacity>
          </View>

          {!isChildMode ? (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="parent@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  testID="login-email-input"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  testID="login-password-input"
                />
              </View>

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => navigation.navigate("ForgotPassword")}
              >
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleParentLogin}
                disabled={loading}
                testID="login-submit-btn"
              >
                <Text style={styles.buttonText}>
                  {loading ? "Signing In..." : "Sign In"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Family Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ABCDEFGH"
                  value={familyCode}
                  onChangeText={setFamilyCode}
                  autoCapitalize="characters"
                  testID="login-family-code-input"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Your Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Timmy"
                  value={childName}
                  onChangeText={setChildName}
                  autoCapitalize="words"
                  testID="login-child-name-input"
                />
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleChildLogin}
                disabled={loading}
                testID="login-submit-btn"
              >
                <Text style={styles.buttonText}>
                  {loading ? "Signing In..." : "Sign In"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!isChildMode && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Register")}
                testID="login-signup-link"
              >
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          )}
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
    paddingTop: spacing.md,
  },
  backButton: {
    fontSize: 16,
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
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
  forgotPassword: {
    alignSelf: "flex-end",
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
});
