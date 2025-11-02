import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { X, Upload, Camera, CheckCircle } from "lucide-react-native";
import * as ImagePicker from 'expo-image-picker';
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import Button from "@/components/Button";
import { PaymentMethod } from "@/lib/api/expenses";

interface SettlementModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    amount: number,
    paymentMethod: PaymentMethod,
    proofImage?: string,
    note?: string
  ) => Promise<void>;
  recipientName: string;
  maxAmount: number;
  roomName: string;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; emoji: string }[] = [
  { value: 'cash', label: 'Cash', emoji: '💵' },
  { value: 'zelle', label: 'Zelle', emoji: '⚡' },
  { value: 'venmo', label: 'Venmo', emoji: '💙' },
  { value: 'paypal', label: 'PayPal', emoji: '🅿️' },
  { value: 'bank_transfer', label: 'Bank Transfer', emoji: '🏦' },
  { value: 'other', label: 'Other', emoji: '💳' },
];

export default function SettlementModal({
  visible,
  onClose,
  onSubmit,
  recipientName,
  maxAmount,
  roomName,
}: SettlementModalProps) {
  const [amount, setAmount] = useState<string>(maxAmount.toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('zelle');
  const [proofImage, setProofImage] = useState<string | undefined>();
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleClose = () => {
    setAmount(maxAmount.toFixed(2));
    setPaymentMethod('zelle');
    setProofImage(undefined);
    setNote("");
    setIsSubmitting(false);
    onClose();
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload payment proof.'
        );
        return;
      }

      setIsUploadingImage(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProofImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera permissions to take a photo.'
        );
        return;
      }

      setIsUploadingImage(true);

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProofImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }

    if (parsedAmount > maxAmount) {
      Alert.alert(
        'Amount Too High',
        `The amount cannot exceed $${maxAmount.toFixed(2)}`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(parsedAmount, paymentMethod, proofImage, note);
      handleClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Settle Up</Text>
              <Text style={styles.modalSubtitle}>Pay {recipientName}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} testID="close-settlement-modal">
              <X size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Room Info */}
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Room</Text>
              <Text style={styles.infoValue}>{roomName}</Text>
            </View>

            {/* Amount Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Amount *</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={colors.gray}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  testID="settlement-amount-input"
                />
              </View>
              <Text style={styles.helperText}>
                You owe ${maxAmount.toFixed(2)}
              </Text>
            </View>

            {/* Payment Method Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Payment Method *</Text>
              <View style={styles.paymentMethodGrid}>
                {PAYMENT_METHODS.map((method) => (
                  <TouchableOpacity
                    key={method.value}
                    style={[
                      styles.paymentMethodButton,
                      paymentMethod === method.value && styles.paymentMethodButtonActive,
                    ]}
                    onPress={() => setPaymentMethod(method.value)}
                    testID={`payment-method-${method.value}`}
                  >
                    <Text style={styles.paymentMethodEmoji}>{method.emoji}</Text>
                    <Text
                      style={[
                        styles.paymentMethodLabel,
                        paymentMethod === method.value && styles.paymentMethodLabelActive,
                      ]}
                    >
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Payment Proof (Optional) */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Payment Proof (Optional)</Text>
              <Text style={styles.helperText}>
                Upload a screenshot or photo of your payment
              </Text>

              {proofImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: proofImage }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setProofImage(undefined)}
                  >
                    <X size={20} color={colors.white} />
                  </TouchableOpacity>
                  <View style={styles.imageCheckmark}>
                    <CheckCircle size={24} color={colors.success} />
                  </View>
                </View>
              ) : (
                <View style={styles.uploadButtonsContainer}>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handlePickImage}
                    disabled={isUploadingImage}
                    testID="upload-from-gallery"
                  >
                    {isUploadingImage ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Upload size={24} color={colors.primary} />
                        <Text style={styles.uploadButtonText}>Gallery</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handleTakePhoto}
                    disabled={isUploadingImage}
                    testID="take-photo"
                  >
                    {isUploadingImage ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Camera size={24} color={colors.primary} />
                        <Text style={styles.uploadButtonText}>Camera</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Notes (Optional) */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Note (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add a note about this payment..."
                placeholderTextColor={colors.gray}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                testID="settlement-note-input"
              />
            </View>

            {/* Submit Button */}
            <Button
              title={isSubmitting ? "Submitting..." : "Submit Payment"}
              onPress={handleSubmit}
              variant="primary"
              disabled={isSubmitting || !amount || !paymentMethod}
              testID="submit-settlement-button"
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: "600",
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  modalBody: {
    padding: spacing.lg,
  },
  infoCard: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  infoValue: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "500",
    marginBottom: spacing.sm,
  },
  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
  },
  currencySymbol: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: "600",
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 1,
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: "600",
    paddingVertical: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.card,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  paymentMethodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  paymentMethodButton: {
    flex: 1,
    minWidth: "30%",
    flexBasis: "30%",
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.border,
  },
  paymentMethodButtonActive: {
    borderColor: colors.accent,
    backgroundColor: '#e6f7ff',
  },
  paymentMethodEmoji: {
    fontSize: 24,
  },
  paymentMethodLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  paymentMethodLabelActive: {
    color: colors.accent,
    fontWeight: "600",
  },
  uploadButtonsContainer: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  uploadButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    backgroundColor: colors.card,
  },
  uploadButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: "500",
  },
  imagePreviewContainer: {
    position: "relative",
    marginTop: spacing.sm,
    borderRadius: 12,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: 20,
    padding: spacing.xs,
  },
  imageCheckmark: {
    position: "absolute",
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.xs,
  },
});
