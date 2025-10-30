-- =====================================================
-- SPLIT REQUESTS SYSTEM
-- =====================================================
-- This migration adds support for expense splitting via chat
-- Users can create split requests for items/expenses
-- Other users can accept or decline split requests

-- =====================================================
-- SPLIT REQUESTS TABLE
-- =====================================================

CREATE TABLE split_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to the message that contains this split request
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,

  -- Item/expense information
  item_name TEXT NOT NULL CHECK (length(item_name) > 0),
  item_emoji TEXT NOT NULL DEFAULT '💰',
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount > 0),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),

  -- Creator
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each message can only have one split request
  UNIQUE(message_id)
);

-- =====================================================
-- SPLIT DETAILS TABLE
-- =====================================================
-- Tracks individual splits (who owes what)

CREATE TABLE split_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to split request
  split_request_id UUID NOT NULL REFERENCES split_requests(id) ON DELETE CASCADE,

  -- User information
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,

  -- Amount this user owes/is responsible for
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each user can only appear once per split request
  UNIQUE(split_request_id, user_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_split_requests_message_id ON split_requests(message_id);
CREATE INDEX idx_split_requests_created_by ON split_requests(created_by);
CREATE INDEX idx_split_requests_status ON split_requests(status);
CREATE INDEX idx_split_requests_created_at ON split_requests(created_at DESC);
CREATE INDEX idx_split_details_split_request_id ON split_details(split_request_id);
CREATE INDEX idx_split_details_user_id ON split_details(user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE split_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_details ENABLE ROW LEVEL SECURITY;

-- Split requests policies
-- Users can view split requests in conversations they're part of
CREATE POLICY "Users can view split requests in their conversations"
  ON split_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = message_id
      AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
    )
  );

-- Users can create split requests in conversations they're part of
CREATE POLICY "Users can create split requests in their conversations"
  ON split_requests FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = message_id
      AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
    )
  );

-- Users can update split requests in conversations they're part of
CREATE POLICY "Users can update split requests in their conversations"
  ON split_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = message_id
      AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
    )
  );

-- Split details policies
-- Users can view split details for requests they can see
CREATE POLICY "Users can view split details in their conversations"
  ON split_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM split_requests sr
      JOIN messages m ON sr.message_id = m.id
      JOIN conversations c ON m.conversation_id = c.id
      WHERE sr.id = split_request_id
      AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
    )
  );

-- Users can create split details when creating split requests
CREATE POLICY "Users can create split details for their requests"
  ON split_details FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM split_requests sr
      WHERE sr.id = split_request_id
      AND sr.created_by = auth.uid()
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp on split_requests
CREATE TRIGGER update_split_requests_updated_at
  BEFORE UPDATE ON split_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to create a split request with details
CREATE OR REPLACE FUNCTION create_split_request(
  p_message_id UUID,
  p_item_name TEXT,
  p_item_emoji TEXT,
  p_total_amount DECIMAL,
  p_splits JSONB
)
RETURNS UUID AS $$
DECLARE
  v_split_request_id UUID;
  v_split JSONB;
BEGIN
  -- Create the split request
  INSERT INTO split_requests (message_id, item_name, item_emoji, total_amount, created_by)
  VALUES (p_message_id, p_item_name, p_item_emoji, p_total_amount, auth.uid())
  RETURNING id INTO v_split_request_id;

  -- Create split details for each participant
  FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits)
  LOOP
    INSERT INTO split_details (split_request_id, user_id, user_name, amount)
    VALUES (
      v_split_request_id,
      (v_split->>'userId')::UUID,
      v_split->>'userName',
      (v_split->>'amount')::DECIMAL
    );
  END LOOP;

  RETURN v_split_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept a split request
CREATE OR REPLACE FUNCTION accept_split_request(p_split_request_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify the user is part of the conversation
  IF NOT EXISTS (
    SELECT 1 FROM split_requests sr
    JOIN messages m ON sr.message_id = m.id
    JOIN conversations c ON m.conversation_id = c.id
    WHERE sr.id = p_split_request_id
    AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update status to accepted
  UPDATE split_requests
  SET status = 'accepted', updated_at = NOW()
  WHERE id = p_split_request_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decline a split request
CREATE OR REPLACE FUNCTION decline_split_request(p_split_request_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify the user is part of the conversation
  IF NOT EXISTS (
    SELECT 1 FROM split_requests sr
    JOIN messages m ON sr.message_id = m.id
    JOIN conversations c ON m.conversation_id = c.id
    WHERE sr.id = p_split_request_id
    AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update status to declined
  UPDATE split_requests
  SET status = 'declined', updated_at = NOW()
  WHERE id = p_split_request_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON split_requests TO authenticated;
GRANT ALL ON split_details TO authenticated;
GRANT EXECUTE ON FUNCTION create_split_request TO authenticated;
GRANT EXECUTE ON FUNCTION accept_split_request TO authenticated;
GRANT EXECUTE ON FUNCTION decline_split_request TO authenticated;
