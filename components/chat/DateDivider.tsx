import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { chatColors, chatSpacing } from '@/constants/chatColors';

interface DateDividerProps {
  date: Date | string;
}

export default function DateDivider({ date }: DateDividerProps) {
  const formatDate = (dateInput: Date | string): string => {
    const msgDate = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Helper function to check if two dates are the same day
    const isSameDay = (date1: Date, date2: Date): boolean => {
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
      );
    };

    if (isSameDay(msgDate, today)) {
      return 'TODAY';
    } else if (isSameDay(msgDate, yesterday)) {
      return 'YESTERDAY';
    } else {
      // Format as "Oct 21, 2025"
      return msgDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.text}>{formatDate(date)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: chatSpacing.lg,
  },
  badge: {
    backgroundColor: chatColors.overlayDark,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    // Backdrop blur effect (not directly supported in RN, but we can use opacity)
    opacity: 0.9,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    color: chatColors.tertiaryText,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
