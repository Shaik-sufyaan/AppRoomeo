-- =====================================================
-- USER ONLINE STATUS
-- =====================================================
-- Adds online status tracking for users
-- Shows when users are active and their last seen time

-- =====================================================
-- ADD COLUMNS TO PROFILES
-- =====================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- CREATE INDEX
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_online_status ON profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen DESC);

-- =====================================================
-- FUNCTION TO UPDATE ONLINE STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION update_user_online_status(
  p_is_online BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update the current user's online status
  UPDATE profiles
  SET
    is_online = p_is_online,
    last_seen = NOW()
  WHERE id = auth.uid();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION TO AUTO-UPDATE LAST SEEN
-- =====================================================
-- This function updates last_seen whenever a user sends a message

CREATE OR REPLACE FUNCTION update_last_seen_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET last_seen = NOW()
  WHERE id = NEW.sender_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_seen on message send
CREATE TRIGGER update_user_last_seen_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen_on_message();

-- =====================================================
-- TYPING INDICATOR TABLE (OPTIONAL - for persistence)
-- =====================================================
-- This is optional - you can also handle typing indicators
-- purely client-side without database persistence

CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Only one typing indicator per user per conversation
  UNIQUE(conversation_id, user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation ON typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_updated_at ON typing_indicators(updated_at DESC);

-- Enable RLS
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Users can view typing indicators in their conversations
CREATE POLICY "Users can view typing in their conversations"
  ON typing_indicators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
    )
  );

-- Users can set their own typing status
CREATE POLICY "Users can set their own typing status"
  ON typing_indicators FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- FUNCTION TO UPDATE TYPING STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION update_typing_status(
  p_conversation_id UUID,
  p_is_typing BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
  -- If typing, insert or update
  IF p_is_typing THEN
    INSERT INTO typing_indicators (conversation_id, user_id, is_typing)
    VALUES (p_conversation_id, auth.uid(), TRUE)
    ON CONFLICT (conversation_id, user_id)
    DO UPDATE SET
      is_typing = TRUE,
      updated_at = NOW();
  ELSE
    -- If not typing, delete the indicator
    DELETE FROM typing_indicators
    WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid();
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CLEANUP OLD TYPING INDICATORS
-- =====================================================
-- Auto-delete typing indicators older than 10 seconds
-- This prevents stale "is typing" indicators

CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE updated_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON typing_indicators TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_online_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_typing_status TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_typing_indicators TO authenticated;
