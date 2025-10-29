-- =====================================================
-- ULTRA QUICK DEMO SEED - Copy/Paste & Run!
-- =====================================================
-- Just replace YOUR_USER_ID on line 7 and run!
-- =====================================================

WITH user_id AS (
  SELECT 'YOUR_USER_ID_HERE'::UUID AS id  -- 🔴 REPLACE THIS WITH YOUR USER ID
),
-- Create demo users
demo_users AS (
  INSERT INTO profiles (id, name, age, user_type, college, work_status, smoker, pets, has_place, about, photos, is_visible)
  VALUES
    (gen_random_uuid(), 'Sarah Johnson', 24, 'finding-roommate', 'UCLA', 'full-time', false, true, true,
     'Friendly grad student with a 2BR apartment near campus. Love cooking, yoga, and Netflix!',
     ARRAY['https://i.pravatar.cc/300?img=5'], true),
    (gen_random_uuid(), 'Mike Chen', 26, 'finding-roommate', 'USC', 'full-time', false, false, true,
     'Software engineer working from home. Quiet, clean, and chill. Non-smoker preferred.',
     ARRAY['https://i.pravatar.cc/300?img=12'], true),
    (gen_random_uuid(), 'Emma Martinez', 23, 'finding-roommate', 'UCLA', 'part-time', false, false, true,
     'Art student with a cozy place near campus. Love plants, art, and good vibes!',
     ARRAY['https://i.pravatar.cc/300?img=9'], true)
  RETURNING id, name
),
-- Create conversations
conversations_created AS (
  INSERT INTO conversations (user_a_id, user_b_id, context_type, created_at, updated_at)
  SELECT
    LEAST((SELECT id FROM user_id), du.id),
    GREATEST((SELECT id FROM user_id), du.id),
    'match',
    CASE
      WHEN du.name = 'Sarah Johnson' THEN NOW() - INTERVAL '2 days'
      WHEN du.name = 'Mike Chen' THEN NOW() - INTERVAL '5 days'
      ELSE NOW() - INTERVAL '7 days'
    END,
    CASE
      WHEN du.name = 'Sarah Johnson' THEN NOW() - INTERVAL '5 minutes'
      WHEN du.name = 'Mike Chen' THEN NOW() - INTERVAL '3 hours'
      ELSE NOW() - INTERVAL '2 days'
    END
  FROM demo_users du
  RETURNING id, user_a_id, user_b_id
),
-- Get demo user IDs for messages
sarah_data AS (
  SELECT du.id as sarah_id, cc.id as conv_id
  FROM demo_users du
  JOIN conversations_created cc ON (cc.user_a_id = du.id OR cc.user_b_id = du.id)
  WHERE du.name = 'Sarah Johnson'
  LIMIT 1
),
mike_data AS (
  SELECT du.id as mike_id, cc.id as conv_id
  FROM demo_users du
  JOIN conversations_created cc ON (cc.user_a_id = du.id OR cc.user_b_id = du.id)
  WHERE du.name = 'Mike Chen'
  LIMIT 1
),
emma_data AS (
  SELECT du.id as emma_id, cc.id as conv_id
  FROM demo_users du
  JOIN conversations_created cc ON (cc.user_a_id = du.id OR cc.user_b_id = du.id)
  WHERE du.name = 'Emma Martinez'
  LIMIT 1
),
-- Insert messages for Sarah
sarah_messages AS (
  INSERT INTO messages (conversation_id, sender_id, text, read, created_at)
  SELECT
    sd.conv_id,
    CASE WHEN msg.from_sarah THEN sd.sarah_id ELSE (SELECT id FROM user_id) END,
    msg.text,
    msg.is_read,
    msg.sent_at
  FROM sarah_data sd
  CROSS JOIN (
    VALUES
      (true, 'Hey! I saw your profile and thought we might be a good match!', true, NOW() - INTERVAL '2 days'),
      (false, 'Hi Sarah! Thanks for reaching out. I love your place!', true, NOW() - INTERVAL '2 days' + INTERVAL '10 minutes'),
      (true, 'Thanks! Yeah it''s pretty cozy. The apartment is close to campus and has great natural light.', true, NOW() - INTERVAL '2 days' + INTERVAL '30 minutes'),
      (false, 'That sounds perfect! What''s the rent and when would the room be available?', true, NOW() - INTERVAL '2 days' + INTERVAL '1 hour'),
      (true, 'It''s $850/month including utilities. The room would be available starting next month. Would you like to schedule a time to come see it?', true, NOW() - INTERVAL '1 day'),
      (false, 'That works for my budget! How about this weekend? Saturday afternoon?', true, NOW() - INTERVAL '1 day' + INTERVAL '2 hours'),
      (true, 'Saturday at 2pm works perfectly! I''ll send you the address. Looking forward to meeting you!', false, NOW() - INTERVAL '5 minutes')
  ) AS msg(from_sarah, text, is_read, sent_at)
  RETURNING id
),
-- Insert messages for Mike
mike_messages AS (
  INSERT INTO messages (conversation_id, sender_id, text, read, created_at)
  SELECT
    md.conv_id,
    CASE WHEN msg.from_mike THEN md.mike_id ELSE (SELECT id FROM user_id) END,
    msg.text,
    msg.is_read,
    msg.sent_at
  FROM mike_data md
  CROSS JOIN (
    VALUES
      (false, 'Hi Mike! Your place sounds great for remote work.', true, NOW() - INTERVAL '5 days'),
      (true, 'Thanks! Yeah I''ve set up a nice home office. The internet is fiber optic, super fast.', true, NOW() - INTERVAL '5 days' + INTERVAL '1 hour'),
      (false, 'Perfect, I work from home too. What''s your typical schedule?', true, NOW() - INTERVAL '4 days'),
      (true, 'Usually 9-6 weekdays, pretty quiet. Evenings I game or watch movies. Pretty low-key!', true, NOW() - INTERVAL '4 days' + INTERVAL '30 minutes'),
      (true, 'Hey, just wanted to follow up - are you still interested in the room? A few people have asked.', false, NOW() - INTERVAL '3 hours')
  ) AS msg(from_mike, text, is_read, sent_at)
  RETURNING id
),
-- Insert messages for Emma
emma_messages AS (
  INSERT INTO messages (conversation_id, sender_id, text, read, created_at)
  SELECT
    ed.conv_id,
    CASE WHEN msg.from_emma THEN ed.emma_id ELSE (SELECT id FROM user_id) END,
    msg.text,
    msg.is_read,
    msg.sent_at
  FROM emma_data ed
  CROSS JOIN (
    VALUES
      (true, 'Hi! Love your profile. I think we''d vibe well!', true, NOW() - INTERVAL '7 days'),
      (false, 'Hey Emma! Your place looks so artistic and cozy!', true, NOW() - INTERVAL '7 days' + INTERVAL '2 hours'),
      (true, 'Thanks! I''ve decorated it myself. Lots of plants and art everywhere 🌿🎨', true, NOW() - INTERVAL '6 days'),
      (false, 'That sounds amazing! What''s the neighborhood like?', true, NOW() - INTERVAL '6 days' + INTERVAL '1 hour'),
      (true, 'Really chill, lots of cafes and art galleries nearby. Very walkable!', true, NOW() - INTERVAL '2 days')
  ) AS msg(from_emma, text, is_read, sent_at)
  RETURNING id
)
SELECT
  (SELECT COUNT(*) FROM demo_users) as users_created,
  (SELECT COUNT(*) FROM conversations_created) as conversations_created,
  (SELECT COUNT(*) FROM sarah_messages) + (SELECT COUNT(*) FROM mike_messages) + (SELECT COUNT(*) FROM emma_messages) as messages_created;

-- You should see: users_created: 3, conversations_created: 3, messages_created: 17
