-- =====================================================
-- DEMO CHAT DATA SEED SCRIPT - V2 (FIXED)
-- =====================================================
-- This version works without authentication context
-- =====================================================

-- =====================================================
-- STEP 1: Find Your User ID
-- =====================================================
-- First, run this query to find your user ID:

SELECT id, name, email FROM profiles ORDER BY created_at DESC LIMIT 5;

-- Copy your user ID from the results above, then continue below

-- =====================================================
-- STEP 2: Replace YOUR_USER_ID and Run This Script
-- =====================================================

DO $$
DECLARE
  -- 🔴 REPLACE THIS WITH YOUR ACTUAL USER ID FROM STEP 1
  current_user_id UUID := 'YOUR_USER_ID_HERE'; -- <-- CHANGE THIS!

  demo_user_1_id UUID;
  demo_user_2_id UUID;
  demo_user_3_id UUID;
  conv_1_id UUID;
  conv_2_id UUID;
  conv_3_id UUID;
BEGIN
  -- Validate user ID is set
  IF current_user_id = 'YOUR_USER_ID_HERE' THEN
    RAISE EXCEPTION 'Please replace YOUR_USER_ID_HERE with your actual user ID from Step 1!';
  END IF;

  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id) THEN
    RAISE EXCEPTION 'User ID % not found in profiles table. Please check the ID.', current_user_id;
  END IF;

  RAISE NOTICE '✅ Using user ID: %', current_user_id;

  -- =====================================================
  -- Create Demo User Profiles
  -- =====================================================

  -- Demo User 1: Sarah (Finding roommate)
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
    'finding-roommate',
    'UCLA',
    'full-time',
    false,
    true,
    true,
    'Friendly grad student with a 2BR apartment near campus. Love cooking, yoga, and Netflix. Looking for a clean, respectful roommate!',
    ARRAY['https://i.pravatar.cc/300?img=5'],
    true
  ) RETURNING id INTO demo_user_1_id;

  RAISE NOTICE 'Created Sarah: %', demo_user_1_id;

  -- Demo User 2: Mike (Finding roommate)
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

  RAISE NOTICE 'Created Mike: %', demo_user_2_id;

  -- Demo User 3: Emma (Finding roommate)
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

  RAISE NOTICE 'Created Emma: %', demo_user_3_id;

  -- =====================================================
  -- Create Conversations
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
    NOW() - INTERVAL '5 minutes'
  ) RETURNING id INTO conv_1_id;

  RAISE NOTICE 'Created conversation with Sarah: %', conv_1_id;

  -- Conversation 2 with Mike
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

  RAISE NOTICE 'Created conversation with Mike: %', conv_2_id;

  -- Conversation 3 with Emma
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

  RAISE NOTICE 'Created conversation with Emma: %', conv_3_id;

  -- =====================================================
  -- Add Messages
  -- =====================================================

  -- === Conversation 1 with Sarah ===
  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_1_id, demo_user_1_id, 'Hey! I saw your profile and thought we might be a good match!', true, NOW() - INTERVAL '2 days'),
  (conv_1_id, current_user_id, 'Hi Sarah! Thanks for reaching out. I love your place!', true, NOW() - INTERVAL '2 days' + INTERVAL '10 minutes'),
  (conv_1_id, demo_user_1_id, 'Thanks! Yeah it''s pretty cozy. The apartment is close to campus and has great natural light.', true, NOW() - INTERVAL '2 days' + INTERVAL '30 minutes'),
  (conv_1_id, current_user_id, 'That sounds perfect! What''s the rent and when would the room be available?', true, NOW() - INTERVAL '2 days' + INTERVAL '1 hour'),
  (conv_1_id, demo_user_1_id, 'It''s $850/month including utilities. The room would be available starting next month. Would you like to schedule a time to come see it?', true, NOW() - INTERVAL '1 day'),
  (conv_1_id, current_user_id, 'That works for my budget! How about this weekend? Saturday afternoon?', true, NOW() - INTERVAL '1 day' + INTERVAL '2 hours'),
  (conv_1_id, demo_user_1_id, 'Saturday at 2pm works perfectly! I''ll send you the address. Looking forward to meeting you!', false, NOW() - INTERVAL '5 minutes');

  RAISE NOTICE 'Added 7 messages to Sarah conversation';

  -- === Conversation 2 with Mike ===
  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_2_id, current_user_id, 'Hi Mike! Your place sounds great for remote work.', true, NOW() - INTERVAL '5 days'),
  (conv_2_id, demo_user_2_id, 'Thanks! Yeah I''ve set up a nice home office. The internet is fiber optic, super fast.', true, NOW() - INTERVAL '5 days' + INTERVAL '1 hour'),
  (conv_2_id, current_user_id, 'Perfect, I work from home too. What''s your typical schedule?', true, NOW() - INTERVAL '4 days'),
  (conv_2_id, demo_user_2_id, 'Usually 9-6 weekdays, pretty quiet. Evenings I game or watch movies. Pretty low-key!', true, NOW() - INTERVAL '4 days' + INTERVAL '30 minutes'),
  (conv_2_id, demo_user_2_id, 'Hey, just wanted to follow up - are you still interested in the room? A few people have asked.', false, NOW() - INTERVAL '3 hours');

  RAISE NOTICE 'Added 5 messages to Mike conversation';

  -- === Conversation 3 with Emma ===
  INSERT INTO messages (conversation_id, sender_id, text, read, created_at) VALUES
  (conv_3_id, demo_user_3_id, 'Hi! Love your profile. I think we''d vibe well!', true, NOW() - INTERVAL '7 days'),
  (conv_3_id, current_user_id, 'Hey Emma! Your place looks so artistic and cozy!', true, NOW() - INTERVAL '7 days' + INTERVAL '2 hours'),
  (conv_3_id, demo_user_3_id, 'Thanks! I''ve decorated it myself. Lots of plants and art everywhere 🌿🎨', true, NOW() - INTERVAL '6 days'),
  (conv_3_id, current_user_id, 'That sounds amazing! What''s the neighborhood like?', true, NOW() - INTERVAL '6 days' + INTERVAL '1 hour'),
  (conv_3_id, demo_user_3_id, 'Really chill, lots of cafes and art galleries nearby. Very walkable!', true, NOW() - INTERVAL '2 days');

  RAISE NOTICE 'Added 5 messages to Emma conversation';

  -- =====================================================
  -- Success!
  -- =====================================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ DEMO DATA CREATED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📱 You now have:';
  RAISE NOTICE '   • 3 demo users (Sarah, Mike, Emma)';
  RAISE NOTICE '   • 3 conversations';
  RAISE NOTICE '   • 17 messages total';
  RAISE NOTICE '   • 2 unread messages (Sarah & Mike)';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Refresh your app to see the conversations!';
  RAISE NOTICE '';

END $$;
