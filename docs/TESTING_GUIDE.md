# Match Request System - Testing Guide

## 🎯 Testing Overview

This guide provides step-by-step instructions to test the new approval-based matching system with complementary user type filtering.

---

## 🛠️ Pre-Test Setup

### 1. Run the Database Migration

**Using Supabase Dashboard:**
```
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Click "New Query"
4. Copy contents of supabase/migrations/006_create_matching_system.sql
5. Paste and click "Run"
6. Verify success message appears
```

**Using Supabase CLI:**
```bash
cd /path/to/AppRoomeo
supabase db push
```

**Verify Migration Success:**
```sql
-- Check if tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('match_requests', 'matches', 'swipes');

-- Should return 3 rows:
-- match_requests
-- matches
-- swipes
```

---

### 2. Create Test Accounts

You need **two test accounts** with different user types:

**Test Account A: "Looking for Place"**
```
Email: test-looking@example.com
Password: testpassword123
User Type: looking-for-place
Name: Alex
Age: 24
College: Stanford
```

**Test Account B: "Finding Roommate"**
```
Email: test-finding@example.com
Password: testpassword123
User Type: finding-roommate
Name: Sarah
Age: 25
College: Stanford
```

**How to create:**
1. Launch app
2. Sign up with each email
3. Select appropriate user type during onboarding
4. Complete profile setup

---

### 3. Verify Test Accounts in Database

```sql
-- Check both profiles exist with correct user types
SELECT id, name, age, user_type
FROM profiles
WHERE name IN ('Alex', 'Sarah');

-- Expected output:
-- Alex  | 24 | looking-for-place
-- Sarah | 25 | finding-roommate
```

---

## ✅ Test Cases

### Test 1: Complementary Matching Filter

**Objective:** Verify users only see complementary user types

**Steps:**
1. Login as **Alex** (looking-for-place)
2. Navigate to Matches screen
3. Observe the smart filter message
4. Look at profile cards

**Expected Results:**
- ✅ Smart filter shows: "💡 Showing: People with a place to share"
- ✅ Sarah's profile appears in feed (she's finding-roommate)
- ✅ Profile card shows "Has a place" badge
- ✅ No other "looking-for-place" users appear

**Verification Query:**
```sql
-- Check what Alex should see
SELECT * FROM get_match_feed(
  'alex-user-id',  -- Replace with Alex's actual user ID
  NULL, NULL, 50, 20, 0
);
-- Should only return finding-roommate users
```

---

**Steps (continued):**
5. Logout and login as **Sarah** (finding-roommate)
6. Navigate to Matches screen
7. Observe the smart filter message
8. Look at profile cards

**Expected Results:**
- ✅ Smart filter shows: "💡 Showing: People looking for a place"
- ✅ Alex's profile appears in feed (he's looking-for-place)
- ✅ Profile card shows "Looking for a place" badge
- ✅ No other "finding-roommate" users appear

---

### Test 2: Send Match Request (Right Swipe)

**Objective:** Verify match request is created and appears in recipient's list

**Steps:**
1. Login as **Alex**
2. Navigate to Matches screen
3. Locate Sarah's profile card
4. Swipe right (or tap Connect button)

**Expected Results:**
- ✅ Card animates off screen to the right
- ✅ Toast message appears: "Request sent to Sarah!"
- ✅ Next profile appears

**Verification Query:**
```sql
-- Check match request was created
SELECT *
FROM match_requests
WHERE sender_id = 'alex-user-id'
  AND recipient_id = 'sarah-user-id'
  AND status = 'pending';

-- Should return 1 row

-- Check swipe was recorded
SELECT *
FROM swipes
WHERE swiper_id = 'alex-user-id'
  AND swiped_user_id = 'sarah-user-id'
  AND swipe_type = 'like';

-- Should return 1 row
```

---

**Steps (continued):**
5. Logout and login as **Sarah**
6. Navigate to Matches screen
7. Look at "Pending Requests" section

**Expected Results:**
- ✅ "PENDING REQUESTS (1)" section appears
- ✅ Alex's request card is visible
- ✅ Card shows: "Alex, 24"
- ✅ Message: "Alex is interested in connecting with you"
- ✅ Badge shows: "Looking for a place"
- ✅ Two buttons: "Approve" (green) and "Reject" (gray)

**Screenshot Example:**
```
┌─────────────────────────────────┐
│ PENDING REQUESTS (1)            │
│ ┌─────────────────────────────┐ │
│ │ Alex, 24                    │ │
│ │ Stanford                    │ │
│ │ "Alex is interested..."     │ │
│ │ 🏠 Looking for a place      │ │
│ │ [✓ Approve] [✗ Reject]     │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

### Test 3: Approve Match Request

**Objective:** Verify approval creates match and shows celebration modal

**Steps:**
1. Still logged in as **Sarah**
2. In "Pending Requests" section, find Alex's request
3. Tap "Approve" button
4. Observe loading state (button shows spinner)
5. Wait for response

**Expected Results:**
- ✅ Button shows loading spinner briefly
- ✅ Request card disappears from list
- ✅ Match celebration modal appears with:
  - Title: "✓ Match Confirmed!"
  - Both user avatars (Sarah's and Alex's)
  - Message: "You and Alex can now chat with each other!"
  - "Send Message" button (green)
  - "Keep Swiping" text button
- ✅ "PENDING REQUESTS" section now shows (0) or disappears

**Verification Query:**
```sql
-- Check match was created
SELECT *
FROM matches
WHERE (user_a_id = 'alex-user-id' AND user_b_id = 'sarah-user-id')
   OR (user_a_id = 'sarah-user-id' AND user_b_id = 'alex-user-id');

-- Should return 1 row with:
-- is_mutual: false (Sarah approved Alex's request)

-- Check match request status changed
SELECT *
FROM match_requests
WHERE sender_id = 'alex-user-id'
  AND recipient_id = 'sarah-user-id';

-- Should return 1 row with status: 'approved'
```

---

**Steps (continued):**
6. Tap "Send Message" button in modal

**Expected Results:**
- ✅ Modal closes
- ✅ Chat screen opens
- ✅ Conversation with Alex is started

---

### Test 4: Reject Match Request (Silent Rejection)

**Objective:** Verify rejection deletes request without notifying sender

**Preparation:**
1. Create another test account:
   - **Test Account C: "Finding Roommate 2"**
   - Email: test-finding2@example.com
   - Name: Mike
   - User Type: finding-roommate
2. Login as Mike and swipe right on Alex

**Steps:**
1. Login as **Alex**
2. Navigate to Matches screen
3. Verify Mike's request appears in "Pending Requests"
4. Tap "Reject" button on Mike's request

**Expected Results:**
- ✅ Reject confirmation modal appears
- ✅ Modal title: "Reject Request?"
- ✅ Message: "Mike won't be notified that you rejected their request."
- ✅ Two buttons: "Cancel" (gray) and "Reject" (red)

---

**Steps (continued):**
5. Tap "Reject" button in modal

**Expected Results:**
- ✅ Modal closes
- ✅ Mike's request card disappears
- ✅ No toast/notification appears
- ✅ "PENDING REQUESTS" count decreases by 1

**Verification Query:**
```sql
-- Check match request was deleted
SELECT *
FROM match_requests
WHERE sender_id = 'mike-user-id'
  AND recipient_id = 'alex-user-id';

-- Should return 0 rows (request deleted)

-- Check rejection swipe was recorded
SELECT *
FROM swipes
WHERE swiper_id = 'alex-user-id'
  AND swiped_user_id = 'mike-user-id'
  AND swipe_type = 'reject';

-- Should return 1 row
```

---

**Steps (continued):**
6. Logout and login as **Mike**
7. Navigate to Chat screen
8. Look for "Sent Requests" section (if implemented)

**Expected Results:**
- ✅ Mike's request to Alex still shows as "Pending..."
- ✅ No indication that Alex rejected it (silent rejection)
- ✅ Mike did NOT receive any notification

**Why this is good UX:**
- Silent rejections avoid hurt feelings
- Sender's request just appears to be pending
- Better than showing "Rejected" explicitly

---

### Test 5: Mutual Match (Both Swipe Right)

**Objective:** Verify instant match when both users swipe right

**Preparation:**
1. Create two fresh test accounts:
   - **Account D:** Emma (looking-for-place)
   - **Account E:** David (finding-roommate)
2. Make sure neither has swiped on the other yet

**Steps:**
1. Login as **Emma**
2. Navigate to Matches screen
3. Swipe right on David
4. Observe results (should show "Request sent!")
5. Logout and login as **David**
6. Navigate to Matches screen
7. Swipe right on Emma

**Expected Results:**
- ✅ No "Request sent!" message appears
- ✅ Match celebration modal appears immediately
- ✅ Modal title: "🎉 It's a Match!"
- ✅ Subtitle: "You both swiped right!"
- ✅ Both avatars displayed
- ✅ Different visual style than regular match modal

**Verification Query:**
```sql
-- Check match was created
SELECT *
FROM matches
WHERE (user_a_id = 'emma-user-id' AND user_b_id = 'david-user-id')
   OR (user_a_id = 'david-user-id' AND user_b_id = 'emma-user-id');

-- Should return 1 row with:
-- is_mutual: true

-- Check both match requests were deleted
SELECT *
FROM match_requests
WHERE (sender_id = 'emma-user-id' AND recipient_id = 'david-user-id')
   OR (sender_id = 'david-user-id' AND recipient_id = 'emma-user-id');

-- Should return 0 rows (both deleted)
```

---

### Test 6: Left Swipe (Skip)

**Objective:** Verify left swipe records skip and doesn't show user again

**Steps:**
1. Login as **Alex**
2. Navigate to Matches screen
3. Note the current profile name (e.g., "Jennifer")
4. Swipe left (or tap Skip button)

**Expected Results:**
- ✅ Card animates off screen to the left
- ✅ No toast message appears
- ✅ Next profile appears
- ✅ Jennifer's profile doesn't appear again in feed

**Verification Query:**
```sql
-- Check skip swipe was recorded
SELECT *
FROM swipes
WHERE swiper_id = 'alex-user-id'
  AND swiped_user_id = 'jennifer-user-id'
  AND swipe_type = 'skip';

-- Should return 1 row

-- Verify Jennifer won't appear in feed again
SELECT * FROM get_match_feed(
  'alex-user-id',
  NULL, NULL, 50, 20, 0
);

-- Jennifer should NOT be in results
```

---

### Test 7: Duplicate Request Prevention

**Objective:** Verify cannot send multiple requests to same user

**Steps:**
1. Login as **Alex**
2. Navigate to Matches screen
3. Swipe right on a new user (e.g., "Lisa")
4. Observe success message
5. Reload the app or navigate away and back
6. Try to swipe right on Lisa again (if she appears)

**Expected Results:**
- ✅ Alert appears: "You already sent a request to Lisa"
- ✅ Card doesn't animate off screen
- ✅ No duplicate request created

**Verification Query:**
```sql
-- Check only one request exists
SELECT COUNT(*)
FROM match_requests
WHERE sender_id = 'alex-user-id'
  AND recipient_id = 'lisa-user-id';

-- Should return 1 (not 2 or more)
```

---

### Test 8: Already Matched Prevention

**Objective:** Verify matched users don't appear in feed

**Steps:**
1. Ensure Alex and Sarah are matched (from Test 3)
2. Login as **Alex**
3. Navigate to Matches screen
4. Scroll through all available profiles

**Expected Results:**
- ✅ Sarah does NOT appear in the feed
- ✅ Smart filter still works correctly
- ✅ Other compatible users appear

**Verification Query:**
```sql
-- Verify Sarah is in matches
SELECT *
FROM matches
WHERE (user_a_id = 'alex-user-id' AND user_b_id = 'sarah-user-id')
   OR (user_a_id = 'sarah-user-id' AND user_b_id = 'alex-user-id');

-- Should return 1 row

-- Verify Sarah doesn't appear in Alex's feed
SELECT * FROM get_match_feed(
  'alex-user-id',
  NULL, NULL, 50, 100, 0  -- Get up to 100 results
);

-- Sarah should NOT be in results
```

---

### Test 9: Incompatible User Type Error

**Objective:** Verify API blocks requests to incompatible user types

**Setup:**
This test requires calling the API directly (can't happen through UI since feed is filtered)

**Test using API call:**
```typescript
// Try to send request from Alex (looking-for-place)
// to another looking-for-place user
const result = await sendMatchRequest('another-looking-for-place-user-id');

console.log(result);
```

**Expected Results:**
```json
{
  "success": false,
  "error": "INCOMPATIBLE_USER_TYPES"
}
```

**Alternative: Manual SQL test:**
```sql
-- Try to create incompatible request manually
-- (Will be blocked by validation in sendMatchRequest function)
INSERT INTO match_requests (sender_id, recipient_id, status)
VALUES ('alex-user-id', 'another-looking-user-id', 'pending');

-- Then call API to send request
-- Should fail validation
```

---

### Test 10: Empty State

**Objective:** Verify empty state shows when no profiles available

**Steps:**
1. Create a test account that has swiped on all available compatible users
2. Login with that account
3. Navigate to Matches screen

**Expected Results:**
- ✅ No profile cards visible
- ✅ Empty state displays:
  - Icon: 🎯 or similar
  - Title: "No More Profiles"
  - Message: "You've seen everyone nearby! Check back later for new matches."

---

### Test 11: Loading States

**Objective:** Verify loading indicators appear during data fetching

**Steps:**
1. Clear app cache/data
2. Login
3. Navigate to Matches screen immediately

**Expected Results:**
- ✅ Loading spinner appears
- ✅ Message: "Loading profiles..."
- ✅ Screen doesn't show empty state prematurely
- ✅ Once loaded, profiles appear

---

### Test 12: Notification Badge

**Objective:** Verify notification badge shows count of pending requests

**Steps:**
1. Have 3 users swipe right on Alex
2. Login as **Alex**
3. Look at Matches tab icon

**Expected Results:**
- ✅ Badge shows "3" on Matches tab
- ✅ Badge also shows on notification bell in Matches screen
- ✅ After approving/rejecting requests, count decreases

---

## 🐛 Common Issues & Fixes

### Issue 1: "Not authenticated" error

**Cause:** User session expired or not logged in

**Fix:**
```typescript
// Check if user is authenticated
const { data: { user }, error } = await supabase.auth.getUser();
console.log('User:', user);
console.log('Error:', error);

// If error, re-login
await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'testpassword123'
});
```

---

### Issue 2: Match feed is empty

**Possible causes:**
1. No compatible user types exist
2. All compatible users have been swiped
3. User's `user_type` not set

**Check:**
```sql
-- Check current user's type
SELECT id, name, user_type
FROM profiles
WHERE id = 'your-user-id';

-- Check if compatible users exist
SELECT COUNT(*)
FROM profiles
WHERE user_type != 'your-user-type'
  AND is_visible = true;
```

**Fix:**
Create more test accounts with complementary user types

---

### Issue 3: RLS policy errors

**Error message:** "new row violates row-level security policy"

**Fix:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'match_requests';

-- Grant permissions
GRANT ALL ON match_requests TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
```

---

### Issue 4: Database function not found

**Error message:** "function get_match_feed does not exist"

**Fix:**
Re-run the migration:
```sql
-- Drop and recreate function
DROP FUNCTION IF EXISTS get_match_feed;

-- Then re-run the CREATE FUNCTION statement from migration
```

---

### Issue 5: Match celebration modal doesn't appear

**Possible causes:**
1. State update failed
2. Modal component not mounted
3. JavaScript error in modal

**Debug:**
```typescript
// Add logging in swipeRight function
console.log('Match result:', result);
console.log('Is mutual:', result.data?.is_mutual);
console.log('Matched user:', matchedUser);
console.log('Show modal:', showMatchModal);
```

---

## 📊 Test Data Queries

### View all match requests
```sql
SELECT
  mr.id,
  mr.status,
  sender.name as sender_name,
  recipient.name as recipient_name,
  mr.created_at
FROM match_requests mr
JOIN profiles sender ON sender.id = mr.sender_id
JOIN profiles recipient ON recipient.id = mr.recipient_id
ORDER BY mr.created_at DESC;
```

### View all matches
```sql
SELECT
  m.id,
  m.is_mutual,
  a.name as user_a,
  b.name as user_b,
  m.matched_at
FROM matches m
JOIN profiles a ON a.id = m.user_a_id
JOIN profiles b ON b.id = m.user_b_id
ORDER BY m.matched_at DESC;
```

### View swipe history for a user
```sql
SELECT
  s.swipe_type,
  swiped.name as swiped_on,
  swiped.user_type,
  s.created_at
FROM swipes s
JOIN profiles swiped ON swiped.id = s.swiped_user_id
WHERE s.swiper_id = 'your-user-id'
ORDER BY s.created_at DESC;
```

### Check compatibility matrix
```sql
SELECT
  a.name as user_a,
  a.user_type as type_a,
  b.name as user_b,
  b.user_type as type_b,
  are_users_compatible(a.id, b.id) as compatible
FROM profiles a
CROSS JOIN profiles b
WHERE a.id != b.id
LIMIT 20;
```

---

## ✅ Test Completion Checklist

### Core Functionality
- [ ] Complementary user type filtering works
- [ ] Right swipe sends match request
- [ ] Request appears in recipient's list
- [ ] Approve creates match
- [ ] Reject deletes request silently
- [ ] Mutual swipe creates instant match
- [ ] Left swipe records skip
- [ ] Already-swiped users don't reappear

### UI/UX
- [ ] Smart filter message displays correctly
- [ ] User type badges show on cards
- [ ] Match celebration modal appears
- [ ] Reject confirmation modal appears
- [ ] Toast messages show
- [ ] Loading states work
- [ ] Empty states display
- [ ] Animations are smooth

### Edge Cases
- [ ] Duplicate request prevention
- [ ] Already matched prevention
- [ ] Incompatible type rejection
- [ ] Network error handling
- [ ] Session expiration handling
- [ ] RLS policy enforcement

### Data Integrity
- [ ] Match requests created correctly
- [ ] Matches created correctly
- [ ] Swipes recorded correctly
- [ ] Mutual flag set correctly
- [ ] Status transitions work

---

## 🚀 Ready to Deploy?

Once all tests pass:

1. ✅ Run migration on production database
2. ✅ Deploy updated app code
3. ✅ Monitor error logs
4. ✅ Track analytics (match rate, request approval rate)
5. ✅ Gather user feedback

---

## 📞 Need Help?

If you encounter issues:
1. Check error logs in Supabase Dashboard
2. Review database queries above
3. Verify RLS policies are correct
4. Check migration ran successfully
5. Test API functions individually

Happy Testing! 🎉
