-- Function to update user profile after onboarding
-- This is called after user selects their type and completes profile
CREATE OR REPLACE FUNCTION update_user_profile(
  p_user_id UUID,
  p_user_type user_type,
  p_name TEXT,
  p_age INTEGER,
  p_college TEXT DEFAULT NULL,
  p_work_status work_status DEFAULT 'not-working',
  p_smoker BOOLEAN DEFAULT false,
  p_pets BOOLEAN DEFAULT false,
  p_has_place BOOLEAN DEFAULT false,
  p_about TEXT DEFAULT NULL,
  p_photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_room_photos TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS profiles AS $$
DECLARE
  v_profile profiles;
BEGIN
  -- Update the profile with all provided data
  UPDATE profiles
  SET
    user_type = p_user_type,
    name = p_name,
    age = p_age,
    college = p_college,
    work_status = p_work_status,
    smoker = p_smoker,
    pets = p_pets,
    has_place = p_has_place,
    about = p_about,
    photos = p_photos,
    room_photos = p_room_photos,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user profile by ID
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id UUID)
RETURNS profiles AS $$
DECLARE
  v_profile profiles;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has completed onboarding
CREATE OR REPLACE FUNCTION has_completed_onboarding(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_completed BOOLEAN;
BEGIN
  SELECT (user_type IS NOT NULL AND name IS NOT NULL AND age IS NOT NULL)
  INTO v_completed
  FROM profiles
  WHERE id = p_user_id;

  RETURN COALESCE(v_completed, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION has_completed_onboarding TO authenticated;
