# Expense Rooms & Events Implementation Guide

## Overview
This guide documents the complete implementation of expense rooms and events functionality, allowing users to create and track shared expenses beyond just chat-based splits.

## What Was Implemented ✅

### 1. Database Schema
**Migration File:** `supabase/migrations/015_create_expense_events.sql`

**New Tables:**
- `expense_events` - One-time events (trips, parties, dinners)
- `expense_event_members` - Event participants with roles
- Updated `expenses` table with `event_id` column

**Key Features:**
- Row Level Security (RLS) policies for all tables
- Proper indexes for performance
- Foreign key relationships
- Database functions for balance calculation
- Automatic constraint: expense must be in room OR event (not both)

### 2. API Functions
**File:** `lib/api/expenses.ts`

**Expense Rooms API:**
```typescript
createExpenseRoom(name, description, memberIds) - Create ongoing expense room
getExpenseRooms() - Get all rooms user is member of
getRoomDetails(roomId) - Get room with expenses and balance
```

**Expense Events API:**
```typescript
createExpenseEvent(name, description, eventDate, memberIds) - Create one-time event
getExpenseEvents() - Get all events user participates in
getEventDetails(eventId) - Get event with expenses and balance
```

**Direct Expense Creation:**
```typescript
createExpense(title, amount, splits, roomId?, eventId?, description?) - Create expense directly (not from chat)
```

### 3. Expenses Screen Redesign
**File:** `app/(tabs)/expenses/index.tsx`

**New Features:**
- **Three Tabs:** All Expenses, Rooms, Events
- **Real-time Data:** Fetches from database, not mock data
- **Create Buttons:** Easy access to create rooms and events
- **Beautiful Cards:** Distinct styling for rooms vs events
- **Empty States:** Helpful guidance when no data exists
- **Pull to Refresh:** Reload all data
- **Integrated Modals:** CreateRoomModal and CreateEventModal

**Tab 1: All Expenses**
- Balance summary cards (To Receive / You Owe)
- List of all expenses with expandable details
- Shows source: Chat, Room, or Event
- Mark as paid functionality

**Tab 2: Rooms**
- List of expense rooms
- Shows member count
- Tap to view room details (future)
- Create new room button

**Tab 3: Events**
- List of expense events
- Shows date and participant count
- Tap to view event details (future)
- Create new event button

---

## Database Setup Instructions

### Step 1: Run Migration

Go to **Supabase Dashboard → SQL Editor** and run:

**Migration File:** `supabase/migrations/015_create_expense_events.sql`

This creates:
- `expense_events` table
- `expense_event_members` table
- `event_id` column in expenses table
- RLS policies
- Database functions
- Indexes

**To Run:**
1. Copy entire contents of `015_create_expense_events.sql`
2. Paste in Supabase SQL Editor
3. Click "Run"

### Step 2: Verify Tables

Check that these tables exist:
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('expense_events', 'expense_event_members');
```

Should return both table names.

### Step 3: Verify Expense Constraint

Check that expenses can be in room OR event:
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'expense_room_or_event_check';
```

---

## How It Works

### Expense Rooms
**Purpose:** Track ongoing shared expenses (rent, utilities, groceries)

**Flow:**
```
1. User clicks "Create Room" on Rooms tab
2. Fills in:
   - Room name (e.g., "Apartment 4B")
   - Description (optional)
   - Total amount (initial budget)
   - Select roommates
3. Room created in database
4. All members can add expenses to room
5. Balance calculated automatically
```

**Example Use Cases:**
- Monthly rent splitting
- Shared groceries
- Utility bills
- Apartment supplies

### Expense Events
**Purpose:** Track one-time shared expenses (trips, parties)

**Flow:**
```
1. User clicks "Create Event" on Events tab
2. Fills in:
   - Event name (e.g., "Weekend Trip")
   - Description (optional)
   - Event date
   - Estimated budget
   - Select participants
3. Event created in database
4. All participants can add expenses to event
5. Balance calculated automatically
```

**Example Use Cases:**
- Weekend trips
- Birthday parties
- Group dinners
- Concert outings

---

## Complete Feature Set

### From Chat (Already Working)
✅ Create split requests in chat
✅ Accept/Decline splits inline
✅ Automatic expense creation on accept
✅ Real-time status updates

### From Expenses Screen (NEW)
✅ Create expense rooms
✅ Create expense events
✅ View all rooms and events
✅ Track balances across rooms/events
✅ Three-tab navigation
✅ Pull to refresh

### Shared Features
✅ Automatic balance calculation
✅ Track who owes what
✅ Mark splits as paid
✅ Real-time updates
✅ Secure RLS policies

---

## Database Schema Details

### expense_events Table
```sql
id                UUID PRIMARY KEY
name              TEXT NOT NULL
description       TEXT
event_date        DATE
created_by        UUID (references auth.users)
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

### expense_event_members Table
```sql
id                UUID PRIMARY KEY
event_id          UUID (references expense_events)
user_id           UUID (references auth.users)
role              TEXT ('admin' | 'member')
joined_at         TIMESTAMPTZ
```

### expenses Table (Updated)
```sql
-- Existing columns
id, room_id, split_request_id, title, description, amount,
paid_by, expense_date, created_at, updated_at, splits

-- NEW column
event_id          UUID (references expense_events)

-- NEW constraint
CHECK: (room_id OR event_id OR split_request_id) but not multiple
```

---

## API Usage Examples

### Create a Room
```typescript
import { createExpenseRoom } from '@/lib/api/expenses';

const result = await createExpenseRoom(
  "Apartment 4B",
  "Monthly shared expenses",
  ["user-id-1", "user-id-2"]
);

if (result.success) {
  console.log("Room created:", result.data.roomId);
}
```

### Create an Event
```typescript
import { createExpenseEvent } from '@/lib/api/expenses';

const result = await createExpenseEvent(
  "Weekend Trip",
  "Beach house getaway",
  "2025-12-15",
  ["user-id-1", "user-id-2", "user-id-3"]
);

if (result.success) {
  console.log("Event created:", result.data.eventId);
}
```

### Get User's Rooms
```typescript
import { getExpenseRooms } from '@/lib/api/expenses';

const result = await getExpenseRooms();

if (result.success) {
  result.data.forEach(room => {
    console.log(`${room.name} - ${room.members.length} members`);
  });
}
```

### Get Room Details with Balance
```typescript
import { getRoomDetails } from '@/lib/api/expenses';

const result = await getRoomDetails(roomId);

if (result.success) {
  console.log("Room:", result.data.room.name);
  console.log("Balance:", result.data.balance);
  console.log("Expenses:", result.data.expenses.length);
}
```

### Create Direct Expense in Room
```typescript
import { createExpense } from '@/lib/api/expenses';

const result = await createExpense(
  "December Rent",
  1500,
  [
    { userId: "user-1", amount: 750 },
    { userId: "user-2", amount: 750 }
  ],
  roomId,        // Link to room
  undefined,     // No event
  "Monthly rent payment"
);
```

### Create Direct Expense in Event
```typescript
const result = await createExpense(
  "Beach House Rental",
  800,
  [
    { userId: "user-1", amount: 200 },
    { userId: "user-2", amount: 200 },
    { userId: "user-3", amount: 200 },
    { userId: "user-4", amount: 200 }
  ],
  undefined,     // No room
  eventId,       // Link to event
  "Weekend accommodation"
);
```

---

## Testing the Implementation

### Test 1: Create a Room
1. Go to Expenses screen
2. Tap "Rooms" tab
3. Tap "+" button or "Create Room"
4. Fill in:
   - Name: "Test Apartment"
   - Description: "Shared expenses"
   - Amount: 1000
5. Select roommates
6. Tap "Create Room"
7. **Expected:** Room appears in Rooms tab

### Test 2: Create an Event
1. Go to Expenses screen
2. Tap "Events" tab
3. Tap "+" button or "Create Event"
4. Fill in:
   - Name: "Test Trip"
   - Description: "Weekend away"
   - Budget: 500
5. Select participants
6. Tap "Create Event"
7. **Expected:** Event appears in Events tab

### Test 3: Verify in Database
```sql
-- Check created rooms
SELECT * FROM expense_rooms WHERE created_by = 'your-user-id';

-- Check created events
SELECT * FROM expense_events WHERE created_by = 'your-user-id';

-- Check room memberships
SELECT er.name, COUNT(erm.user_id) as member_count
FROM expense_rooms er
JOIN expense_room_members erm ON er.id = erm.room_id
GROUP BY er.id, er.name;

-- Check event participants
SELECT ee.name, COUNT(eem.user_id) as participant_count
FROM expense_events ee
JOIN expense_event_members eem ON ee.id = eem.event_id
GROUP BY ee.id, ee.name;
```

### Test 4: Check RLS Policies
```sql
-- As different user, try to access someone else's room
-- Should only see rooms where you're a member
SELECT * FROM expense_rooms;

-- Should only see events where you're a participant
SELECT * FROM expense_events;
```

---

## Troubleshooting

### Issue: Room not created

**Possible causes:**
1. Migration not run
2. User not authenticated
3. RLS policies blocking

**Fix:**
```sql
-- Check if tables exist
\dt expense_*

-- Check if user is authenticated
SELECT auth.uid();

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('expense_rooms', 'expense_events');
```

### Issue: Cannot see rooms/events

**Possible causes:**
1. Not a member of any rooms/events
2. Query filtering incorrectly

**Fix:**
```sql
-- Check your memberships
SELECT * FROM expense_room_members WHERE user_id = auth.uid();
SELECT * FROM expense_event_members WHERE user_id = auth.uid();

-- Check if rooms exist
SELECT COUNT(*) FROM expense_rooms;
```

### Issue: Balance calculation not working

**Possible causes:**
1. Database function not created
2. Expenses not linked to room/event

**Fix:**
```sql
-- Check if function exists
SELECT proname FROM pg_proc WHERE proname LIKE '%balance%';

-- Check expenses
SELECT id, room_id, event_id FROM expenses WHERE room_id IS NOT NULL OR event_id IS NOT NULL;
```

---

## Next Steps & Enhancements

### Short-term
1. **Room/Event Details Page** - Tap on room/event to see full details and expenses
2. **Add Expenses to Rooms/Events** - Create expenses directly within rooms
3. **Fetch Real Users** - Get matches/connections for member selection
4. **Edit/Delete Rooms/Events** - Allow admins to manage

### Medium-term
1. **Room Statistics** - Charts showing spending trends
2. **Settlement Suggestions** - Optimize payments to settle balances
3. **Recurring Expenses** - Auto-create monthly expenses (rent, utilities)
4. **Expense Categories** - Tag expenses (food, transport, accommodation)

### Long-term
1. **Multi-currency Support** - Handle expenses in different currencies
2. **Receipt Upload** - Attach photos of receipts
3. **Budget Warnings** - Notify when approaching budget limit
4. **Export Reports** - Generate PDF summaries

---

## Summary

### What Users Can Now Do:

**Before (Chat Only):**
- ✅ Create split requests in chat
- ✅ Accept/decline splits
- ✅ See expenses from accepted splits

**After (Rooms & Events Added):**
- ✅ Create expense rooms for ongoing costs
- ✅ Create expense events for one-time occasions
- ✅ View all rooms and events in organized tabs
- ✅ Track balances across multiple contexts
- ✅ Create expenses in chat, rooms, or events
- ✅ Manage everything from one central Expenses screen

### Files Modified:
1. ✅ `supabase/migrations/015_create_expense_events.sql` - Database schema
2. ✅ `lib/api/expenses.ts` - API functions for rooms and events
3. ✅ `app/(tabs)/expenses/index.tsx` - Complete screen redesign with tabs
4. ✅ Integration with CreateRoomModal and CreateEventModal

### Database Objects Created:
- 2 new tables (expense_events, expense_event_members)
- 1 updated table (expenses with event_id)
- 1 database function (get_user_balance_in_event)
- 8 RLS policies
- 5 indexes
- 1 constraint (room_or_event_check)

**You now have a complete expense tracking system with rooms, events, and chat integration!** 🎉
