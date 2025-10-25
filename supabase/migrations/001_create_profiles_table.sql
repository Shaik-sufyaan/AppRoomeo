-- Create enum for work status
CREATE TYPE work_status AS ENUM ('part-time', 'full-time', 'not-working');

-- Create enum for user type (from onboarding)
CREATE TYPE user_type AS ENUM ('looking-for-place', 'finding-roommate');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  -- Primary key linked to Supabase Auth
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- User type from onboarding
  user_type user_type,

  -- Basic profile information (from profile.tsx)
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age > 0),
  college TEXT,
  work_status work_status NOT NULL DEFAULT 'not-working',
  smoker BOOLEAN NOT NULL DEFAULT false,
  pets BOOLEAN NOT NULL DEFAULT false,
  has_place BOOLEAN NOT NULL DEFAULT false,
  about TEXT,

  -- Photo URLs (stored as arrays)
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  room_photos TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Profile visibility
  is_visible BOOLEAN NOT NULL DEFAULT true,

  -- Location (for distance calculation)
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_profiles_user_type ON profiles(user_type);
CREATE INDEX idx_profiles_age ON profiles(age);
CREATE INDEX idx_profiles_has_place ON profiles(has_place);
CREATE INDEX idx_profiles_is_visible ON profiles(is_visible);
CREATE INDEX idx_profiles_location ON profiles(latitude, longitude);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view all visible profiles
CREATE POLICY "Users can view visible profiles"
  ON profiles FOR SELECT
  USING (is_visible = true OR auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on profile changes
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile automatically when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, age, work_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'age')::INTEGER, 18),
    'not-working'::work_status
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Grant permissions
GRANT USAGE ON TYPE work_status TO authenticated;
GRANT USAGE ON TYPE user_type TO authenticated;
GRANT ALL ON profiles TO authenticated;
