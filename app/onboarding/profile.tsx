import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Camera } from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing, borderRadius } from "@/constants/spacing";
import Input from "@/components/Input";
import Avatar from "@/components/Avatar";
import { useApp } from "@/contexts/AppContext";
import { User } from "@/types";

export default function ProfileScreen() {
  const router = useRouter();
  const { completeOnboarding } = useApp();
  
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [college, setCollege] = useState("");
  const [workStatus, setWorkStatus] = useState<"part-time" | "full-time" | "not-working">("not-working");
  const [smoker, setSmoker] = useState(false);
  const [pets, setPets] = useState(false);
  const [hasPlace, setHasPlace] = useState(false);
  const [about, setAbout] = useState("");

  const handleComplete = async () => {
    const user: User = {
      id: Date.now().toString(),
      name,
      age: parseInt(age, 10),
      college,
      workStatus,
      smoker,
      pets,
      hasPlace,
      about,
      photos: ["https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800"],
      roomPhotos: hasPlace ? ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"] : [],
    };

    await completeOnboarding(user);
    router.replace("/matches");
  };

  const isValid = name.trim() && age && parseInt(age, 10) > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Create Profile",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.photoUploader} testID="photo-uploader">
          <Avatar size="xlarge" name={name || "User"} />
          <View style={styles.cameraIcon}>
            <Camera size={20} color={colors.white} />
          </View>
        </TouchableOpacity>

        <Text style={styles.photoHint}>Tap to add your photo</Text>

        <View style={styles.form}>
          <Input
            label="Name *"
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            testID="name-input"
          />

          <Input
            label="Age *"
            value={age}
            onChangeText={setAge}
            placeholder="Enter your age"
            keyboardType="numeric"
            testID="age-input"
          />

          <Input
            label="College (Optional)"
            value={college}
            onChangeText={setCollege}
            placeholder="Enter your college"
            testID="college-input"
          />

          <View style={styles.field}>
            <Text style={styles.label}>Work Status</Text>
            <View style={styles.segmentControl}>
              {[
                { value: "part-time" as const, label: "Part-time" },
                { value: "full-time" as const, label: "Full-time" },
                { value: "not-working" as const, label: "Not working" },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.segment,
                    workStatus === option.value && styles.segmentActive,
                  ]}
                  onPress={() => setWorkStatus(option.value)}
                  testID={`work-status-${option.value}`}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      workStatus === option.value && styles.segmentTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.toggle}>
              <Text style={styles.label}>Smoker</Text>
              <Switch
                value={smoker}
                onValueChange={setSmoker}
                trackColor={{ false: colors.grayLight, true: colors.accent }}
                thumbColor={colors.white}
                testID="smoker-switch"
              />
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.toggle}>
              <Text style={styles.label}>Pets</Text>
              <Switch
                value={pets}
                onValueChange={setPets}
                trackColor={{ false: colors.grayLight, true: colors.accent }}
                thumbColor={colors.white}
                testID="pets-switch"
              />
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.toggle}>
              <Text style={styles.label}>Do you have a place?</Text>
              <Switch
                value={hasPlace}
                onValueChange={setHasPlace}
                trackColor={{ false: colors.grayLight, true: colors.accent }}
                thumbColor={colors.white}
                testID="has-place-switch"
              />
            </View>
          </View>

          {hasPlace && (
            <View style={styles.roomPhotosSection}>
              <Text style={styles.label}>Room Photos</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                testID="upload-room-photos"
              >
                <Text style={styles.uploadButtonText}>+ Add Room Photos</Text>
              </TouchableOpacity>
            </View>
          )}

          <Input
            label="About (Optional)"
            value={about}
            onChangeText={setAbout}
            placeholder="Tell us about yourself..."
            multiline
            numberOfLines={4}
            style={styles.textArea}
            testID="about-input"
          />
        </View>

        <TouchableOpacity
          style={[styles.completeButton, !isValid && styles.disabledButton]}
          onPress={handleComplete}
          disabled={!isValid}
          testID="complete-profile-button"
        >
          <Text
            style={[styles.completeText, !isValid && styles.disabledText]}
          >
            COMPLETE PROFILE
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  photoUploader: {
    alignSelf: "center",
    position: "relative",
    marginBottom: spacing.sm,
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.accent,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.background,
  },
  photoHint: {
    ...typography.caption,
    color: colors.gray,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  segmentControl: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  segmentText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  segmentTextActive: {
    color: colors.white,
    fontWeight: "600",
  },
  toggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  roomPhotosSection: {
    gap: spacing.sm,
  },
  uploadButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: "dashed",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  uploadButtonText: {
    ...typography.body,
    color: colors.accent,
    fontWeight: "600",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  completeButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  disabledButton: {
    backgroundColor: colors.grayLight,
  },
  completeText: {
    ...typography.button,
    color: colors.white,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  disabledText: {
    color: colors.gray,
  },
});
