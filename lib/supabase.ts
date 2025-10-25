import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Type definitions for database
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_type: 'looking-for-place' | 'finding-roommate' | null;
          name: string;
          age: number;
          college: string | null;
          work_status: 'part-time' | 'full-time' | 'not-working';
          smoker: boolean;
          pets: boolean;
          has_place: boolean;
          about: string | null;
          photos: string[];
          room_photos: string[];
          is_visible: boolean;
          location: string | null;
          latitude: number | null;
          longitude: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_type?: 'looking-for-place' | 'finding-roommate' | null;
          name: string;
          age: number;
          college?: string | null;
          work_status?: 'part-time' | 'full-time' | 'not-working';
          smoker?: boolean;
          pets?: boolean;
          has_place?: boolean;
          about?: string | null;
          photos?: string[];
          room_photos?: string[];
          is_visible?: boolean;
          location?: string | null;
          latitude?: number | null;
          longitude?: number | null;
        };
        Update: {
          id?: string;
          user_type?: 'looking-for-place' | 'finding-roommate' | null;
          name?: string;
          age?: number;
          college?: string | null;
          work_status?: 'part-time' | 'full-time' | 'not-working';
          smoker?: boolean;
          pets?: boolean;
          has_place?: boolean;
          about?: string | null;
          photos?: string[];
          room_photos?: string[];
          is_visible?: boolean;
          location?: string | null;
          latitude?: number | null;
          longitude?: number | null;
        };
      };
    };
  };
};
