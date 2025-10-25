import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { borderRadius, spacing } from "@/constants/spacing";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "small" | "medium" | "large";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export default function Button({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  testID,
}: ButtonProps) {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: borderRadius.md,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    };

    if (fullWidth) {
      baseStyle.width = "100%";
    }

    const sizeStyles: Record<ButtonSize, ViewStyle> = {
      small: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        minHeight: 36,
      },
      medium: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        minHeight: 48,
      },
      large: {
        paddingVertical: spacing.lg - 4,
        paddingHorizontal: spacing.xl,
        minHeight: 56,
      },
    };

    const variantStyles: Record<ButtonVariant, ViewStyle> = {
      primary: {
        backgroundColor: colors.accent,
      },
      secondary: {
        backgroundColor: "transparent",
        borderWidth: 2,
        borderColor: colors.accent,
      },
      ghost: {
        backgroundColor: "transparent",
      },
    };

    if (disabled || loading) {
      return {
        ...baseStyle,
        ...sizeStyles[size],
        backgroundColor: colors.grayLight,
        borderWidth: 0,
      };
    }

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      ...typography.button,
      textTransform: "uppercase",
      letterSpacing: 1,
    };

    const variantTextStyles: Record<ButtonVariant, TextStyle> = {
      primary: {
        color: colors.white,
      },
      secondary: {
        color: colors.accent,
      },
      ghost: {
        color: colors.primary,
      },
    };

    if (disabled || loading) {
      return {
        ...baseTextStyle,
        color: colors.gray,
      };
    }

    return {
      ...baseTextStyle,
      ...variantTextStyles[variant],
    };
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? colors.white : colors.accent}
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
