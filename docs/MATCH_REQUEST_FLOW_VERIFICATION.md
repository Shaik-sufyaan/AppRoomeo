# Match Request System - Flow Verification

## Your Question
> "After I sent a request to match, the match_request table is empty. Can you verify how match requests are sent, if the user can accept/decline, and if clicking yes lets them chat?"

---

## How Match Requests Work

### 1️⃣ **When You Swipe Right (Send Match Request)**

**Location**: `app/(tabs)/matches/index.tsx:148-186`

When you swipe right or tap "Connect", this happens:

```typescript
const swipeRight = async () => {
  const result = await sendMatchRequest(swipedUser.id);

  if (result.success) {
    if (result.data?.is_mutual) {
      // INSTANT MATCH! Both swiped right
      setShowMatchModal(true);
    } else {
      // Request sent, waiting for approval
      Alert.alert("Request Sent!", `Request sent to ${swipedUser.name}!`);
    }
  }
}
```

### 2️⃣ **What Happens in the Database**

**Location**: `lib/api/matches.ts:90-218`

The `sendMatchRequest()` function follows this logic:

```
START
  ↓
Check: Are users compatible? (complementary user types)
  ↓ Yes
Check: Already matched?
  ↓ No
Check: Request already sent?
  ↓ No
Check: Is this MUTUAL? (Did recipient already swipe right on you?)
  ↓
  ├── YES - MUTUAL MATCH
  │   ↓
  │   1. Create match immediately (in `matches` table)
  │   2. Mark is_mutual = TRUE
  │   3. DELETE both match requests (if any)
  │   4. Show celebration modal
  │   ↓
  │   RESULT: ✅ Match created, ❌ NO request in match_requests table
  │
  └── NO - ONE-SIDED REQUEST
      ↓
      1. Create match request (in `match_requests` table)
      2. Status = 'pending'
      3. Record swipe in `swipes` table
      ↓
      RESULT: ✅ Request in match_requests table
```

---

## Why Your match_requests Table Might Be Empty

### Scenario 1: **It Was a Mutual Match** ✨

**What happened:**
- You swiped right on User B
- User B had ALREADY swiped right on you earlier
- System detected mutual interest
- Created match immediately in `matches` table
- Deleted any pending requests

**Check:**
```sql
-- Look in the matches table instead
SELECT * FROM matches
WHERE user_a_id = 'YOUR_USER_ID' OR user_b_id = 'YOUR_USER_ID'
ORDER BY matched_at DESC;
```

**Expected behavior**: You should see a match celebration modal in the app.

---

### Scenario 2: **Migration Not Run**

**What happened:**
- The `006_create_matching_system.sql` migration wasn't run
- Tables don't exist
- Insert fails silently or with error

**Check:**
```sql
-- Verify tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('match_requests', 'matches', 'swipes');
```

**Expected result**: Should see all 3 tables.

**Fix**: Run the migration in Supabase SQL Editor:
1. Go to Supabase Dashboard → SQL Editor
2. Paste `/supabase/migrations/006_create_matching_system.sql`
3. Run it

---

### Scenario 3: **RLS Policies Blocking View**

**What happened:**
- Request WAS created
- But RLS policy prevents you from seeing it
- You can only see requests where you're the **recipient**

**Check:**
```sql
-- Check requests you SENT (as sender)
SELECT * FROM match_requests WHERE sender_id = auth.uid();

-- Check requests you RECEIVED (as recipient)
SELECT * FROM match_requests WHERE recipient_id = auth.uid();
```

**Note**: By default, senders can view their sent requests, but the app UI only shows **received** requests on the Chat screen.

---

### Scenario 4: **Error During Insert**

**What happened:**
- Compatibility check failed
- Already matched
- Request already exists
- Other database error

**Check the console**: You should see an error message like:
- "Incompatible Match"
- "Already Matched"
- "Request Pending"

---

## Where Match Requests Are Displayed

### ✅ **For the RECIPIENT** (Person who received the request)

**Location**: `app/(tabs)/chat/index.tsx`

Match requests appear at the **top of the Chat screen** with:
- Sender's photo and name
- "Approve" button (green checkmark)
- "Reject" button (red X)

```typescript
const loadMatchRequests = async () => {
  const result = await getReceivedMatchRequests();
  // Shows all pending requests where recipient_id = current user
}
```

### ❌ **For the SENDER** (Person who sent the request)

**You DON'T see your sent requests in the app UI.**

The app only shows:
1. Pending requests YOU received
2. Your existing matches

To see your sent requests, query the database directly:
```sql
SELECT * FROM match_requests
WHERE sender_id = auth.uid()
  AND status = 'pending';
```

---

## Accept/Decline Flow

### ✅ **When Recipient Clicks "Approve"**

**Location**: `app/(tabs)/chat/index.tsx:96-115`

```typescript
const handleApproveRequest = async (requestId: string) => {
  // 1. Call approveMatchRequest
  const result = await approveMatchRequest(requestId);

  // 2. Create match in database (via create_match_from_request function)
  // 3. Update request status to 'approved'
  // 4. Create conversation automatically
  await getOrCreateConversation(request.sender_id, 'match', match_id);

  // 5. Show celebration modal
  setCelebrationModalVisible(true);

  // 6. Reload conversations (chat is now available)
}
```

**Database function**: `create_match_from_request()` (migration line 216-254)
- Creates match in `matches` table
- Updates request status to 'approved'
- Returns match ID

**Result**:
- ✅ Match created
- ✅ Conversation created (can chat now)
- ✅ Celebration modal shown

---

### ❌ **When Recipient Clicks "Reject"**

**Location**: `app/(tabs)/chat/index.tsx:127-140`

```typescript
const confirmRejectRequest = async () => {
  // 1. Call rejectMatchRequest
  const result = await rejectMatchRequest(requestId);

  // 2. DELETE the request from database
  // 3. Record rejection in swipes table (swipe_type = 'reject')
  // 4. Request disappears from UI
}
```

**Result**:
- ❌ Request deleted (silent rejection)
- ❌ No match created
- ❌ Sender never knows they were rejected
- ✅ Sender won't see this person in feed again

---

## Chat Access After Approval

### How Chat Works

**When request is approved:**

1. **Match created** in `matches` table
2. **Conversation created** automatically via `getOrCreateConversation()`
3. **Both users** can now chat

**Location**: `lib/api/chat.ts:15-83`

```typescript
export async function getOrCreateConversation(
  otherUserId: string,
  contextType?: 'match' | 'marketplace',
  contextId?: string
) {
  // 1. Check if conversation already exists
  // 2. If not, create new conversation
  // 3. Return conversation_id
}
```

### Verification

**Check if conversation was created:**
```sql
SELECT * FROM conversations
WHERE (user_a_id = 'USER_1_ID' AND user_b_id = 'USER_2_ID')
   OR (user_a_id = 'USER_2_ID' AND user_b_id = 'USER_1_ID');
```

**Expected**: You should see a conversation with `context_type = 'match'`

---

## Testing the Complete Flow

### Test 1: Send Request (Non-Mutual)

**Setup**: 2 test accounts (A and B)

**Steps**:
1. **Account A**: Swipe right on Account B
2. **Check database**:
   ```sql
   SELECT * FROM match_requests;
   ```
3. **Expected**: 1 row with sender_id = A, recipient_id = B, status = 'pending'

4. **Account B**: Open Chat screen
5. **Expected**: See match request card from Account A

---

### Test 2: Approve Request

**Steps**:
1. **Account B**: Click "Approve" on Account A's request
2. **Expected**:
   - Celebration modal appears
   - "Send Message" button available

3. **Check database**:
   ```sql
   -- Match created
   SELECT * FROM matches WHERE user_a_id IN ('A_ID', 'B_ID');

   -- Request updated
   SELECT * FROM match_requests WHERE status = 'approved';

   -- Conversation created
   SELECT * FROM conversations;
   ```

4. **Account B**: Click "Send Message"
5. **Expected**: Navigate to chat screen with Account A

6. **Account A**: Open Chat screen
7. **Expected**: See conversation with Account B (no request, just conversation)

---

### Test 3: Mutual Match

**Steps**:
1. **Account A**: Swipe right on Account B
2. **Check database**: Request created (A → B)
3. **Account B**: Swipe right on Account A (BEFORE approving request)
4. **Expected**:
   - Instant match celebration modal
   - NO request in database (deleted)
   - Match created with is_mutual = TRUE
   - Conversation created

**Check:**
```sql
SELECT * FROM matches WHERE is_mutual = TRUE;
```

---

## Debug Queries to Run Now

Copy these into Supabase SQL Editor:

### 1. Check ALL requests
```sql
SELECT
  mr.id,
  mr.status,
  mr.created_at,
  ps.name as sender_name,
  pr.name as recipient_name
FROM match_requests mr
LEFT JOIN profiles ps ON mr.sender_id = ps.id
LEFT JOIN profiles pr ON mr.recipient_id = pr.id
ORDER BY mr.created_at DESC;
```

### 2. Check ALL matches
```sql
SELECT
  m.id,
  m.is_mutual,
  m.matched_at,
  pa.name as user_a_name,
  pb.name as user_b_name
FROM matches m
LEFT JOIN profiles pa ON m.user_a_id = pa.id
LEFT JOIN profiles pb ON m.user_b_id = pb.id
ORDER BY m.matched_at DESC;
```

### 3. Check recent swipes (your activity)
```sql
SELECT
  s.swipe_type,
  s.created_at,
  ps.name as you_swiped_on
FROM swipes s
LEFT JOIN profiles ps ON s.swiped_user_id = ps.id
WHERE s.swiper_id = auth.uid()
ORDER BY s.created_at DESC
LIMIT 10;
```

### 4. Check if you have any pending requests TO you
```sql
SELECT
  mr.*,
  p.name as sender_name,
  p.photos as sender_photos
FROM match_requests mr
LEFT JOIN profiles p ON mr.sender_id = p.id
WHERE mr.recipient_id = auth.uid()
  AND mr.status = 'pending';
```

---

## Common Issues & Solutions

### Issue 1: "Table doesn't exist"
**Solution**: Run migration `006_create_matching_system.sql`

### Issue 2: "Empty table but I swiped"
**Solution**: Check `matches` table - it might have been a mutual match

### Issue 3: "Can't see my sent requests"
**Solution**: Normal behavior - app only shows RECEIVED requests. Query database:
```sql
SELECT * FROM match_requests WHERE sender_id = auth.uid();
```

### Issue 4: "Approved but can't chat"
**Solution**: Check if conversation was created:
```sql
SELECT * FROM conversations WHERE user_a_id = auth.uid() OR user_b_id = auth.uid();
```

If missing, run this to create it manually:
```sql
SELECT get_or_create_conversation('USER_A_ID', 'USER_B_ID', 'match', 'MATCH_ID');
```

---

## Summary: Expected Behavior

| Scenario | match_requests Table | matches Table | Can Chat? |
|----------|---------------------|---------------|-----------|
| You swipe right (non-mutual) | ✅ Request created | ❌ | ❌ |
| You swipe right (mutual) | ❌ Deleted immediately | ✅ Match created | ✅ |
| They approve your request | ✅ Status = 'approved' | ✅ Match created | ✅ |
| They reject your request | ❌ Request deleted | ❌ | ❌ |

---

## Next Steps

1. **Run the debug queries above** to see what's actually in your database
2. **Tell me the results** (how many rows in each table)
3. **Check your app console** for any error messages
4. **Test with a second account** to verify the complete flow

Once I see the query results, I can tell you exactly what happened and why the table appears empty.
