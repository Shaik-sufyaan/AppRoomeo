# Chat Splits Auto-Create Rooms - Implementation Guide

## Overview
Chat-based split requests now automatically create or find expense rooms, making all expenses trackable in the Rooms tab of the Expenses screen.

## What Changed ✅

### 1. Database Function Update
**File:** `supabase/migrations/016_chat_splits_create_rooms.sql`

**Old Behavior:**
- Split request accepted → Expense created with only `split_request_id`
- Expense NOT linked to any room
- Only appeared in "All Expenses" tab

**New Behavior:**
- Split request accepted → Finds or creates expense room
- Expense linked to room via `room_id`
- Appears in both "All Expenses" AND "Rooms" tabs

**How It Works:**
1. When split is accepted, function gets conversation details
2. Checks if room already exists between these 2 users
3. If room exists → Use it
4. If room doesn't exist → Create new room with name like "Expenses with [Other User]"
5. Add both users as room members
6. Create expense and link to room
7. Create expense splits

### 2. Room Details Screen
**File:** `app/(tabs)/expenses/room/[roomId].tsx`

**Features:**
- Shows room name, description, members
- Displays your balance in this room (positive = owed to you, negative = you owe)
- Lists all expenses in the room
- Expandable expense details with split breakdown
- Mark as paid functionality
- Pull to refresh

### 3. Expenses Screen Navigation
**File:** `app/(tabs)/expenses/index.tsx`

**Updated:**
- Room cards are now tappable
- Navigate to `/expenses/room/[roomId]` when tapped
- Shows ChevronRight icon to indicate it's tappable

---

## Complete Flow

### User A creates split with User B:

```
1. User A in chat with User B
         ↓
2. User A creates split: "Pizza - $20"
         ↓
3. User B receives split request
         ↓
4. User B clicks "Accept"
         ↓
5. DATABASE TRIGGER FIRES
         ↓
6. Function checks: Does room exist between A & B?
         ↓
   NO → Create room "Expenses with User B"
        Add User A and User B as members
         ↓
   YES → Use existing room
         ↓
7. Create expense linked to room
         ↓
8. Create expense splits
         ↓
9. BOTH users see:
   - Expense in "All" tab
   - Room in "Rooms" tab
   - Can tap room to see details
```

---

## Setup Instructions

### Step 1: Run Migration

Go to **Supabase Dashboard → SQL Editor** and run:

**Migration File:** `supabase/migrations/016_chat_splits_create_rooms.sql`

This migration:
- Drops old `create_expense_from_split_request` function
- Creates new version with room creation logic
- Handles finding existing rooms
- Auto-creates rooms when needed

**To Run:**
1. Copy entire contents of `016_chat_splits_create_rooms.sql`
2. Paste in Supabase SQL Editor
3. Click "Run"

### Step 2: Verify Function Updated

```sql
-- Check function exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'create_expense_from_split_request';
```

Should show the updated function with room creation logic.

### Step 3: Test the Flow

1. **Create Split in Chat:**
   - User A opens chat with User B
   - User A creates split request: "Dinner - $50"
   - User B accepts

2. **Check Rooms Tab:**
   - Both users go to Expenses screen
   - Tap "Rooms" tab
   - Should see: "Expenses with [Other User]"

3. **Tap Room:**
   - Opens room details screen
   - Shows balance
   - Shows "Dinner - $50" expense
   - Can expand to see split breakdown

4. **Settle Up:**
   - User B (who owes) taps "Mark Paid"
   - Status changes to ✅ Paid
   - Balance updates

---

## Room Naming Logic

**Format:** `"Expenses with [Other User Name]"`

**Examples:**
- If John creates split with Sarah → Room named "Expenses with Sarah" (from John's view)
- If Sarah creates split with John → Room named "Expenses with John" (from Sarah's view)
- Same room used for all future splits between these 2 users

**Room Properties:**
- Description: "Shared expenses from chat"
- Creator: Person who created first split
- Members: Both users (creator is admin, other is member)
- Type: 2-person room (chat-based)

---

## Database Schema Changes

### expense_rooms (No changes needed - already exists)
```sql
id                UUID PRIMARY KEY
name              TEXT
description       TEXT
created_by        UUID
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

### expense_room_members (No changes needed - already exists)
```sql
id                UUID PRIMARY KEY
room_id           UUID
user_id           UUID
role              TEXT ('admin' | 'member')
joined_at         TIMESTAMPTZ
```

### expenses (No changes - uses existing columns)
```sql
room_id           UUID  ← Now populated for chat splits!
split_request_id  UUID  ← Still tracked
```

---

## Room Details Screen Features

### Balance Display
- **Positive balance** (green): Others owe you
- **Zero balance** (green): All settled up
- **Negative balance** (red): You owe others

**Calculation:**
```
Balance = (What you paid) - (What you owe)
```

### Expense List
- Shows all expenses in the room
- Most recent first
- 💬 Chat icon for expenses from split requests
- 💵 Dollar icon for manually created expenses

### Split Breakdown
- Tap any expense to expand
- See who paid and who owes
- Payment status badges:
  - ✅ **Paid** (green)
  - ⏰ **Waiting** (gray)
- "Mark Paid" button for your unpaid splits

---

## Testing Scenarios

### Test 1: First Split Between Users
1. User A and User B have never split before
2. User A creates split for $30
3. User B accepts
4. **Expected:**
   - New room created: "Expenses with User B"
   - Expense appears in room
   - Both users see room in Rooms tab

### Test 2: Second Split Between Same Users
1. User A and User B already have a room
2. User A creates another split for $20
3. User B accepts
4. **Expected:**
   - Uses existing room (no new room created)
   - New expense added to same room
   - Room shows 2 expenses total

### Test 3: Room Details Navigation
1. Go to Expenses → Rooms tab
2. Tap on a room
3. **Expected:**
   - Opens room details screen
   - Shows room name and member count
   - Shows balance
   - Lists all expenses

### Test 4: Balance Calculation
**Scenario:** User A paid $50, User B owes $25

- **User A's view:**
  - Balance: +$25 (green)
  - "You are owed this amount"

- **User B's view:**
  - Balance: -$25 (red)
  - "You owe this amount"

### Test 5: Multiple Rooms
1. User A splits with User B → Room "Expenses with User B"
2. User A splits with User C → Room "Expenses with User C"
3. **Expected:**
   - User A sees 2 different rooms
   - Each room has its own expenses
   - Balances calculated separately

---

## Verification Queries

### Check if rooms are created
```sql
SELECT
  er.name,
  er.description,
  er.created_by,
  COUNT(e.id) as expense_count
FROM expense_rooms er
LEFT JOIN expenses e ON e.room_id = er.id
WHERE er.description = 'Shared expenses from chat'
GROUP BY er.id, er.name, er.description, er.created_by;
```

### Check room memberships
```sql
SELECT
  er.name as room_name,
  p.name as member_name,
  erm.role
FROM expense_rooms er
JOIN expense_room_members erm ON erm.room_id = er.id
JOIN profiles p ON p.id = erm.user_id
WHERE er.description = 'Shared expenses from chat'
ORDER BY er.created_at DESC;
```

### Check expenses linked to rooms
```sql
SELECT
  er.name as room_name,
  e.title as expense_title,
  e.amount,
  sr.item_name as from_split_request
FROM expenses e
JOIN expense_rooms er ON er.id = e.room_id
LEFT JOIN split_requests sr ON sr.id = e.split_request_id
WHERE e.room_id IS NOT NULL
ORDER BY e.created_at DESC;
```

---

## Troubleshooting

### Issue: Room not created

**Possible causes:**
1. Migration not run
2. Function not updated
3. Split not accepted

**Fix:**
```sql
-- Check if function has room creation logic
SELECT prosrc FROM pg_proc WHERE proname = 'create_expense_from_split_request';

-- Should contain:
-- - expense_rooms INSERT
-- - expense_room_members INSERT
-- - room_id in expenses INSERT
```

### Issue: Expense not appearing in room

**Possible causes:**
1. Expense has no room_id
2. User not member of room
3. RLS policy blocking

**Fix:**
```sql
-- Check expense
SELECT id, title, room_id, split_request_id
FROM expenses
WHERE split_request_id IS NOT NULL;

-- Check room membership
SELECT * FROM expense_room_members WHERE user_id = 'your-user-id';
```

### Issue: Can't navigate to room details

**Possible causes:**
1. Router not configured
2. File path incorrect

**Fix:**
- Ensure file exists at: `app/(tabs)/expenses/room/[roomId].tsx`
- Check Expo Router is recognizing the route

---

## Summary

### What Users See Now:

**Before:**
- ✅ Create split in chat
- ✅ Accept/decline
- ✅ See in "All Expenses" tab
- ❌ No room organization
- ❌ No grouped view

**After:**
- ✅ Create split in chat
- ✅ Accept/decline
- ✅ See in "All Expenses" tab
- ✅ **Auto-creates room** between users
- ✅ **Room appears in "Rooms" tab**
- ✅ **Tap room to see all expenses**
- ✅ **Track balance per room**
- ✅ **Organize by conversation**

### Files Created/Modified:

1. ✅ `supabase/migrations/016_chat_splits_create_rooms.sql` - Database function
2. ✅ `app/(tabs)/expenses/room/[roomId].tsx` - Room details screen (NEW)
3. ✅ `app/(tabs)/expenses/index.tsx` - Added room navigation

### Benefits:

- 📊 **Better Organization:** All expenses with a person in one room
- 💰 **Balance Tracking:** See how much you owe/are owed per person
- 🔍 **Easy Access:** Tap room to see all shared expenses
- 🤝 **Relationship-Based:** Rooms created per conversation, not per split
- ♻️ **Reusable:** Same room for all future splits with that person

**You're ready to use the complete chat-to-rooms integration!** 🎉

Run the migration, create a split in chat, and watch it automatically appear in the Rooms tab!
