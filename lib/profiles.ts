import { supabase, Database } from './supabase';

export type ProfileData = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * Create or update a user profile in the database
 * Uses upsert because the profile might be auto-created by trigger
 */
export async function createProfile(profileData: ProfileData) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profileData, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get a user profile by ID
 */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update a user profile
 */
export async function updateProfile(userId: string, updates: Database['public']['Tables']['profiles']['Update']) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
