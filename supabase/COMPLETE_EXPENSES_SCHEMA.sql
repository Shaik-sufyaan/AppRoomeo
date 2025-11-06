-- =====================================================
-- COMPLETE EXPENSE SYSTEM DATABASE SCHEMA
-- =====================================================
-- This file contains the complete database schema for the expense management system
-- Run this file in order after setting up your Supabase project
--
-- PREREQUISITES:
-- 1. profiles table must exist (from migration 001)
-- 2. messages, conversations tables must exist (from migration 008)
-- 3. split_requests, split_details tables must exist (from migration 010)
--
-- WHAT THIS SCHEMA CREATES:
-- 1. Expense Rooms (ongoing shared expenses between roommates)
-- 2. Expense Events (one-time events like trips, parties)
-- 3. Expenses (individual expense entries)
-- 4. Expense Splits (how expenses are divided)
-- 5. Settlements (payment tracking with approval workflow)
-- 6. All necessary indexes, RLS policies, and functions
-- =====================================================

-- =====================================================
-- PART 1: EXPENSE ROOMS
-- =====================================================

-- Expense Rooms Table
CREATE TABLE IF NOT EXISTS expense_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) > 0),
  description TEXT,
  event_id UUID,  -- Optional link to an event
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expense Room Members Table
CREATE TABLE IF NOT EXISTS expense_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES expense_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- =====================================================
-- PART 2: EXPENSE EVENTS
-- =====================================================

-- Expense Events Table
CREATE TABLE IF NOT EXISTS expense_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Event Members Table
CREATE TABLE IF NOT EXISTS expense_event_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES expense_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Add foreign key constraint to expense_rooms.event_id
ALTER TABLE expense_rooms
ADD CONSTRAINT fk_expense_rooms_event_id
FOREIGN KEY (event_id) REFERENCES expense_events(id) ON DELETE SET NULL;

-- =====================================================
-- PART 3: EXPENSES AND SPLITS
-- =====================================================

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context: room, event, or chat split request
  room_id UUID REFERENCES expense_rooms(id) ON DELETE CASCADE,
  event_id UUID REFERENCES expense_events(id) ON DELETE CASCADE,
  split_request_id UUID UNIQUE REFERENCES split_requests(id) ON DELETE SET NULL,

  -- Expense details
  title TEXT NOT NULL CHECK (length(title) > 0),
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  category TEXT DEFAULT 'other',

  -- Who paid
  paid_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Date
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: must be in room OR event OR split_request (not multiple)
  CONSTRAINT expense_context_check CHECK (
    (room_id IS NOT NULL AND event_id IS NULL AND split_request_id IS NULL) OR
    (room_id IS NULL AND event_id IS NOT NULL AND split_request_id IS NULL) OR
    (room_id IS NULL AND event_id IS NULL AND split_request_id IS NOT NULL)
  )
);

-- Expense Splits Table
CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(expense_id, user_id)
);

-- =====================================================
-- PART 4: SETTLEMENTS (WITH APPROVAL WORKFLOW)
-- =====================================================

-- Settlements Table
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  room_id UUID REFERENCES expense_rooms(id) ON DELETE CASCADE,

  -- Who paid whom
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Amount and payment details
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT CHECK (payment_method IN ('cash', 'zelle', 'venmo', 'paypal', 'bank_transfer', 'other')),
  proof_image TEXT,
  note TEXT,
  settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PART 5: INDEXES
-- =====================================================

-- Expense Rooms Indexes
CREATE INDEX IF NOT EXISTS idx_expense_rooms_created_by ON expense_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_expense_rooms_event_id ON expense_rooms(event_id);
CREATE INDEX IF NOT EXISTS idx_expense_room_members_room_id ON expense_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_expense_room_members_user_id ON expense_room_members(user_id);

-- Expense Events Indexes
CREATE INDEX IF NOT EXISTS idx_expense_events_created_by ON expense_events(created_by);
CREATE INDEX IF NOT EXISTS idx_expense_events_event_date ON expense_events(event_date);
CREATE INDEX IF NOT EXISTS idx_expense_event_members_event_id ON expense_event_members(event_id);
CREATE INDEX IF NOT EXISTS idx_expense_event_members_user_id ON expense_event_members(user_id);

-- Expenses Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_room_id ON expenses(room_id);
CREATE INDEX IF NOT EXISTS idx_expenses_event_id ON expenses(event_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expenses_split_request_id ON expenses(split_request_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date DESC);

-- Expense Splits Indexes
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON expense_splits(user_id);

-- Settlements Indexes
CREATE INDEX IF NOT EXISTS idx_settlements_room_id ON settlements(room_id);
CREATE INDEX IF NOT EXISTS idx_settlements_from_user ON settlements(from_user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_to_user ON settlements(to_user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_to_user_pending ON settlements(to_user_id) WHERE status = 'pending';

-- =====================================================
-- PART 6: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE expense_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- EXPENSE ROOMS RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view rooms they are members of" ON expense_rooms;
CREATE POLICY "Users can view rooms they are members of"
  ON expense_rooms FOR SELECT
  USING (
    id IN (SELECT room_id FROM expense_room_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create rooms" ON expense_rooms;
CREATE POLICY "Users can create rooms"
  ON expense_rooms FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Room admins can update rooms" ON expense_rooms;
CREATE POLICY "Room admins can update rooms"
  ON expense_rooms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM expense_room_members
      WHERE room_id = id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- EXPENSE ROOM MEMBERS RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view members of their rooms" ON expense_room_members;
CREATE POLICY "Users can view members of their rooms"
  ON expense_room_members FOR SELECT
  USING (
    room_id IN (SELECT room_id FROM expense_room_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Room admins can add members" ON expense_room_members;
CREATE POLICY "Room admins can add members"
  ON expense_room_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expense_room_members
      WHERE room_id = expense_room_members.room_id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- EXPENSE EVENTS RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view events they're members of" ON expense_events;
CREATE POLICY "Users can view events they're members of"
  ON expense_events FOR SELECT
  USING (
    id IN (
      SELECT event_id FROM expense_event_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create events" ON expense_events;
CREATE POLICY "Users can create events"
  ON expense_events FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Event admins can update events" ON expense_events;
CREATE POLICY "Event admins can update events"
  ON expense_events FOR UPDATE
  USING (
    id IN (
      SELECT event_id FROM expense_event_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Event admins can delete events" ON expense_events;
CREATE POLICY "Event admins can delete events"
  ON expense_events FOR DELETE
  USING (
    id IN (
      SELECT event_id FROM expense_event_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- EXPENSE EVENT MEMBERS RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view event members if they're in the event" ON expense_event_members;
CREATE POLICY "Users can view event members if they're in the event"
  ON expense_event_members FOR SELECT
  USING (
    event_id IN (
      SELECT event_id FROM expense_event_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Event admins can add members" ON expense_event_members;
CREATE POLICY "Event admins can add members"
  ON expense_event_members FOR INSERT
  WITH CHECK (
    event_id IN (
      SELECT event_id FROM expense_event_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Event admins can remove members" ON expense_event_members;
CREATE POLICY "Event admins can remove members"
  ON expense_event_members FOR DELETE
  USING (
    event_id IN (
      SELECT event_id FROM expense_event_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- EXPENSES RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view expenses in their rooms" ON expenses;
CREATE POLICY "Users can view expenses in their rooms"
  ON expenses FOR SELECT
  USING (
    room_id IN (SELECT room_id FROM expense_room_members WHERE user_id = auth.uid())
    OR event_id IN (SELECT event_id FROM expense_event_members WHERE user_id = auth.uid())
    OR paid_by = auth.uid()
    OR id IN (SELECT expense_id FROM expense_splits WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Room members can create expenses" ON expenses;
CREATE POLICY "Room members can create expenses"
  ON expenses FOR INSERT
  WITH CHECK (
    auth.uid() = paid_by
    AND (
      (room_id IS NULL AND event_id IS NULL)
      OR room_id IN (SELECT room_id FROM expense_room_members WHERE user_id = auth.uid())
      OR event_id IN (SELECT event_id FROM expense_event_members WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Expense creators can update their expenses" ON expenses;
CREATE POLICY "Expense creators can update their expenses"
  ON expenses FOR UPDATE
  USING (paid_by = auth.uid());

-- =====================================================
-- EXPENSE SPLITS RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view splits for expenses they can see" ON expense_splits;
CREATE POLICY "Users can view splits for expenses they can see"
  ON expense_splits FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM expenses
      WHERE room_id IN (SELECT room_id FROM expense_room_members WHERE user_id = auth.uid())
      OR event_id IN (SELECT event_id FROM expense_event_members WHERE user_id = auth.uid())
      OR paid_by = auth.uid()
      OR id IN (SELECT expense_id FROM expense_splits WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Expense creators can create splits" ON expense_splits;
CREATE POLICY "Expense creators can create splits"
  ON expense_splits FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM expenses WHERE id = expense_id AND paid_by = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own split payment status" ON expense_splits;
CREATE POLICY "Users can update their own split payment status"
  ON expense_splits FOR UPDATE
  USING (user_id = auth.uid());

-- =====================================================
-- SETTLEMENTS RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their settlements" ON settlements;
CREATE POLICY "Users can view their settlements"
ON settlements FOR SELECT
USING (
  auth.uid() = from_user_id OR
  auth.uid() = to_user_id OR
  auth.uid() IN (
    SELECT user_id FROM expense_room_members
    WHERE room_id = settlements.room_id AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users can create settlements" ON settlements;
CREATE POLICY "Users can create settlements"
ON settlements FOR INSERT
WITH CHECK (
  auth.uid() = from_user_id AND
  EXISTS (
    SELECT 1 FROM expense_room_members
    WHERE room_id = settlements.room_id AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Recipients can update settlements" ON settlements;
CREATE POLICY "Recipients can update settlements"
ON settlements FOR UPDATE
USING (auth.uid() = to_user_id)
WITH CHECK (auth.uid() = to_user_id);

-- =====================================================
-- PART 7: FUNCTIONS
-- =====================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get user balance in a room
CREATE OR REPLACE FUNCTION get_user_balance_in_room(p_user_id UUID, p_room_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_owed_to_user DECIMAL;
  v_owes_from_user DECIMAL;
BEGIN
  -- Calculate what others owe to this user
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

-- Function to get user balance in an event
CREATE OR REPLACE FUNCTION get_user_balance_in_event(p_user_id UUID, p_event_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_balance DECIMAL := 0;
  v_paid DECIMAL := 0;
  v_owed DECIMAL := 0;
BEGIN
  -- Calculate total paid by user
  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM expenses
  WHERE event_id = p_event_id AND paid_by = p_user_id;

  -- Calculate total owed by user
  SELECT COALESCE(SUM(amount), 0) INTO v_owed
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE e.event_id = p_event_id
    AND es.user_id = p_user_id
    AND NOT es.paid;

  v_balance := v_paid - v_owed;
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to submit a settlement
CREATE OR REPLACE FUNCTION submit_settlement(
  p_room_id UUID,
  p_to_user_id UUID,
  p_amount DECIMAL,
  p_payment_method TEXT,
  p_proof_image TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settlement_id UUID;
  v_from_user_id UUID;
BEGIN
  v_from_user_id := auth.uid();

  IF v_from_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user is a member of the room
  IF NOT EXISTS (
    SELECT 1 FROM expense_room_members
    WHERE room_id = p_room_id AND user_id = v_from_user_id
  ) THEN
    RAISE EXCEPTION 'You are not a member of this room';
  END IF;

  -- Verify recipient is a member of the room
  IF NOT EXISTS (
    SELECT 1 FROM expense_room_members
    WHERE room_id = p_room_id AND user_id = p_to_user_id
  ) THEN
    RAISE EXCEPTION 'Recipient is not a member of this room';
  END IF;

  -- Create settlement record
  INSERT INTO settlements (
    room_id,
    from_user_id,
    to_user_id,
    amount,
    payment_method,
    proof_image,
    note,
    status
  ) VALUES (
    p_room_id,
    v_from_user_id,
    p_to_user_id,
    p_amount,
    p_payment_method,
    p_proof_image,
    p_note,
    'pending'
  )
  RETURNING id INTO v_settlement_id;

  RETURN v_settlement_id;
END;
$$;

-- Function to approve or reject a settlement
CREATE OR REPLACE FUNCTION approve_settlement(
  p_settlement_id UUID,
  p_approved BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
  v_settlement RECORD;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get settlement details
  SELECT * INTO v_settlement
  FROM settlements
  WHERE id = p_settlement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settlement not found';
  END IF;

  -- Verify settlement is pending
  IF v_settlement.status != 'pending' THEN
    RAISE EXCEPTION 'Settlement has already been processed';
  END IF;

  -- Verify current user is the recipient
  IF v_settlement.to_user_id != v_current_user_id THEN
    RAISE EXCEPTION 'Only the recipient can approve settlements';
  END IF;

  -- Update settlement status
  UPDATE settlements
  SET
    status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
    approved_at = NOW(),
    approved_by = v_current_user_id
  WHERE id = p_settlement_id;

  -- If approved, update expense splits to mark as paid
  IF p_approved THEN
    UPDATE expense_splits es
    SET paid = TRUE, paid_at = NOW()
    FROM expenses e
    WHERE es.expense_id = e.id
      AND e.room_id = v_settlement.room_id
      AND es.user_id = v_settlement.from_user_id
      AND e.paid_by = v_settlement.to_user_id
      AND es.paid = FALSE
      AND es.amount <= v_settlement.amount;
  END IF;
END;
$$;

-- Function to get pending settlements for a user (as recipient)
CREATE OR REPLACE FUNCTION get_pending_settlements_for_user()
RETURNS TABLE (
  id UUID,
  room_id UUID,
  room_name TEXT,
  from_user_id UUID,
  from_user_name TEXT,
  from_user_photos TEXT[],
  amount DECIMAL,
  payment_method TEXT,
  proof_image TEXT,
  note TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.room_id,
    er.name as room_name,
    s.from_user_id,
    p.name as from_user_name,
    p.photos as from_user_photos,
    s.amount,
    s.payment_method,
    s.proof_image,
    s.note,
    s.created_at
  FROM settlements s
  JOIN expense_rooms er ON er.id = s.room_id
  JOIN profiles p ON p.id = s.from_user_id
  WHERE s.to_user_id = v_current_user_id
    AND s.status = 'pending'
  ORDER BY s.created_at DESC;
END;
$$;

-- =====================================================
-- PART 8: TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_expense_rooms_updated_at ON expense_rooms;
CREATE TRIGGER update_expense_rooms_updated_at
  BEFORE UPDATE ON expense_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS expense_events_updated_at ON expense_events;
CREATE TRIGGER expense_events_updated_at
  BEFORE UPDATE ON expense_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 9: GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON expense_rooms TO authenticated;
GRANT ALL ON expense_room_members TO authenticated;
GRANT ALL ON expense_events TO authenticated;
GRANT ALL ON expense_event_members TO authenticated;
GRANT ALL ON expenses TO authenticated;
GRANT ALL ON expense_splits TO authenticated;
GRANT ALL ON settlements TO authenticated;

GRANT EXECUTE ON FUNCTION get_user_balance_in_room TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_balance_in_event TO authenticated;
GRANT EXECUTE ON FUNCTION submit_settlement TO authenticated;
GRANT EXECUTE ON FUNCTION approve_settlement TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_settlements_for_user TO authenticated;

-- =====================================================
-- END OF SCHEMA
-- =====================================================
