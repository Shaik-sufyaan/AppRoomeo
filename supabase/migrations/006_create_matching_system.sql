-- =====================================================
-- Match Request System Migration
-- =====================================================
-- This migration creates tables and functions for the
-- approval-based matching system with complementary
-- user type filtering.
-- =====================================================

-- =====================================================
-- Table 1: match_requests
-- =====================================================
-- Stores pending match requests sent by users

CREATE TABLE match_requests (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The user who sent the request (swiped right)
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- The user who received the request
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Request status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Optional message with request (future feature)
  message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  -- Prevent duplicate requests
  CONSTRAINT unique_match_request UNIQUE (sender_id, recipient_id),

  -- Prevent self-requests
  CONSTRAINT no_self_request CHECK (sender_id != recipient_id)
);

-- Indexes for performance
CREATE INDEX idx_match_requests_recipient ON match_requests(recipient_id) WHERE status = 'pending';
CREATE INDEX idx_match_requests_sender ON match_requests(sender_id) WHERE status = 'pending';
CREATE INDEX idx_match_requests_status ON match_requests(status);
CREATE INDEX idx_match_requests_created_at ON match_requests(created_at DESC);
CREATE INDEX idx_match_requests_expires_at ON match_requests(expires_at) WHERE status = 'pending';

-- Enable Row Level Security
ALTER TABLE match_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for match_requests

-- Users can view requests they sent
CREATE POLICY "Users can view sent requests"
  ON match_requests FOR SELECT
  USING (sender_id = auth.uid());

-- Users can view requests they received
CREATE POLICY "Users can view received requests"
  ON match_requests FOR SELECT
  USING (recipient_id = auth.uid());

-- Users can create match requests
CREATE POLICY "Users can create match requests"
  ON match_requests FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Users can update (approve/reject) requests sent to them
CREATE POLICY "Users can update received requests"
  ON match_requests FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Users can delete their sent requests (cancel)
CREATE POLICY "Users can delete sent requests"
  ON match_requests FOR DELETE
  USING (sender_id = auth.uid());

-- =====================================================
-- Table 2: matches
-- =====================================================
-- Stores confirmed matches between users

CREATE TABLE matches (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The two matched users (order doesn't matter)
  user_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Match metadata
  matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Was this a mutual swipe (both swiped right before seeing request)?
  is_mutual BOOLEAN NOT NULL DEFAULT false,

  -- Prevent duplicate matches
  CONSTRAINT unique_match UNIQUE (user_a_id, user_b_id),

  -- Prevent self-match
  CONSTRAINT no_self_match CHECK (user_a_id != user_b_id)
);

-- Indexes for querying matches
CREATE INDEX idx_matches_user_a ON matches(user_a_id);
CREATE INDEX idx_matches_user_b ON matches(user_b_id);
CREATE INDEX idx_matches_matched_at ON matches(matched_at DESC);

-- Enable Row Level Security
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for matches

-- Users can view their matches
CREATE POLICY "Users can view their matches"
  ON matches FOR SELECT
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- Only system can create matches (via functions)
CREATE POLICY "System can create matches"
  ON matches FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- Table 3: swipes
-- =====================================================
-- Records all swipe actions for analytics and preventing re-showing

CREATE TABLE swipes (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The user who performed the swipe
  swiper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- The user who was swiped on
  swiped_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Type of swipe
  swipe_type TEXT NOT NULL CHECK (swipe_type IN ('like', 'skip', 'reject')),

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate swipes
  CONSTRAINT unique_swipe UNIQUE (swiper_id, swiped_user_id)
);

-- Indexes
CREATE INDEX idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX idx_swipes_swiped_user ON swipes(swiped_user_id);
CREATE INDEX idx_swipes_type ON swipes(swipe_type);
CREATE INDEX idx_swipes_created_at ON swipes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for swipes

-- Users can view their own swipes
CREATE POLICY "Users can view their swipes"
  ON swipes FOR SELECT
  USING (swiper_id = auth.uid());

-- Users can create swipes
CREATE POLICY "Users can create swipes"
  ON swipes FOR INSERT
  WITH CHECK (swiper_id = auth.uid());

-- =====================================================
-- Database Functions
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_match_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on match_request changes
CREATE TRIGGER update_match_requests_updated_at
  BEFORE UPDATE ON match_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_match_request_updated_at();

-- =====================================================
-- Function 1: Check for Mutual Match
-- =====================================================
CREATE OR REPLACE FUNCTION check_mutual_match(
  sender_uuid UUID,
  recipient_uuid UUID
) RETURNS BOOLEAN AS $$
DECLARE
  reverse_request_exists BOOLEAN;
BEGIN
  -- Check if recipient already sent a request to sender
  SELECT EXISTS (
    SELECT 1 FROM match_requests
    WHERE sender_id = recipient_uuid
      AND recipient_id = sender_uuid
      AND status = 'pending'
  ) INTO reverse_request_exists;

  RETURN reverse_request_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function 2: Create Match from Request
-- =====================================================
CREATE OR REPLACE FUNCTION create_match_from_request(
  request_uuid UUID
) RETURNS UUID AS $$
DECLARE
  sender_uuid UUID;
  recipient_uuid UUID;
  new_match_id UUID;
BEGIN
  -- Get sender and recipient from the request
  SELECT sender_id, recipient_id INTO sender_uuid, recipient_uuid
  FROM match_requests
  WHERE id = request_uuid AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match request not found or already processed';
  END IF;

  -- Check if match already exists
  IF EXISTS (
    SELECT 1 FROM matches
    WHERE (user_a_id = sender_uuid AND user_b_id = recipient_uuid)
       OR (user_a_id = recipient_uuid AND user_b_id = sender_uuid)
  ) THEN
    RAISE EXCEPTION 'Match already exists';
  END IF;

  -- Create the match
  INSERT INTO matches (user_a_id, user_b_id, is_mutual)
  VALUES (sender_uuid, recipient_uuid, false)
  RETURNING id INTO new_match_id;

  -- Update the match request status
  UPDATE match_requests
  SET status = 'approved'
  WHERE id = request_uuid;

  RETURN new_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function 3: Create Mutual Match
-- =====================================================
-- Called when both users swipe right on each other
CREATE OR REPLACE FUNCTION create_mutual_match(
  user_a_uuid UUID,
  user_b_uuid UUID
) RETURNS UUID AS $$
DECLARE
  new_match_id UUID;
BEGIN
  -- Check if match already exists
  IF EXISTS (
    SELECT 1 FROM matches
    WHERE (user_a_id = user_a_uuid AND user_b_id = user_b_uuid)
       OR (user_a_id = user_b_uuid AND user_b_id = user_a_uuid)
  ) THEN
    RAISE EXCEPTION 'Match already exists';
  END IF;

  -- Create the match
  INSERT INTO matches (user_a_id, user_b_id, is_mutual)
  VALUES (user_a_uuid, user_b_uuid, true)
  RETURNING id INTO new_match_id;

  -- Delete both match requests if they exist
  DELETE FROM match_requests
  WHERE (sender_id = user_a_uuid AND recipient_id = user_b_uuid)
     OR (sender_id = user_b_uuid AND recipient_id = user_a_uuid);

  RETURN new_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function 4: Get User's Match Feed
-- =====================================================
-- Returns profiles to show in swipe feed
-- Filters by complementary user type, distance, and excludes already swiped/matched
CREATE OR REPLACE FUNCTION get_match_feed(
  user_uuid UUID,
  user_latitude DECIMAL DEFAULT NULL,
  user_longitude DECIMAL DEFAULT NULL,
  max_distance_miles INT DEFAULT 50,
  result_limit INT DEFAULT 20,
  result_offset INT DEFAULT 0
) RETURNS TABLE (
  profile_id UUID,
  name TEXT,
  age INT,
  user_type user_type,
  college TEXT,
  work_status work_status,
  smoker BOOLEAN,
  pets BOOLEAN,
  has_place BOOLEAN,
  about TEXT,
  photos TEXT[],
  room_photos TEXT[],
  distance DECIMAL
) AS $$
DECLARE
  current_user_type user_type;
BEGIN
  -- Get current user's type
  SELECT p.user_type INTO current_user_type
  FROM profiles p
  WHERE p.id = user_uuid;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.age,
    p.user_type,
    p.college,
    p.work_status,
    p.smoker,
    p.pets,
    p.has_place,
    p.about,
    p.photos,
    p.room_photos,
    -- Calculate distance using haversine formula (only if coordinates provided)
    CASE
      WHEN user_latitude IS NOT NULL AND user_longitude IS NOT NULL
           AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
      THEN ROUND(
        (3959 * acos(
          cos(radians(user_latitude)) *
          cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians(user_longitude)) +
          sin(radians(user_latitude)) *
          sin(radians(p.latitude))
        ))::numeric,
        1
      )
      ELSE NULL
    END as distance
  FROM profiles p
  WHERE p.id != user_uuid
    AND p.is_visible = true
    -- COMPLEMENTARY USER TYPE MATCHING
    -- If current user is 'looking-for-place', show only 'finding-roommate' users
    -- If current user is 'finding-roommate', show only 'looking-for-place' users
    AND (
      (current_user_type = 'looking-for-place' AND p.user_type = 'finding-roommate')
      OR
      (current_user_type = 'finding-roommate' AND p.user_type = 'looking-for-place')
    )
    -- Not already swiped
    AND NOT EXISTS (
      SELECT 1 FROM swipes s
      WHERE s.swiper_id = user_uuid
        AND s.swiped_user_id = p.id
    )
    -- Not already matched
    AND NOT EXISTS (
      SELECT 1 FROM matches m
      WHERE (m.user_a_id = user_uuid AND m.user_b_id = p.id)
         OR (m.user_a_id = p.id AND m.user_b_id = user_uuid)
    )
    -- Not pending request to this user
    AND NOT EXISTS (
      SELECT 1 FROM match_requests mr
      WHERE mr.sender_id = user_uuid
        AND mr.recipient_id = p.id
        AND mr.status = 'pending'
    )
    -- Within distance (only if coordinates provided)
    AND (
      user_latitude IS NULL OR user_longitude IS NULL OR
      p.latitude IS NULL OR p.longitude IS NULL OR
      (3959 * acos(
        cos(radians(user_latitude)) *
        cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(user_longitude)) +
        sin(radians(user_latitude)) *
        sin(radians(p.latitude))
      )) <= max_distance_miles
    )
  ORDER BY
    -- Prioritize users with photos
    CASE WHEN array_length(p.photos, 1) > 0 THEN 0 ELSE 1 END,
    -- Then by distance (nulls last)
    CASE
      WHEN user_latitude IS NOT NULL AND user_longitude IS NOT NULL
           AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
      THEN (3959 * acos(
        cos(radians(user_latitude)) *
        cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(user_longitude)) +
        sin(radians(user_latitude)) *
        sin(radians(p.latitude))
      ))
      ELSE 999999
    END ASC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function 5: Check if Users Are Compatible
-- =====================================================
CREATE OR REPLACE FUNCTION are_users_compatible(
  user_a_uuid UUID,
  user_b_uuid UUID
) RETURNS BOOLEAN AS $$
DECLARE
  user_a_type user_type;
  user_b_type user_type;
BEGIN
  -- Get both user types
  SELECT user_type INTO user_a_type FROM profiles WHERE id = user_a_uuid;
  SELECT user_type INTO user_b_type FROM profiles WHERE id = user_b_uuid;

  -- Check if they're complementary
  RETURN (
    (user_a_type = 'looking-for-place' AND user_b_type = 'finding-roommate')
    OR
    (user_a_type = 'finding-roommate' AND user_b_type = 'looking-for-place')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Grant Permissions
-- =====================================================
GRANT ALL ON match_requests TO authenticated;
GRANT ALL ON matches TO authenticated;
GRANT ALL ON swipes TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION check_mutual_match TO authenticated;
GRANT EXECUTE ON FUNCTION create_match_from_request TO authenticated;
GRANT EXECUTE ON FUNCTION create_mutual_match TO authenticated;
GRANT EXECUTE ON FUNCTION get_match_feed TO authenticated;
GRANT EXECUTE ON FUNCTION are_users_compatible TO authenticated;

-- =====================================================
-- Comments for Documentation
-- =====================================================
COMMENT ON TABLE match_requests IS 'Stores pending match requests sent when users swipe right';
COMMENT ON TABLE matches IS 'Stores confirmed matches between users after approval';
COMMENT ON TABLE swipes IS 'Records all swipe actions for analytics and preventing re-showing profiles';

COMMENT ON FUNCTION get_match_feed IS 'Returns profiles for swipe feed, filtered by complementary user type and excluding already swiped/matched users';
COMMENT ON FUNCTION check_mutual_match IS 'Checks if recipient already sent a request to sender (mutual interest)';
COMMENT ON FUNCTION create_match_from_request IS 'Creates a match when a request is approved';
COMMENT ON FUNCTION create_mutual_match IS 'Creates a match when both users swipe right (mutual swipe)';
COMMENT ON FUNCTION are_users_compatible IS 'Checks if two users have complementary user types';

-- =====================================================
-- Migration Complete
-- =====================================================
