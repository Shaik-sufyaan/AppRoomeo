-- =====================================================
-- ENHANCE SETTLEMENTS TABLE FOR PAYMENT WORKFLOW
-- =====================================================
-- Migration: 018_enhance_settlements_table.sql
-- Description: Add payment method, proof, and approval workflow to settlements

-- Add new columns to settlements table
ALTER TABLE settlements
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('cash', 'zelle', 'venmo', 'paypal', 'bank_transfer', 'other')),
ADD COLUMN IF NOT EXISTS proof_image TEXT,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for faster queries on pending settlements
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_to_user ON settlements(to_user_id) WHERE status = 'pending';

-- =====================================================
-- SETTLEMENT FUNCTIONS
-- =====================================================

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
  -- Get current user
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
  v_room_creator UUID;
BEGIN
  -- Get current user
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

  -- Verify current user is the recipient (to_user_id)
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
-- RLS POLICIES FOR SETTLEMENTS
-- =====================================================

-- Enable RLS
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Users can view settlements they're involved in
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

-- Users can create settlements for rooms they're in
CREATE POLICY "Users can create settlements"
ON settlements FOR INSERT
WITH CHECK (
  auth.uid() = from_user_id AND
  EXISTS (
    SELECT 1 FROM expense_room_members
    WHERE room_id = settlements.room_id AND user_id = auth.uid()
  )
);

-- Only recipients can update settlements (approve/reject)
CREATE POLICY "Recipients can update settlements"
ON settlements FOR UPDATE
USING (auth.uid() = to_user_id)
WITH CHECK (auth.uid() = to_user_id);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION submit_settlement TO authenticated;
GRANT EXECUTE ON FUNCTION approve_settlement TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_settlements_for_user TO authenticated;
