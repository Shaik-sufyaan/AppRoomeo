import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { chatColors, chatSpacing } from '@/constants/chatColors';

interface TypingIndicatorProps {
  userName: string;
  userInitials: string;
}

export default function TypingIndicator({ userName, userInitials }: TypingIndicatorProps) {
  // Animated values for the three dots
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create animation for each dot
    const createAnimation = (animatedValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 420, // 30% of 1400ms
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 420,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.delay(560), // Rest of the 1400ms cycle
        ])
      );
    };

    // Start animations with staggered delays
    const anim1 = createAnimation(dot1, 0);
    const anim2 = createAnimation(dot2, 200);
    const anim3 = createAnimation(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    // Cleanup
    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  // Interpolate values for translation and opacity
  const createDotStyle = (animatedValue: Animated.Value) => {
    return {
      transform: [
        {
          translateY: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -8],
          }),
        },
      ],
      opacity: animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.4, 1],
      }),
    };
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.initials}>{userInitials}</Text>
      </View>
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, createDotStyle(dot1)]} />
        <Animated.View style={[styles.dot, createDotStyle(dot2)]} />
        <Animated.View style={[styles.dot, createDotStyle(dot3)]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: chatSpacing.sm,
    marginVertical: chatSpacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: chatColors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 12,
    fontWeight: '600',
    color: chatColors.onDarkBackground,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: chatColors.overlayMedium,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: chatColors.secondaryText,
  },
});
