-- =====================================================
-- COMPLETE FIX FOR ROOM CREATION ISSUES
-- =====================================================
-- This file fixes:
-- 1. Infinite recursion in expense_room_members RLS policies
-- 2. RLS policy violations when creating rooms
-- 3. Adds proper room creation function with duplicate detection
--
-- TO RUN: Copy this entire file and paste into Supabase SQL Editor, then click RUN
-- =====================================================

-- =====================================================
-- PART 1: DROP EXISTING POLICIES FIRST (BEFORE FUNCTIONS)
-- =====================================================
-- Must drop policies before dropping functions they depend on

DROP POLICY IF EXISTS "Users can view members of their rooms" ON expense_room_members;
DROP POLICY IF EXISTS "Room admins can add members" ON expense_room_members;

-- =====================================================
-- PART 2: DROP AND CREATE HELPER FUNCTIONS
-- =====================================================

-- Now we can safely drop existing functions
DROP FUNCTION IF EXISTS is_expense_room_member(UUID, UUID);
DROP FUNCTION IF EXISTS is_expense_room_admin(UUID, UUID);

-- Function to check if user is member of a room (bypasses RLS)
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

-- Function to check if user is admin of a room (bypasses RLS)
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_expense_room_member TO authenticated;
GRANT EXECUTE ON FUNCTION is_expense_room_admin TO authenticated;

-- Add comments
COMMENT ON FUNCTION is_expense_room_member IS 'Check if user is member of room without triggering RLS recursion';
COMMENT ON FUNCTION is_expense_room_admin IS 'Check if user is admin of room without triggering RLS recursion';

-- =====================================================
-- PART 3: CREATE NEW RLS POLICIES ON EXPENSE_ROOM_MEMBERS
-- =====================================================

-- Create new policies using the helper functions (no recursion)
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
    -- Allow the first member (creator) to be added when creating a room
    NOT EXISTS (
      SELECT 1 FROM expense_room_members AS erm
      WHERE erm.room_id = expense_room_members.room_id
    )
  );

-- =====================================================
-- PART 4: CREATE ROOM CREATION FUNCTION
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_expense_room_with_members(TEXT, TEXT, UUID[], UUID);

-- Create function to handle room creation with members
-- This uses SECURITY DEFINER to bypass RLS issues
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
      RAISE NOTICE 'Found existing room: %', v_existing_room_id;
      RETURN v_existing_room_id;
    END IF;
  END IF;

  -- Create the room
  INSERT INTO expense_rooms (name, description, created_by, event_id)
  VALUES (p_room_name, p_description, v_current_user_id, p_event_id)
  RETURNING id INTO v_room_id;

  RAISE NOTICE 'Created new room: %', v_room_id;

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

-- =====================================================
-- VERIFICATION QUERIES (Optional - uncomment to test)
-- =====================================================

-- Check if functions were created successfully
-- SELECT routine_name, routine_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name IN ('is_expense_room_member', 'is_expense_room_admin', 'create_expense_room_with_members')
-- ORDER BY routine_name;

-- Check updated policies
-- SELECT schemaname, tablename, policyname
-- FROM pg_policies
-- WHERE tablename = 'expense_room_members'
-- ORDER BY policyname;

-- =====================================================
-- DONE!
-- =====================================================
-- After running this script:
-- 1. Room creation should work without RLS errors
-- 2. Duplicate 2-person rooms will be prevented
-- 3. No infinite recursion in policies
-- =====================================================
