import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
} from "react-native";
import { X, Check } from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import Button from "@/components/Button";
import Avatar from "@/components/Avatar";
import { User, ExpenseEvent } from "@/types";

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateEvent: (event: ExpenseEvent) => void;
  currentUser: User | null;
  availableUsers: User[];
}

export default function CreateEventModal({
  visible,
  onClose,
  onCreateEvent,
  currentUser,
  availableUsers,
}: CreateEventModalProps) {
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [step, setStep] = useState<number>(1);

  const handleToggleUser = (user: User) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreate = () => {
    if (!name || !amount || !currentUser) return;

    const totalAmount = parseFloat(amount);
    const allParticipants = [currentUser, ...selectedUsers];

    const newEvent: ExpenseEvent = {
      id: `event-${Date.now()}`,
      name,
      description,
      amount: totalAmount,
      date: Date.now(),
      participants: allParticipants,
      createdBy: currentUser.id,
      rooms: [],
      expenses: [],
      totalBalance: 0,
      status: "active",
      createdAt: Date.now(),
    };

    console.log("Creating event:", newEvent);
    onCreateEvent(newEvent);
    handleClose();
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setAmount("");
    setSelectedUsers([]);
    setStep(1);
    onClose();
  };

  const handleNext = () => {
    if (step === 1 && name && amount) {
      setStep(2);
    }
  };

  const canCreate = name.trim() && amount.trim() && selectedUsers.length > 0;

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
            <Text style={styles.modalTitle}>
              {step === 1 ? "Create Event" : "Add Participants"}
            </Text>
            <TouchableOpacity onPress={handleClose} testID="close-create-event-modal">
              <X size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {step === 1 ? (
              <View style={styles.formContainer}>
                <Text style={styles.label}>Event Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Weekend Trip, Birthday Party"
                  placeholderTextColor={colors.gray}
                  value={name}
                  onChangeText={setName}
                  testID="event-name-input"
                />

                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add more details about this event..."
                  placeholderTextColor={colors.gray}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  testID="event-description-input"
                />

                <Text style={styles.label}>Estimated Budget *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="$0.00"
                  placeholderTextColor={colors.gray}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  testID="event-amount-input"
                />

                <Button
                  title="Next"
                  onPress={handleNext}
                  variant="primary"
                  disabled={!name || !amount}
                  testID="event-next-button"
                />
              </View>
            ) : (
              <View style={styles.formContainer}>
                <Text style={styles.infoText}>
                  You can add multiple rooms under this event later. Select participants who will be involved.
                </Text>

                <Text style={styles.label}>Selected: {selectedUsers.length}</Text>
                
                <FlatList
                  data={availableUsers}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const isSelected = !!selectedUsers.find((u) => u.id === item.id);
                    return (
                      <TouchableOpacity
                        style={styles.userRow}
                        onPress={() => handleToggleUser(item)}
                        testID={`user-${item.id}`}
                      >
                        <Avatar uri={item.photos[0]} size="medium" />
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>{item.name}</Text>
                          <Text style={styles.userAge}>{item.age} years old</Text>
                        </View>
                        <View
                          style={[
                            styles.checkbox,
                            isSelected && styles.checkboxSelected,
                          ]}
                        >
                          {isSelected && <Check size={16} color={colors.white} />}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  style={styles.userList}
                />

                <View style={styles.buttonRow}>
                  <Button
                    title="Back"
                    onPress={() => setStep(1)}
                    variant="secondary"
                    style={styles.halfButton}
                    testID="event-back-button"
                  />
                  <Button
                    title="Create Event"
                    onPress={handleCreate}
                    variant="primary"
                    disabled={!canCreate}
                    style={styles.halfButton}
                    testID="event-create-button"
                  />
                </View>
              </View>
            )}
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
  modalBody: {
    padding: spacing.lg,
  },
  formContainer: {
    gap: spacing.md,
  },
  label: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "500",
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
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: 10,
  },
  userList: {
    maxHeight: 300,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  userName: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  userAge: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.gray,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  halfButton: {
    flex: 1,
  },
});
