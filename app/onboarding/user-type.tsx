import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Home, Users } from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing, borderRadius } from "@/constants/spacing";
import Card from "@/components/Card";
import { useAuth } from "@/contexts/AuthContext";

type UserType = "looking-for-place" | "finding-roommate" | null;

export default function UserTypeScreen() {
  const router = useRouter();
  const { setUserType } = useAuth();
  const [selectedType, setSelectedType] = useState<UserType>(null);

  const handleContinue = () => {
    if (selectedType) {
      setUserType(selectedType);
      router.push("/onboarding/profile");
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Get Started",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
        }}
      />
      <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>What brings you here?</Text>
            <Text style={styles.subtitle}>
              Choose what you&apos;re looking for to get personalized matches
            </Text>

            <View style={styles.cards}>
              <TouchableOpacity
                onPress={() => setSelectedType("looking-for-place")}
                activeOpacity={0.8}
                testID="looking-for-place-card"
              >
                <Card
                  style={[
                    styles.card,
                    selectedType === "looking-for-place" && styles.selectedCard,
                  ]}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      selectedType === "looking-for-place" &&
                        styles.selectedIconContainer,
                    ]}
                  >
                    <Home
                      size={32}
                      color={
                        selectedType === "looking-for-place"
                          ? colors.white
                          : colors.primary
                      }
                    />
                  </View>
                  <Text style={[
                    styles.cardTitle,
                    selectedType === "looking-for-place" && styles.selectedCardTitle
                  ]}>Looking for a place</Text>
                  <Text style={[
                    styles.cardDescription,
                    selectedType === "looking-for-place" && styles.selectedCardDescription
                  ]}>
                    Find rooms and apartments from people who have space to share
                  </Text>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedType("finding-roommate")}
                activeOpacity={0.8}
                testID="finding-roommate-card"
              >
                <Card
                  style={[
                    styles.card,
                    selectedType === "finding-roommate" && styles.selectedCard,
                  ]}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      selectedType === "finding-roommate" &&
                        styles.selectedIconContainer,
                    ]}
                  >
                    <Users
                      size={32}
                      color={
                        selectedType === "finding-roommate"
                          ? colors.white
                          : colors.primary
                      }
                    />
                  </View>
                  <Text style={[
                    styles.cardTitle,
                    selectedType === "finding-roommate" && styles.selectedCardTitle
                  ]}>Finding a roommate</Text>
                  <Text style={[
                    styles.cardDescription,
                    selectedType === "finding-roommate" && styles.selectedCardDescription
                  ]}>
                    I have a place and looking for someone to share it with
                  </Text>
                </Card>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                !selectedType && styles.disabledButton,
              ]}
              onPress={handleContinue}
              disabled={!selectedType}
              testID="continue-button"
            >
              <Text
                style={[
                  styles.continueText,
                  !selectedType && styles.disabledText,
                ]}
              >
                CONTINUE
              </Text>
            </TouchableOpacity>
          </View>
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
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  cards: {
    gap: spacing.md,
  },
  card: {
    padding: spacing.lg,
    minHeight: 180,
  },
  selectedCard: {
    backgroundColor: colors.primary,
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  selectedIconContainer: {
    backgroundColor: colors.accent,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  selectedCardTitle: {
    color: colors.white,
  },
  cardDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  selectedCardDescription: {
    color: colors.white,
    opacity: 0.9,
  },
  footer: {
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  continueButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: colors.grayLight,
  },
  continueText: {
    ...typography.button,
    color: colors.white,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  disabledText: {
    color: colors.gray,
  },
});
