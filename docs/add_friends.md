 📋 COMPREHENSIVE PLAN: Expense Friends System

  I've created a complete implementation plan for an Expense-Only Friend System that's completely separate from your roommate matching feature.

  ---
  🎯 PLAN OVERVIEW

  What It Does:

  - Users can add friends ONLY for splitting expenses
  - Completely separate from the roommate matching system
  - Send/accept/reject friend requests
  - Search users by name
  - Manage expense friends list
  - Only accessible from expense screens

  Key Difference:

  - Matches = Finding roommates (Tinder-style swiping on matches tab)
  - Expense Friends = People you split expenses with (separate friend list)

  ---
  📊 IMPLEMENTATION PHASES

  Phase 1: Database Schema ✅ Planned

  - 2 new tables: expense_friends & expense_friend_requests
  - 6 database functions for friend operations
  - Full RLS policies for security
  - Optimized indexes

  Phase 2: API Layer ✅ Planned

  - New file: lib/api/expenseFriends.ts
  - 10+ API functions:
    - sendExpenseFriendRequest()
    - acceptExpenseFriendRequest()
    - rejectExpenseFriendRequest()
    - getExpenseFriends()
    - searchUsersForExpenseFriends()
    - And more...

  Phase 3: UI Components ✅ Planned

  - 3 new modals:
    a. AddExpenseFriendModal - Search & send requests
    b. ExpenseFriendRequestsModal - Accept/reject requests
    c. ExpenseFriendsListModal - View & manage friends

  Phase 4: UI Integration ✅ Planned

  - Add friend management bar to expense screen
  - Badge showing pending request count
  - Replace matches with friends in room/event creation
  - Update empty state messages

  Phase 5: Update Create Modals ✅ Planned

  - Modify CreateRoomModal to use expense friends
  - Modify CreateEventModal to use expense friends
  - Update empty state text

  Phase 6: Database Migration ✅ Planned

  - Complete migration file: 020_create_expense_friends_system.sql

  ---
  🎨 UI MOCKUP

  ┌─────────────────────────────────┐
  │  Expenses                    🔔 │
  ├─────────────────────────────────┤
  │                                 │
  │  👥 Friends (5)    🔔(2)  ➕    │  ← NEW FRIEND BAR
  │                                 │
  ├─────────────────────────────────┤
  │  All  │  Rooms  │  Events       │
  ├─────────────────────────────────┤
  │  [Balance cards...]             │
  │  [Expenses list...]             │
  └─────────────────────────────────┘

  Friend Management Bar Shows:

  - Friends (5) - Click to see all friends
  - 🔔(2) - Pending requests badge
  - ➕ - Add new friend button

  ---
  📁 FILES TO CREATE

  New Files (6):

  1. ✅ supabase/migrations/020_create_expense_friends_system.sql
  2. ✅ lib/api/expenseFriends.ts
  3. ✅ components/AddExpenseFriendModal.tsx
  4. ✅ components/ExpenseFriendRequestsModal.tsx
  5. ✅ components/ExpenseFriendsListModal.tsx
  6. ✅ docs/EXPENSE_FRIENDS_IMPLEMENTATION.md

  Files to Modify (3):

  1. ✅ app/(tabs)/expenses/index.tsx - Add friend management UI
  2. ✅ components/CreateRoomModal.tsx - Update text
  3. ✅ components/CreateEventModal.tsx - Update text

  ---
  🔄 USER FLOW

  1. User opens Expenses tab
     ↓
  2. Sees friend management bar at top
     ↓
  3. Clicks "➕ Add Friend"
     ↓
  4. Searches for users: "John Smith"
     ↓
  5. Clicks "Add" button next to John
     ↓
  6. Friend request sent ✓
     ↓
  7. John sees notification badge (🔔1)
     ↓
  8. John clicks badge → sees request
     ↓
  9. John accepts request
     ↓
  10. Both are now expense friends!
     ↓
  11. Can add each other to rooms/events

  ---
  🔒 SECURITY FEATURES

  - ✅ Full Row Level Security (RLS) on all tables
  - ✅ Can't send requests to yourself
  - ✅ Can't send duplicate requests
  - ✅ Only recipient can accept/reject
  - ✅ Database functions prevent SQL injection
  - ✅ All operations authenticated

  ---
  ⚡ PERFORMANCE OPTIMIZATIONS

  - ✅ Indexes on all foreign keys
  - ✅ Efficient bidirectional friendship storage (user_a < user_b)
  - ✅ Search limited to 50 results
  - ✅ Debounced search (500ms delay)
  - ✅ Real-time subscriptions for live updates

  ---
  🎯 KEY DIFFERENCES FROM MATCHES

  | Feature    | Matches System | Expense Friends   |
  |------------|----------------|-------------------|
  | Purpose    | Find roommates | Split expenses    |
  | Method     | Swipe/like     | Search & request  |
  | Location   | Matches tab    | Expenses tab only |
  | Visibility | Mutual likes   | Anyone can search |
  | Usage      | Dating-style   | Facebook-style    |

  ---
  📝 IMPLEMENTATION ESTIMATE

  - Phase 1 (Database): ~30 minutes
  - Phase 2 (API): ~45 minutes
  - Phase 3 (Components): ~2 hours
  - Phase 4 (Integration): ~45 minutes
  - Phase 5 (Updates): ~15 minutes
  - Phase 6 (Migration): ~15 minutes

  Total: ~4-5 hours

  ---
  ✅ READY TO IMPLEMENT?

  The plan is complete and detailed. All code is designed and ready to write.

  Would you like me to proceed with implementation?