import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Bell, MessageCircle, Users, X } from 'lucide-react-native';
import colors from '@/constants/colors';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import Avatar from './Avatar';

const { width } = Dimensions.get('window');

interface NotificationToastProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'match' | 'message' | 'general';
  senderName?: string;
  senderPhoto?: string;
  onPress?: () => void;
  onDismiss: () => void;
  duration?: number;
}

export default function NotificationToast({
  visible,
  title,
  message,
  type = 'general',
  senderName,
  senderPhoto,
  onPress,
  onDismiss,
  duration = 4000,
}: NotificationToastProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Auto dismiss after duration
      timeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, duration);
    } else {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, duration, slideAnim]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  const handlePress = () => {
    if (onPress) {
      handleDismiss();
      onPress();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'match':
        return <Users size={20} color={colors.white} />;
      case 'message':
        return <MessageCircle size={20} color={colors.white} />;
      default:
        return <Bell size={20} color={colors.white} />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'match':
        return colors.accent;
      case 'message':
        return colors.primary;
      default:
        return colors.textPrimary;
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: getBackgroundColor(),
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        {/* Show sender photo for messages, or icon for other types */}
        {type === 'message' && senderPhoto ? (
          <Avatar uri={senderPhoto} size="small" />
        ) : (
          <View style={styles.iconContainer}>{getIcon()}</View>
        )}

        <View style={styles.textContainer}>
          {/* Show sender name for messages */}
          {type === 'message' && senderName ? (
            <>
              <Text style={styles.senderName} numberOfLines={1}>
                {senderName}
              </Text>
              <Text style={styles.message} numberOfLines={2}>
                {message}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.message} numberOfLines={2}>
                {message}
              </Text>
            </>
          )}
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
          <X size={18} color={colors.white} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: width,
    paddingTop: 50, // Account for status bar
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    zIndex: 9999,
    elevation: 10,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  senderName: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  message: {
    ...typography.bodySmall,
    color: colors.white,
    opacity: 0.9,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
