-- =====================================================
-- EXPENSE EVENTS SYSTEM
-- =====================================================
-- Creates tables and functions for one-time expense events
-- (trips, parties, etc.) separate from ongoing rooms

-- =====================================================
-- TABLES
-- =====================================================

-- Expense Events Table
-- One-time events like trips, parties, dinners
CREATE TABLE IF NOT EXISTS expense_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Event Members Table
-- Participants in an event
CREATE TABLE IF NOT EXISTS expense_event_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES expense_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Add event_id column to expenses table
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES expense_events(id) ON DELETE SET NULL;

-- Add constraint: expense must be in either a room OR event (not both, not neither)
ALTER TABLE expenses
ADD CONSTRAINT expense_room_or_event_check
CHECK (
  (room_id IS NOT NULL AND event_id IS NULL) OR
  (room_id IS NULL AND event_id IS NOT NULL) OR
  (room_id IS NULL AND event_id IS NULL AND split_request_id IS NOT NULL)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_expense_events_created_by ON expense_events(created_by);
CREATE INDEX IF NOT EXISTS idx_expense_events_event_date ON expense_events(event_date);
CREATE INDEX IF NOT EXISTS idx_expense_event_members_event_id ON expense_event_members(event_id);
CREATE INDEX IF NOT EXISTS idx_expense_event_members_user_id ON expense_event_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_event_id ON expenses(event_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE expense_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_event_members ENABLE ROW LEVEL SECURITY;

-- Events: View if you're a member
CREATE POLICY "Users can view events they're members of"
  ON expense_events FOR SELECT
  USING (
    id IN (
      SELECT event_id FROM expense_event_members
      WHERE user_id = auth.uid()
    )
  );

-- Events: Insert your own
CREATE POLICY "Users can create events"
  ON expense_events FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Events: Update if you're admin
CREATE POLICY "Event admins can update events"
  ON expense_events FOR UPDATE
  USING (
    id IN (
      SELECT event_id FROM expense_event_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Events: Delete if you're admin
CREATE POLICY "Event admins can delete events"
  ON expense_events FOR DELETE
  USING (
    id IN (
      SELECT event_id FROM expense_event_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Event Members: View if you're in the event
CREATE POLICY "Users can view event members if they're in the event"
  ON expense_event_members FOR SELECT
  USING (
    event_id IN (
      SELECT event_id FROM expense_event_members
      WHERE user_id = auth.uid()
    )
  );

-- Event Members: Insert if you're admin of the event
CREATE POLICY "Event admins can add members"
  ON expense_event_members FOR INSERT
  WITH CHECK (
    event_id IN (
      SELECT event_id FROM expense_event_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Event Members: Delete if you're admin
CREATE POLICY "Event admins can remove members"
  ON expense_event_members FOR DELETE
  USING (
    event_id IN (
      SELECT event_id FROM expense_event_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Get user balance in an event
CREATE OR REPLACE FUNCTION get_user_balance_in_event(
  p_user_id UUID,
  p_event_id UUID
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

  -- Balance = paid - owed
  v_balance := v_paid - v_owed;

  RETURN v_balance;
END;
$$;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_expense_event_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expense_events_updated_at
  BEFORE UPDATE ON expense_events
  FOR EACH ROW
  EXECUTE FUNCTION update_expense_event_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE expense_events IS 'One-time expense events like trips, parties, dinners';
COMMENT ON TABLE expense_event_members IS 'Participants in expense events';
COMMENT ON COLUMN expenses.event_id IS 'Link to event if this expense is part of an event';
COMMENT ON FUNCTION get_user_balance_in_event IS 'Calculate a user''s balance (paid - owed) within an event';
