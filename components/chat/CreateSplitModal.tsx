import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { chatColors, chatTypography, chatBorderRadius, chatSpacing } from '@/constants/chatColors';
import { CreateSplitRequestInput } from '@/types';

interface CreateSplitModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (splitRequest: Omit<CreateSplitRequestInput, 'messageId'>) => void;
  participants: { id: string; name: string }[];
}

const commonEmojis = ['💰', '🛋️', '🍕', '🎬', '🚗', '🏠', '🎉', '📱', '💡', '🎮'];

export default function CreateSplitModal({
  visible,
  onClose,
  onSubmit,
  participants,
}: CreateSplitModalProps) {
  const [itemName, setItemName] = useState('');
  const [itemEmoji, setItemEmoji] = useState('💰');
  const [totalAmount, setTotalAmount] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');

  const handleClose = () => {
    // Reset form
    setItemName('');
    setItemEmoji('💰');
    setTotalAmount('');
    setSelectedParticipants([]);
    setSplitType('equal');
    onClose();
  };

  const handleSubmit = () => {
    // Validation
    if (!itemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (selectedParticipants.length === 0) {
      Alert.alert('Error', 'Please select at least one participant');
      return;
    }

    // Calculate splits
    const splitAmount = amount / selectedParticipants.length;
    const splits = selectedParticipants.map((participantId) => {
      const participant = participants.find((p) => p.id === participantId);
      return {
        userId: participantId,
        userName: participant?.name || 'Unknown',
        amount: splitAmount,
      };
    });

    // Submit
    onSubmit({
      itemName: itemName.trim(),
      itemEmoji,
      totalAmount: amount,
      splits,
    });

    handleClose();
  };

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(participantId)
        ? prev.filter((id) => id !== participantId)
        : [...prev, participantId]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Split Request</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={chatColors.onLightBackground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Item Name */}
            <View style={styles.section}>
              <Text style={styles.label}>Item Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Living Room Couch"
                placeholderTextColor={chatColors.mutedText}
                value={itemName}
                onChangeText={setItemName}
              />
            </View>

            {/* Emoji Selector */}
            <View style={styles.section}>
              <Text style={styles.label}>Select Emoji</Text>
              <View style={styles.emojiGrid}>
                {commonEmojis.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiButton,
                      itemEmoji === emoji && styles.emojiButtonSelected,
                    ]}
                    onPress={() => setItemEmoji(emoji)}
                  >
                    <Text style={styles.emoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Total Amount */}
            <View style={styles.section}>
              <Text style={styles.label}>Total Amount ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={chatColors.mutedText}
                value={totalAmount}
                onChangeText={setTotalAmount}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Participants */}
            <View style={styles.section}>
              <Text style={styles.label}>Split With</Text>
              {participants.map((participant) => (
                <TouchableOpacity
                  key={participant.id}
                  style={styles.participantRow}
                  onPress={() => toggleParticipant(participant.id)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      selectedParticipants.includes(participant.id) &&
                        styles.checkboxSelected,
                    ]}
                  >
                    {selectedParticipants.includes(participant.id) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.participantName}>{participant.name}</Text>
                  {selectedParticipants.includes(participant.id) && totalAmount && (
                    <Text style={styles.participantAmount}>
                      ${(parseFloat(totalAmount) / selectedParticipants.length).toFixed(2)}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButtonContainer}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[chatColors.accentGreen, chatColors.successGreen]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitButton}
            >
              <Text style={styles.submitButtonText}>Create Split Request</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: chatColors.onDarkBackground,
    borderTopLeftRadius: chatBorderRadius.large,
    borderTopRightRadius: chatBorderRadius.large,
    maxHeight: '90%',
    paddingTop: chatSpacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: chatSpacing.lg,
    paddingBottom: chatSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: chatColors.splitBorder,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: chatColors.onLightBackground,
  },
  closeButton: {
    padding: chatSpacing.sm,
  },
  scrollView: {
    paddingHorizontal: chatSpacing.lg,
  },
  section: {
    marginTop: chatSpacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: chatColors.onLightBackground,
    marginBottom: chatSpacing.sm,
  },
  input: {
    backgroundColor: chatColors.inputBackground,
    borderWidth: 1,
    borderColor: chatColors.inputBorder,
    borderRadius: chatBorderRadius.medium,
    paddingVertical: chatSpacing.md,
    paddingHorizontal: chatSpacing.lg,
    fontSize: 16,
    color: chatColors.onLightBackground,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: chatSpacing.sm,
  },
  emojiButton: {
    width: 50,
    height: 50,
    borderRadius: chatBorderRadius.medium,
    backgroundColor: chatColors.inputBackground,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonSelected: {
    borderColor: chatColors.accentGreen,
    backgroundColor: 'rgba(109, 213, 177, 0.1)',
  },
  emoji: {
    fontSize: 24,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: chatSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: chatColors.splitBorder,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: chatColors.splitBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: chatSpacing.md,
  },
  checkboxSelected: {
    backgroundColor: chatColors.accentGreen,
    borderColor: chatColors.accentGreen,
  },
  checkmark: {
    color: chatColors.onDarkBackground,
    fontSize: 14,
    fontWeight: '700',
  },
  participantName: {
    flex: 1,
    fontSize: 16,
    color: chatColors.onLightBackground,
  },
  participantAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: chatColors.secondaryText,
  },
  submitButtonContainer: {
    margin: chatSpacing.lg,
    borderRadius: chatBorderRadius.medium,
    overflow: 'hidden',
  },
  submitButton: {
    paddingVertical: chatSpacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: chatColors.onDarkBackground,
  },
});
