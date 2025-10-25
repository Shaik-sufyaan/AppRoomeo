import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import Button from "@/components/Button";

const { width } = Dimensions.get("window");

const slides = [
  {
    title: "FIND YOUR\nPERFECT\nROOMMATE\nTODAY",
    description: "Swipe, match, and move in with compatible roommates. Split expenses, share furniture, and build your perfect living space.",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
  },
  {
    title: "SWIPE TO\nMATCH",
    description: "Browse profiles of potential roommates. See their lifestyle, preferences, and available rooms.",
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
  },
  {
    title: "SHARE &\nSPLIT",
    description: "Built-in marketplace and expense splitting. Buy furniture, share costs, and manage payments easily.",
    image: "https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=800",
  },
];

export default function SplashScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentIndex(index);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
        >
          {slides.map((slide, index) => (
            <View key={index} style={styles.slide}>
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: slide.image }}
                  style={styles.image}
                  resizeMode="cover"
                />
                <View style={styles.overlay} />
                <View style={styles.stripeOverlay} />
              </View>
              <View style={styles.content}>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.description}>{slide.description}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentIndex === index && styles.activeDot,
                ]}
              />
            ))}
          </View>

          <Button
            title="GET STARTED NOW"
            onPress={() => router.push("/onboarding/auth")}
            size="large"
            fullWidth
            testID="get-started-button"
          />

          <View style={styles.authButtons}>
            <Button
              title="SIGN UP FREE"
              onPress={() => router.push("/onboarding/auth")}
              variant="secondary"
              fullWidth
              testID="sign-up-button"
            />
            <Button
              title="SIGN IN"
              onPress={() => router.push("/onboarding/auth")}
              variant="ghost"
              fullWidth
              testID="sign-in-button"
            />
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
    opacity: 0.7,
  },
  stripeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    borderBottomWidth: 60,
    borderBottomColor: colors.primary,
    borderStyle: "solid",
    transform: [{ skewY: "-2deg" }],
    bottom: -30,
  },
  content: {
    position: "absolute",
    top: "15%",
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
  },
  title: {
    ...typography.h1,
    fontSize: 42,
    fontWeight: "800",
    color: colors.white,
    marginBottom: spacing.md,
    lineHeight: 48,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  description: {
    ...typography.body,
    color: colors.white,
    lineHeight: 24,
    marginTop: spacing.lg,
    paddingLeft: spacing.xs,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  footer: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryDark,
  },
  activeDot: {
    width: 24,
    backgroundColor: colors.accent,
  },
  authButtons: {
    gap: spacing.sm,
  },
});
