import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { MessageCircle, X } from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing, borderRadius } from "@/constants/spacing";
import Avatar from "./Avatar";
import { User } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface MatchCelebrationModalProps {
  visible: boolean;
  matchedUser: User;
  currentUser: User;
  isMutual?: boolean;
  onClose: () => void;
  onSendMessage: () => void;
  testID?: string;
}

export default function MatchCelebrationModal({
  visible,
  matchedUser,
  currentUser,
  isMutual = false,
  onClose,
  onSendMessage,
  testID,
}: MatchCelebrationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            testID={`${testID}-close`}
          >
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.content}>
            <Text style={styles.title}>
              {isMutual ? "🎉 It's a Match!" : "✓ Match Confirmed!"}
            </Text>

            {isMutual && (
              <Text style={styles.subtitle}>
                You both swiped right!
              </Text>
            )}

            <View style={styles.avatars}>
              <View style={styles.avatarContainer}>
                <Avatar
                  uri={currentUser.photos[0]}
                  name={currentUser.name}
                  size="xlarge"
                />
                <Text style={styles.avatarName}>You</Text>
              </View>

              <View style={styles.heartContainer}>
                <Text style={styles.heart}>❤️</Text>
              </View>

              <View style={styles.avatarContainer}>
                <Avatar
                  uri={matchedUser.photos[0]}
                  name={matchedUser.name}
                  size="xlarge"
                />
                <Text style={styles.avatarName}>{matchedUser.name}</Text>
              </View>
            </View>

            <Text style={styles.message}>
              You and {matchedUser.name} can now chat with each other!
            </Text>

            <TouchableOpacity
              style={styles.sendMessageButton}
              onPress={onSendMessage}
              testID={`${testID}-send-message`}
            >
              <MessageCircle size={20} color={colors.white} />
              <Text style={styles.sendMessageText}>Send Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.keepSwipingButton}
              onPress={onClose}
              testID={`${testID}-keep-swiping`}
            >
              <Text style={styles.keepSwipingText}>Keep Swiping</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: SCREEN_WIDTH - 40,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  closeButton: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.grayLight,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  content: {
    alignItems: "center",
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: "center",
  },
  avatars: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    alignItems: "center",
  },
  avatarName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontWeight: "600",
  },
  heartContainer: {
    marginHorizontal: spacing.lg,
  },
  heart: {
    fontSize: 40,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  sendMessageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    width: "100%",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sendMessageText: {
    ...typography.button,
    color: colors.white,
    fontWeight: "600",
  },
  keepSwipingButton: {
    paddingVertical: spacing.md,
  },
  keepSwipingText: {
    ...typography.button,
    color: colors.primary,
    fontWeight: "600",
  },
});
