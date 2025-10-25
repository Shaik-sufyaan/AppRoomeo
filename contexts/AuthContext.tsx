import { useState, useEffect } from "react";
import createContextHook from "@nkzw/create-context-hook";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

interface OnboardingData {
  userType: "looking-for-place" | "finding-roommate" | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  onboardingData: OnboardingData;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    onboardingData: {
      userType: null,
    },
  });

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        isLoading: false,
      }));
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({
        ...prev,
        user: session?.user ?? null,
      }));
    });

    return () => subscription.unsubscribe();
  }, []);

  const setUserType = (userType: "looking-for-place" | "finding-roommate") => {
    setState((prev) => ({
      ...prev,
      onboardingData: {
        ...prev.onboardingData,
        userType,
      },
    }));
  };

  const clearOnboardingData = () => {
    setState((prev) => ({
      ...prev,
      onboardingData: {
        userType: null,
      },
    }));
  };

  return {
    user: state.user,
    isLoading: state.isLoading,
    onboardingData: state.onboardingData,
    setUserType,
    clearOnboardingData,
  };
});
