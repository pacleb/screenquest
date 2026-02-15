import React, { useEffect, useRef, useCallback, useState } from "react";
import { Animated, Text, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { registerToast } from "../services/toastBridge";
import { colors, spacing, borderRadius } from "../theme";

type ToastType = "error" | "success" | "info";

const ICON_MAP: Record<ToastType, string> = {
  error: "alert-circle",
  success: "checkmark-circle",
  info: "information-circle",
};

const COLOR_MAP: Record<ToastType, string> = {
  error: colors.error,
  success: colors.secondary,
  info: colors.primary,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(
    (message: string, type: ToastType = "error") => {
      setToast({ message, type });
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => setToast(null));
      }, 3500);
    },
    [opacity],
  );

  useEffect(() => {
    registerToast(show);
  }, [show]);

  return (
    <>
      {children}
      {toast && (
        <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
          <Icon
            name={ICON_MAP[toast.type] as any}
            size={20}
            color={COLOR_MAP[toast.type]}
          />
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 100,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
});
