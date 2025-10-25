import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing, borderRadius } from "@/constants/spacing";
import Button from "@/components/Button";
import { signUp, signIn } from "@/lib/auth";

type AuthMode = "signin" | "signup";

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    setIsLoading(true);

    try {
      if (mode === "signup") {
        // Sign up new user
        const result = await signUp({ email, password });

        // Check if email confirmation is required
        if (result.user && !result.session) {
          Alert.alert(
            "Check Your Email",
            "Please check your email and click the confirmation link to continue.",
            [{ text: "OK" }]
          );
          setIsLoading(false);
          return;
        }

        // If we have a session, proceed to user type selection
        if (result.session) {
          router.push("/onboarding/user-type");
        }
      } else {
        // Sign in existing user
        await signIn({ email, password });
        // Existing account - go directly to main app
        router.replace("/(tabs)/matches");
      }
    } catch (error: any) {
      Alert.alert(
        "Authentication Error",
        error.message || "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    if (!email || !password) return false;
    if (mode === "signup" && password !== confirmPassword) return false;
    return true;
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: mode === "signup" ? "Sign Up" : "Sign In",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.title}>
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </Text>
            <Text style={styles.subtitle}>
              {mode === "signup"
                ? "Join MyCrib and find your perfect roommate"
                : "Sign in to continue to MyCrib"}
            </Text>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.gray}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  testID="email-input"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.gray}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete={mode === "signup" ? "password-new" : "password"}
                  testID="password-input"
                />
              </View>

              {mode === "signup" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    placeholderTextColor={colors.gray}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password-new"
                    testID="confirm-password-input"
                  />
                  {password && confirmPassword && password !== confirmPassword && (
                    <Text style={styles.errorText}>Passwords do not match</Text>
                  )}
                </View>
              )}

              {mode === "signin" && (
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </View>

            <Button
              title={mode === "signup" ? "SIGN UP" : "SIGN IN"}
              onPress={handleAuth}
              size="large"
              fullWidth
              disabled={!isFormValid() || isLoading}
              testID="auth-button"
            />

            <View style={styles.switchMode}>
              <Text style={styles.switchModeText}>
                {mode === "signup"
                  ? "Already have an account? "
                  : "Don't have an account? "}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setMode(mode === "signup" ? "signin" : "signup")
                }
                testID="switch-mode-button"
              >
                <Text style={styles.switchModeLink}>
                  {mode === "signup" ? "Sign In" : "Sign Up"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              title="CONTINUE WITH GOOGLE"
              onPress={() => {
                // TODO: Implement Google OAuth
                console.log("Google OAuth");
              }}
              variant="secondary"
              fullWidth
              testID="google-auth-button"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
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
  form: {
    marginBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.grayLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.primary,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginTop: spacing.xs,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: -spacing.sm,
  },
  forgotPasswordText: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: "600",
  },
  switchMode: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  switchModeText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  switchModeLink: {
    ...typography.body,
    color: colors.accent,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.grayLight,
  },
  dividerText: {
    ...typography.bodySmall,
    color: colors.gray,
    marginHorizontal: spacing.md,
  },
});
