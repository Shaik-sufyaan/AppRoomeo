-- =====================================================
-- EXPENSE FRIENDS SYSTEM
-- =====================================================
-- Separate friend system specifically for expense features
-- Does NOT affect the matches system (which is for roommate matching)
-- Migration: 020_create_expense_friends_system.sql

-- =====================================================
-- TABLES
-- =====================================================

-- Expense Friends Table
-- Stores bidirectional friendships for expense sharing
CREATE TABLE IF NOT EXISTS expense_friends (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

-- Always store with user_a_id < user_b_id (alphabetically by UUID)
user_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
user_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

-- Timestamps
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

-- Ensure no duplicate friendships
UNIQUE(user_a_id, user_b_id),

-- Ensure user_a_id < user_b_id
CHECK (user_a_id < user_b_id)
);

-- Expense Friend Requests Table
-- Stores pending friend requests for expense sharing
CREATE TABLE IF NOT EXISTS expense_friend_requests (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

-- Who sent and who receives the request
sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

-- Request status
status TEXT NOT NULL DEFAULT 'pending'
CHECK (status IN ('pending', 'accepted', 'rejected')),

-- Optional message
message TEXT,

-- Timestamps
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

-- Can't send request to yourself
CHECK (sender_id != recipient_id),

-- Only one pending request between two users
UNIQUE(sender_id, recipient_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Expense Friends indexes
CREATE INDEX IF NOT EXISTS idx_expense_friends_user_a ON expense_friends(user_a_id);
CREATE INDEX IF NOT EXISTS idx_expense_friends_user_b ON expense_friends(user_b_id);
CREATE INDEX IF NOT EXISTS idx_expense_friends_created_at ON expense_friends(created_at DESC);

-- Expense Friend Requests indexes
CREATE INDEX IF NOT EXISTS idx_expense_friend_requests_sender ON expense_friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_expense_friend_requests_recipient ON expense_friend_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_expense_friend_requests_status ON expense_friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_expense_friend_requests_created_at ON expense_friend_requests(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE expense_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_friend_requests ENABLE ROW LEVEL SECURITY;

-- EXPENSE FRIENDS POLICIES
DROP POLICY IF EXISTS "Users can view their expense friendships" ON expense_friends;
CREATE POLICY "Users can view their expense friendships"
ON expense_friends FOR SELECT
USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

DROP POLICY IF EXISTS "Users can remove their expense friendships" ON expense_friends;
CREATE POLICY "Users can remove their expense friendships"
ON expense_friends FOR DELETE
USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- EXPENSE FRIEND REQUESTS POLICIES
DROP POLICY IF EXISTS "Users can view their expense friend requests" ON expense_friend_requests;
CREATE POLICY "Users can view their expense friend requests"
ON expense_friend_requests FOR SELECT
USING (sender_id = auth.uid() OR recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can send expense friend requests" ON expense_friend_requests;
CREATE POLICY "Users can send expense friend requests"
ON expense_friend_requests FOR INSERT
WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can update received expense friend requests" ON expense_friend_requests;
CREATE POLICY "Users can update received expense friend requests"
ON expense_friend_requests FOR UPDATE
USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete sent expense friend requests" ON expense_friend_requests;
CREATE POLICY "Users can delete sent expense friend requests"
ON expense_friend_requests FOR DELETE
USING (sender_id = auth.uid());

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to send a friend request
CREATE OR REPLACE FUNCTION send_expense_friend_request(
p_recipient_id UUID,
p_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
v_sender_id UUID;
v_request_id UUID;
v_user_a_id UUID;
v_user_b_id UUID;
BEGIN
v_sender_id := auth.uid();

IF v_sender_id IS NULL THEN
RAISE EXCEPTION 'Not authenticated';
END IF;

-- Can't send request to yourself
IF v_sender_id = p_recipient_id THEN
RAISE EXCEPTION 'Cannot send friend request to yourself';
END IF;

-- Check if already friends
v_user_a_id := LEAST(v_sender_id, p_recipient_id);
v_user_b_id := GREATEST(v_sender_id, p_recipient_id);

IF EXISTS (
SELECT 1 FROM expense_friends
WHERE user_a_id = v_user_a_id AND user_b_id = v_user_b_id
) THEN
RAISE EXCEPTION 'Already friends';
END IF;

-- Check for existing pending request
IF EXISTS (
SELECT 1 FROM expense_friend_requests
WHERE sender_id = v_sender_id
  AND recipient_id = p_recipient_id
  AND status = 'pending'
) THEN
RAISE EXCEPTION 'Friend request already sent';
END IF;

-- Check for reverse pending request
IF EXISTS (
SELECT 1 FROM expense_friend_requests
WHERE sender_id = p_recipient_id
  AND recipient_id = v_sender_id
  AND status = 'pending'
) THEN
RAISE EXCEPTION 'This user has already sent you a friend request';
END IF;

-- Create the request
INSERT INTO expense_friend_requests (sender_id, recipient_id, message, status)
VALUES (v_sender_id, p_recipient_id, p_message, 'pending')
RETURNING id INTO v_request_id;

RETURN v_request_id;
END;
$$;

-- Function to accept a friend request
CREATE OR REPLACE FUNCTION accept_expense_friend_request(
p_request_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
v_request expense_friend_requests%ROWTYPE;
v_friendship_id UUID;
v_user_a_id UUID;
v_user_b_id UUID;
BEGIN
-- Get the request
SELECT * INTO v_request
FROM expense_friend_requests
WHERE id = p_request_id AND recipient_id = auth.uid() AND status = 'pending';

IF NOT FOUND THEN
RAISE EXCEPTION 'Friend request not found or already processed';
END IF;

-- Ensure user_a_id < user_b_id
v_user_a_id := LEAST(v_request.sender_id, v_request.recipient_id);
v_user_b_id := GREATEST(v_request.sender_id, v_request.recipient_id);

-- Create friendship
INSERT INTO expense_friends (user_a_id, user_b_id)
VALUES (v_user_a_id, v_user_b_id)
RETURNING id INTO v_friendship_id;

-- Update request status
UPDATE expense_friend_requests
SET status = 'accepted', updated_at = NOW()
WHERE id = p_request_id;

RETURN v_friendship_id;
END;
$$;

-- Function to reject a friend request
CREATE OR REPLACE FUNCTION reject_expense_friend_request(
p_request_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
UPDATE expense_friend_requests
SET status = 'rejected', updated_at = NOW()
WHERE id = p_request_id
AND recipient_id = auth.uid()
AND status = 'pending';

IF NOT FOUND THEN
RAISE EXCEPTION 'Friend request not found or already processed';
END IF;
END;
$$;

-- Function to remove a friend
CREATE OR REPLACE FUNCTION remove_expense_friend(
p_friend_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
v_user_a_id UUID;
v_user_b_id UUID;
BEGIN
v_user_a_id := LEAST(auth.uid(), p_friend_user_id);
v_user_b_id := GREATEST(auth.uid(), p_friend_user_id);

DELETE FROM expense_friends
WHERE user_a_id = v_user_a_id AND user_b_id = v_user_b_id;

IF NOT FOUND THEN
RAISE EXCEPTION 'Friendship not found';
END IF;
END;
$$;

-- Function to get all expense friends for a user
CREATE OR REPLACE FUNCTION get_expense_friends_for_user(
p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
friend_id UUID,
friend_name TEXT,
friend_photos TEXT[],
friend_age INT,
friendship_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
v_user_id UUID;
BEGIN
v_user_id := COALESCE(p_user_id, auth.uid());

RETURN QUERY
SELECT
CASE
  WHEN ef.user_a_id = v_user_id THEN ef.user_b_id
  ELSE ef.user_a_id
END AS friend_id,
p.name AS friend_name,
p.photos AS friend_photos,
p.age AS friend_age,
ef.created_at AS friendship_created_at
FROM expense_friends ef
JOIN profiles p ON (
CASE
  WHEN ef.user_a_id = v_user_id THEN p.id = ef.user_b_id
  ELSE p.id = ef.user_a_id
END
)
WHERE ef.user_a_id = v_user_id OR ef.user_b_id = v_user_id
ORDER BY ef.created_at DESC;
END;
$$;

-- Function to search users for expense friends
CREATE OR REPLACE FUNCTION search_users_for_expense_friends(
p_search_query TEXT
)
RETURNS TABLE (
user_id UUID,
user_name TEXT,
user_photos TEXT[],
user_age INT,
is_friend BOOLEAN,
has_pending_request BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
v_current_user_id UUID;
BEGIN
v_current_user_id := auth.uid();

RETURN QUERY
SELECT
p.id AS user_id,
p.name AS user_name,
p.photos AS user_photos,
p.age AS user_age,
EXISTS (
  SELECT 1 FROM expense_friends ef
  WHERE (ef.user_a_id = v_current_user_id AND ef.user_b_id = p.id)
      OR (ef.user_b_id = v_current_user_id AND ef.user_a_id = p.id)
) AS is_friend,
EXISTS (
  SELECT 1 FROM expense_friend_requests efr
  WHERE efr.sender_id = v_current_user_id
    AND efr.recipient_id = p.id
    AND efr.status = 'pending'
) AS has_pending_request
FROM profiles p
WHERE p.id != v_current_user_id
AND p.name ILIKE '%' || p_search_query || '%'
ORDER BY p.name
LIMIT 50;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_expense_friend_requests_updated_at ON expense_friend_requests;
CREATE TRIGGER update_expense_friend_requests_updated_at
BEFORE UPDATE ON expense_friend_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON expense_friends TO authenticated;
GRANT ALL ON expense_friend_requests TO authenticated;
GRANT EXECUTE ON FUNCTION send_expense_friend_request TO authenticated;
GRANT EXECUTE ON FUNCTION accept_expense_friend_request TO authenticated;
GRANT EXECUTE ON FUNCTION reject_expense_friend_request TO authenticated;
GRANT EXECUTE ON FUNCTION remove_expense_friend TO authenticated;
GRANT EXECUTE ON FUNCTION get_expense_friends_for_user TO authenticated;
GRANT EXECUTE ON FUNCTION search_users_for_expense_friends TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE expense_friends IS 'Friendships specifically for expense sharing (separate from roommate matches)';
COMMENT ON TABLE expense_friend_requests IS 'Friend requests for expense sharing';
COMMENT ON FUNCTION send_expense_friend_request IS 'Send a friend request for expense sharing';
COMMENT ON FUNCTION accept_expense_friend_request IS 'Accept a friend request and create friendship';
COMMENT ON FUNCTION reject_expense_friend_request IS 'Reject a friend request';
COMMENT ON FUNCTION remove_expense_friend IS 'Remove an expense friend (unfriend)';
COMMENT ON FUNCTION get_expense_friends_for_user IS 'Get all expense friends for a user';
COMMENT ON FUNCTION search_users_for_expense_friends IS 'Search users to add as expense friends';
