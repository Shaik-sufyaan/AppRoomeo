# Database Migration Instructions

## Quick Start (Recommended)

If you're setting up a fresh database, use the consolidated schema file:

```bash
# Run this single file in your Supabase SQL Editor
supabase/COMPLETE_EXPENSES_SCHEMA.sql
```

**⚠️ Prerequisites:** Make sure you have already run migrations 001-012 (profiles, auth, messages, split_requests).

---

## Incremental Migrations (If database already exists)

If you already have migrations 001-017 applied, run only the new ones:

### Step 1: Run Settlement Enhancement
```bash
# In Supabase SQL Editor
supabase/migrations/018_enhance_settlements_table.sql
```

This adds:
- Settlement payment methods (cash, zelle, venmo, paypal, bank_transfer, other)
- Payment proof image upload
- Approval workflow (pending, approved, rejected)
- Database functions: submit_settlement, approve_settlement, get_pending_settlements_for_user

### Step 2: Run Event-Room Linking
```bash
# In Supabase SQL Editor
supabase/migrations/019_add_event_id_to_rooms.sql
```

This adds:
- event_id column to expense_rooms table
- Foreign key constraint to expense_events
- Index for faster queries

---

## Verification

After running migrations, verify tables exist:

```sql
-- Check tables
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'expense%'
ORDER BY tablename;

-- Expected output:
-- expense_event_members
-- expense_events
-- expense_room_members
-- expense_rooms
-- expense_splits
-- expenses
-- settlements
```

Check settlement columns:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'settlements';

-- Should include:
-- payment_method (text)
-- proof_image (text)
-- status (text)
-- approved_at (timestamp with time zone)
-- approved_by (uuid)
```

Check expense_rooms has event_id:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'expense_rooms'
AND column_name = 'event_id';

-- Should return:
-- event_id | uuid
```

Check functions exist:
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%settlement%';

-- Should include:
-- submit_settlement
-- approve_settlement
-- get_pending_settlements_for_user
```

---

## Troubleshooting

### Error: "relation already exists"
This is normal if you're re-running migrations. The `CREATE TABLE IF NOT EXISTS` clauses will skip existing tables.

### Error: "column already exists"
Run this to safely add missing columns:
```sql
ALTER TABLE expense_rooms ADD COLUMN IF NOT EXISTS event_id UUID;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS proof_image TEXT;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
```

### Error: "function already exists"
Drop and recreate:
```sql
DROP FUNCTION IF EXISTS submit_settlement CASCADE;
DROP FUNCTION IF EXISTS approve_settlement CASCADE;
DROP FUNCTION IF EXISTS get_pending_settlements_for_user CASCADE;

-- Then re-run the migration
```

### RLS Policy Errors
Drop existing policies before creating:
```sql
DROP POLICY IF EXISTS "Users can view their settlements" ON settlements;
DROP POLICY IF EXISTS "Users can create settlements" ON settlements;
DROP POLICY IF EXISTS "Recipients can update settlements" ON settlements;

-- Then re-run the migration
```

---

## Testing After Migration

### 1. Create a test room
```sql
-- Replace YOUR_USER_ID with actual user ID from auth.users
INSERT INTO expense_rooms (name, description, created_by)
VALUES ('Test Room', 'Testing expense system', 'YOUR_USER_ID')
RETURNING id;

-- Save the returned room_id
```

### 2. Add yourself as admin
```sql
-- Use room_id from previous query
INSERT INTO expense_room_members (room_id, user_id, role)
VALUES ('ROOM_ID', 'YOUR_USER_ID', 'admin');
```

### 3. Test settlement function
```sql
-- Create a test settlement (will fail if validation works)
SELECT submit_settlement(
  'ROOM_ID',
  'ANOTHER_USER_ID',
  50.00,
  'zelle',
  null,
  'Test settlement'
);

-- Should return a settlement UUID
```

### 4. Check pending settlements
```sql
-- This will return settlements where you're the recipient
SELECT * FROM get_pending_settlements_for_user();
```

---

## What Each Migration Does

### 018_enhance_settlements_table.sql
- Adds payment workflow columns to settlements table
- Creates 3 database functions for settlement operations
- Adds indexes for faster pending settlement queries
- Updates RLS policies for settlement approval

### 019_add_event_id_to_rooms.sql
- Adds event_id column to expense_rooms
- Creates foreign key to expense_events
- Adds index for event-based room queries
- Enables creating rooms from events

---

## Need Help?

If you encounter any issues:

1. Check Supabase logs in the dashboard
2. Verify your user is authenticated
3. Check RLS policies are enabled
4. Ensure prerequisite tables exist (profiles, expense_events)

For detailed schema documentation, see:
- `COMPLETE_EXPENSES_SCHEMA.sql` - Complete schema with comments
- `FRONTEND_BACKEND_VERIFICATION.md` - Frontend-backend mapping
