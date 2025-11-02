 📑 TABLE OF CONTENTS

  1. #1-expense-page-data-display
  2. #2-create-room-feature
  3. #3-create-event-feature
  4. #4-friends-feature-integration
  5. #5-complete-function-engineering

  ---
  1. EXPENSE PAGE DATA DISPLAY

  1.1 Main Dashboard Overview (ExpensesPage.tsx:57-745)

  The expense screen displays the following data for the main user:

  Dashboard Statistics Grid (4 Cards)

  Card 1: Your Balance (lines 351-383)
  - User Profile Picture: Avatar with border
  - Total Amount Owed: Calculated from all active expense rooms
  - Status Indicator:
    - Red text if user owes money (text-roomeo-danger)
    - Green text if settled (text-roomeo-success)
  - Message: Dynamic ("You owe $X" or "All settled up! 🎉")

  Card 2: Summary (lines 385-401)
  - Active Rooms Count: Filtered based on current filter (all/regular/event)
  - Pending Settlements: Total number awaiting approval
  - Friends Available: Total count of friends from useFriends() hook

  Card 3: You Owe (lines 403-452)
  - Iterates through dashboardData.active_expenses
  - Shows debts grouped by room/creator
  - Displays:
    - Profile picture of creditor
    - Room name with creator name
    - Amount owed (amount_owed - amount_paid)
  - Empty state: "All settled up! 🎉"

  Card 4: Friends Owe You (lines 454-503)
  - Aggregates amounts across all rooms where user is creator
  - Maps through participants who owe money
  - Displays:
    - Each friend's profile picture
    - Friend's name
    - Amount they owe
  - Empty state: "No pending payments 💯"

  Events Section (lines 506-528)

  Only displayed if user has events (events.length > 0)
  - Shows event cards in grid layout
  - Filter buttons: "All", "Owned"
  - Each EventCard component displays:
    - Event name
    - Member count
    - Room count
    - Total amount

  Rooms Section (lines 530-641)

  Three Filter Modes:
  1. All Rooms: Both regular and event rooms
  2. Regular Rooms: Only rooms without event_id
  3. Event Rooms: Only rooms with event_id

  Each Room Card Shows:
  - Room name and description
  - Total amount
  - Your share (amount_owed)
  - Payment status
  - Participant list with avatars
  - Action buttons (Settle Up, View Details, Delete)

  Pending Settlements Section (lines 643-661)

  Only shown if dashboardData.pending_settlements.length > 0
  - Lists all settlements awaiting approval
  - Each SettlementCard shows:
    - Payer name
    - Amount
    - Payment method
    - Proof image (if uploaded)
    - Approve/Reject buttons (for creators only)

  1.2 Data Fetching Architecture

  Primary Data Source: fetchDashboardData() function (lines 88-116)
  const [userEvents, allRoomsData, pendingSettlements] = await Promise.all([
    getUserEvents(),      // Fetches all events user is part of
    getAllRooms(),        // Fetches ALL rooms with complete participant data
    getPendingSettlements() // Fetches settlements awaiting approval
  ])

  Balance Calculation (lines 98-106):
  - total_owed: Sum of (amount_owed - amount_paid) for all rooms
  - total_to_receive: Sum of pending settlement amounts

  ---
  2. CREATE ROOM FEATURE

  2.1 UI Components

  Modal Trigger (ExpensesPage.tsx:326-331)
  <button onClick={() => setIsCreateModalOpen(true)}
          className="roomeo-button-primary">
    <span>➕</span> Create Room
  </button>

  2.2 CreateExpenseModal Component (CreateExpenseModal.tsx)

  Form Fields:

  1. Room Name (lines 167-178) - REQUIRED
    - Text input
    - Placeholder: "Pizza Night, Rent Split, Trip Expenses..."
    - Validation: !formData.name.trim() throws error
  2. Description (lines 180-191) - OPTIONAL
    - Text input
    - Placeholder: "Add some details about this expense..."
  3. Total Amount (lines 193-209) - REQUIRED
    - Number input with $ prefix
    - Step: 0.01 (supports cents)
    - Validation: Must be > 0
  4. Split Type (lines 212-241)
    - Equal Split 🍽️: Divides amount equally
    - Custom Amounts 🎯: Manual allocation per participant
    - Auto-calculation for equal split (lines 42-52)
  5. Friends Selection (lines 243-315) - REQUIRED
    - Displays all friends with profile pictures
    - Checkbox selection
    - Shows selected count
    - For custom split: inline amount input per friend (lines 294-308)
    - Empty state: "No friends available"
  6. Group Chat Option (lines 317-333) - OPTIONAL
    - Checkbox to create group chat
    - Visual feedback with emerald primary color

  2.3 Validation Logic (lines 79-106)

  validateForm() {
    if (!name.trim()) return "Expense name is required"
    if (total_amount <= 0) return "Valid total amount is required"
    if (selectedFriends.length === 0) return "At least one friend must be selected"

    if (split_type === 'custom') {
      const totalCustom = sum(customAmounts)
      if (totalCustom > total_amount)
        return "Custom amounts cannot exceed the total amount"
    }
  }

  2.4 Backend Processing (services/expenses.ts:330-451)

  Function: createExpenseGroup()

  Two Execution Paths:

  A. Regular Room (no event_id):
  supabase.rpc('create_regular_room', {
    p_name,
    p_total_amount,
    p_participants,
    p_description,
    p_split_type,
    p_custom_amounts,
    p_create_group_chat: false
  })

  B. Event Room (with event_id):
  supabase.rpc('create_event_room', {
    p_name,
    p_total_amount,
    p_selected_friends,  // Additional friends beyond event members
    p_event_id,
    p_description
  })

  Post-Creation Actions (lines 404-437):
  1. Send email/WhatsApp invites (if provided)
  2. Send notifications to all participants
  3. Return group_id for UI refresh

  2.5 Database Side Effects

  When room is created:
  1. expense_groups table: New row inserted
  2. expense_participants table: One row per participant (including creator)
  3. notifications table: Notifications sent to all participants
  4. group_chats table (optional): Group chat created if requested

  ---
  3. CREATE EVENT FEATURE

  3.1 Event Modal (CreateEventModal.tsx)

  Form Structure:

  1. Event Name (line 176-186) - REQUIRED
    - Text input
    - Placeholder: "e.g., Birthday Party, Road Trip"
  2. Event Description (lines 209-220) - OPTIONAL
    - Textarea (3 rows)
    - Placeholder: "Add notes about this event..."
  3. Date Range (NOT SHOWN IN UI YET)
    - Start date and end date fields
    - Validation: End date must be after start date
  4. Invite Friends (lines 297-328) - OPTIONAL
    - Checkbox list of all friends
    - Multiple selection allowed
    - Shows count of selected friends

  3.2 Event Context in Room Creation

  Special Behavior When Creating Room in Event:

  Event Info Banner (CreateExpenseModal.tsx:133-165)
  - Displays event name
  - Shows all event members will be auto-added
  - Preview of first 3 members (+X more)
  - Dismissible with X button

  Automatic Participant Addition:
  - All event members are automatically included
  - Creator doesn't manually select them
  - Can optionally add additional friends not in event

  Split Type Restriction:
  - Custom split DISABLED for event rooms
  - Only equal split allowed (to keep it simple)

  Participant Count Calculation (lines 342-344):
  eventContext
    ? `${eventContext.eventMembers.length + formData.participants.length + 1} people`
    : `${formData.participants.length + 1} people`

  3.3 Event Backend Service (services/events.ts)

  Function: createEvent() (lines 30-82)

  Database Call:
  supabase.rpc('create_event', {
    p_name,
    p_description,
    p_start_date,
    p_end_date,
    p_member_ids  // Array of invited user IDs
  })

  Database Side Effects:
  1. events table: New event row
  2. event_members table:
    - Creator as 'owner' role
    - Invited members as 'member' role

  3.4 Event Details & Management

  Function: getEventDetails() (lines 84-162)

  Returns EventWithDetails containing:
  - Event metadata (name, dates, description)
  - Members array: All event participants with roles
  - Rooms array: All expense rooms linked to this event
    - Each room includes full participant data
    - Fetched via separate queries to expense_participants
  - Stats object:
    - total_rooms: Count of expense rooms
    - total_amount: Sum of all room amounts
    - member_count: Number of event members

  3.5 Event Room Integration

  When user creates room inside an event:

  1. Event Modal opens (EventModal component)
  2. User clicks "Create Room" inside event
  3. CreateExpenseModal receives eventContext:
  eventContext={{
    eventId: string,
    eventName: string,
    eventMembers: Array<{ user_id, name }>
  }}
  4. Modal adapts:
    - Shows event banner
    - Auto-includes event members
    - Allows selecting additional friends
    - Forces equal split
  5. Backend links room to event via event_id foreign key

  ---
  4. FRIENDS FEATURE INTEGRATION

  4.1 Friends Data Management

  Custom Hook: useFriends() (hooks/useFriends.ts)

  State Variables:
  friends: Friend[]              // Confirmed friendships
  sentRequests: FriendRequest[]  // Pending outgoing requests
  receivedRequests: FriendRequest[] // Pending incoming requests
  loading: boolean
  error: string

  Core Functions:

  1. getFriendsList() (services/friends.ts:39-97)
    - Queries friendships table
    - Bidirectional join (user1_id OR user2_id = current user)
    - Returns friend list with profile data
  2. getFriendRequests() (lines 100-172)
    - Sent: Where sender_id = current user
    - Received: Where receiver_id = current user
    - Only returns status = 'pending'
  3. searchUsers() (lines 175-256)
    - Search by name with ILIKE %query%
    - Excludes current user
    - Determines relationship status:
        - friend: Already friends
      - request_sent: Pending request from you
      - request_received: Pending request to you
      - stranger: No relationship
  4. sendFriendRequest() (lines 259-369)
    - Validates no existing friendship
    - Checks for duplicate pending requests
    - Handles declined requests (allows retry)
    - Inserts into friend_requests table
  5. acceptFriendRequest() (lines 372-398)
    - Calls database function accept_friend_request
    - Creates friendship record
    - Updates request status to 'accepted'

  4.2 Integration with Create Room

  Friends List Display (CreateExpenseModal.tsx:258-313)

  {friends.map(friend => (
    <div onClick={() => handleFriendToggle(friend.id)}>
      <div className="checkbox">
        {isSelected && <span>✓</span>}
      </div>
      <img src={friend.profilePicture} />
      <span>{friend.name}</span>
      {isSelected && split_type === 'custom' && (
        <input type="number" value={customAmounts[friend.id]} />
      )}
    </div>
  ))}

  Friend Selection Flow:
  1. User clicks on friend card
  2. handleFriendToggle() adds/removes from selectedFriends array
  3. For equal split: Auto-calculates share (line 45)
  4. For custom split: Shows amount input field
  5. On submit: participants array passed to backend

  4.3 Integration with Create Event

  Event Member Selection (CreateEventModal.tsx:297-328)

  {friends.map((friend) => (
    <div onClick={() => toggleParticipant(friend.id)}>
      <input type="checkbox"
             checked={formData.invited_member_ids.includes(friend.id)} />
      <div style={{backgroundImage: friend.profilePicture}} />
      <span>{friend.name}</span>
    </div>
  ))}

  Difference from Room Creation:
  - Event: Friends become event members (persistent)
  - Room: Friends become room participants (per-room basis)

  4.4 Friend Data Propagation

  Data Flow:
  ExpensesPage (loads friends via useFriends())
      ↓
  friends array passed as prop
      ↓
  CreateExpenseModal OR CreateEventModal
      ↓
  User selects friends
      ↓
  Friend IDs sent to backend
      ↓
  Database creates participant/member records
      ↓
  Real-time updates refresh UI

  ---
  5. COMPLETE FUNCTION ENGINEERING

  5.1 Core Expense Functions

  A. getExpenseSummaryWithParticipants() (expenses.ts:59-228)

  Purpose: Fetch expense rooms with full participant data

  Algorithm:
  1. Query expense_groups where status = 'active'
  2. Apply event filtering (all/regular/event rooms)
  3. Fetch all participants for these groups in one batch query
  4. Fetch all pending settlements for these groups
  5. Group data by group_id using Maps
  6. Transform into ExpenseSummary[] with participant arrays

  Key Logic:
  // Skip groups where user is not involved
  if (!userParticipant && !isCreator) continue

  // Calculate settled status
  is_settled: isCreator
    ? participants.every(p => p.is_settled)  // All must pay creator
    : (userParticipant?.is_settled || false) // User's status

  Return Type:
  ExpenseSummary {
    group_id, group_name, total_amount,
    amount_owed, amount_paid, is_settled,
    created_by_name, created_at,
    participants: [{
      user_id, name, profile_picture,
      amount_owed, amount_paid, is_settled, is_creator
    }]
  }

  B. getAllRooms() / getRegularRooms() / getEventRooms() (lines 231-277)

  Wrapper functions that call getExpenseSummaryWithParticipants() with different filters:
  - getAllRooms(): No filter (undefined)
  - getRegularRooms(): eventRooms = false
  - getEventRooms(): eventRooms = true

  C. createExpenseGroup() (lines 330-451)

  Input Validation:
  if (!name.trim()) throw Error("Expense name is required")
  if (total_amount <= 0) throw Error("Total amount must be greater than 0")
  if (participants.length < 1) throw Error("At least 1 participant required")

  if (split_type === 'custom') {
    if (!custom_amounts || custom_amounts.length !== participants.length)
      throw Error("Custom amounts must match participants")
    if (sum(custom_amounts) > total_amount)
      throw Error("Custom amounts cannot exceed total")
  }

  Execution:
  let result: string

  if (data.event_id) {
    // EVENT ROOM PATH
    result = await supabase.rpc('create_event_room', {...})
  } else {
    // REGULAR ROOM PATH
    result = await supabase.rpc('create_regular_room', {...})
  }

  // Send invites (if provided)
  for (const invite of data.invites) {
    await fetch('/api/invites', {
      method: 'POST',
      body: JSON.stringify({...})
    })
  }

  // Send notifications
  await sendExpenseNotifications(result, participants, 'expense_created', {...})

  D. submitSettlement() (lines 453-561)

  Purpose: Participant submits payment to room creator

  Validation:
  if (!group_id) throw Error("Group ID required")
  if (amount <= 0) throw Error("Amount must be > 0")
  if (!payment_method) throw Error("Payment method required")

  Database Call:
  supabase.rpc('submit_settlement', {
    p_group_id,
    p_amount,
    p_payment_method,
    p_proof_image,
    p_notes
  })

  Error Handling (lines 493-509):
  - "not a participant" → User validation failed
  - "yourself" → Cannot settle with yourself
  - "No outstanding" → Already settled or no debt
  - "exceed" → Amount > what's owed

  Notification (lines 520-547):
  // Notify room creator about new settlement
  await sendExpenseNotifications(
    settlement_id,
    [creator_id],
    'settlement_requested',
    {
      expense_group_id, expense_name,
      amount, settlement_id, payer_name
    }
  )

  E. approveSettlement() (lines 563-625)

  Purpose: Room creator approves/rejects payment

  Database Call:
  supabase.rpc('approve_settlement', {
    p_settlement_id,
    p_approved  // true/false
  })

  Side Effects:
  - If approved: Updates participant's amount_paid
  - If all paid: Marks room as settled
  - Sends notification to payer

  Notification:
  await sendExpenseNotifications(
    settlement_id,
    [payer_id],
    approved ? 'settlement_approved' : 'settlement_rejected',
    {...}
  )

  F. markParticipantPayment() (lines 667-702)

  Purpose: Creator manually marks participant as paid/unpaid

  Use Case: Cash payments or external transfers

  Database Call:
  supabase.rpc('mark_participant_payment', {
    p_group_id,
    p_user_id,
    p_mark_as_paid  // boolean
  })

  Authorization: Only room creator can call this

  ---
  5.2 Core Event Functions

  A. createEvent() (events.ts:30-82)

  Input Validation:
  if (!name.trim()) throw Error("Event name required")

  if (start_date && end_date) {
    if (new Date(end_date) < new Date(start_date))
      throw Error("End date cannot be before start date")
  }

  Database Call:
  supabase.rpc('create_event', {
    p_name,
    p_description,
    p_start_date,
    p_end_date,
    p_member_ids  // Invited friends
  })

  Database Side Effects:
  1. Insert into events table
  2. Insert creator as owner in event_members
  3. Insert invited members in event_members

  B. getEventDetails() (lines 84-162)

  Purpose: Fetch complete event data including rooms

  Step 1: Get base event data
  supabase.rpc('get_event_details', { p_event_id })
  // Returns: { event, members, rooms, stats }

  Step 2: Enrich rooms with participants
  const roomsWithParticipants = await Promise.all(
    rooms.map(async (room) => {
      const { data: participants } = await supabase
        .from('expense_participants')
        .select(`user_id, amount_owed, amount_paid, users(name, profilepicture)`)
        .eq('group_id', room.group_id)

      return { ...room, participants }
    })
  )

  Return Structure:
  EventWithDetails {
    ...event (id, name, description, dates),
    members: [{ user_id, name, role, profile_picture }],
    rooms: [{ ...ExpenseSummary, participants: [...] }],
    stats: {
      member_count,
      total_rooms,
      total_amount
    }
  }

  C. getUserEvents() (lines 165-189)

  Purpose: Get all events user is part of (as owner or member)

  Database Call:
  supabase.rpc('get_user_events', { p_user_id })

  SQL Logic (approximate):
  SELECT e.*, em.role,
         COUNT(DISTINCT eg.id) as room_count,
         COUNT(DISTINCT em2.user_id) as member_count,
         SUM(eg.total_amount) as total_amount
  FROM events e
  JOIN event_members em ON em.event_id = e.id
  LEFT JOIN expense_groups eg ON eg.event_id = e.id
  LEFT JOIN event_members em2 ON em2.event_id = e.id
  WHERE em.user_id = p_user_id
  GROUP BY e.id, em.role

  D. addEventMember() / removeEventMember() (lines 231-301)

  Add Member:
  supabase.rpc('add_event_member', {
    p_event_id,
    p_user_id,
    p_role  // 'owner' | 'member'
  })

  Remove Member:
  supabase.rpc('remove_event_member', {
    p_event_id,
    p_user_id
  })

  Important: Removing member does NOT delete their participant records in existing event rooms

  ---
  5.3 Core Friends Functions

  A. getFriendsList() (friends.ts:39-97)

  Database Query:
  supabase
    .from('friendships')
    .select(`
      id, user1_id, user2_id, created_at,
      user1:users!friendships_user1_id_fkey(id, name, profilepicture),
      user2:users!friendships_user2_id_fkey(id, name, profilepicture)
    `)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

  Transformation Logic:
  const friends = data.map(friendship => {
    const isUser1 = friendship.user1_id === userId
    const friend = isUser1 ? friendship.user2 : friendship.user1

    return {
      id: friendship.id,
      friendId: friend.id,
      name: friend.name,
      profilePicture: friend.profilepicture,
      friendsSince: friendship.created_at
    }
  })

  Key Point: Friendships are bidirectional - stored once but retrieved regardless of user position

  B. searchUsers() (lines 175-256)

  Step 1: Search users by name
  supabase
    .from('users')
    .select('id, name, profilepicture, location')
    .ilike('name', `%${query}%`)
    .neq('id', currentUserId)
    .limit(20)

  Step 2: Get relationship context
  const [friendships, friendRequests] = await Promise.all([
    supabase.from('friendships')...
    supabase.from('friend_requests')...
  ])

  Step 3: Build lookup sets
  const friendIds = new Set()
  const sentRequestIds = new Set()
  const receivedRequestIds = new Set()

  // Populate sets from queries

  Step 4: Determine relationship for each result
  relationshipStatus =
    friendIds.has(userId) ? 'friend' :
    sentRequestIds.has(userId) ? 'request_sent' :
    receivedRequestIds.has(userId) ? 'request_received' :
    'stranger'

  C. sendFriendRequest() (lines 259-369)

  Complex Validation Logic:

  1. Check existing friendship:
  const friendship = await supabase
    .from('friendships')
    .select('id')
    .or(`and(user1_id.eq.${senderId},user2_id.eq.${receiverId}),
         and(user1_id.eq.${receiverId},user2_id.eq.${senderId})`)
    .single()

  if (friendship)
    return { success: false, error: 'Already friends' }

  2. Check existing requests (bidirectional):
  const existingRequest = await supabase
    .from('friend_requests')
    .select('id, status, sender_id, receiver_id')
    .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),
         and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
    .single()

  3. Handle request states:
  if (existingRequest.status === 'pending') {
    if (existingRequest.sender_id === currentUser)
      return "Already sent"
    else
      return "They sent you a request first"
  }

  if (existingRequest.status === 'declined') {
    // Allow retry - update existing record
    await supabase.from('friend_requests')
      .update({
        sender_id: currentUser,
        status: 'pending',
        updated_at: new Date()
      })
      .eq('id', existingRequest.id)
  }

  4. Insert new request:
  await supabase.from('friend_requests').insert({
    sender_id: currentUser,
    receiver_id,
    status: 'pending'
  })

  D. acceptFriendRequest() (lines 372-398)

  Database Function Call:
  supabase.rpc('accept_friend_request', { request_id })

  Backend Logic (in database function):
  1. Get request details (sender_id, receiver_id)
  2. Create friendship record in friendships table
  3. Update request status to 'accepted'
  4. Trigger notification to sender

  Return Flow:
  // Hook refreshes both friends and requests
  await Promise.all([
    fetchRequests(),
    fetchFriends()
  ])

  ---
  6. ARCHITECTURAL PATTERNS

  6.1 Data Flow Architecture

  UI Component (React)
      ↓ calls
  Service Function (TypeScript)
      ↓ calls
  Supabase Client
      ↓ calls
  Database RPC Function (PostgreSQL)
      ↓ executes
  SQL Queries + Business Logic
      ↓ triggers
  Row Level Security (RLS) Policies
      ↓ returns
  Data back to UI

  6.2 State Management

  Local State: useState for UI state
  Data Fetching: Service functions with async/await
  Real-time: Supabase subscriptions (not heavily used yet)
  Global State: No Redux - uses React Context and hooks

  6.3 Error Handling Pattern

  All service functions follow this pattern:
  async function serviceFunction() {
    try {
      const result = await supabase.rpc('function_name', {...})

      if (error) {
        throw new Error(error.message)
      }

      return { success: true, data: result }
    } catch (error) {
      console.error('❌ Error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  6.4 Security Model

  - Authentication: Supabase Auth (JWT tokens)
  - Authorization: RLS policies on all tables
  - Client-side: All operations go through authenticated Supabase client
  - Server-side: Database functions enforce permissions

  ---
  7. DATABASE SCHEMA (INFERRED)

  Core Tables:

  users
  - id (PK)
  - name
  - email
  - profilepicture
  - location

  friendships
  - id (PK)
  - user1_id (FK → users)
  - user2_id (FK → users)
  - created_at

  friend_requests
  - id (PK)
  - sender_id (FK → users)
  - receiver_id (FK → users)
  - status ('pending' | 'accepted' | 'declined')
  - created_at
  - updated_at

  events
  - id (PK)
  - name
  - description
  - start_date
  - end_date
  - created_by (FK → users)
  - created_at
  - updated_at

  event_members
  - id (PK)
  - event_id (FK → events)
  - user_id (FK → users)
  - role ('owner' | 'member')
  - joined_at

  expense_groups
  - id (PK)
  - name
  - description
  - created_by (FK → users)
  - total_amount
  - split_type ('equal' | 'custom')
  - status ('active' | 'settled' | 'cancelled')
  - event_id (FK → events, nullable)
  - created_at
  - updated_at

  expense_participants
  - id (PK)
  - group_id (FK → expense_groups)
  - user_id (FK → users)
  - amount_owed
  - amount_paid
  - is_settled
  - joined_at

  settlements
  - id (PK)
  - group_id (FK → expense_groups)
  - payer_id (FK → users)
  - receiver_id (FK → users)
  - amount
  - payment_method ('cash' | 'zelle' | 'venmo' | 'paypal' | 'bank_transfer')
  - status ('pending' | 'approved' | 'rejected')
  - proof_image (URL)
  - notes
  - created_at
  - approved_at

  notifications
  - id (PK)
  - user_id (FK → users)
  - type ('expense' | 'friend' | 'event')
  - title
  - message
  - data (JSONB)
  - is_read
  - created_at

  ---
  This completes the comprehensive analysis of your expense page architecture. Every feature, function, and integration point has been documented in minute detail.