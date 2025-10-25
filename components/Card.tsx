import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import colors from "@/constants/colors";
import { borderRadius, spacing } from "@/constants/spacing";

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  testID?: string;
}

export default function Card({
  children,
  style,
  elevated = true,
  testID,
}: CardProps) {
  return (
    <View
      style={[styles.card, elevated && styles.elevated, style]}
      testID={testID}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  elevated: {
    shadowColor: colors.primaryDark,
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 4,
  },
});
