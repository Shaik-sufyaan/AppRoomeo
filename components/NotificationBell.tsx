import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Bell } from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";

interface NotificationBellProps {
  count: number;
  onPress?: () => void;
  testID?: string;
}

export default function NotificationBell({ count, onPress, testID }: NotificationBellProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      testID={testID}
    >
      <Bell size={24} color={colors.primary} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.white,
    fontWeight: "700",
  },
});
