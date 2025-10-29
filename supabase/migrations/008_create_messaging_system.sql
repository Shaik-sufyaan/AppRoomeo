-- =====================================================
-- CONVERSATIONS TABLE
-- =====================================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Participants (always 2 users)
  user_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Context (optional - if conversation started from marketplace)
  context_type TEXT, -- 'marketplace', 'match', 'general'
  context_id UUID,   -- listing_id or match_id

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique conversation per pair (order-independent)
  CONSTRAINT unique_conversation CHECK (user_a_id < user_b_id),
  UNIQUE(user_a_id, user_b_id)
);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation reference
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Message content
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (length(text) > 0),

  -- Read status
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_conversations_user_a ON conversations(user_a_id);
CREATE INDEX idx_conversations_user_b ON conversations(user_b_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_read ON messages(read);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() = user_a_id OR auth.uid() = user_b_id
  );

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  user_1_uuid UUID,
  user_2_uuid UUID,
  context_type_param TEXT DEFAULT NULL,
  context_id_param UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  conversation_uuid UUID;
  smaller_uuid UUID;
  larger_uuid UUID;
BEGIN
  -- Ensure consistent ordering (user_a < user_b)
  IF user_1_uuid < user_2_uuid THEN
    smaller_uuid := user_1_uuid;
    larger_uuid := user_2_uuid;
  ELSE
    smaller_uuid := user_2_uuid;
    larger_uuid := user_1_uuid;
  END IF;

  -- Try to find existing conversation
  SELECT id INTO conversation_uuid
  FROM conversations
  WHERE user_a_id = smaller_uuid AND user_b_id = larger_uuid;

  -- If not found, create new conversation
  IF conversation_uuid IS NULL THEN
    INSERT INTO conversations (user_a_id, user_b_id, context_type, context_id)
    VALUES (smaller_uuid, larger_uuid, context_type_param, context_id_param)
    RETURNING id INTO conversation_uuid;
  END IF;

  RETURN conversation_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update conversation's updated_at when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp on new message
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON conversations TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_conversation TO authenticated;
