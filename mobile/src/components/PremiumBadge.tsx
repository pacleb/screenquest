import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { colors, spacing, borderRadius, fonts } from "../theme";

interface PremiumBadgeProps {
  size?: "sm" | "md";
  onPress?: () => void;
}

export function PremiumBadge({ size = "sm", onPress }: PremiumBadgeProps) {
  const navigation = useNavigation<any>();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate("Paywall");
    }
  };

  const isSmall = size === "sm";

  return (
    <TouchableOpacity
      style={[styles.container, isSmall && styles.containerSm]}
      onPress={handlePress}
    >
      <Icon name="lock-closed" size={isSmall ? 10 : 12} color={colors.accent} />
      <Text style={[styles.label, isSmall && styles.labelSm]}>Premium</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accent + "15",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  containerSm: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  label: {
    fontFamily: fonts.parent.semiBold,
    fontSize: 11,
    color: colors.accent,
  },
  labelSm: {
    fontSize: 10,
  },
});
