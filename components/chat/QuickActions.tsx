import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { chatColors, chatTypography, chatSpacing } from '@/constants/chatColors';

interface QuickAction {
  id: string;
  emoji: string;
  label: string;
  onPress: () => void;
}

interface QuickActionsProps {
  actions?: QuickAction[];
  onRequestSplit?: () => void;
  onShareItem?: () => void;
  onSendLocation?: () => void;
}

export default function QuickActions({
  actions,
  onRequestSplit,
  onShareItem,
  onSendLocation,
}: QuickActionsProps) {
  // Default actions if not provided
  const defaultActions: QuickAction[] = [
    {
      id: 'split',
      emoji: '💰',
      label: 'Request split',
      onPress: onRequestSplit || (() => {}),
    },
    {
      id: 'item',
      emoji: '📦',
      label: 'Share item',
      onPress: onShareItem || (() => {}),
    },
    {
      id: 'location',
      emoji: '📍',
      label: 'Send location',
      onPress: onSendLocation || (() => {}),
    },
  ];

  const quickActions = actions || defaultActions;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionButton}
            onPress={action.onPress}
            activeOpacity={0.7}
          >
            <Text style={styles.actionText}>
              {action.emoji} {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: chatSpacing.sm,
  },
  scrollContent: {
    paddingHorizontal: chatSpacing.md,
    gap: chatSpacing.sm,
  },
  actionButton: {
    backgroundColor: chatColors.quickActionBackground,
    borderWidth: 1,
    borderColor: chatColors.quickActionBorder,
    borderRadius: 20,
    paddingVertical: chatSpacing.sm,
    paddingHorizontal: chatSpacing.lg,
    backdropFilter: 'blur(10px)',
  },
  actionText: {
    fontSize: chatTypography.quickAction.fontSize,
    fontWeight: chatTypography.quickAction.fontWeight,
    color: chatColors.onDarkBackground,
  },
});
