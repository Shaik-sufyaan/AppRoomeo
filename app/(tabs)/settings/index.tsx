import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { Stack } from "expo-router";
import { User, Mail, Lock, Eye, EyeOff, Trash2, LogOut } from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useApp } from "@/contexts/AppContext";

export default function SettingsScreen() {
  const { currentUser, toggleProfileVisibility, updateUserProfile } = useApp();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [name, setName] = useState(currentUser?.name || "");
  const [bio, setBio] = useState(currentUser?.about || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdateProfile = () => {
    updateUserProfile({ name, about: bio });
    setShowProfileModal(false);
    console.log("Profile updated");
  };

  const handleUpdateEmail = () => {
    updateUserProfile({ email });
    setShowEmailModal(false);
    console.log("Email updated");
  };

  const handleUpdatePassword = () => {
    console.log("Password update requested");
    setShowPasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => console.log("Account deletion confirmed"),
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Settings",
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
        }}
      />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Account</Text>

          <Card style={styles.settingCard}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowProfileModal(true)}
              testID="update-profile-button"
            >
              <View style={styles.settingIcon}>
                <User size={20} color={colors.accent} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Update Profile</Text>
                <Text style={styles.settingDescription}>Name, bio, interests</Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Card style={styles.settingCard}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowEmailModal(true)}
              testID="update-email-button"
            >
              <View style={styles.settingIcon}>
                <Mail size={20} color={colors.accent} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Email Address</Text>
                <Text style={styles.settingDescription}>
                  {currentUser?.email || "Not set"}
                </Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Card style={styles.settingCard}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowPasswordModal(true)}
              testID="change-password-button"
            >
              <View style={styles.settingIcon}>
                <Lock size={20} color={colors.accent} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Change Password</Text>
                <Text style={styles.settingDescription}>Update your password</Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Text style={styles.sectionTitle}>Privacy</Text>

          <Card style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <EyeOff size={20} color={colors.accent} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Profile Visibility</Text>
                <Text style={styles.settingDescription}>
                  {currentUser?.isVisible ? "Visible on Matches" : "Hidden from Matches"}
                </Text>
              </View>
              <Switch
                value={currentUser?.isVisible}
                onValueChange={toggleProfileVisibility}
                testID="visibility-toggle"
                trackColor={{ false: colors.gray, true: colors.accent }}
                thumbColor={colors.white}
              />
            </View>
          </Card>

          <Text style={styles.sectionTitle}>Danger Zone</Text>

          <Card style={styles.settingCard}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleDeleteAccount}
              testID="delete-account-button"
            >
              <View style={[styles.settingIcon, styles.dangerIcon]}>
                <Trash2 size={20} color={colors.error} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, styles.dangerLabel]}>
                  Delete Account
                </Text>
                <Text style={styles.settingDescription}>
                  Permanently delete your account
                </Text>
              </View>
            </TouchableOpacity>
          </Card>

          <View style={styles.logoutContainer}>
            <Button
              title="Log Out"
              onPress={() => console.log("Logout")}
              variant="secondary"
              testID="logout-button"
            />
          </View>
        </ScrollView>

        <Modal
          visible={showProfileModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowProfileModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Update Profile</Text>

              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={colors.gray}
                value={name}
                onChangeText={setName}
                testID="profile-name-input"
              />

              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell us about yourself"
                placeholderTextColor={colors.gray}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                testID="profile-bio-input"
              />

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  onPress={() => setShowProfileModal(false)}
                  variant="secondary"
                  style={styles.modalButton}
                />
                <Button
                  title="Save"
                  onPress={handleUpdateProfile}
                  variant="primary"
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showEmailModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEmailModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Update Email</Text>

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="your.email@example.com"
                placeholderTextColor={colors.gray}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="email-input"
              />

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  onPress={() => setShowEmailModal(false)}
                  variant="secondary"
                  style={styles.modalButton}
                />
                <Button
                  title="Save"
                  onPress={handleUpdateEmail}
                  variant="primary"
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showPasswordModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPasswordModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Change Password</Text>

              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.gray}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showPassword}
                  testID="current-password-input"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? (
                    <Eye size={20} color={colors.gray} />
                  ) : (
                    <EyeOff size={20} color={colors.gray} />
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.gray}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  testID="new-password-input"
                />
              </View>

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  onPress={() => setShowPasswordModal(false)}
                  variant="secondary"
                  style={styles.modalButton}
                />
                <Button
                  title="Update"
                  onPress={handleUpdatePassword}
                  variant="primary"
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: "600",
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  settingCard: {
    padding: 0,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerIcon: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  settingInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  settingLabel: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  dangerLabel: {
    color: colors.error,
  },
  settingDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  logoutContainer: {
    marginTop: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 400,
    gap: spacing.md,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  inputLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "500",
    marginTop: spacing.sm,
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
    minHeight: 100,
    textAlignVertical: "top",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.card,
  },
  passwordInput: {
    flex: 1,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  eyeIcon: {
    padding: spacing.md,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});
