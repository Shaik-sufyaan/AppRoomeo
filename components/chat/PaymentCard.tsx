import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SplitRequest } from '@/types';
import { chatColors, chatTypography, chatBorderRadius, chatSpacing } from '@/constants/chatColors';

interface PaymentCardProps {
  splitRequest: SplitRequest;
  onAccept: () => void;
  onDecline: () => void;
  isCreator: boolean; // Whether current user created this split
}

export default function PaymentCard({
  splitRequest,
  onAccept,
  onDecline,
  isCreator,
}: PaymentCardProps) {
  const { itemName, itemEmoji, totalAmount, splits, status } = splitRequest;

  // Function to get user initials
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Render status badge for completed requests
  const renderStatusBadge = () => {
    if (status === 'accepted') {
      return (
        <View style={[styles.statusBadge, styles.acceptedBadge]}>
          <Text style={styles.statusBadgeText}>✓ Accepted</Text>
        </View>
      );
    } else if (status === 'declined') {
      return (
        <View style={[styles.statusBadge, styles.declinedBadge]}>
          <Text style={styles.statusBadgeText}>✕ Declined</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[chatColors.accentGreen, chatColors.successGreen]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconContainer}
        >
          <Text style={styles.emoji}>{itemEmoji}</Text>
        </LinearGradient>
        <View style={styles.headerInfo}>
          <Text style={styles.itemName}>{itemName}</Text>
          <Text style={styles.subtitle}>Split expense request</Text>
        </View>
      </View>

      {/* Total Amount */}
      <Text style={styles.amount}>${totalAmount.toFixed(2)}</Text>

      {/* Split Details */}
      <View style={styles.splitsContainer}>
        {splits.map((split, index) => (
          <View key={index} style={styles.splitRow}>
            <View style={styles.splitUser}>
              <View style={styles.splitAvatar}>
                <Text style={styles.splitInitials}>
                  {split.userInitials || getInitials(split.userName)}
                </Text>
              </View>
              <Text style={styles.splitUserName}>{split.userName}</Text>
            </View>
            <Text style={styles.splitAmount}>${split.amount.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Action Buttons or Status Badge */}
      {status === 'pending' && !isCreator ? (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onAccept}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[chatColors.accentGreen, chatColors.successGreen]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientButton}
            >
              <Text style={styles.primaryButtonText}>Accept Split</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onDecline}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      ) : (
        renderStatusBadge()
      )}

      {status === 'pending' && isCreator && (
        <View style={[styles.statusBadge, styles.pendingBadge]}>
          <Text style={styles.statusBadgeText}>⏳ Waiting for response</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: chatColors.overlayMedium,
    borderRadius: chatBorderRadius.large,
    padding: chatSpacing.lg,
    maxWidth: '85%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: chatSpacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: chatBorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  headerInfo: {
    marginLeft: chatSpacing.md,
    flex: 1,
  },
  itemName: {
    fontSize: chatTypography.paymentTitle.fontSize,
    fontWeight: chatTypography.paymentTitle.fontWeight,
    color: chatColors.onLightBackground,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: chatTypography.paymentInfo.fontSize,
    fontWeight: chatTypography.paymentInfo.fontWeight,
    color: chatColors.secondaryText,
  },

  // Amount styles
  amount: {
    fontSize: chatTypography.paymentAmount.fontSize,
    fontWeight: chatTypography.paymentAmount.fontWeight,
    color: chatColors.onLightBackground,
    marginVertical: chatSpacing.md,
  },

  // Splits styles
  splitsContainer: {
    borderTopWidth: 1,
    borderTopColor: chatColors.splitBorder,
    paddingTop: chatSpacing.md,
    marginBottom: chatSpacing.md,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: chatSpacing.sm,
  },
  splitUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  splitAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: chatColors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: chatSpacing.sm,
  },
  splitInitials: {
    fontSize: 12,
    fontWeight: '600',
    color: chatColors.onDarkBackground,
  },
  splitUserName: {
    fontSize: chatTypography.paymentInfo.fontSize,
    fontWeight: chatTypography.paymentInfo.fontWeight,
    color: chatColors.onLightBackground,
  },
  splitAmount: {
    fontSize: chatTypography.paymentInfo.fontSize,
    fontWeight: '600',
    color: chatColors.onLightBackground,
  },

  // Action buttons
  actionsContainer: {
    gap: chatSpacing.sm,
  },
  primaryButton: {
    borderRadius: chatBorderRadius.medium,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 10,
    paddingHorizontal: chatSpacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: chatTypography.buttonText.fontSize,
    fontWeight: chatTypography.buttonText.fontWeight,
    color: chatColors.onDarkBackground,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: chatColors.splitBorder,
    borderRadius: chatBorderRadius.medium,
    paddingVertical: 10,
    paddingHorizontal: chatSpacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: chatTypography.buttonText.fontSize,
    fontWeight: chatTypography.buttonText.fontWeight,
    color: chatColors.secondaryText,
  },

  // Status badge
  statusBadge: {
    paddingVertical: chatSpacing.sm,
    paddingHorizontal: chatSpacing.lg,
    borderRadius: chatBorderRadius.medium,
    alignItems: 'center',
    marginTop: chatSpacing.sm,
  },
  acceptedBadge: {
    backgroundColor: 'rgba(109, 213, 177, 0.2)',
  },
  declinedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  pendingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusBadgeText: {
    fontSize: chatTypography.buttonText.fontSize,
    fontWeight: chatTypography.buttonText.fontWeight,
    color: chatColors.onLightBackground,
  },
});
