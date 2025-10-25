import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useApp } from "@/contexts/AppContext";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import colors from "@/constants/colors";

export default function Index() {
  const router = useRouter();
  const { hasCompletedOnboarding, isLoading } = useApp();

  useEffect(() => {
    if (!isLoading) {
      if (hasCompletedOnboarding) {
        router.replace("/matches");
      } else {
        router.replace("/onboarding/splash");
      }
    }
  }, [hasCompletedOnboarding, isLoading, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
});
