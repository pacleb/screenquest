import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/auth";
import { authService } from "../../services/auth";
import { colors, spacing, borderRadius } from "../../theme";

export default function EmailVerificationScreen() {
  const { user, logout, setUser } = useAuthStore();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleResend = useCallback(async () => {
    setResending(true);
    try {
      await authService.resendVerification();
      Alert.alert(
        "Email Sent",
        "A new verification email has been sent. Please check your inbox.",
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Could not resend verification email.",
      );
    } finally {
      setResending(false);
    }
  }, []);

  const handleCheckStatus = useCallback(async () => {
    setChecking(true);
    try {
      const profile = await authService.getProfile();
      if (profile.emailVerified) {
        setUser(profile);
      } else {
        Alert.alert(
          "Not Verified Yet",
          "Your email hasn't been verified yet. Please check your inbox and click the verification link.",
        );
      }
    } catch (error: any) {
      Alert.alert("Error", "Could not check verification status.");
    } finally {
      setChecking(false);
    }
  }, [setUser]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>📧</Text>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to{"\n"}
          <Text style={styles.email}>{user?.email}</Text>
        </Text>
        <Text style={styles.description}>
          Please check your inbox and tap the link to verify your email address
          before using ScreenQuest.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCheckStatus}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>I've Verified My Email</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleResend}
          disabled={resending}
        >
          {resending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.secondaryButtonText}>
              Resend Verification Email
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>
            Sign in with a different account
          </Text>
        </TouchableOpacity>
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: 24,
  },
  email: {
    fontWeight: "600",
    color: colors.primary,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: borderRadius.md,
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: borderRadius.md,
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  logoutButton: {
    paddingVertical: spacing.sm,
  },
  logoutButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
