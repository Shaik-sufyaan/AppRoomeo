import React from "react";
import { View, Image, Text, StyleSheet, ViewStyle } from "react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";

type AvatarSize = "small" | "medium" | "large" | "xlarge";

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: AvatarSize;
  style?: ViewStyle;
  testID?: string;
}

export default function Avatar({
  uri,
  name,
  size = "medium",
  style,
  testID,
}: AvatarProps) {
  const sizeMap: Record<AvatarSize, number> = {
    small: 32,
    medium: 48,
    large: 64,
    xlarge: 120,
  };

  const dimension = sizeMap[size];
  const fontSize = dimension / 2.5;

  const getInitials = (name?: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <View
      style={[
        styles.container,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
        style,
      ]}
      testID={testID}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            { width: dimension, height: dimension, borderRadius: dimension / 2 },
          ]}
        />
      ) : (
        <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  initials: {
    ...typography.body,
    color: colors.white,
    fontWeight: "700",
  },
});
