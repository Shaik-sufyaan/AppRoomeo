-- Drop the auto-create trigger and function
-- We don't need it since users complete full onboarding
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Update RLS policy to be more permissive for new users
-- This allows the profile to be created during onboarding
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
