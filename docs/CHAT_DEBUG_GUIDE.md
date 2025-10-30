# Chat System Deep Debug Guide

## What I Fixed

I've added **extensive logging** throughout the entire chat system to help identify exactly where issues are occurring. The logs use emoji prefixes for easy scanning:

- 🔍 = Debug info
- ✅ = Success
- ❌ = Error

## Files Modified with Logging

### 1. `/app/(tabs)/chat/[ChatId].tsx` (Individual Chat Screen)
**What it logs:**
- When conversation loading starts
- Current user ID
- Conversation query results
- Whether profiles were found
- Message loading results
- Any errors with detailed messages

**What to check:**
- Look for: `[ChatThread]` in console
- If stuck loading, check for error messages
- Verify the conversation ID is valid

### 2. `/lib/api/chat.ts` (Chat API Functions)
**What it logs:**
- `getOrCreateConversation`: Tracks conversation creation
- `getConversations`: Lists all conversations being fetched
- `getMessages`: Shows message fetching process

**What to check:**
- Look for: `[Chat API]` in console
- Check if RPC function `get_or_create_conversation` succeeds
- Verify profiles are being returned

### 3. `/app/(tabs)/chat/index.tsx` (Chat List Screen)
**What it logs:**
- Match approval process
- Conversation creation after approval
- Navigation to chat screen
- "Send Message" button clicks

**What to check:**
- Look for: `[ChatScreen]` in console
- Verify `senderId` is correct
- Check if conversation is created after approval

## How to Debug

### Step 1: Open React Native Debugger
```bash
# In your terminal
npx react-native log-android
# or
npx react-native log-ios
```

### Step 2: Test Match Request Approval
1. Have another test user send you a match request
2. Go to Chat tab
3. Click "Approve" on the pending request
4. Watch console for these logs:
   ```
   🔍 [ChatScreen] Approving match request: <id>
   🔍 [ChatScreen] Calling approveMatchRequest...
   🔍 [Chat API] getOrCreateConversation called
   ✅ [Chat API] Successfully got/created conversation: <conv_id>
   ```

### Step 3: Test Opening Chat
1. After approval, click "Send Message" in celebration modal
2. Watch console for:
   ```
   🔍 [ChatScreen] Send message clicked
   🔍 [ChatScreen] Navigating to chat: <conv_id>
   🔍 [ChatThread] Starting to load conversation
   🔍 [ChatThread] Conversation data: {...}
   ✅ [ChatThread] Set other user: <name>
   ✅ [ChatThread] Finished loading conversation
   ```

### Step 4: If Chat is Still Loading
The loading state will show error alerts and console logs. Check for:

**Error 1: Conversation not found**
```
❌ [ChatThread] Error loading conversation
```
**Solution:** The conversation wasn't created. Check Step 2 logs.

**Error 2: Other user profile not found**
```
❌ [ChatThread] Other user profile not found
```
**Solution:** The other user's profile is missing from database. Check:
```sql
SELECT * FROM profiles WHERE id = '<other_user_id>';
```

**Error 3: RPC function error**
```
❌ [Chat API] Error getting/creating conversation
```
**Solution:** Database function issue. Verify migration 008 was applied:
```sql
SELECT * FROM pg_proc WHERE proname = 'get_or_create_conversation';
```

## Common Issues and Fixes

### Issue 1: "Cannot read property 'photos' of undefined"
**Cause:** Profile data missing from database
**Fix:** Ensure both users have complete profiles
```sql
SELECT id, name, photos FROM profiles WHERE id IN ('<user1_id>', '<user2_id>');
```

### Issue 2: Chat stuck on "Loading..."
**Cause:** Conversation query failing or returning null profiles
**Fix:** Check console logs for exact error. The screen now shows alerts with error details.

### Issue 3: Conversation not created after approval
**Cause:** RPC function failing or not called
**Fix:** Check approval logs. Should see:
```
✅ [ChatScreen] Conversation created: <id>
```

### Issue 4: Empty conversations list
**Cause:** No conversations exist or RLS policy blocking
**Fix:**
1. Check logs: `🔍 [Chat API] Conversations query result`
2. Verify conversations exist:
```sql
SELECT * FROM conversations
WHERE user_a_id = '<user_id>' OR user_b_id = '<user_id>';
```
3. Check RLS policies are correct

## Test Checklist

Run through this checklist and note which logs appear:

- [ ] Open Chat tab
  - [ ] See: `🔍 [Chat API] getConversations called`
  - [ ] See: `🔍 [Chat API] Conversations query result`

- [ ] Approve a match request
  - [ ] See: `🔍 [ChatScreen] Approving match request`
  - [ ] See: `🔍 [Chat API] getOrCreateConversation called`
  - [ ] See: `✅ [Chat API] Successfully got/created conversation`

- [ ] Click "Send Message"
  - [ ] See: `🔍 [ChatScreen] Send message clicked`
  - [ ] See: `✅ [ChatScreen] Navigating to chat`

- [ ] Chat screen loads
  - [ ] See: `🔍 [ChatThread] Starting to load conversation`
  - [ ] See: `🔍 [ChatThread] Conversation data`
  - [ ] See: `✅ [ChatThread] Set other user`
  - [ ] See: `✅ [ChatThread] Finished loading conversation`

## Next Steps

1. **Run the app and go through the flow**
2. **Copy ALL console logs** and send them to me
3. **Note exactly where it gets stuck** (which screen, what you clicked)
4. **Share any alert messages** that appear

With these detailed logs, I'll be able to pinpoint the exact issue!
