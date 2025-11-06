 Mobile Expense Feature Implementation Plan

 Overview

 Implement complete expense management system matching website functionality, optimized for mobile UI with expandable cards, hybrid settlement workflow, and full event features.    

 Phase 1: Friends Integration & Profile Display (Priority 1)

 Goal: Connect expense system to matches/friends and display real user information

 Task 1.1: Integrate Matches API for Member Selection

 - Fetch confirmed matches using lib/api/matches.ts
 - Update CreateRoomModal to load and display actual friends with photos
 - Update CreateEventModal to load and display actual friends with photos
 - Add friend search/filter functionality
 - Replace empty availableUsers arrays with real data

 Task 1.2: Display User Profiles in Expenses

 - Fetch user profiles for all expense participants
 - Replace "User" placeholders with real names
 - Display profile avatars throughout expense screens
 - Cache user data to avoid repeated fetches
 - Update expense cards to show creator information

 Task 1.3: Profile Integration in Room/Event Details

 - Show member list with photos and names in room details
 - Show participant list with photos and names in event details
 - Add member count badges with avatars

 Phase 2: Enhanced Dashboard with Expandable Cards

 Goal: Mobile-optimized dashboard with detailed stats on demand

 Task 2.1: Redesign Dashboard Cards

 - Keep 2-card summary layout (To Receive, You Owe)
 - Add expand/collapse functionality to each card
 - Collapsed: Show total amounts only
 - Expanded: Show detailed breakdowns by person/room

 Task 2.2: Add Summary Statistics Card

 - Create new expandable "Summary" card
 - Show: Active rooms count, Active events count, Pending settlements count
 - Collapsed: Just show counts
 - Expanded: Show recent activity list

 Task 2.3: Friends Owe You Breakdown

 - Add "Friends Owe You" section in expanded "To Receive" card
 - Group by person with individual amounts
 - Show profile photos and names
 - Tap person to see detailed breakdown by room

 Phase 3: Settlement Workflow (Hybrid Approach)

 Goal: Implement payment submission and quick approval system

 Task 3.1: Create Settlement Submission Modal

 - Add "Settle Up" button in room details screen
 - Create SettlementModal.tsx component
 - Fields: Amount (pre-filled with owed amount), Payment method dropdown, Optional proof photo upload, Optional notes
 - Use image picker for proof upload
 - Submit to settlements table

 Task 3.2: Pending Settlements Section

 - Add "Pending Settlements" section to main expense screen
 - Show list of settlements awaiting approval (for creators only)
 - Each card shows: Payer name & photo, Amount, Payment method, Proof image (if provided), Quick approve/reject buttons

 Task 3.3: Settlement Approval Logic

 - Implement one-tap approve/reject
 - Update expense_splits.paid status on approval
 - Update expense_splits.paid_at timestamp
 - Send notification to payer
 - Recalculate room balances
 - Add settlement history view in room details

 Phase 4: Full Event Management System

 Goal: Complete event features with room relationships

 Task 4.1: Event Detail Screen

 - Create app/(tabs)/expenses/event/[eventId].tsx
 - Display: Event info (name, description, date), Participant list with photos, Event statistics (total rooms, total expenses, member count)
 - Add "Create Room" button within event context
 - Show list of all rooms belonging to this event

 Task 4.2: Event-Room Relationship

 - Update CreateRoomModal to accept optional eventContext prop
 - When creating room from event: Show event banner, Auto-select all event members, Allow adding additional friends, Link room to event via event_id
 - Update room cards to show parent event badge if applicable

 Task 4.3: Event Statistics & Filtering

 - Add filter buttons: "All Events", "My Events", "Events I'm In"
 - Calculate and display: Total spent per event, Per-person breakdown, Outstanding balances within event
 - Add event dashboard card (expandable) showing all events summary

 Phase 5: Custom Split Amounts

 Goal: Support unequal expense splitting

 Task 5.1: Split Type Selector in Room/Expense Creation

 - Add toggle: "Equal Split" vs "Custom Amounts"
 - For equal: Auto-calculate per person (current behavior)
 - For custom: Show amount input next to each selected friend
 - Add real-time validation: Sum of custom amounts ≤ total amount

 Task 5.2: Custom Split Display

 - Update expense cards to show individual split amounts
 - Display split type badge ("Equal" or "Custom")
 - Show breakdown: "You: $25, Friend1: $30, Friend2: $45"
 - Update room balance calculations for custom splits

 Phase 6: Enhanced Room Features

 Goal: Add room management actions and improved UX

 Task 6.1: Room Action Menu

 - Add three-dot menu on room cards
 - Actions: View Details, Settle All, Edit Room, Delete Room
 - Implement delete room (with confirmation alert)
 - Add room settings screen for admins

 Task 6.2: Quick Actions on Room Cards

 - Add "Settle Up" shortcut button on room cards
 - Show balance indicator with color coding
 - Add member avatars preview (first 3 + count)
 - Tap room card to navigate to details

 Task 6.3: Room Details Enhancements

 - Add "Add Expense" button in room details
 - Show expense history with filters (all, paid, unpaid)
 - Add room chat link (if group chat exists)
 - Display room creation date and creator

 Phase 7: Backend Function Integration

 Goal: Use website's optimized database functions

 Task 7.1: Create Missing RPC Functions

 - Implement create_regular_room() if not exists
 - Implement create_event_room() if not exists
 - Implement submit_settlement() function
 - Implement approve_settlement() function
 - Test all functions in Supabase dashboard

 Task 7.2: Update API Layer to Use RPC Functions

 - Refactor createExpenseRoom() to use create_regular_room()
 - Refactor createExpenseEvent() to use proper event creation RPC
 - Add submitSettlement() API function
 - Add approveSettlement() API function
 - Add getPendingSettlements() API function

 Phase 8: Real-time Updates & Notifications

 Goal: Live updates for collaborative expense management

 Task 8.1: Real-time Subscriptions

 - Subscribe to expense room updates
 - Subscribe to settlement status changes
 - Subscribe to new expenses in user's rooms
 - Update UI automatically when changes occur

 Task 8.2: Notification Integration

 - Send notification when added to room/event
 - Send notification when someone settles up
 - Send notification when settlement is approved/rejected
 - Send notification when new expense is added
 - Add notification badges to expense tab

 Phase 9: UI Polish & Mobile Optimization

 Goal: Ensure excellent mobile UX

 Task 9.1: Loading & Error States

 - Add skeleton loaders for all data fetching
 - Implement proper error boundaries
 - Show friendly error messages
 - Add retry buttons for failed requests

 Task 9.2: Empty States

 - Design empty states for: No rooms, No events, No expenses, All settled up
 - Add illustrations and encouraging CTAs
 - Guide users to create their first room/event

 Task 9.3: Mobile-Specific Optimizations

 - Optimize for one-handed use (bottom actions)
 - Add haptic feedback for important actions
 - Implement swipe gestures (swipe to settle, swipe to delete)
 - Ensure touch targets are at least 44x44pts
 - Test on small screens (iPhone SE) and large screens (iPad)

 Database Changes Needed

 None! Current schema supports all features. May need to add indexes for performance.

 Implementation Order

 1. Friends Integration (Week 1)
 2. Profile Display (Week 1)
 3. Dashboard Enhancement (Week 2)
 4. Settlement Workflow (Week 2-3)
 5. Event Management (Week 3-4)
 6. Custom Splits (Week 4)
 7. Room Features (Week 5)
 8. Backend Integration (Week 5)
 9. Real-time & Notifications (Week 6)
 10. UI Polish (Week 6)

 Success Criteria

 ✅ Users can add friends when creating rooms/events
 ✅ Real names and photos display throughout
 ✅ Dashboard shows detailed stats (expandable)
 ✅ Users can submit settlements with optional proof
 ✅ Creators can approve settlements with one tap
 ✅ Full event detail screens with room management
 ✅ Can create rooms within events
 ✅ Custom split amounts work correctly
 ✅ Room actions menu (delete, settle, edit)
 ✅ Real-time updates work seamlessly
 ✅ UI is clean, simple, and mobile-optimized