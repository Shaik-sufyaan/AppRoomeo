-- =====================================================
-- EXPENSES SYSTEM
-- =====================================================
-- Complete expense tracking system for roommates
-- Integrates with split_requests from chat

-- =====================================================
-- EXPENSE ROOMS TABLE
-- =====================================================
-- Rooms are groups of people who share expenses

CREATE TABLE expense_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL CHECK (length(name) > 0),
  description TEXT,

  -- Creator of the room
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- EXPENSE ROOM MEMBERS TABLE
-- =====================================================

CREATE TABLE expense_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  room_id UUID NOT NULL REFERENCES expense_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Role in the room
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),

  -- Timestamps
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each user can only be in a room once
  UNIQUE(room_id, user_id)
);

-- =====================================================
-- EXPENSES TABLE
-- =====================================================
-- Individual expense entries

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which room this expense belongs to (optional - can be standalone)
  room_id UUID REFERENCES expense_rooms(id) ON DELETE CASCADE,

  -- Link to split request if created from chat (optional)
  split_request_id UUID UNIQUE REFERENCES split_requests(id) ON DELETE SET NULL,

  -- Expense details
  title TEXT NOT NULL CHECK (length(title) > 0),
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  category TEXT DEFAULT 'other',

  -- Who paid for this expense
  paid_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Date of the expense
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- EXPENSE SPLITS TABLE
-- =====================================================
-- How an expense is split among participants

CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Amount this user owes for this expense
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),

  -- Payment status
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each user can only have one split per expense
  UNIQUE(expense_id, user_id)
);

-- =====================================================
-- SETTLEMENTS TABLE
-- =====================================================
-- Track when users settle up their balances

CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  room_id UUID REFERENCES expense_rooms(id) ON DELETE CASCADE,

  -- Who paid whom
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),

  -- Settlement details
  note TEXT,
  settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_expense_rooms_created_by ON expense_rooms(created_by);
CREATE INDEX idx_expense_room_members_room_id ON expense_room_members(room_id);
CREATE INDEX idx_expense_room_members_user_id ON expense_room_members(user_id);
CREATE INDEX idx_expenses_room_id ON expenses(room_id);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_expenses_split_request_id ON expenses(split_request_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date DESC);
CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user_id ON expense_splits(user_id);
CREATE INDEX idx_settlements_room_id ON settlements(room_id);
CREATE INDEX idx_settlements_from_user ON settlements(from_user_id);
CREATE INDEX idx_settlements_to_user ON settlements(to_user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE expense_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Expense Rooms Policies
CREATE POLICY "Users can view rooms they are members of"
  ON expense_rooms FOR SELECT
  USING (
    id IN (SELECT room_id FROM expense_room_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create rooms"
  ON expense_rooms FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room admins can update rooms"
  ON expense_rooms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM expense_room_members
      WHERE room_id = id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- Expense Room Members Policies
CREATE POLICY "Users can view members of their rooms"
  ON expense_room_members FOR SELECT
  USING (
    room_id IN (SELECT room_id FROM expense_room_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Room admins can add members"
  ON expense_room_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expense_room_members
      WHERE room_id = expense_room_members.room_id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- Expenses Policies
CREATE POLICY "Users can view expenses in their rooms"
  ON expenses FOR SELECT
  USING (
    room_id IN (SELECT room_id FROM expense_room_members WHERE user_id = auth.uid())
    OR paid_by = auth.uid()
    OR id IN (SELECT expense_id FROM expense_splits WHERE user_id = auth.uid())
  );

CREATE POLICY "Room members can create expenses"
  ON expenses FOR INSERT
  WITH CHECK (
    auth.uid() = paid_by
    AND (
      room_id IS NULL
      OR room_id IN (SELECT room_id FROM expense_room_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Expense creators can update their expenses"
  ON expenses FOR UPDATE
  USING (paid_by = auth.uid());

-- Expense Splits Policies
CREATE POLICY "Users can view splits for expenses they can see"
  ON expense_splits FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM expenses
      WHERE room_id IN (SELECT room_id FROM expense_room_members WHERE user_id = auth.uid())
      OR paid_by = auth.uid()
      OR id IN (SELECT expense_id FROM expense_splits WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Expense creators can create splits"
  ON expense_splits FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM expenses WHERE id = expense_id AND paid_by = auth.uid())
  );

CREATE POLICY "Users can update their own split payment status"
  ON expense_splits FOR UPDATE
  USING (user_id = auth.uid());

-- Settlements Policies
CREATE POLICY "Users can view settlements they are involved in"
  ON settlements FOR SELECT
  USING (
    from_user_id = auth.uid()
    OR to_user_id = auth.uid()
    OR room_id IN (SELECT room_id FROM expense_room_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create settlements"
  ON settlements FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_expense_rooms_updated_at
  BEFORE UPDATE ON expense_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to create expense from accepted split request
CREATE OR REPLACE FUNCTION create_expense_from_split_request(p_split_request_id UUID)
RETURNS UUID AS $$
DECLARE
  v_split_request split_requests%ROWTYPE;
  v_message messages%ROWTYPE;
  v_conversation conversations%ROWTYPE;
  v_expense_id UUID;
  v_other_user_id UUID;
BEGIN
  -- Get the split request
  SELECT * INTO v_split_request
  FROM split_requests
  WHERE id = p_split_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Split request not found';
  END IF;

  -- Get the message and conversation
  SELECT * INTO v_message FROM messages WHERE id = v_split_request.message_id;
  SELECT * INTO v_conversation FROM conversations WHERE id = v_message.conversation_id;

  -- Determine the other user (the one who will owe money)
  IF v_conversation.user_a_id = v_split_request.created_by THEN
    v_other_user_id := v_conversation.user_b_id;
  ELSE
    v_other_user_id := v_conversation.user_a_id;
  END IF;

  -- Create the expense
  INSERT INTO expenses (
    split_request_id,
    title,
    amount,
    paid_by,
    expense_date
  ) VALUES (
    p_split_request_id,
    v_split_request.item_name,
    v_split_request.total_amount,
    v_split_request.created_by,
    CURRENT_DATE
  )
  RETURNING id INTO v_expense_id;

  -- Create expense splits from split_details
  INSERT INTO expense_splits (expense_id, user_id, amount)
  SELECT v_expense_id, user_id, amount
  FROM split_details
  WHERE split_request_id = p_split_request_id;

  RETURN v_expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create expense when split request is accepted
CREATE OR REPLACE FUNCTION auto_create_expense_on_split_accept()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create expense if status changed to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Check if expense doesn't already exist
    IF NOT EXISTS (SELECT 1 FROM expenses WHERE split_request_id = NEW.id) THEN
      PERFORM create_expense_from_split_request(NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_expense_on_split_accept
  AFTER UPDATE ON split_requests
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND OLD.status != 'accepted')
  EXECUTE FUNCTION auto_create_expense_on_split_accept();

-- Function to get user balance in a room
CREATE OR REPLACE FUNCTION get_user_balance_in_room(p_user_id UUID, p_room_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_owed_to_user DECIMAL;
  v_owes_from_user DECIMAL;
BEGIN
  -- Calculate what others owe to this user (expenses they paid)
  SELECT COALESCE(SUM(es.amount), 0) INTO v_owed_to_user
  FROM expense_splits es
  JOIN expenses e ON es.expense_id = e.id
  WHERE e.room_id = p_room_id
  AND e.paid_by = p_user_id
  AND es.user_id != p_user_id
  AND es.paid = FALSE;

  -- Calculate what this user owes to others
  SELECT COALESCE(SUM(es.amount), 0) INTO v_owes_from_user
  FROM expense_splits es
  JOIN expenses e ON es.expense_id = e.id
  WHERE e.room_id = p_room_id
  AND es.user_id = p_user_id
  AND e.paid_by != p_user_id
  AND es.paid = FALSE;

  RETURN v_owed_to_user - v_owes_from_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON expense_rooms TO authenticated;
GRANT ALL ON expense_room_members TO authenticated;
GRANT ALL ON expenses TO authenticated;
GRANT ALL ON expense_splits TO authenticated;
GRANT ALL ON settlements TO authenticated;
GRANT EXECUTE ON FUNCTION create_expense_from_split_request TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_balance_in_room TO authenticated;
