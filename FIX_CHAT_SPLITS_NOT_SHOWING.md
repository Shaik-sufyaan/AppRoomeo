# Fix: Chat Splits Not Showing in Expense Screen

## Problem

When you create and accept split requests in chat, they're not appearing in the Expense screen's **All tab** or **Rooms tab**.

## Root Cause

The database function `create_expense_from_split_request()` needs to be updated to:
1. Auto-create expense rooms for chat splits
2. Link expenses to those rooms

The original function (from migration 013) creates expenses **without** room_id, so they don't appear in the Rooms tab.

## Solution: Run Database Migrations

### Step 1: Run Migration 016 (Update Function)

This migration updates the database function to auto-create rooms for future chat splits.

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy the entire contents of: `supabase/migrations/016_chat_splits_create_rooms.sql`
3. Paste into SQL Editor
4. Click **Run**
5. You should see: `Success. No rows returned`

**What this does:**
- Updates `create_expense_from_split_request()` function
- Future split requests will automatically create/find rooms
- New expenses will have `room_id` set

### Step 2: Run Migration 017 (Fix Existing Data)

This migration fixes **existing** chat split expenses that were created before migration 016.

1. In **Supabase SQL Editor**
2. Copy the entire contents of: `supabase/migrations/017_backfill_chat_split_rooms.sql`
3. Paste into SQL Editor
4. Click **Run**
5. You should see notices like:
   ```
   NOTICE: Created new room <uuid> for expense <uuid>
   NOTICE: Linked expense <uuid> to room <uuid>
   ```

**What this does:**
- Finds all expenses created from chat splits
- Creates rooms for them (or finds existing rooms)
- Links expenses to rooms
- Now they appear in the Rooms tab

### Step 3: Verify in the App

1. **Restart your app** (expo restart or refresh)
2. Go to **Expenses** screen
3. Check **Rooms tab** - you should now see:
   - "Expenses with [Other User]" rooms
   - One room per conversation partner
4. Tap a room to see all expenses from that chat
5. Check **All tab** - you should see all expenses listed

## Testing the Fix

### Test 1: Existing Splits Show Up
1. Go to Expenses → Rooms tab
2. **Expected:** See rooms for each person you've split with
3. Tap a room
4. **Expected:** See all accepted splits from chat with that person

### Test 2: New Splits Auto-Create Rooms
1. Create a NEW split in chat with someone
2. Have them accept it
3. Go to Expenses → Rooms tab
4. **Expected:** Room appears immediately (or uses existing room)

### Test 3: Multiple Splits Same Room
1. Create 2-3 splits with the same person
2. Have them accept all
3. Go to Expenses → Rooms
4. **Expected:** All splits appear in the SAME room, not separate rooms

## Verification Queries

You can run these in Supabase SQL Editor to verify:

### Check if all chat split expenses have rooms:
```sql
SELECT
  COUNT(*) as total_chat_splits,
  COUNT(room_id) as splits_with_rooms,
  COUNT(*) - COUNT(room_id) as splits_without_rooms
FROM expenses
WHERE split_request_id IS NOT NULL;
```

**Expected:** `splits_without_rooms` should be **0**

### See all rooms created from chat:
```sql
SELECT
  er.name,
  er.description,
  COUNT(e.id) as expense_count
FROM expense_rooms er
LEFT JOIN expenses e ON e.room_id = er.id
WHERE er.description = 'Shared expenses from chat'
GROUP BY er.id, er.name, er.description
ORDER BY er.created_at DESC;
```

**Expected:** See all your chat-based rooms with expense counts

## Troubleshooting

### Issue: Migration 016 fails with "function already exists"
**Solution:** This is okay! It means the function was already updated. Just run migration 017.

### Issue: Migration 017 shows "0 expenses processed"
**Reason:** You have no chat splits yet, or they already have rooms.
**Check:** Create a new split in chat and accept it to test.

### Issue: Rooms still not showing in app
**Solutions:**
1. Pull down to **refresh** the Expenses screen
2. **Restart the app** (expo restart)
3. Check Supabase RLS policies (ensure you're authenticated)

### Issue: Multiple rooms created for same two users
**Reason:** Might have created manual rooms before.
**Solution:** This is normal. Chat splits will use the first 2-person room found.

## Summary of Changes Made

### Database (Migrations)
✅ **Migration 016** - Updated `create_expense_from_split_request()` to create rooms
✅ **Migration 017** - Backfilled existing expenses with room links

### App Code (Already Done)
✅ Settle up button now shows for **creator** (who sent the split)
✅ Settle up marks the **other person's** split as paid (the one who owes)
✅ Expense screen navigates to room details when room is tapped
✅ Room details screen shows balance and all expenses

## What Happens Now

### When You Create a Split in Chat:
1. User A creates split "Pizza - $20"
2. User B accepts
3. **Database automatically:**
   - Finds existing room between A & B (or creates one)
   - Creates expense linked to that room
   - Creates splits for both users
4. **Both users see:**
   - Expense in "All" tab
   - Room in "Rooms" tab
   - Can settle up from chat or expense screen

### When You Settle Up:
1. Creator (User A) sees "💰 Settle Up" button
2. Clicks it when User B pays them
3. **Database marks:** User B's split as paid
4. **Both users see:** "✅ Settled" badge everywhere

---

**After running both migrations, all your chat splits will appear in the Expense screen!** 🎉
