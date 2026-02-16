import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Pressable,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { colors, spacing, borderRadius } from "../theme";

export interface DropdownOption<T = string | number | null> {
  label: string;
  value: T;
}

interface DropdownPickerProps<T = string | number | null> {
  label?: string;
  options: DropdownOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  placeholder?: string;
}

export function DropdownPicker<T = string | number | null>({
  label,
  options,
  selectedValue,
  onSelect,
  placeholder = "Select...",
}: DropdownPickerProps<T>) {
  const [visible, setVisible] = useState(false);

  const selectedOption = options.find((o) => o.value === selectedValue);
  const displayText = selectedOption?.label ?? placeholder;

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.triggerText,
            !selectedOption && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <Icon name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.sheet}>
            {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}
            <FlatList
              data={options}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <TouchableOpacity
                    style={[styles.option, isSelected && styles.optionActive]}
                    onPress={() => {
                      onSelect(item.value);
                      setVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Icon
                        name="checkmark"
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              style={styles.list}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  trigger: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontWeight: "400",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  sheet: {
    width: "100%",
    maxHeight: "60%",
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  list: {
    maxHeight: 350,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
  },
  optionActive: {
    backgroundColor: colors.primary + "10",
  },
  optionText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  optionTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
});
