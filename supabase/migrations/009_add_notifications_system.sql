-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User who receives the notification
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Notification details
  type TEXT NOT NULL, -- 'match_request', 'match_approved', 'new_message', 'marketplace_interest', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Related entities
  related_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  related_item_id UUID, -- Could be message_id, match_id, listing_id, etc.

  -- Navigation
  screen TEXT, -- Screen to navigate to when tapped
  screen_params JSONB, -- Parameters for navigation

  -- Status
  read BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,

  -- Index for faster queries
  CHECK (type IN ('match_request', 'match_approved', 'mutual_match', 'new_message', 'marketplace_interest', 'expense_added'))
);

-- =====================================================
-- PUSH NOTIFICATION TOKENS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT NOT NULL, -- 'ios' or 'android'

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one token per device
  UNIQUE(user_id, token)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Push tokens policies
CREATE POLICY "Users can manage their own push tokens"
  ON push_tokens FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to create notification when new message is sent
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
BEGIN
  -- Get the recipient (the user who is NOT the sender)
  SELECT
    CASE
      WHEN c.user_a_id = NEW.sender_id THEN c.user_b_id
      ELSE c.user_a_id
    END INTO recipient_id
  FROM conversations c
  WHERE c.id = NEW.conversation_id;

  -- Get sender's name
  SELECT name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Create notification for recipient
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_user_id,
    related_item_id,
    screen,
    screen_params
  ) VALUES (
    recipient_id,
    'new_message',
    sender_name,
    CASE
      WHEN length(NEW.text) > 100 THEN substring(NEW.text, 1, 100) || '...'
      ELSE NEW.text
    END,
    NEW.sender_id,
    NEW.id,
    'chat',
    jsonb_build_object('conversationId', NEW.conversation_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = true, read_at = NOW()
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = true, read_at = NOW()
  WHERE user_id = auth.uid() AND read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM notifications
  WHERE user_id = auth.uid() AND read = false;

  RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to create notification when new message is sent
DROP TRIGGER IF EXISTS trigger_create_message_notification ON messages;
CREATE TRIGGER trigger_create_message_notification
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON notifications TO authenticated;
GRANT ALL ON push_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION create_message_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
