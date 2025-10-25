import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { borderRadius, spacing } from "@/constants/spacing";

interface BadgeProps {
  text?: string;
  label?: string;
  variant?: "primary" | "secondary" | "gold" | "success";
  style?: ViewStyle;
  testID?: string;
}

export default function Badge({
  text,
  label,
  variant = "primary",
  style,
  testID,
}: BadgeProps) {
  const displayText = text || label || "";

  const variantStyles = {
    primary: {
      backgroundColor: colors.accent,
      color: colors.white,
    },
    secondary: {
      backgroundColor: colors.background,
      color: colors.primary,
    },
    gold: {
      backgroundColor: colors.gold,
      color: colors.primary,
    },
    success: {
      backgroundColor: colors.success,
      color: colors.white,
    },
  };

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: variantStyles[variant].backgroundColor },
        style,
      ]}
      testID={testID}
    >
      <Text
        style={[styles.text, { color: variantStyles[variant].color }]}
      >
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  text: {
    ...typography.caption,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
