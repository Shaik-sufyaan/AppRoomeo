-- =====================================================
-- COMPLETE FIX FOR EXPENSES NOT SHOWING
-- =====================================================
-- Run this entire script in Supabase SQL Editor
-- It will diagnose and fix all issues

-- =====================================================
-- STEP 1: Check current state
-- =====================================================

-- Check if you have any split requests
DO $$
DECLARE
  v_split_count INTEGER;
  v_accepted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_split_count FROM split_requests;
  SELECT COUNT(*) INTO v_accepted_count FROM split_requests WHERE status = 'accepted';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSIS RESULTS:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total split requests: %', v_split_count;
  RAISE NOTICE 'Accepted split requests: %', v_accepted_count;

  IF v_split_count = 0 THEN
    RAISE NOTICE '⚠️  No split requests found - create one in chat first!';
  ELSIF v_accepted_count = 0 THEN
    RAISE NOTICE '⚠️  No accepted splits - accept a split request in chat!';
  ELSE
    RAISE NOTICE '✅ You have accepted splits';
  END IF;
END $$;

-- Check if expenses were created
DO $$
DECLARE
  v_expense_count INTEGER;
  v_with_room INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_expense_count FROM expenses WHERE split_request_id IS NOT NULL;
  SELECT COUNT(*) INTO v_with_room FROM expenses WHERE split_request_id IS NOT NULL AND room_id IS NOT NULL;

  RAISE NOTICE '';
  RAISE NOTICE 'Total expenses from chat splits: %', v_expense_count;
  RAISE NOTICE 'Expenses with room_id: %', v_with_room;

  IF v_expense_count = 0 THEN
    RAISE NOTICE '⚠️  No expenses created - trigger may not be working!';
  ELSIF v_with_room = 0 THEN
    RAISE NOTICE '⚠️  Expenses exist but have no room_id - need migration 017!';
  ELSE
    RAISE NOTICE '✅ Expenses have room_ids';
  END IF;
END $$;

-- =====================================================
-- STEP 2: Ensure function is updated (Migration 016)
-- =====================================================

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
    v_room_name := 'Expenses with ' ||
      CASE
        WHEN v_split_request.created_by = v_user_a_id
        THEN COALESCE(v_user_b_name, 'User')
        ELSE COALESCE(v_user_a_name, 'User')
      END;

    INSERT INTO expense_rooms (name, description, created_by)
    VALUES (
      v_room_name,
      'Shared expenses from chat',
      v_split_request.created_by
    )
    RETURNING id INTO v_room_id;

    INSERT INTO expense_room_members (room_id, user_id, role)
    VALUES
      (v_room_id, v_user_a_id,
        CASE WHEN v_user_a_id = v_split_request.created_by THEN 'admin' ELSE 'member' END),
      (v_room_id, v_user_b_id,
        CASE WHEN v_user_b_id = v_split_request.created_by THEN 'admin' ELSE 'member' END);

    RAISE NOTICE '✅ Created new room: %', v_room_name;
  ELSE
    RAISE NOTICE '✅ Using existing room: %', v_room_id;
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

  RAISE NOTICE '✅ Created expense: % (id: %)', v_split_request.item_name, v_expense_id;

  RETURN v_expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

RAISE NOTICE '✅ Function updated successfully';

-- =====================================================
-- STEP 3: Ensure trigger exists
-- =====================================================

DROP TRIGGER IF EXISTS trigger_create_expense_on_split_accept ON split_requests;

CREATE TRIGGER trigger_create_expense_on_split_accept
  AFTER UPDATE ON split_requests
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND OLD.status != 'accepted')
  EXECUTE FUNCTION auto_create_expense_on_split_accept();

-- =====================================================
-- STEP 4: Backfill existing expenses (Migration 017)
-- =====================================================

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
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'BACKFILLING EXISTING EXPENSES:';
  RAISE NOTICE '========================================';

  FOR v_expense IN
    SELECT * FROM expenses
    WHERE split_request_id IS NOT NULL
    AND room_id IS NULL
  LOOP
    v_count := v_count + 1;

    SELECT * INTO v_split_request FROM split_requests WHERE id = v_expense.split_request_id;
    SELECT * INTO v_message FROM messages WHERE id = v_split_request.message_id;
    SELECT * INTO v_conversation FROM conversations WHERE id = v_message.conversation_id;

    v_user_a_id := v_conversation.user_a_id;
    v_user_b_id := v_conversation.user_b_id;

    SELECT name INTO v_user_a_name FROM profiles WHERE id = v_user_a_id;
    SELECT name INTO v_user_b_name FROM profiles WHERE id = v_user_b_id;

    SELECT er.id INTO v_room_id
    FROM expense_rooms er
    WHERE er.id IN (
      SELECT erm1.room_id FROM expense_room_members erm1 WHERE erm1.user_id = v_user_a_id
      INTERSECT
      SELECT erm2.room_id FROM expense_room_members erm2 WHERE erm2.user_id = v_user_b_id
    )
    AND (SELECT COUNT(*) FROM expense_room_members WHERE room_id = er.id) = 2
    LIMIT 1;

    IF v_room_id IS NULL THEN
      v_room_name := 'Expenses with ' ||
        CASE
          WHEN v_split_request.created_by = v_user_a_id
          THEN COALESCE(v_user_b_name, 'User')
          ELSE COALESCE(v_user_a_name, 'User')
        END;

      INSERT INTO expense_rooms (name, description, created_by)
      VALUES (v_room_name, 'Shared expenses from chat', v_split_request.created_by)
      RETURNING id INTO v_room_id;

      INSERT INTO expense_room_members (room_id, user_id, role)
      VALUES
        (v_room_id, v_user_a_id,
          CASE WHEN v_user_a_id = v_split_request.created_by THEN 'admin' ELSE 'member' END),
        (v_room_id, v_user_b_id,
          CASE WHEN v_user_b_id = v_split_request.created_by THEN 'admin' ELSE 'member' END);

      RAISE NOTICE '  ✅ Created room: %', v_room_name;
    END IF;

    UPDATE expenses SET room_id = v_room_id WHERE id = v_expense.id;
    RAISE NOTICE '  ✅ Linked expense "%" to room', v_expense.title;
  END LOOP;

  IF v_count = 0 THEN
    RAISE NOTICE '  ℹ️  No expenses needed backfilling';
  ELSE
    RAISE NOTICE '  ✅ Backfilled % expenses', v_count;
  END IF;
END $$;

-- =====================================================
-- STEP 5: Final verification
-- =====================================================

DO $$
DECLARE
  v_expenses INTEGER;
  v_rooms INTEGER;
  v_splits INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_expenses FROM expenses WHERE split_request_id IS NOT NULL;
  SELECT COUNT(*) INTO v_rooms FROM expense_rooms WHERE description = 'Shared expenses from chat';
  SELECT COUNT(*) INTO v_splits FROM expense_splits;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FINAL STATUS:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Chat expenses created: %', v_expenses;
  RAISE NOTICE 'Chat rooms created: %', v_rooms;
  RAISE NOTICE 'Expense splits created: %', v_splits;
  RAISE NOTICE '';
  RAISE NOTICE '✅ ALL FIXES APPLIED!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Refresh your app';
  RAISE NOTICE '2. Go to Expenses screen';
  RAISE NOTICE '3. Check both "All" and "Rooms" tabs';
  RAISE NOTICE '========================================';
END $$;
