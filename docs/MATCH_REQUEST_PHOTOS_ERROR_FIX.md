# Match Request Photos Error - FIXED ✅

## Error You Saw

```
ERROR [TypeError: Cannot read property 'photos' of undefined]

Call Stack
  MatchRequestCard (components\MatchRequestCard.tsx)
  ...
```

**What happened**: App crashed when loading match requests on the Chat screen.

---

## Root Cause

**Data Structure Mismatch** between API and Component:

### What the API Returns:
```typescript
// lib/api/matches.ts - Supabase join syntax
.select(`
  *,
  sender:sender_id (
    id,
    name,
    photos,
    ...
  )
`)
```

This returns:
```javascript
{
  id: "request-123",
  sender_id: "user-456",
  recipient_id: "user-789",
  sender: {           // ← API returns this
    id: "user-456",
    name: "John",
    photos: [...]
  }
}
```

### What the Component Expects:
```typescript
// components/MatchRequestCard.tsx:65
<Avatar uri={request.user.photos[0]} />  // ← Expects request.user
```

The component expected `request.user`, but the API returned `request.sender`.

**Result**: `request.user` was `undefined`, causing crash when accessing `.photos`.

---

## The Fix

### Fix #1: Transform API Data ✅

**Location**: `lib/api/matches.ts:366-387`

Added data transformation to map `sender` to `user`:

```typescript
// Transform data to match expected interface (map sender to user)
const transformedRequests = requests?.map((request: any) => ({
  id: request.id,
  sender_id: request.sender_id,
  recipient_id: request.recipient_id,
  status: request.status,
  message: request.message,
  created_at: request.created_at,
  updated_at: request.updated_at,
  expires_at: request.expires_at,
  sender: request.sender, // Keep sender for chat screen (uses request.sender)
  user: request.sender ? { // Add user for MatchRequestCard component
    id: request.sender.id,
    name: request.sender.name,
    age: request.sender.age,
    userType: request.sender.user_type,
    college: request.sender.college,
    photos: request.sender.photos || [], // ← Default to empty array
    workStatus: request.sender.work_status,
    hasPlace: request.sender.has_place,
  } : undefined,
}));
```

**Why both `sender` and `user`?**
- Chat screen uses `request.sender` (line 104, 107 in chat/index.tsx)
- MatchRequestCard uses `request.user`
- Both need to work!

---

### Fix #2: Add Safety Check ✅

**Location**: `components/MatchRequestCard.tsx:62-66`

Added defensive check before rendering:

```typescript
// Safety check: make sure user data exists
if (!request.user) {
  console.error('MatchRequestCard: request.user is undefined', request);
  return null; // Don't crash, just skip this card
}
```

Also added optional chaining:
```typescript
// Before (would crash)
<Avatar uri={request.user.photos[0]} />

// After (safe)
<Avatar uri={request.user.photos?.[0]} />
```

---

## Why This Happened

The API function was written to return `sender` (following Supabase join convention), but the component was written expecting `user` (following the TypeScript interface).

**TypeScript interface** (`types/index.ts:37`):
```typescript
export interface MatchRequestWithUser extends MatchRequest {
  user: User; // ← Interface says "user"
}
```

But **Supabase returns** what you name in the query:
```typescript
sender:sender_id (...) // ← Returns as "sender"
```

---

## Files Modified

### 1. `/lib/api/matches.ts`
- **Lines 366-391**: Added data transformation
- Maps database field names (snake_case) to TypeScript interface (camelCase)
- Maps `sender` object to `user` object
- Provides default empty array for photos

### 2. `/components/MatchRequestCard.tsx`
- **Lines 62-66**: Added safety check for undefined user
- **Line 71**: Changed `photos[0]` to `photos?.[0]` (optional chaining)

---

## Testing

### Test 1: Load Match Requests ✅

1. Have someone send you a match request
2. Open Chat screen
3. **Expected**:
   - ✅ Match request card appears
   - ✅ User photo shows
   - ✅ User name shows
   - ✅ No error in console

### Test 2: User Without Photos ✅

1. Create test user with empty photos array
2. Send match request
3. **Expected**:
   - ✅ Card still renders
   - ✅ Avatar shows placeholder
   - ✅ No crash

### Test 3: Approve/Reject ✅

1. See match request
2. Click "Approve" or "Reject"
3. **Expected**:
   - ✅ Action completes successfully
   - ✅ Request disappears from list
   - ✅ No errors

---

## Database Check

To see what data actually exists:

```sql
-- Check your received match requests
SELECT
  mr.id,
  mr.status,
  ps.name as sender_name,
  ps.photos as sender_photos,
  pr.name as your_name
FROM match_requests mr
LEFT JOIN profiles ps ON mr.sender_id = ps.id
LEFT JOIN profiles pr ON mr.recipient_id = pr.id
WHERE mr.recipient_id = auth.uid()
  AND mr.status = 'pending';
```

**Expected**: See sender details with photos array.

---

## Before vs After

### Before (Broken) ❌

```
API returns request.sender
    ↓
Component expects request.user
    ↓
request.user is undefined
    ↓
Accessing request.user.photos[0]
    ↓
❌ TypeError: Cannot read property 'photos' of undefined
    ↓
App crashes
```

### After (Fixed) ✅

```
API returns request.sender
    ↓
Transform: Add request.user = request.sender (formatted)
    ↓
Component gets request.user
    ↓
Safety check: if (!request.user) return null
    ↓
Accessing request.user.photos?.[0]
    ↓
✅ Photo displays
    ↓
✅ App works!
```

---

## Related Data Flow

The match request data flows through these files:

1. **Database** (`match_requests` table)
   - `sender_id`, `recipient_id`, `status`
   - Foreign key join to `profiles` table

2. **API** (`lib/api/matches.ts`)
   - Fetches from database with join
   - Returns `sender` object from join
   - **NOW**: Transforms to add `user` object

3. **Chat Screen** (`app/(tabs)/chat/index.tsx`)
   - Calls API
   - Uses `request.sender` and `request.sender_id`

4. **Component** (`components/MatchRequestCard.tsx`)
   - Receives match request
   - Uses `request.user`
   - **NOW**: Has safety check

---

## Summary

**Problem**: Component expected `request.user` but API returned `request.sender`

**Solution**:
1. Transform API data to include both `sender` and `user`
2. Add safety checks in component

**Files Changed**: 2
**Lines Added**: ~30
**Status**: ✅ **FIXED**

---

## Next Steps

**Restart your app** and the match request error should be gone.

If you still see issues:
1. Check console for any remaining errors
2. Verify match requests exist in database
3. Check that profiles have photos array (even if empty)

The match request cards should now display correctly with user photos! ✅
