# Complementary User Type Matching - Summary

## Quick Overview

The matching system implements **smart complementary matching** to ensure users only see profiles that match their housing needs.

---

## The Rule

### Simple Version
**You only see people whose needs complement yours:**
- If you **need a place** → You see people **with a place**
- If you **have a place** → You see people **who need a place**

### Technical Version
```typescript
// Matching Logic
if (currentUser.userType === 'looking-for-place') {
  // Show only 'finding-roommate' users
  showProfiles.where('user_type', '=', 'finding-roommate')
}

if (currentUser.userType === 'finding-roommate') {
  // Show only 'looking-for-place' users
  showProfiles.where('user_type', '=', 'looking-for-place')
}
```

---

## Why This Matters

### Without Complementary Matching ❌
```
Sarah (has 2BR apartment, needs roommate)
    ↓ swipes right on
Emma (has studio, needs roommate)
    ↓
Both have places, neither needs one
    ↓
DEAD-END MATCH 💀
```

### With Complementary Matching ✅
```
Sarah (has 2BR apartment, needs roommate)
    ↓ swipes right on
Marcus (looking for a place)
    ↓
Sarah has room, Marcus needs room
    ↓
PERFECT MATCH! 🎉
```

---

## Implementation Locations

### 1. Database Function
**File:** `supabase/migrations/006_create_matching_system.sql`

The `get_match_feed()` function filters by user type:
```sql
WHERE (
  (current_user_type = 'looking-for-place' AND p.user_type = 'finding-roommate')
  OR
  (current_user_type = 'finding-roommate' AND p.user_type = 'looking-for-place')
)
```

### 2. API Validation
**File:** `lib/api/matches.ts`

The `sendMatchRequest()` function validates compatibility:
```typescript
const isCompatible = (
  (sender.user_type === 'looking-for-place' &&
   recipient.user_type === 'finding-roommate') ||
  (sender.user_type === 'finding-roommate' &&
   recipient.user_type === 'looking-for-place')
);

if (!isCompatible) {
  throw new Error('INCOMPATIBLE_USER_TYPES');
}
```

### 3. UI Indicator
**File:** `app/(tabs)/matches/index.tsx`

Shows smart filter message:
```
💡 Showing: People looking for a place
   (You have a place to share)
```

---

## User Experience

### For "looking-for-place" Users 🔍

**What you see:**
- Only profiles of people with available rooms
- Badge: "🏠 Has a place"
- Smart indicator: "Showing: People with a place to share"

**What you DON'T see:**
- Other people looking for a place
- Anyone without housing to offer

**Example feed:**
```
┌─────────────────────────────────┐
│ Sarah, 24                       │
│ 🏠 Has a 2BR apartment          │
│ Stanford • 2.5 miles away       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Alex, 25                        │
│ 🏠 Has a 3BR house              │
│ Stanford • 5.1 miles away       │
└─────────────────────────────────┘
```

---

### For "finding-roommate" Users 🏡

**What you see:**
- Only profiles of people looking for a place
- Badge: "🏠 Looking for a place"
- Smart indicator: "Showing: People looking for a place"

**What you DON'T see:**
- Other people with places to fill
- Anyone not looking for housing

**Example feed:**
```
┌─────────────────────────────────┐
│ Marcus, 26                      │
│ 🏠 Looking for a place          │
│ UC Berkeley • 3.8 miles away    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Emma, 22                        │
│ 🏠 Looking for a place          │
│ San Jose State • 1.2 miles away │
└─────────────────────────────────┘
```

---

## Edge Cases Handled

### 1. User Changes Type
**Scenario:** User changes from "finding-roommate" to "looking-for-place"

**Behavior:**
- Feed automatically updates to show new complementary profiles
- Existing match requests remain valid
- Existing matches are unaffected

### 2. API Manipulation
**Scenario:** User calls API directly to request incompatible user

**Behavior:**
- API validates user types
- Returns `INCOMPATIBLE_USER_TYPES` error
- Request is blocked
- No match request created

### 3. Feed Caching
**Scenario:** User's feed is cached, then they change profile type

**Behavior:**
- Cache is invalidated on user type change
- New feed is fetched with correct filters
- Old cached profiles are discarded

---

## Testing Checklist

### Unit Tests
- [ ] Test complementary matching logic in `get_match_feed()`
- [ ] Test API validation rejects incompatible types
- [ ] Test feed returns only correct user types

### Integration Tests
- [ ] Create "looking-for-place" user, verify feed shows only "finding-roommate"
- [ ] Create "finding-roommate" user, verify feed shows only "looking-for-place"
- [ ] Attempt to send request to incompatible type, verify error
- [ ] Change user type, verify feed updates

### UI Tests
- [ ] Verify smart indicator shows correct message
- [ ] Verify user type badges display correctly
- [ ] Verify profiles in feed match expected type
- [ ] Verify no incompatible profiles appear

---

## Benefits

### For Users 👥
1. **Less confusion** - Only see relevant matches
2. **Higher quality matches** - Everyone has complementary needs
3. **Better UX** - Clear expectations about each profile
4. **Faster results** - No wasted swipes on incompatible users

### For the App 📱
1. **Better engagement** - Users find matches faster
2. **Lower bounce rate** - Fewer frustrated users
3. **Clearer value prop** - Matching makes sense
4. **Data quality** - All matches are meaningful

### For Development 🛠️
1. **Simpler logic** - Clear rules, easy to maintain
2. **Better performance** - Smaller result sets
3. **Easier debugging** - Predictable behavior
4. **Scalable** - Can add more user types later

---

## Future Enhancements

### 1. Sub-Types
Add more granular matching:
```
looking-for-place:
  - looking-for-room (shared house)
  - looking-for-apartment (whole unit)

finding-roommate:
  - has-room (single room in house)
  - has-apartment (whole apartment to share)
```

### 2. Preference Toggle
Let users optionally see all types:
```
Settings:
☑ Only show complementary matches (recommended)
☐ Show all users
```

### 3. Compatibility Score
Calculate match percentage:
```
Sarah (finding-roommate) + Marcus (looking-for-place)
✓ Complementary types: +40%
✓ Similar age: +20%
✓ Same school: +30%
✓ Non-smoker: +10%
= 100% Match!
```

---

## Quick Reference

| User Type          | Sees User Type     | Icon | Description              |
|--------------------|--------------------|------|--------------------------|
| looking-for-place  | finding-roommate   | 🔍   | Needs housing            |
| finding-roommate   | looking-for-place  | 🏡   | Has place to share       |

**SQL Snippet:**
```sql
-- In WHERE clause of feed query
AND (
  (current_user_type = 'looking-for-place' AND p.user_type = 'finding-roommate')
  OR
  (current_user_type = 'finding-roommate' AND p.user_type = 'looking-for-place')
)
```

**TypeScript Helper:**
```typescript
function isCompatibleUserType(userA: UserType, userB: UserType): boolean {
  return (
    (userA === 'looking-for-place' && userB === 'finding-roommate') ||
    (userA === 'finding-roommate' && userB === 'looking-for-place')
  );
}
```

---

**Implementation Status:** ✅ Fully Specified
**Documentation:** ✅ Complete
**Ready for Development:** ✅ Yes

See `MATCH_REQUEST_FEATURE_SPEC.md` for full technical details.
