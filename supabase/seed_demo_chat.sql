-- =====================================================
-- DEMO CHAT DATA SEED SCRIPT
-- =====================================================
-- This script creates demo users, conversations, and messages
-- so you can test the chat feature without matching with real users
--
-- USAGE:
-- 1. Copy this entire script
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and run this script
-- 4. Refresh your app to see demo conversations
--
-- CLEANUP:
-- Run the cleanup script at the bottom to remove all demo data
-- =====================================================

-- Get the current authenticated user's ID
-- Replace 'YOUR_USER_ID' with your actual user ID from Supabase Auth
-- You can find it in: Supabase Dashboard > Authentication > Users
DO $$
DECLARE
  current_user_id UUID;
  demo_user_1_id UUID;
  demo_user_2_id UUID;
  demo_user_3_id UUID;
  conv_1_id UUID;
  conv_2_id UUID;
  conv_3_id UUID;
BEGIN
  -- =====================================================
  -- STEP 1: Get Current User ID
  -- =====================================================
  -- Replace this with your actual user ID
  -- You can find it by running: SELECT auth.uid();
  -- Or check Supabase Dashboard > Authentication > Users

  SELECT auth.uid() INTO current_user_id;

  -- If not authenticated, exit with error
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found. Please make sure you are logged in.';
  END IF;

  RAISE NOTICE 'Current user ID: %', current_user_id;

  -- =====================================================
  -- STEP 2: Create Demo User Profiles
  -- =====================================================

  -- Demo User 1: Sarah (Looking for place)
  INSERT INTO profiles (
    id,
    name,
    age,
    user_type,
    college,
    work_status,
    smoker,
    pets,
    has_place,
    about,
    photos,
    is_visible
  ) VALUES (
    gen_random_uuid(),
    'Sarah Johnson',
    24,
    'finding-roommate',  -- Opposite of your type for matching
    'UCLA',
    'full-time',
    false,
    true,
    true,  -- Has a place
    'Friendly grad student with a 2BR apartment near campus. Love cooking, yoga, and Netflix. Looking for a clean, respectful roommate!',
    ARRAY['https://i.pravatar.cc/300?img=5'],
    true
  ) RETURNING id INTO demo_user_1_id;

  RAISE NOTICE 'Created demo user 1 (Sarah): %', demo_user_1_id;

  -- Demo User 2: Mike (Looking for place)
  INSERT INTO profiles (
    id,
    name,
    age,
    user_type,
    college,
    work_status,
    smoker,
    pets,
    has_place,
    about,
    photos,
    is_visible
  ) VALUES (
    gen_random_uuid(),
    'Mike Chen',
    26,
    'finding-roommate',
    'USC',
    'full-time',
    false,
    false,
    true,
    'Software engineer working from home. Quiet, clean, and chill. Have a spare room in my apartment. Non-smoker preferred.',
    ARRAY['https://i.pravatar.cc/300?img=12'],
    true
  ) RETURNING id INTO demo_user_2_id;

  RAISE NOTICE 'Created demo user 2 (Mike): %', demo_user_2_id;

  -- Demo User 3: Emma (Looking for place)
  INSERT INTO profiles (
    id,
    name,
    age,
    user_type,
    college,
    work_status,
    smoker,
    pets,
    has_place,
    about,
    photos,
    is_visible
  ) VALUES (
    gen_random_uuid(),
    'Emma Martinez',
    23,
    'finding-roommate',
    'UCLA',
    'part-time',
    false,
    false,
    true,
    'Art student with a cozy place near campus. Love plants, art, and good vibes. Looking for someone creative and low-key!',
    ARRAY['https://i.pravatar.cc/300?img=9'],
    true
  ) RETURNING id INTO demo_user_3_id;

  RAISE NOTICE 'Created demo user 3 (Emma): %', demo_user_3_id;

  -- =====================================================
  -- STEP 3: Create Conversations
  -- =====================================================

  -- Conversation 1 with Sarah (most recent)
  INSERT INTO conversations (
    id,
    user_a_id,
    user_b_id,
    context_type,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    LEAST(current_user_id, demo_user_1_id),
    GREATEST(current_user_id, demo_user_1_id),
    'match',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '5 minutes'  -- Recent activity
  ) RETURNING id INTO conv_1_id;

  RAISE NOTICE 'Created conversation 1 with Sarah: %', conv_1_id;

  -- Conversation 2 with Mike (older, has unread)
  INSERT INTO conversations (
    id,
    user_a_id,
    user_b_id,
    context_type,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    LEAST(current_user_id, demo_user_2_id),
    GREATEST(current_user_id, demo_user_2_id),
    'match',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '3 hours'
  ) RETURNING id INTO conv_2_id;

  RAISE NOTICE 'Created conversation 2 with Mike: %', conv_2_id;

  -- Conversation 3 with Emma (oldest, no recent activity)
  INSERT INTO conversations (
    id,
    user_a_id,
    user_b_id,
    context_type,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    LEAST(current_user_id, demo_user_3_id),
    GREATEST(current_user_id, demo_user_3_id),
    'match',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '2 days'
  ) RETURNING id INTO conv_3_id;

  RAISE NOTICE 'Created conversation 3 with Emma: %', conv_3_id;

  -- =====================================================
  -- STEP 4: Add Messages to Conversations
  -- =====================================================

  -- === Conversation 1 with Sarah (Recent, active chat) ===

  -- Sarah starts the conversation
  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_1_id, demo_user_1_id, 'Hey! I saw your profile and thought we might be a good match!', true, NOW() - INTERVAL '2 days');

  -- You reply
  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_1_id, current_user_id, 'Hi Sarah! Thanks for reaching out. I love your place!', true, NOW() - INTERVAL '2 days' + INTERVAL '10 minutes');

  -- Sarah responds
  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_1_id, demo_user_1_id, 'Thanks! Yeah it''s pretty cozy. The apartment is close to campus and has great natural light.', true, NOW() - INTERVAL '2 days' + INTERVAL '30 minutes');

  -- You ask a question
  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_1_id, current_user_id, 'That sounds perfect! What''s the rent and when would the room be available?', true, NOW() - INTERVAL '2 days' + INTERVAL '1 hour');

  -- Sarah's detailed response
  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_1_id, demo_user_1_id, 'It''s $850/month including utilities. The room would be available starting next month. Would you like to schedule a time to come see it?', true, NOW() - INTERVAL '1 day');

  -- Your confirmation
  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_1_id, current_user_id, 'That works for my budget! How about this weekend? Saturday afternoon?', true, NOW() - INTERVAL '1 day' + INTERVAL '2 hours');

  -- Sarah's most recent message (UNREAD)
  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_1_id, demo_user_1_id, 'Saturday at 2pm works perfectly! I''ll send you the address. Looking forward to meeting you!', false, NOW() - INTERVAL '5 minutes');

  -- === Conversation 2 with Mike (Has unread messages) ===

  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_2_id, current_user_id, 'Hi Mike! Your place sounds great for remote work.', true, NOW() - INTERVAL '5 days');

  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_2_id, demo_user_2_id, 'Thanks! Yeah I''ve set up a nice home office. The internet is fiber optic, super fast.', true, NOW() - INTERVAL '5 days' + INTERVAL '1 hour');

  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_2_id, current_user_id, 'Perfect, I work from home too. What''s your typical schedule?', true, NOW() - INTERVAL '4 days');

  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_2_id, demo_user_2_id, 'Usually 9-6 weekdays, pretty quiet. Evenings I game or watch movies. Pretty low-key!', true, NOW() - INTERVAL '4 days' + INTERVAL '30 minutes');

  -- Mike's unread message
  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_2_id, demo_user_2_id, 'Hey, just wanted to follow up - are you still interested in the room? A few people have asked.', false, NOW() - INTERVAL '3 hours');

  -- === Conversation 3 with Emma (Older conversation) ===

  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_3_id, demo_user_3_id, 'Hi! Love your profile. I think we''d vibe well!', true, NOW() - INTERVAL '7 days');

  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_3_id, current_user_id, 'Hey Emma! Your place looks so artistic and cozy!', true, NOW() - INTERVAL '7 days' + INTERVAL '2 hours');

  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_3_id, demo_user_3_id, 'Thanks! I''ve decorated it myself. Lots of plants and art everywhere 🌿🎨', true, NOW() - INTERVAL '6 days');

  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_3_id, current_user_id, 'That sounds amazing! What''s the neighborhood like?', true, NOW() - INTERVAL '6 days' + INTERVAL '1 hour');

  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_3_id, demo_user_3_id, 'Really chill, lots of cafes and art galleries nearby. Very walkable!', true, NOW() - INTERVAL '2 days');

  -- =====================================================
  -- Success Message
  -- =====================================================

  RAISE NOTICE '✅ Demo data created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📱 You now have:';
  RAISE NOTICE '   - 3 demo users (Sarah, Mike, Emma)';
  RAISE NOTICE '   - 3 conversations with different states';
  RAISE NOTICE '   - Multiple messages in each conversation';
  RAISE NOTICE '   - 2 unread messages (from Sarah and Mike)';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Refresh your app to see the demo conversations!';
  RAISE NOTICE '';
  RAISE NOTICE 'Conversation IDs:';
  RAISE NOTICE '   Sarah: %', conv_1_id;
  RAISE NOTICE '   Mike:  %', conv_2_id;
  RAISE NOTICE '   Emma:  %', conv_3_id;

END $$;

-- =====================================================
-- CLEANUP SCRIPT (Run this to remove all demo data)
-- =====================================================
-- Uncomment and run this section to delete all demo data

/*
DO $$
BEGIN
  -- Delete demo users (this will cascade delete conversations and messages)
  DELETE FROM profiles WHERE name IN ('Sarah Johnson', 'Mike Chen', 'Emma Martinez');

  RAISE NOTICE '✅ All demo data has been deleted!';
END $$;
*/
