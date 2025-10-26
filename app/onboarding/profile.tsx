import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Camera, X } from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing, borderRadius } from "@/constants/spacing";
import Input from "@/components/Input";
import Avatar from "@/components/Avatar";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "@/types";
import { createProfile } from "@/lib/profiles";
import { supabase } from "@/lib/supabase";
import { pickImage, pickMultipleImages, uploadImage, uploadMultipleImages } from "@/lib/storage";

export default function ProfileScreen() {
  const router = useRouter();
  const { completeOnboarding } = useApp();
  const { user, onboardingData, clearOnboardingData } = useAuth();

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [college, setCollege] = useState("");
  const [workStatus, setWorkStatus] = useState<"part-time" | "full-time" | "not-working">("not-working");
  const [smoker, setSmoker] = useState(false);
  const [pets, setPets] = useState(false);
  const [hasPlace, setHasPlace] = useState(false);
  const [about, setAbout] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Photo states
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [roomPhotoUris, setRoomPhotoUris] = useState<string[]>([]);

  // Check if user is finding a roommate (should see room photos option)
  const isFindingRoommate = onboardingData.userType === 'finding-roommate';

  const handlePickProfilePhoto = async () => {
    try {
      const uri = await pickImage();
      if (uri) {
        setProfilePhotoUri(uri);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick photo');
    }
  };

  const handlePickRoomPhotos = async () => {
    try {
      const uris = await pickMultipleImages({ quality: 0.8 });
      if (uris.length > 0) {
        setRoomPhotoUris([...roomPhotoUris, ...uris]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick photos');
    }
  };

  const handleRemoveRoomPhoto = (index: number) => {
    setRoomPhotoUris(roomPhotoUris.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    setIsLoading(true);

    try {
      // First check if we have a session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        Alert.alert("Session Error", `Failed to get session: ${sessionError.message}`);
        setIsLoading(false);
        return;
      }

      if (!session) {
        Alert.alert(
          "No Active Session",
          "Your session has expired. Please sign in again.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/onboarding/auth")
            }
          ]
        );
        setIsLoading(false);
        return;
      }

      // Get current user from Supabase
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        Alert.alert("User Error", `Failed to get user: ${userError.message}`);
        setIsLoading(false);
        return;
      }

      if (!currentUser) {
        Alert.alert("Error", "No user found. Please sign in again.");
        setIsLoading(false);
        return;
      }

      // Upload images to Supabase Storage
      let profilePhotoUrls: string[] = [];
      let roomPhotoUrls: string[] = [];

      try {
        // Upload profile photo if selected
        if (profilePhotoUri) {
          const result = await uploadImage({
            userId: currentUser.id,
            imageUri: profilePhotoUri,
            bucket: 'profile-photos',
          });
          profilePhotoUrls = [result.url];
        }

        // Upload room photos if user is finding roommate and has selected photos
        if (isFindingRoommate && roomPhotoUris.length > 0) {
          const results = await uploadMultipleImages({
            userId: currentUser.id,
            imageUris: roomPhotoUris,
            bucket: 'room-photos',
          });
          roomPhotoUrls = results.map(r => r.url);
        }
      } catch (uploadError: any) {
        Alert.alert("Upload Error", uploadError.message || "Failed to upload images");
        setIsLoading(false);
        return;
      }

      // Save profile to Supabase
      await createProfile({
        id: currentUser.id,
        user_type: onboardingData.userType,
        name,
        age: parseInt(age, 10),
        college: college || null,
        work_status: workStatus,
        smoker,
        pets,
        has_place: hasPlace,
        about: about || null,
        photos: profilePhotoUrls.length > 0 ? profilePhotoUrls : ["https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800"],
        room_photos: roomPhotoUrls.length > 0 ? roomPhotoUrls : [],
      });

      // Also save to local context for app functionality
      const localUser: User = {
        id: currentUser.id,
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

      await completeOnboarding(localUser);
      clearOnboardingData();
      router.replace("/matches");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to create profile. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
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
        <TouchableOpacity
          style={styles.photoUploader}
          testID="photo-uploader"
          onPress={handlePickProfilePhoto}
        >
          {profilePhotoUri ? (
            <Image source={{ uri: profilePhotoUri }} style={styles.profileImage} />
          ) : (
            <Avatar size="xlarge" name={name || "User"} />
          )}
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

          {isFindingRoommate && (
            <View style={styles.roomPhotosSection}>
              <Text style={styles.label}>Room Photos</Text>
              <Text style={styles.photoDescription}>
                Add photos of your place to attract potential roommates
              </Text>

              {roomPhotoUris.length > 0 && (
                <View style={styles.roomPhotosGrid}>
                  {roomPhotoUris.map((uri, index) => (
                    <View key={index} style={styles.roomPhotoContainer}>
                      <Image source={{ uri }} style={styles.roomPhoto} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => handleRemoveRoomPhoto(index)}
                      >
                        <X size={16} color={colors.white} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.uploadButton}
                testID="upload-room-photos"
                onPress={handlePickRoomPhotos}
              >
                <Text style={styles.uploadButtonText}>
                  + {roomPhotoUris.length > 0 ? 'Add More Photos' : 'Add Room Photos'}
                </Text>
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
          style={[styles.completeButton, (!isValid || isLoading) && styles.disabledButton]}
          onPress={handleComplete}
          disabled={!isValid || isLoading}
          testID="complete-profile-button"
        >
          <Text
            style={[styles.completeText, (!isValid || isLoading) && styles.disabledText]}
          >
            {isLoading ? "CREATING PROFILE..." : "COMPLETE PROFILE"}
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
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
  photoDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  roomPhotosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  roomPhotoContainer: {
    position: 'relative',
    width: '48%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  roomPhoto: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: "dashed",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xl,
    alignItems: "center",
    marginTop: spacing.sm,
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
