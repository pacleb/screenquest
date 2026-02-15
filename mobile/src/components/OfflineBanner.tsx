import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { spacing } from "../theme";

export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();

  if (isConnected) return null;

  return (
    <View style={styles.banner}>
      <Icon name="cloud-offline-outline" size={16} color="#FFF" />
      <Text style={styles.text}>
        You are offline. Some features may be limited.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "#666",
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFF",
  },
});
