-- =====================================================
-- UPDATE SPLIT REQUEST TO ROOM INTEGRATION
-- =====================================================
-- Ensures chat-based split requests automatically create/use expense rooms

-- Drop and recreate the function with room creation logic
DROP FUNCTION IF EXISTS create_expense_from_split_request(UUID);

CREATE OR REPLACE FUNCTION create_expense_from_split_request(p_split_request_id UUID)
RETURNS UUID AS $$
DECLARE
  v_split_request split_requests%ROWTYPE;
  v_message messages%ROWTYPE;
  v_conversation conversations%ROWTYPE;
  v_expense_id UUID;
  v_room_id UUID;
  v_user_a_id UUID;
  v_user_b_id UUID;
  v_user_a_name TEXT;
  v_user_b_name TEXT;
  v_room_name TEXT;
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

  -- Get both user IDs
  v_user_a_id := v_conversation.user_a_id;
  v_user_b_id := v_conversation.user_b_id;

  -- Get user names for room naming
  SELECT name INTO v_user_a_name FROM profiles WHERE id = v_user_a_id;
  SELECT name INTO v_user_b_name FROM profiles WHERE id = v_user_b_id;

  -- Try to find existing room between these two users
  -- Look for a room where both users are members
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
  -- Ensure it's a 2-person room (chat-based room)
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
  END IF;

  -- Create the expense linked to the room
  INSERT INTO expenses (
    room_id,
    split_request_id,
    title,
    amount,
    paid_by,
    expense_date
  ) VALUES (
    v_room_id,
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

-- Add helpful comment
COMMENT ON FUNCTION create_expense_from_split_request IS 'Creates expense from accepted split request and automatically creates/finds expense room for the conversation';
