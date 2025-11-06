-- =====================================================
-- FIX INFINITE RECURSION IN EXPENSE ROOM MEMBERS RLS
-- =====================================================
-- Migration: 021_fix_expense_room_members_rls.sql
-- Description: Fix infinite recursion in expense_room_members policies
-- Solution: Create a SECURITY DEFINER function to check membership without RLS

-- Create a security definer function to check if user is member of a room
-- This bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION is_expense_room_member(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM expense_room_members
    WHERE room_id = p_room_id
    AND user_id = p_user_id
  );
$$;

-- Create a security definer function to check if user is admin of a room
CREATE OR REPLACE FUNCTION is_expense_room_admin(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM expense_room_members
    WHERE room_id = p_room_id
    AND user_id = p_user_id
    AND role = 'admin'
  );
$$;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view members of their rooms" ON expense_room_members;
DROP POLICY IF EXISTS "Room admins can add members" ON expense_room_members;

-- Create new policies using the SECURITY DEFINER functions
CREATE POLICY "Users can view members of their rooms"
  ON expense_room_members FOR SELECT
  USING (
    -- Users can see their own membership
    user_id = auth.uid()
    OR
    -- Users can see other members if they are a member of the room
    is_expense_room_member(room_id, auth.uid())
  );

CREATE POLICY "Room admins can add members"
  ON expense_room_members FOR INSERT
  WITH CHECK (
    -- Admins can add members
    is_expense_room_admin(expense_room_members.room_id, auth.uid())
    OR
    -- Allow the first member (creator) to be added
    NOT EXISTS (
      SELECT 1 FROM expense_room_members AS erm
      WHERE erm.room_id = expense_room_members.room_id
    )
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_expense_room_member TO authenticated;
GRANT EXECUTE ON FUNCTION is_expense_room_admin TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION is_expense_room_member IS 'Check if user is member of room without triggering RLS recursion';
COMMENT ON FUNCTION is_expense_room_admin IS 'Check if user is admin of room without triggering RLS recursion';
