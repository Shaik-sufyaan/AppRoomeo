-- =====================================================
-- MESSAGE DELIVERY STATUS
-- =====================================================
-- Adds delivery status tracking for messages
-- Distinguishes between delivered (✓) and read (✓✓)

-- =====================================================
-- ADD COLUMN TO MESSAGES
-- =====================================================

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN DEFAULT TRUE;

-- By default, messages are immediately delivered
-- You can set to false and update when actually delivered
-- if implementing offline message queuing

-- =====================================================
-- CREATE INDEX
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_messages_delivery_status ON messages(is_delivered);

-- =====================================================
-- FUNCTION TO MARK MESSAGE AS DELIVERED
-- =====================================================

CREATE OR REPLACE FUNCTION mark_message_delivered(p_message_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify user is part of the conversation
  IF NOT EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE m.id = p_message_id
    AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update delivery status
  UPDATE messages
  SET is_delivered = TRUE
  WHERE id = p_message_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION TO GET MESSAGE STATUS
-- =====================================================
-- Returns the status of messages for a user

CREATE OR REPLACE FUNCTION get_message_status(p_conversation_id UUID)
RETURNS TABLE (
  message_id UUID,
  is_delivered BOOLEAN,
  is_read BOOLEAN,
  read_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS message_id,
    m.is_delivered,
    m.read AS is_read,
    m.read_at
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER TO AUTO-MARK DELIVERED
-- =====================================================
-- Automatically marks messages as delivered when created
-- (assumes immediate delivery in most cases)

CREATE OR REPLACE FUNCTION auto_mark_delivered()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_delivered := TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_mark_message_delivered
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_mark_delivered();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION mark_message_delivered TO authenticated;
GRANT EXECUTE ON FUNCTION get_message_status TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN messages.is_delivered IS 'Whether the message has been delivered to the recipient';
COMMENT ON COLUMN messages.read IS 'Whether the message has been read by the recipient';
COMMENT ON COLUMN messages.read_at IS 'Timestamp when the message was read';
COMMENT ON FUNCTION mark_message_delivered IS 'Marks a message as delivered to the recipient';
COMMENT ON FUNCTION get_message_status IS 'Returns delivery and read status for all messages in a conversation';
