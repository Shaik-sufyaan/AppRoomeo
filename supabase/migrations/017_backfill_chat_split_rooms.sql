-- =====================================================
-- BACKFILL ROOMS FOR EXISTING CHAT SPLIT EXPENSES
-- =====================================================
-- This migration finds existing expenses created from chat splits
-- that don't have room_ids and assigns them to rooms

-- First, make sure migration 016 was run (the updated function)
-- This script handles existing data

DO $$
DECLARE
  v_expense RECORD;
  v_split_request split_requests%ROWTYPE;
  v_message messages%ROWTYPE;
  v_conversation conversations%ROWTYPE;
  v_room_id UUID;
  v_user_a_id UUID;
  v_user_b_id UUID;
  v_user_a_name TEXT;
  v_user_b_name TEXT;
  v_room_name TEXT;
BEGIN
  -- Loop through all expenses that were created from chat splits but don't have room_id
  FOR v_expense IN
    SELECT * FROM expenses
    WHERE split_request_id IS NOT NULL
    AND room_id IS NULL
  LOOP
    -- Get the split request details
    SELECT * INTO v_split_request
    FROM split_requests
    WHERE id = v_expense.split_request_id;

    -- Get the message and conversation
    SELECT * INTO v_message FROM messages WHERE id = v_split_request.message_id;
    SELECT * INTO v_conversation FROM conversations WHERE id = v_message.conversation_id;

    -- Get both user IDs
    v_user_a_id := v_conversation.user_a_id;
    v_user_b_id := v_conversation.user_b_id;

    -- Get user names
    SELECT name INTO v_user_a_name FROM profiles WHERE id = v_user_a_id;
    SELECT name INTO v_user_b_name FROM profiles WHERE id = v_user_b_id;

    -- Try to find existing room between these two users
    SELECT er.id INTO v_room_id
    FROM expense_rooms er
    WHERE er.id IN (
      SELECT erm1.room_id
      FROM expense_room_members erm1
      WHERE erm1.user_id = v_user_a_id
      INTERSECT
      SELECT erm2.room_id
      FROM expense_room_members erm2
      WHERE erm2.user_id = v_user_b_id
    )
    AND (
      SELECT COUNT(*)
      FROM expense_room_members
      WHERE room_id = er.id
    ) = 2
    LIMIT 1;

    -- If no room exists, create one
    IF v_room_id IS NULL THEN
      -- Create room name
      v_room_name := 'Expenses with ' ||
        CASE
          WHEN v_split_request.created_by = v_user_a_id
          THEN COALESCE(v_user_b_name, 'User')
          ELSE COALESCE(v_user_a_name, 'User')
        END;

      -- Create the room
      INSERT INTO expense_rooms (name, description, created_by)
      VALUES (
        v_room_name,
        'Shared expenses from chat',
        v_split_request.created_by
      )
      RETURNING id INTO v_room_id;

      -- Add both users as members
      INSERT INTO expense_room_members (room_id, user_id, role)
      VALUES
        (v_room_id, v_user_a_id,
          CASE WHEN v_user_a_id = v_split_request.created_by THEN 'admin' ELSE 'member' END),
        (v_room_id, v_user_b_id,
          CASE WHEN v_user_b_id = v_split_request.created_by THEN 'admin' ELSE 'member' END);

      RAISE NOTICE 'Created new room % for expense %', v_room_id, v_expense.id;
    ELSE
      RAISE NOTICE 'Using existing room % for expense %', v_room_id, v_expense.id;
    END IF;

    -- Update the expense to link to the room
    UPDATE expenses
    SET room_id = v_room_id
    WHERE id = v_expense.id;

    RAISE NOTICE 'Linked expense % to room %', v_expense.id, v_room_id;
  END LOOP;
END $$;

-- Add helpful comment
COMMENT ON TABLE expenses IS 'Expenses table - all chat split expenses should have room_id set via migration 016 function or this backfill script';
