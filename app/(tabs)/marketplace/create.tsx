import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { X } from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { useApp } from "@/contexts/AppContext";
import { MarketplaceListing } from "@/types";

type Category = "furniture" | "household" | "other";

export default function CreateListingScreen() {
  const { addMarketplaceListing, currentUser } = useApp();
  const router = useRouter();

  const [title, setTitle] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [category, setCategory] = useState<Category>("furniture");
  const [imageUrl, setImageUrl] = useState<string>("");

  const handleSubmit = () => {
    if (!title || !price || !description || !location) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to create a listing");
      return;
    }

    const newListing: MarketplaceListing = {
      id: `ml-${Date.now()}`,
      title,
      price: parseFloat(price),
      description,
      category,
      images: [
        imageUrl ||
          "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800",
      ],
      seller: currentUser,
      location,
      timestamp: Date.now(),
      saved: false,
    };

    addMarketplaceListing(newListing);
    console.log("Listing created:", newListing);
    Alert.alert("Success", "Your listing has been created!", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  const categories: Category[] = ["furniture", "household", "other"];

  return (
    <>
      <Stack.Screen
        options={{
          title: "Create Listing",
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.closeButton}
              testID="close-button"
            >
              <X size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Item Details</Text>

          <Input
            label="Title *"
            value={title}
            onChangeText={setTitle}
            placeholder="E.g. Modern Grey Couch"
            testID="title-input"
          />

          <Input
            label="Price *"
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            keyboardType="decimal-pad"
            testID="price-input"
          />

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your item..."
              placeholderTextColor={colors.gray}
              multiline
              numberOfLines={4}
              maxLength={500}
              testID="description-input"
            />
          </View>

          <Input
            label="Location *"
            value={location}
            onChangeText={setLocation}
            placeholder="E.g. Downtown San Jose"
            testID="location-input"
          />

          <Input
            label="Image URL (optional)"
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://..."
            testID="image-url-input"
          />

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.categoryContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    category === cat && styles.categoryButtonActive,
                  ]}
                  onPress={() => setCategory(cat)}
                  testID={`category-${cat}`}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      category === cat && styles.categoryTextActive,
                    ]}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Create Listing"
            onPress={handleSubmit}
            variant="primary"
            testID="submit-button"
          />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  closeButton: {
    marginRight: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: "600",
  },
  inputContainer: {
    gap: spacing.sm,
  },
  label: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  textArea: {
    ...typography.body,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 100,
    textAlignVertical: "top",
    color: colors.textPrimary,
  },
  categoryContainer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
  },
  categoryButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.cardLight,
  },
  categoryText: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  categoryTextActive: {
    color: colors.accent,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
