import { Stack } from "expo-router";
import colors from "@/constants/colors";

export default function MarketplaceLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Marketplace",
          headerShown: true,
        }}
      />
    </Stack>
  );
}
