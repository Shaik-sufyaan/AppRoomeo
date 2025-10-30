import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Check, X, Home, Users } from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing, borderRadius } from "@/constants/spacing";
import Avatar from "./Avatar";
import Badge from "./Badge";
import Card from "./Card";
import { MatchRequestWithUser } from "@/types";

interface MatchRequestCardProps {
  request: MatchRequestWithUser;
  onApprove: (requestId: string) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
  testID?: string;
}

export default function MatchRequestCard({
  request,
  onApprove,
  onReject,
  testID,
}: MatchRequestCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApprove = async () => {
    if (isApproving || isRejecting) return;

    setIsApproving(true);
    try {
      await onApprove(request.id);
    } catch (error) {
      console.error("Error approving request:", error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (isApproving || isRejecting) return;

    setIsRejecting(true);
    try {
      await onReject(request.id);
    } catch (error) {
      console.error("Error rejecting request:", error);
    } finally {
      setIsRejecting(false);
    }
  };

  const isLoading = isApproving || isRejecting;

  // Safety check: make sure user data exists
  if (!request.user) {
    console.error('MatchRequestCard: request.user is undefined', request);
    return null;
  }

  return (
    <Card style={styles.card} testID={testID}>
      <View style={styles.header}>
        <Avatar uri={request.user.photos?.[0]} size="medium" />
        <View style={styles.userInfo}>
          <Text style={styles.name}>
            {request.user.name}, {request.user.age}
          </Text>
          {request.user.college && (
            <Text style={styles.college}>{request.user.college}</Text>
          )}
          {request.user.distance && (
            <Text style={styles.distance}>{request.user.distance} miles away</Text>
          )}
        </View>
      </View>

      <Text style={styles.message}>
        <Text style={styles.userName}>{request.user.name}</Text> is interested in connecting
        with you
      </Text>

      <View style={styles.badges}>
        {request.user.userType === "looking-for-place" ? (
          <View style={styles.typeBadge}>
            <Home size={14} color={colors.primary} />
            <Text style={styles.typeBadgeText}>Looking for a place</Text>
          </View>
        ) : (
          <View style={styles.typeBadge}>
            <Users size={14} color={colors.primary} />
            <Text style={styles.typeBadgeText}>Has a place</Text>
          </View>
        )}

        {request.user.workStatus !== "not-working" && (
          <Badge
            label={
              request.user.workStatus === "full-time" ? "Full-time" : "Part-time"
            }
            variant="gold"
          />
        )}

        {request.user.hasPlace && <Badge label="Has Place" variant="primary" />}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.rejectButton, isLoading && styles.disabledButton]}
          onPress={handleReject}
          disabled={isLoading}
          testID={`${testID}-reject`}
        >
          {isRejecting ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <>
              <X size={20} color={colors.textSecondary} />
              <Text style={styles.rejectText}>Reject</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.approveButton, isLoading && styles.disabledButton]}
          onPress={handleApprove}
          disabled={isLoading}
          testID={`${testID}-approve`}
        >
          {isApproving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Check size={20} color={colors.white} />
              <Text style={styles.approveText}>Approve</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  userInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  name: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  college: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  distance: {
    ...typography.caption,
    color: colors.gray,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  userName: {
    fontWeight: "600",
    color: colors.textPrimary,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  typeBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  approveButton: {
    backgroundColor: colors.accent,
  },
  rejectButton: {
    backgroundColor: colors.grayLight,
  },
  disabledButton: {
    opacity: 0.6,
  },
  approveText: {
    ...typography.button,
    color: colors.white,
    fontWeight: "600",
  },
  rejectText: {
    ...typography.button,
    color: colors.textSecondary,
    fontWeight: "600",
  },
});
