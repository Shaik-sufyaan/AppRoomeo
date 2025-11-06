-- =====================================================
-- CREATE DATABASE FUNCTION FOR ROOM CREATION
-- =====================================================
-- Migration: 022_create_room_function.sql
-- Description: Create SECURITY DEFINER function to handle room creation
--              This bypasses RLS issues and handles the entire transaction

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_expense_room_with_members(TEXT, TEXT, UUID[], UUID);

-- Create function to handle room creation with members
CREATE OR REPLACE FUNCTION create_expense_room_with_members(
  p_room_name TEXT,
  p_description TEXT,
  p_member_ids UUID[],
  p_event_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_id UUID;
  v_current_user_id UUID;
  v_member_id UUID;
  v_existing_room_id UUID;
BEGIN
  -- Get current authenticated user
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- If creating a 2-person room (current user + 1 other), check if room exists
  IF array_length(p_member_ids, 1) = 1 AND p_event_id IS NULL THEN
    -- Try to find existing 2-person room between these users
    SELECT erm1.room_id INTO v_existing_room_id
    FROM expense_room_members erm1
    JOIN expense_room_members erm2 ON erm1.room_id = erm2.room_id
    JOIN expense_rooms er ON er.id = erm1.room_id
    WHERE erm1.user_id = v_current_user_id
      AND erm2.user_id = p_member_ids[1]
      AND er.event_id IS NULL
      AND (
        SELECT COUNT(*) FROM expense_room_members
        WHERE room_id = erm1.room_id
      ) = 2
    LIMIT 1;

    -- If existing room found, return it
    IF v_existing_room_id IS NOT NULL THEN
      RETURN v_existing_room_id;
    END IF;
  END IF;

  -- Create the room
  INSERT INTO expense_rooms (name, description, created_by, event_id)
  VALUES (p_room_name, p_description, v_current_user_id, p_event_id)
  RETURNING id INTO v_room_id;

  -- Add creator as admin
  INSERT INTO expense_room_members (room_id, user_id, role)
  VALUES (v_room_id, v_current_user_id, 'admin');

  -- Add other members
  IF p_member_ids IS NOT NULL AND array_length(p_member_ids, 1) > 0 THEN
    FOREACH v_member_id IN ARRAY p_member_ids
    LOOP
      INSERT INTO expense_room_members (room_id, user_id, role)
      VALUES (v_room_id, v_member_id, 'member');
    END LOOP;
  END IF;

  RETURN v_room_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise
    RAISE EXCEPTION 'Failed to create room: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_expense_room_with_members TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_expense_room_with_members IS
  'Creates an expense room with members. Uses SECURITY DEFINER to bypass RLS issues. Checks for existing 2-person rooms.';
