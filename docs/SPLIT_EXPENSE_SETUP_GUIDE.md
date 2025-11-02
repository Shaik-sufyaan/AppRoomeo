# Split & Expense Integration Setup Guide

## Overview
This guide explains how to set up the complete split request and expense tracking system that integrates chat with expenses.

## Features Implemented ✅

### 1. Chat Integration
- ✅ Create split requests directly in chat
- ✅ Display beautiful payment cards for split requests
- ✅ Accept/Decline splits inline
- ✅ Real-time split status updates

### 2. Expense Tracking
- ✅ Automatic expense creation when splits are accepted
- ✅ Track who owes what
- ✅ Expense history and balances
- ✅ Settlement tracking

### 3. Database Schema
- ✅ Split requests and split details tables
- ✅ Expenses, expense splits, and settlements tables
- ✅ Automatic triggers to create expenses from accepted splits
- ✅ RLS policies for security

---

## Database Setup

### Step 1: Run Migrations in Supabase

You need to run **THREE** migration files in your Supabase SQL editor **IN ORDER**:

#### Migration 1: Split Requests System
**File:** `supabase/migrations/010_create_split_requests.sql`

This creates:
- `split_requests` table - Main split request records
- `split_details` table - Individual user splits
- Functions: `create_split_request`, `accept_split_request`, `decline_split_request`
- RLS policies for security

**To Run:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire contents of `010_create_split_requests.sql`
3. Paste and click "Run"

#### Migration 2: Expenses System
**File:** `supabase/migrations/013_create_expenses_system.sql`

This creates:
- `expense_rooms` table - Group expense rooms
- `expense_room_members` table - Room membership
- `expenses` table - Individual expenses
- `expense_splits` table - Who owes what
- `settlements` table - Payment tracking
- Automatic trigger to create expenses when splits are accepted
- Functions: `create_expense_from_split_request`, `get_user_balance_in_room`
- RLS policies for all tables

**To Run:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire contents of `013_create_expenses_system.sql`
3. Paste and click "Run"

#### Migration 3: Add Message Type Column
**File:** `supabase/migrations/014_add_message_type_column.sql`

This adds the `type` column to the `messages` table to support split request messages.

**To Run:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire contents of `014_add_message_type_column.sql`
3. Paste and click "Run"

### Step 2: Verify Tables Created

After running migrations, verify these tables exist in Supabase:

**Split Tables:**
- ✅ `split_requests`
- ✅ `split_details`

**Expense Tables:**
- ✅ `expense_rooms`
- ✅ `expense_room_members`
- ✅ `expenses`
- ✅ `expense_splits`
- ✅ `settlements`

### Step 3: Verify Message Type Column

Check that the `messages` table now has a `type` column:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'messages' AND column_name = 'type';
```

You should see:
- **column_name:** type
- **data_type:** text
- **column_default:** 'text'

---

## How It Works

### Creating a Split Request in Chat

1. **User clicks "Request Split" button** in chat
2. **Modal opens** with:
   - Item name input
   - Emoji picker
   - Amount input
   - Participant selection (automatic for 1-on-1 chats)

3. **On submit:**
   - Creates a message with type `split_request`
   - Creates split request record in database
   - Creates split details for each participant
   - Message appears as PaymentCard in chat

### Accepting a Split

1. **Recipient sees PaymentCard** with:
   - Item emoji and name
   - Total amount
   - Split breakdown
   - Accept/Decline buttons

2. **On Accept:**
   - Split request status → `accepted`
   - **Automatic trigger fires** → Creates expense entry
   - Expense splits created for each participant
   - PaymentCard updates to show "Accepted" status
   - **Expense appears in Expenses screen**

3. **On Decline:**
   - Split request status → `declined`
   - PaymentCard updates to show "Declined" status
   - No expense is created

### Expense Flow

```
Chat Split Request
       ↓
   [Accept]
       ↓
Database Trigger Fires
       ↓
Expense Created
       ↓
Appears in Expenses Screen
```

---

## Database Schema Relationships

```
┌─────────────┐
│  messages   │
└──────┬──────┘
       │
       ↓ (message_id)
┌──────────────────┐
│ split_requests   │
└──────┬───────────┘
       │
       ├─→ split_details (split breakdown)
       │
       ↓ (split_request_id)
┌─────────────────┐
│    expenses     │
└──────┬──────────┘
       │
       └─→ expense_splits (who owes what)
```

---

## API Functions Available

### Split Request Functions
Located in: `lib/api/expenses.ts`

```typescript
// Create a split request
createSplitRequest(conversationId, splitRequest)

// Get split request details
getSplitRequest(splitRequestId)
getSplitRequestByMessageId(messageId)

// Accept/Decline
acceptSplitRequest(splitRequestId)
declineSplitRequest(splitRequestId)

// Real-time updates
subscribeToSplitRequestUpdates(messageId, callback)
```

### Expense Functions

```typescript
// Get user's expenses
getExpenses()

// Get expense by split request
getExpenseBySplitRequest(splitRequestId)

// Mark as paid
markSplitAsPaid(splitId)
```

---

## Testing the Integration

### Test 1: Create Split Request

1. Open a chat conversation
2. Click "Request split" button
3. Fill in:
   - Item: "Couch"
   - Emoji: 🛋️
   - Amount: 500
   - Split with: [Other user]
4. Click "Create Split Request"
5. **Expected:** PaymentCard appears in chat

### Test 2: Accept Split

1. Login as the recipient user
2. Open the chat
3. See the PaymentCard
4. Click "Accept"
5. **Expected:**
   - PaymentCard shows "Accepted"
   - Go to Expenses screen → See new expense

### Test 3: Decline Split

1. Create another split request
2. Login as recipient
3. Click "Decline"
4. **Expected:**
   - PaymentCard shows "Declined"
   - No expense created

### Test 4: Check Database

```sql
-- View split requests
SELECT * FROM split_requests;

-- View accepted splits with expenses
SELECT
  sr.item_name,
  sr.status,
  e.id as expense_id,
  e.amount
FROM split_requests sr
LEFT JOIN expenses e ON e.split_request_id = sr.id;

-- View expense splits
SELECT
  e.title,
  es.user_id,
  es.amount,
  es.paid
FROM expenses e
JOIN expense_splits es ON es.expense_id = e.id;
```

---

## Troubleshooting

### Issue: Split request not sending

**Possible causes:**
1. Migration not run → Run `010_create_split_requests.sql`
2. Messages table missing → Check messages table exists
3. RLS policies blocking → Check user is authenticated

**Fix:**
```sql
-- Check if split_requests table exists
SELECT * FROM split_requests LIMIT 1;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'split_requests';
```

### Issue: Expense not created on accept

**Possible causes:**
1. Expenses migration not run → Run `013_create_expenses_system.sql`
2. Trigger not firing → Check trigger exists

**Fix:**
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trigger_create_expense_on_split_accept';

-- Manually test trigger
UPDATE split_requests SET status = 'accepted' WHERE id = 'some-id';

-- Check if expense was created
SELECT * FROM expenses WHERE split_request_id = 'some-id';
```

### Issue: PaymentCard not showing

**Possible causes:**
1. Split request data not loading
2. Message type detection not working

**Fix:**
- Check browser console for errors
- Verify message text contains "💰 Split request:"
- Check `splitRequests` state in React DevTools

---

## Next Steps

### Optional Enhancements

1. **Expense Rooms:**
   - Create rooms for groups (apartment, roommates)
   - Track balances across rooms
   - Implement in `app/(tabs)/expenses/index.tsx`

2. **Payment Proof:**
   - Add image upload for payment receipts
   - Update `expense_splits.paid` when proof uploaded

3. **Notifications:**
   - Notify when split request received
   - Notify when split accepted/declined
   - Notify when payment marked as paid

4. **Analytics:**
   - Total spent per month
   - Most expensive categories
   - Balance trends

---

## Complete End-to-End Flow

### User Journey

```
1. User A opens chat with User B
         ↓
2. User A clicks "Request Split"
         ↓
3. User A fills modal:
   - Item: "Couch" 🛋️
   - Amount: $500
   - Split: User A ($250), User B ($250)
         ↓
4. User A clicks "Create Split Request"
         ↓
5. PaymentCard appears in chat for BOTH users
         ↓
6. User B sees notification
         ↓
7. User B opens chat, sees PaymentCard
         ↓
8. User B clicks "Accept"
         ↓
9. Database trigger fires automatically
         ↓
10. Expense created in expenses table
         ↓
11. PaymentCard shows "Accepted" status
         ↓
12. User A opens Expenses screen
         ↓
13. ✅ Sees "Couch - $500" expense
    - Shows "You paid"
    - Shows User B owes $250
    - Marked "From Chat"
         ↓
14. User B opens Expenses screen
         ↓
15. ✅ Sees "Couch - $500" expense
    - Shows "You owe $250"
    - Has "Mark Paid" button
         ↓
16. User B clicks "Mark Paid"
         ↓
17. Both users see expense marked as ✅ Paid
```

---

## Expenses Screen Features

### What You'll See

**1. Balance Summary (Top Cards)**
- **To Receive:** Total amount others owe you
- **You Owe:** Total amount you owe others

**2. Expense List**
- Shows all expenses (most recent first)
- Chat icon 💬 for expenses from chat splits
- Tap to expand and see split breakdown

**3. Expense Details (When Expanded)**
- Who paid
- How much each person owes
- Payment status (Paid ✅ / Waiting ⏰)
- "Mark Paid" button for your portion

**4. Empty State**
- Shows when no expenses exist
- "Go to Chat" button to create first split

---

## Summary

✅ **Database:** 2 migrations create 7 tables with triggers and RLS
✅ **API:** Complete CRUD operations for splits and expenses
✅ **Chat UI:** PaymentCard component with Accept/Decline
✅ **Expenses UI:** Real-time expense tracking and balances
✅ **Integration:** Splits automatically create expenses
✅ **Real-time:** Split status updates in chat
✅ **Payment Tracking:** Mark splits as paid

---

## The Complete Feature Flow

### Chat Side
1. ✅ Create split requests
2. ✅ View split requests as PaymentCards
3. ✅ Accept/Decline splits
4. ✅ Real-time status updates

### Database Side
1. ✅ Store split requests
2. ✅ Auto-create expenses on accept
3. ✅ Track payment status
4. ✅ Calculate balances

### Expenses Side
1. ✅ Display all expenses
2. ✅ Show expenses from chat
3. ✅ Calculate who owes what
4. ✅ Mark splits as paid
5. ✅ Real-time balance updates

**You're ready to use the complete split & expense system!** 🎉

Run the migrations, test in chat, and watch everything work together seamlessly.
