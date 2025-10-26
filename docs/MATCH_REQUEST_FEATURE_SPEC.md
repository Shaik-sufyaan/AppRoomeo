# Match Request System - Complete Feature Specification

## 📌 Table of Contents
1. [Overview](#overview)
2. [User Flow](#user-flow)
3. [UI/UX Design](#uiux-design)
4. [API Endpoints & Payloads](#api-endpoints--payloads)
5. [Database Schema](#database-schema)
6. [Sequence Diagrams](#sequence-diagrams)
7. [Edge Cases](#edge-cases)
8. [Notifications & Messages](#notifications--messages)
9. [Implementation Checklist](#implementation-checklist)

---

## Overview

Transform the existing swipe-based system into a Hinge-style approval-based matching system where:
- Right swipes send match requests that require approval
- Recipients can approve or reject requests
- Approval creates a match and enables messaging
- Rejections are silent (requester is not notified)
- **Smart matching:** Users only see complementary user types
  - "looking-for-place" users only see "finding-roommate" users (who have a place)
  - "finding-roommate" users only see "looking-for-place" users (who need a place)

---

## User Flow

### Complementary User Type Matching

Before diving into the flows, it's important to understand the **smart matching logic**:

**Matching Matrix:**
```
┌──────────────────────┬─────────────────────────┬──────────────────────┐
│ Your User Type       │ You Will See            │ You Won't See        │
├──────────────────────┼─────────────────────────┼──────────────────────┤
│ looking-for-place    │ finding-roommate users  │ looking-for-place    │
│ (Need a place)       │ (Have a place)          │ (Also need a place)  │
├──────────────────────┼─────────────────────────┼──────────────────────┤
│ finding-roommate     │ looking-for-place users │ finding-roommate     │
│ (Have a place)       │ (Need a place)          │ (Also have a place)  │
└──────────────────────┴─────────────────────────┴──────────────────────┘
```

**Example Scenarios:**

✅ **Match:** Sarah (finding-roommate) can swipe on Marcus (looking-for-place)
- Sarah has a 2BR apartment and needs a roommate
- Marcus is looking for a place near downtown
- Perfect match!

❌ **No Match:** Sarah (finding-roommate) won't see Emma (finding-roommate)
- Both have places they're trying to fill
- Neither is looking for a place
- Not complementary

✅ **Match:** Alex (looking-for-place) can swipe on Jessica (finding-roommate)
- Alex needs to find housing
- Jessica has a spare room
- Compatible needs!

**Benefits:**
1. **Reduced confusion** - Users only see relevant profiles
2. **Better matches** - Complementary needs = higher compatibility
3. **Less frustration** - No dead-end matches where both users have the same need
4. **Clearer intent** - Everyone knows why they're seeing each profile

---

### Flow 1: Sending a Match Request (Right Swipe)

**Step 1:** User A views User B's profile on the Matches screen

**Step 2:** User A swipes right or taps the "Connect" button

**Step 3:** System checks for existing interactions:
- If already matched → Show error "You're already matched!"
- If already sent request → Show "Request pending..."
- If User B already sent request to User A → Auto-match! (mutual interest)
- Otherwise → Create new match request

**Step 4:** Success feedback:
- Show toast: "Request sent to [Name]!"
- Card animates off screen
- Next profile appears

**Step 5:** User B receives notification:
- Push notification (if enabled): "[User A name] is interested in you!"
- In-app notification badge on Matches tab
- Entry appears in "Requests" section

---

### Flow 2: Receiving and Approving a Request

**Step 1:** User B sees notification badge on Matches tab

**Step 2:** User B navigates to Matches screen

**Step 3:** At top of screen, "Pending Requests" section shows:
- User A's profile card (compact view)
- Message: "[User A name] is interested in connecting with you"
- Two action buttons: "Approve" and "Reject"

**Step 4:** User B taps "Approve"

**Step 5:** System actions:
- Creates a Match record
- Deletes the match_request
- Creates a Conversation with status: "accepted"
- Sends notification to User A

**Step 6:** User B sees:
- Success toast: "You matched with [User A name]! You can now chat."
- Request card removes from list
- User A appears in Chat messages

**Step 7:** User A receives notification:
- Push notification: "[User B name] accepted your request!"
- In-app badge on Chat tab
- User B appears in conversations list

---

### Flow 3: Receiving and Rejecting a Request

**Step 1:** User B sees pending request (same as Flow 2, Step 1-3)

**Step 2:** User B taps "Reject"

**Step 3:** System shows confirmation modal:
- Title: "Reject Request?"
- Message: "[User A name] won't be notified"
- Buttons: "Cancel" and "Reject"

**Step 4:** User B confirms rejection

**Step 5:** System actions:
- Deletes the match_request
- Creates a swipe record (type: 'reject') for history
- **No notification sent to User A**

**Step 6:** User B sees:
- Request card removes from list
- No other visible change

**Step 7:** User A sees:
- **Nothing** - request stays in "Sent Requests" with status "Pending..."
- No notification of rejection

---

### Flow 4: Viewing Sent Requests

**Step 1:** User A navigates to Chat or Matches screen

**Step 2:** "Sent Requests" section shows all pending outgoing requests:
- User's profile card (compact)
- Message: "Pending..."
- No action buttons (can't cancel)

**Step 3:** If request is accepted:
- Card disappears from "Sent Requests"
- User appears in Chat messages
- Notification received

**Step 4:** If request is rejected:
- Card stays in "Sent Requests" indefinitely
- **No indication of rejection** (better UX to avoid hurt feelings)

---

## UI/UX Design

### 1. Matches Screen - Updated Layout

```
┌─────────────────────────────────────────┐
│  Matches                    🔔 (badge)  │ ← Header
├─────────────────────────────────────────┤
│                                         │
│  📍 All Residencies ▼                   │ ← Filter dropdown
│                                         │
│  💡 Showing: People looking for a place │ ← Smart filter indicator
│     (You have a place to share)         │    (Based on user_type)
│                                         │
├─────────────────────────────────────────┤
│  PENDING REQUESTS (2)                   │ ← New Section
│  ┌───────────────────────────────────┐ │
│  │ 👤 Sarah Chen, 24                 │ │
│  │ "Sarah is interested in you"      │ │
│  │ 🏠 Looking for a place            │ │ ← User type badge
│  │                                   │ │
│  │  [✓ Approve]    [✗ Reject]       │ │ ← Action buttons
│  └───────────────────────────────────┘ │
│  ┌───────────────────────────────────┐ │
│  │ 👤 Alex Kim, 25                   │ │
│  │ "Alex is interested in you"       │ │
│  │ 🏠 Looking for a place            │ │
│  │  [✓ Approve]    [✗ Reject]       │ │
│  └───────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  DISCOVER                               │
│  ┌───────────────────────────────────┐ │
│  │                                   │ │
│  │        [Large Profile Card]       │ │ ← Swipeable cards
│  │                                   │ │ ← Only shows complementary
│  │   Marcus, 26                      │ │   user types
│  │   🏠 Looking for a place          │ │
│  └───────────────────────────────────┘ │
│                                         │
│         [Skip 🡸]      [Connect 🤝]      │ ← Swipe buttons
└─────────────────────────────────────────┘
```

**Smart Filter Indicator Text (Dynamic):**

If current user is `finding-roommate`:
```
💡 Showing: People looking for a place
   (You have a place to share)
```

If current user is `looking-for-place`:
```
💡 Showing: People with a place to share
   (You're looking for a place)
```

---

### 2. Pending Request Card (Component Design)

```
┌─────────────────────────────────────────┐
│ ┌───┐  Sarah Chen, 24                  │
│ │ 👤│  Stanford University              │
│ └───┘  2.5 miles away                  │
│                                         │
│ "Sarah is interested in connecting     │
│  with you"                             │
│                                         │
│ [Has Place] [Full-time]                │ ← Badges
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ ✓  Approve   │  │ ✗  Reject    │   │
│  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────┘
```

**Styling:**
- Background: White card with subtle shadow
- Approve button: Green background (#10B981), white text
- Reject button: Light gray background (#E5E7EB), dark gray text
- Card has rounded corners and padding
- Avatar shows user's first photo

---

### 3. Rejection Confirmation Modal

```
┌─────────────────────────────────────────┐
│                                         │
│         Reject Request?                 │ ← Title (H3, bold)
│                                         │
│  Sarah won't be notified that you      │
│  rejected their request.               │ ← Body text
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │   Cancel     │  │    Reject    │   │
│  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────┘
```

**Styling:**
- Semi-transparent dark overlay background
- White modal centered on screen
- Cancel button: Light gray
- Reject button: Red (#EF4444)

---

### 4. Success Toast Messages

**After sending request:**
```
┌─────────────────────────────────────┐
│ ✓  Request sent to Sarah!           │
└─────────────────────────────────────┘
```

**After approving request:**
```
┌─────────────────────────────────────┐
│ ✓  You matched with Sarah!          │
│    You can now chat.                │
└─────────────────────────────────────┘
```

**Styling:**
- Green background (#10B981)
- White text
- Appears at bottom of screen
- Auto-dismisses after 3 seconds
- Slide-up animation

---

### 5. Sent Requests Section (in Chat Screen)

```
┌─────────────────────────────────────────┐
│  Chat                       🔔 (badge)  │
├─────────────────────────────────────────┤
│  SENT REQUESTS (1)                      │
│  ┌───────────────────────────────────┐ │
│  │ 👤 Marcus Johnson, 26             │ │
│  │ Pending...                        │ │ ← No action buttons
│  └───────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  MESSAGES                               │
│  ┌───────────────────────────────────┐ │
│  │ 👤 Sarah Chen                     │ │
│  │ Hey! How's it going?         2:30pm│ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

### 6. Visual States & Animations

**Swipe Right Animation:**
1. Card tilts 10 degrees clockwise
2. "CONNECT" label appears in green at top-right
3. Card slides off screen to the right (250ms)
4. Success toast appears from bottom
5. Next card slides in from underneath

**Approve Button Press:**
1. Button scales down slightly (press animation)
2. Card fades out (200ms)
3. Success toast slides up from bottom
4. Remaining cards shift up to fill space

**Reject Button Press:**
1. Modal fades in with dark overlay
2. User confirms rejection
3. Card fades out to left (200ms)
4. No toast message
5. Remaining cards shift up

---

## API Endpoints & Payloads

### Base URL
```
/api/v1/matches
```

---

### 1. Send Match Request

**Endpoint:** `POST /api/v1/matches/requests`

**Description:** Creates a match request when user swipes right

**Request Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "recipient_id": "uuid-of-user-b"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "request_id": "req-uuid-1234",
    "sender_id": "uuid-of-user-a",
    "recipient_id": "uuid-of-user-b",
    "status": "pending",
    "created_at": "2025-01-15T10:30:00Z"
  },
  "message": "Match request sent successfully"
}
```

**Success Response - Mutual Match (201 Created):**
```json
{
  "success": true,
  "data": {
    "match_id": "match-uuid-5678",
    "user_a_id": "uuid-of-user-a",
    "user_b_id": "uuid-of-user-b",
    "matched_at": "2025-01-15T10:30:00Z",
    "is_mutual": true
  },
  "message": "It's a match! You both swiped right."
}
```

**Error Responses:**

Already sent request (400):
```json
{
  "success": false,
  "error": "REQUEST_ALREADY_SENT",
  "message": "You already sent a request to this user"
}
```

Already matched (400):
```json
{
  "success": false,
  "error": "ALREADY_MATCHED",
  "message": "You're already matched with this user"
}
```

Incompatible user types (400):
```json
{
  "success": false,
  "error": "INCOMPATIBLE_USER_TYPES",
  "message": "This user is not compatible with your profile type"
}
```

User not found (404):
```json
{
  "success": false,
  "error": "USER_NOT_FOUND",
  "message": "Recipient user not found"
}
```

---

### 2. Approve Match Request

**Endpoint:** `POST /api/v1/matches/requests/:request_id/approve`

**Description:** Approves a pending match request, creating a match

**Request Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "match_id": "match-uuid-5678",
    "user_a_id": "uuid-of-user-a",
    "user_b_id": "uuid-of-user-b",
    "matched_at": "2025-01-15T10:35:00Z",
    "conversation_id": "conv-uuid-9999"
  },
  "message": "Match request approved"
}
```

**Error Responses:**

Request not found (404):
```json
{
  "success": false,
  "error": "REQUEST_NOT_FOUND",
  "message": "Match request not found"
}
```

Unauthorized (403):
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "You can only approve requests sent to you"
}
```

---

### 3. Reject Match Request

**Endpoint:** `POST /api/v1/matches/requests/:request_id/reject`

**Description:** Rejects a pending match request (silent rejection)

**Request Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Match request rejected"
}
```

**Note:** No notification is sent to the requester

---

### 4. Get Received Match Requests

**Endpoint:** `GET /api/v1/matches/requests/received`

**Description:** Fetches all pending match requests received by the current user

**Request Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>"
}
```

**Query Parameters:**
```
?status=pending  (optional, default: pending)
?limit=20        (optional, default: 20)
?offset=0        (optional, default: 0)
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "request_id": "req-uuid-1234",
        "sender": {
          "id": "uuid-of-user-a",
          "name": "Sarah Chen",
          "age": 24,
          "college": "Stanford University",
          "photos": ["https://...photo1.jpg"],
          "work_status": "full-time",
          "has_place": true,
          "distance": 2.5
        },
        "status": "pending",
        "created_at": "2025-01-15T10:30:00Z"
      },
      {
        "request_id": "req-uuid-5678",
        "sender": {
          "id": "uuid-of-user-c",
          "name": "Alex Kim",
          "age": 25,
          "college": "Stanford University",
          "photos": ["https://...photo2.jpg"],
          "work_status": "full-time",
          "has_place": true,
          "distance": 5.1
        },
        "status": "pending",
        "created_at": "2025-01-15T09:15:00Z"
      }
    ],
    "total": 2,
    "has_more": false
  }
}
```

---

### 5. Get Sent Match Requests

**Endpoint:** `GET /api/v1/matches/requests/sent`

**Description:** Fetches all match requests sent by the current user

**Request Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>"
}
```

**Query Parameters:**
```
?status=pending  (optional, default: pending)
?limit=20        (optional, default: 20)
?offset=0        (optional, default: 0)
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "request_id": "req-uuid-9999",
        "recipient": {
          "id": "uuid-of-user-d",
          "name": "Marcus Johnson",
          "age": 26,
          "photos": ["https://...photo3.jpg"]
        },
        "status": "pending",
        "created_at": "2025-01-14T14:20:00Z"
      }
    ],
    "total": 1,
    "has_more": false
  }
}
```

---

### 6. Get All Matches

**Endpoint:** `GET /api/v1/matches`

**Description:** Fetches all matched users for the current user

**Request Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>"
}
```

**Query Parameters:**
```
?limit=50        (optional, default: 50)
?offset=0        (optional, default: 0)
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "match_id": "match-uuid-5678",
        "matched_user": {
          "id": "uuid-of-user-b",
          "name": "Sarah Chen",
          "age": 24,
          "college": "Stanford University",
          "photos": ["https://...photo1.jpg"],
          "work_status": "full-time",
          "has_place": true,
          "about": "Software engineer who loves...",
          "distance": 2.5
        },
        "matched_at": "2025-01-15T10:35:00Z",
        "conversation_id": "conv-uuid-9999"
      }
    ],
    "total": 1,
    "has_more": false
  }
}
```

---

### 7. Record Swipe (Left Swipe)

**Endpoint:** `POST /api/v1/matches/swipes`

**Description:** Records a left swipe (skip) for analytics and preventing re-showing

**Request Headers:**
```json
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "swiped_user_id": "uuid-of-user-b",
  "swipe_type": "skip"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Swipe recorded"
}
```

---

## Database Schema

### Table 1: `match_requests`

**Purpose:** Stores pending match requests sent by users

```sql
CREATE TABLE match_requests (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The user who sent the request
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- The user who received the request
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Request status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate requests
  CONSTRAINT unique_match_request UNIQUE (sender_id, recipient_id)
);

-- Indexes for performance
CREATE INDEX idx_match_requests_recipient ON match_requests(recipient_id) WHERE status = 'pending';
CREATE INDEX idx_match_requests_sender ON match_requests(sender_id) WHERE status = 'pending';
CREATE INDEX idx_match_requests_status ON match_requests(status);
CREATE INDEX idx_match_requests_created_at ON match_requests(created_at);
```

**Columns:**
- `id` - Unique identifier for the request
- `sender_id` - User who swiped right
- `recipient_id` - User who received the request
- `status` - Current status: pending, approved, or rejected
- `created_at` - When the request was sent
- `updated_at` - Last modification time

**Constraints:**
- `unique_match_request` - Prevents duplicate requests between same two users

---

### Table 2: `matches`

**Purpose:** Stores confirmed matches between users

```sql
CREATE TABLE matches (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The two matched users (order doesn't matter)
  user_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Match metadata
  matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Was this a mutual swipe (both swiped right before seeing each other)?
  is_mutual BOOLEAN NOT NULL DEFAULT false,

  -- Associated conversation
  conversation_id UUID,

  -- Prevent duplicate matches
  CONSTRAINT unique_match UNIQUE (user_a_id, user_b_id),
  CONSTRAINT no_self_match CHECK (user_a_id != user_b_id)
);

-- Indexes for querying matches
CREATE INDEX idx_matches_user_a ON matches(user_a_id);
CREATE INDEX idx_matches_user_b ON matches(user_b_id);
CREATE INDEX idx_matches_matched_at ON matches(matched_at DESC);
```

**Columns:**
- `id` - Unique identifier for the match
- `user_a_id` - First user in the match
- `user_b_id` - Second user in the match
- `matched_at` - When the match was created
- `is_mutual` - True if both users swiped right simultaneously
- `conversation_id` - Link to the conversation between these users

**Constraints:**
- `unique_match` - Prevents duplicate matches
- `no_self_match` - User can't match with themselves

**Note:** To query if users are matched, check both combinations:
```sql
WHERE (user_a_id = $1 AND user_b_id = $2)
   OR (user_a_id = $2 AND user_b_id = $1)
```

---

### Table 3: `swipes`

**Purpose:** Records all swipe actions for analytics and preventing re-showing users

```sql
CREATE TABLE swipes (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The user who performed the swipe
  swiper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- The user who was swiped on
  swiped_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Type of swipe
  swipe_type TEXT NOT NULL CHECK (swipe_type IN ('like', 'skip', 'reject')),

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate swipes
  CONSTRAINT unique_swipe UNIQUE (swiper_id, swiped_user_id)
);

-- Indexes
CREATE INDEX idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX idx_swipes_swiped_user ON swipes(swiped_user_id);
CREATE INDEX idx_swipes_type ON swipes(swipe_type);
```

**Columns:**
- `id` - Unique identifier
- `swiper_id` - User who swiped
- `swiped_user_id` - User who was swiped on
- `swipe_type` - Type: 'like' (right swipe), 'skip' (left swipe), 'reject' (declined request)
- `created_at` - When the swipe occurred

**Swipe Types:**
- `like` - User swiped right (created match_request)
- `skip` - User swiped left (not interested)
- `reject` - User rejected an incoming match request

---

### Table 4: `conversations` (Update Existing)

**Purpose:** Chat conversations between matched users

**Modifications Needed:**
```sql
-- Add column if not exists
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES matches(id);

-- Add index
CREATE INDEX IF NOT EXISTS idx_conversations_match ON conversations(match_id);
```

This links conversations to their corresponding match.

---

### Database Functions

#### Function 1: Check for Mutual Match

```sql
CREATE OR REPLACE FUNCTION check_mutual_match(
  sender_uuid UUID,
  recipient_uuid UUID
) RETURNS BOOLEAN AS $$
DECLARE
  reverse_request_exists BOOLEAN;
BEGIN
  -- Check if recipient already sent a request to sender
  SELECT EXISTS (
    SELECT 1 FROM match_requests
    WHERE sender_id = recipient_uuid
      AND recipient_id = sender_uuid
      AND status = 'pending'
  ) INTO reverse_request_exists;

  RETURN reverse_request_exists;
END;
$$ LANGUAGE plpgsql;
```

---

#### Function 2: Create Match from Request

```sql
CREATE OR REPLACE FUNCTION create_match_from_request(
  request_uuid UUID
) RETURNS UUID AS $$
DECLARE
  sender_uuid UUID;
  recipient_uuid UUID;
  new_match_id UUID;
  new_conversation_id UUID;
BEGIN
  -- Get sender and recipient from the request
  SELECT sender_id, recipient_id INTO sender_uuid, recipient_uuid
  FROM match_requests
  WHERE id = request_uuid AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match request not found or already processed';
  END IF;

  -- Create the match
  INSERT INTO matches (user_a_id, user_b_id, is_mutual)
  VALUES (sender_uuid, recipient_uuid, false)
  RETURNING id INTO new_match_id;

  -- Create conversation
  INSERT INTO conversations (user_a_id, user_b_id, match_id, status)
  VALUES (sender_uuid, recipient_uuid, new_match_id, 'active')
  RETURNING id INTO new_conversation_id;

  -- Update match with conversation_id
  UPDATE matches SET conversation_id = new_conversation_id
  WHERE id = new_match_id;

  -- Delete the match request
  DELETE FROM match_requests WHERE id = request_uuid;

  RETURN new_match_id;
END;
$$ LANGUAGE plpgsql;
```

---

#### Function 3: Get User's Match Feed

**Purpose:** Get profiles to show in swipe feed (exclude already swiped/matched, show only complementary user types)

```sql
CREATE OR REPLACE FUNCTION get_match_feed(
  user_uuid UUID,
  user_latitude DECIMAL,
  user_longitude DECIMAL,
  max_distance_miles INT DEFAULT 50,
  result_limit INT DEFAULT 20
) RETURNS TABLE (
  profile_id UUID,
  name TEXT,
  age INT,
  distance DECIMAL
) AS $$
DECLARE
  current_user_type user_type;
BEGIN
  -- Get current user's type
  SELECT user_type INTO current_user_type
  FROM profiles
  WHERE id = user_uuid;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.age,
    -- Calculate distance using haversine formula
    ROUND(
      (3959 * acos(
        cos(radians(user_latitude)) *
        cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(user_longitude)) +
        sin(radians(user_latitude)) *
        sin(radians(p.latitude))
      ))::numeric,
      1
    ) as distance
  FROM profiles p
  WHERE p.id != user_uuid
    AND p.is_visible = true
    -- COMPLEMENTARY USER TYPE MATCHING
    -- If current user is 'looking-for-place', show only 'finding-roommate' users
    -- If current user is 'finding-roommate', show only 'looking-for-place' users
    AND (
      (current_user_type = 'looking-for-place' AND p.user_type = 'finding-roommate')
      OR
      (current_user_type = 'finding-roommate' AND p.user_type = 'looking-for-place')
    )
    -- Not already swiped
    AND NOT EXISTS (
      SELECT 1 FROM swipes s
      WHERE s.swiper_id = user_uuid
        AND s.swiped_user_id = p.id
    )
    -- Not already matched
    AND NOT EXISTS (
      SELECT 1 FROM matches m
      WHERE (m.user_a_id = user_uuid AND m.user_b_id = p.id)
         OR (m.user_a_id = p.id AND m.user_b_id = user_uuid)
    )
    -- Not pending request to this user
    AND NOT EXISTS (
      SELECT 1 FROM match_requests mr
      WHERE mr.sender_id = user_uuid
        AND mr.recipient_id = p.id
        AND mr.status = 'pending'
    )
    -- Within distance
    AND (3959 * acos(
      cos(radians(user_latitude)) *
      cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(user_longitude)) +
      sin(radians(user_latitude)) *
      sin(radians(p.latitude))
    )) <= max_distance_miles
  ORDER BY distance ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;
```

**Matching Logic Explanation:**

The function implements **complementary matching** based on user types:

| Current User Type    | Shows Profiles Of Type  | Reasoning                                    |
|---------------------|-------------------------|----------------------------------------------|
| `looking-for-place` | `finding-roommate`      | Looking for users who have a place to share  |
| `finding-roommate`  | `looking-for-place`     | Looking for users who need a place           |

This ensures:
- Users looking for a place only see people with available rooms
- Users with a place only see people who need housing
- No mismatched expectations (two people looking for a place won't match)

---

### Row Level Security (RLS) Policies

#### match_requests Policies

```sql
-- Enable RLS
ALTER TABLE match_requests ENABLE ROW LEVEL SECURITY;

-- Users can view requests they sent
CREATE POLICY "Users can view sent requests"
  ON match_requests FOR SELECT
  USING (sender_id = auth.uid());

-- Users can view requests they received
CREATE POLICY "Users can view received requests"
  ON match_requests FOR SELECT
  USING (recipient_id = auth.uid());

-- Users can create requests
CREATE POLICY "Users can create match requests"
  ON match_requests FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Users can update (approve/reject) requests sent to them
CREATE POLICY "Users can update received requests"
  ON match_requests FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Users can delete their sent requests
CREATE POLICY "Users can delete sent requests"
  ON match_requests FOR DELETE
  USING (sender_id = auth.uid());
```

---

#### matches Policies

```sql
-- Enable RLS
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Users can view their matches
CREATE POLICY "Users can view their matches"
  ON matches FOR SELECT
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- Only system can create matches (via function)
CREATE POLICY "System can create matches"
  ON matches FOR INSERT
  WITH CHECK (true);  -- Controlled by application logic
```

---

#### swipes Policies

```sql
-- Enable RLS
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;

-- Users can view their own swipes
CREATE POLICY "Users can view their swipes"
  ON swipes FOR SELECT
  USING (swiper_id = auth.uid());

-- Users can create swipes
CREATE POLICY "Users can create swipes"
  ON swipes FOR INSERT
  WITH CHECK (swiper_id = auth.uid());
```

---

## Sequence Diagrams

### Sequence 1: Sending a Match Request

```
User A          Mobile App       API Server       Database        User B
  │                 │                │                │             │
  │ Swipe Right →   │                │                │             │
  │                 │                │                │             │
  │                 │ POST /requests │                │             │
  │                 │───────────────>│                │             │
  │                 │                │                │             │
  │                 │                │ Check existing │             │
  │                 │                │ interactions   │             │
  │                 │                │───────────────>│             │
  │                 │                │<───────────────│             │
  │                 │                │  (no duplicates)             │
  │                 │                │                │             │
  │                 │                │ Insert request │             │
  │                 │                │───────────────>│             │
  │                 │                │<───────────────│             │
  │                 │                │  (request_id)  │             │
  │                 │                │                │             │
  │                 │                │ Insert swipe   │             │
  │                 │                │───────────────>│             │
  │                 │                │<───────────────│             │
  │                 │                │                │             │
  │                 │                │ Create notification          │
  │                 │                │ for User B     │             │
  │                 │                │───────────────>│             │
  │                 │                │                │             │
  │                 │<───────────────│                │             │
  │                 │  201 Created   │                │             │
  │                 │  {request_id}  │                │             │
  │<────────────────│                │                │             │
  │ Show success    │                │                │             │
  │ toast           │                │                │             │
  │                 │                │                │             │
  │                 │                │  Push notification           │
  │                 │                │─────────────────────────────>│
  │                 │                │  "User A is interested..."   │
  │                 │                │                │             │
  │                 │                │  Real-time subscription      │
  │                 │                │  update (via Supabase)       │
  │                 │                │─────────────────────────────>│
  │                 │<───────────────────────────────────────────── │
  │                 │  Badge updates │                │             │
```

---

### Sequence 2: Approving a Match Request

```
User B          Mobile App       API Server       Database        User A
  │                 │                │                │             │
  │ Tap Approve →   │                │                │             │
  │                 │                │                │             │
  │                 │ POST /approve  │                │             │
  │                 │───────────────>│                │             │
  │                 │                │                │             │
  │                 │                │ Verify request │             │
  │                 │                │ belongs to B   │             │
  │                 │                │───────────────>│             │
  │                 │                │<───────────────│             │
  │                 │                │  (authorized)  │             │
  │                 │                │                │             │
  │                 │                │ Create match   │             │
  │                 │                │───────────────>│             │
  │                 │                │<───────────────│             │
  │                 │                │  (match_id)    │             │
  │                 │                │                │             │
  │                 │                │ Create conversation          │
  │                 │                │───────────────>│             │
  │                 │                │<───────────────│             │
  │                 │                │  (conv_id)     │             │
  │                 │                │                │             │
  │                 │                │ Update match_request         │
  │                 │                │ status: approved             │
  │                 │                │───────────────>│             │
  │                 │                │                │             │
  │                 │                │ Create notification          │
  │                 │                │ for User A     │             │
  │                 │                │───────────────>│             │
  │                 │                │                │             │
  │                 │<───────────────│                │             │
  │                 │  200 OK        │                │             │
  │                 │  {match_id,    │                │             │
  │                 │   conv_id}     │                │             │
  │<────────────────│                │                │             │
  │ Show match      │                │                │             │
  │ success toast   │                │                │             │
  │                 │                │                │             │
  │                 │                │  Push notification           │
  │                 │                │─────────────────────────────>│
  │                 │                │  "User B accepted!"          │
  │                 │                │                │             │
  │                 │                │  Real-time subscription      │
  │                 │                │  update (via Supabase)       │
  │                 │                │─────────────────────────────>│
  │                 │<───────────────────────────────────────────── │
  │                 │  Conversation  │                │             │
  │                 │  appears in    │                │             │
  │                 │  chat list     │                │             │
```

---

### Sequence 3: Rejecting a Match Request

```
User B          Mobile App       API Server       Database        User A
  │                 │                │                │             │
  │ Tap Reject →    │                │                │             │
  │                 │                │                │             │
  │                 │ Show modal     │                │             │
  │                 │ "Reject?"      │                │             │
  │<────────────────│                │                │             │
  │                 │                │                │             │
  │ Confirm →       │                │                │             │
  │                 │                │                │             │
  │                 │ POST /reject   │                │             │
  │                 │───────────────>│                │             │
  │                 │                │                │             │
  │                 │                │ Verify request │             │
  │                 │                │ belongs to B   │             │
  │                 │                │───────────────>│             │
  │                 │                │<───────────────│             │
  │                 │                │  (authorized)  │             │
  │                 │                │                │             │
  │                 │                │ Delete request │             │
  │                 │                │───────────────>│             │
  │                 │                │<───────────────│             │
  │                 │                │                │             │
  │                 │                │ Insert swipe   │             │
  │                 │                │ type: reject   │             │
  │                 │                │───────────────>│             │
  │                 │                │<───────────────│             │
  │                 │                │                │             │
  │                 │<───────────────│                │             │
  │                 │  200 OK        │                │             │
  │<────────────────│                │                │             │
  │ Request removed │                │                │             │
  │ from list       │                │                │             │
  │                 │                │                │             │
  │                 │                │  NO notification sent        │
  │                 │                │  to User A     │             X
  │                 │                │                │
  │                 │                │  User A's sent request       │
  │                 │                │  stays "pending" (no update) │
```

---

### Sequence 4: Mutual Match (Both Swipe Right)

```
User A          User B        API Server       Database
  │                │              │                │
  │ Swipe Right →  │              │                │
  │                │              │                │
  │──────────────────────────────>│                │
  │                │              │ Insert request │
  │                │              │───────────────>│
  │                │              │<───────────────│
  │<──────────────────────────────│  201 Created   │
  │                │              │                │
  │                │ Swipe Right →│                │
  │                │──────────────>│                │
  │                │              │                │
  │                │              │ Check for      │
  │                │              │ reverse request│
  │                │              │───────────────>│
  │                │              │<───────────────│
  │                │              │ (found!)       │
  │                │              │                │
  │                │              │ Create match   │
  │                │              │ is_mutual: true│
  │                │              │───────────────>│
  │                │              │<───────────────│
  │                │              │                │
  │                │              │ Delete both    │
  │                │              │ requests       │
  │                │              │───────────────>│
  │                │              │                │
  │                │<─────────────│  201 Created   │
  │                │              │  {match_id,    │
  │                │              │   is_mutual}   │
  │                │              │                │
  │  Push: "It's a match!"        │                │
  │<──────────────────────────────│                │
  │                │              │                │
  │                │  Push: "It's a match!"        │
  │                │<─────────────│                │
  │                │              │                │
  │  Both see "Match!" screen     │                │
  │<─────────────────────────────>│                │
```

---

## Edge Cases

### 1. Duplicate Swipe Right

**Scenario:** User A swipes right on User B, then tries again

**Database Constraint:** `UNIQUE (sender_id, recipient_id)` on match_requests

**API Response:**
```json
{
  "success": false,
  "error": "REQUEST_ALREADY_SENT",
  "message": "You already sent a request to this user"
}
```

**UI Behavior:**
- Show toast: "You already sent a request to Sarah"
- Don't animate card off screen
- Keep card in place or skip to next

**Prevention:**
- Before making API call, check local state for existing request
- Filter out users with pending outgoing requests from swipe feed

---

### 2. Already Matched

**Scenario:** User A and B are already matched, User A tries to swipe right again

**Database Check:** Query matches table for existing match

**API Response:**
```json
{
  "success": false,
  "error": "ALREADY_MATCHED",
  "message": "You're already matched with this user"
}
```

**UI Behavior:**
- Show toast: "You're already matched with Sarah! Go to Chat to message."
- Skip to next card

**Prevention:**
- Exclude matched users from swipe feed query (see `get_match_feed` function)

---

### 3. Request Expiration

**Scenario:** Match request is very old (30+ days) and should expire

**Implementation Options:**

**Option A: Soft Delete (Recommended)**
```sql
-- Add expiration column
ALTER TABLE match_requests ADD COLUMN expires_at TIMESTAMPTZ;

-- Set expiration to 30 days from creation
UPDATE match_requests
SET expires_at = created_at + INTERVAL '30 days'
WHERE expires_at IS NULL;

-- Filter expired requests in queries
SELECT * FROM match_requests
WHERE status = 'pending'
  AND (expires_at IS NULL OR expires_at > NOW());
```

**Option B: Cron Job**
- Run daily job to delete requests older than 30 days
```sql
DELETE FROM match_requests
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '30 days';
```

**UI Behavior:**
- Expired requests don't appear in "Received Requests"
- Sender's request shows "Expired" status in "Sent Requests"
- Can swipe right again to send new request

---

### 4. Simultaneous Mutual Swipe

**Scenario:** User A and User B both swipe right at nearly the same time

**Race Condition:**
- Both API calls check for reverse request
- Both find none
- Both try to create match_request

**Solution 1: Database-Level Locking**
```sql
-- In the send_match_request function
BEGIN TRANSACTION;

-- Lock the row to prevent concurrent inserts
SELECT * FROM match_requests
WHERE (sender_id = $1 AND recipient_id = $2)
   OR (sender_id = $2 AND recipient_id = $1)
FOR UPDATE;

-- Check if reverse request exists
IF reverse_request_exists THEN
  -- Create match immediately
  INSERT INTO matches...
ELSE
  -- Create match_request
  INSERT INTO match_requests...
END IF;

COMMIT;
```

**Solution 2: Retry Logic**
```typescript
try {
  await sendMatchRequest(userId);
} catch (error) {
  if (error.code === 'UNIQUE_VIOLATION') {
    // Another request was created, check if it's a match now
    const match = await checkIfMatched(currentUserId, userId);
    if (match) {
      showMatchModal();
    }
  }
}
```

**Result:**
- One of the requests succeeds
- The other gets unique constraint violation
- System detects mutual interest and creates match
- Both users see "It's a match!" notification

---

### 5. User Deletes Account After Sending Request

**Scenario:** User A sends request, then deletes their account

**Database Behavior:**
- `ON DELETE CASCADE` removes match_request automatically

**UI Behavior for User B:**
- Request disappears from "Received Requests"
- No error shown (silent removal)

**Alternative:** Keep request but show "User no longer available"

---

### 6. Approve Button Mashing

**Scenario:** User B rapidly taps "Approve" multiple times

**Prevention:**

**Client-Side:**
```typescript
const [isApproving, setIsApproving] = useState(false);

const handleApprove = async (requestId: string) => {
  if (isApproving) return; // Prevent double-tap

  setIsApproving(true);
  try {
    await approveMatchRequest(requestId);
  } finally {
    setIsApproving(false);
  }
};
```

**Server-Side:**
```sql
-- Check that request still exists and is pending
UPDATE match_requests
SET status = 'approved'
WHERE id = $1
  AND status = 'pending' -- Only update if still pending
  AND recipient_id = $2; -- Verify ownership

-- If affected rows = 0, request already processed
```

**Result:**
- First tap processes the approval
- Subsequent taps are ignored
- Only one match is created

---

### 7. Network Failure During Approval

**Scenario:** User B approves request, but network disconnects before response

**Problem:** User doesn't know if approval succeeded

**Solution: Idempotent Retry**

```typescript
const handleApprove = async (requestId: string) => {
  try {
    await approveMatchRequest(requestId);
    // Success - remove from UI
  } catch (error) {
    if (error.code === 'NETWORK_ERROR') {
      // Show retry option
      showRetryDialog({
        message: "Connection lost. Try again?",
        onRetry: () => handleApprove(requestId),
      });
    }
  }
};
```

**Server-Side:**
- Approving an already-approved request returns success (idempotent)
- Check if match already exists before creating duplicate

---

### 8. User Blocks Profile After Receiving Request

**Scenario:** User B receives request from User A, then blocks User A

**Implementation:**
- Add `blocked_users` table
- Delete pending match_request when user is blocked
- Prevent future requests between blocked users

```sql
-- Check if blocked before creating request
SELECT EXISTS (
  SELECT 1 FROM blocked_users
  WHERE (blocker_id = $1 AND blocked_id = $2)
     OR (blocker_id = $2 AND blocked_id = $1)
);
```

---

### 9. Same User Shows Up Multiple Times in Feed

**Scenario:** Due to caching, same user appears twice

**Prevention:**
- Client-side deduplication by user ID
- Track seen user IDs in session state
- Filter out users already in current swipe stack

```typescript
const [seenUserIds, setSeenUserIds] = useState<Set<string>>(new Set());
const [swipeStack, setSwipeStack] = useState<User[]>([]);

const loadMoreProfiles = async () => {
  const profiles = await fetchMatchFeed();

  // Filter out already-seen users
  const newProfiles = profiles.filter(
    p => !seenUserIds.has(p.id)
  );

  setSeenUserIds(new Set([...seenUserIds, ...newProfiles.map(p => p.id)]));
  setSwipeStack([...swipeStack, ...newProfiles]);
};
```

---

### 10. Request from Deleted/Invisible Profile

**Scenario:** User A sends request, then sets profile to invisible

**Query Fix:**
```sql
-- Only show requests from visible profiles
SELECT mr.*, p.*
FROM match_requests mr
JOIN profiles p ON p.id = mr.sender_id
WHERE mr.recipient_id = $1
  AND mr.status = 'pending'
  AND p.is_visible = true; -- Filter out invisible users
```

**UI Behavior:**
- Request doesn't appear in "Received Requests"
- If User A becomes visible again, request reappears

---

### 11. Incompatible User Types

**Scenario:** User A (looking-for-place) tries to send request to User B (also looking-for-place)

**This should be prevented at multiple levels:**

**Level 1: Client-Side (Feed Filtering)**
- User B should never appear in User A's swipe feed
- Frontend only shows complementary user types

**Level 2: API Validation (Defense in Depth)**
```typescript
// In sendMatchRequest() function
const sender = await getProfile(senderId);
const recipient = await getProfile(recipientId);

// Validate complementary user types
const isCompatible = (
  (sender.user_type === 'looking-for-place' && recipient.user_type === 'finding-roommate') ||
  (sender.user_type === 'finding-roommate' && recipient.user_type === 'looking-for-place')
);

if (!isCompatible) {
  throw new Error('INCOMPATIBLE_USER_TYPES');
}
```

**API Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "INCOMPATIBLE_USER_TYPES",
  "message": "This user is not compatible with your profile type"
}
```

**UI Behavior:**
- Should never happen if feed is filtered correctly
- If it does (edge case), show error toast
- Auto-skip to next profile

**Why This Validation Matters:**
- Prevents API manipulation (users calling API directly)
- Ensures data integrity
- Catches bugs in feed filtering logic
- Better error messages for debugging

---

## Notifications & Messages

### Push Notifications

#### 1. Match Request Received

**Trigger:** User A swipes right on User B

**Notification Title:**
```
New Match Request
```

**Notification Body:**
```
Sarah Chen is interested in connecting with you!
```

**Tap Action:**
- Open app to Matches screen
- Scroll to "Pending Requests" section
- Highlight the new request

**Payload:**
```json
{
  "type": "match_request",
  "request_id": "req-uuid-1234",
  "sender_id": "uuid-of-user-a",
  "sender_name": "Sarah Chen",
  "sender_photo": "https://...photo.jpg"
}
```

---

#### 2. Request Approved (Match Created)

**Trigger:** User B approves User A's request

**Notification Title:**
```
It's a Match!
```

**Notification Body:**
```
Sarah Chen accepted your request! You can now chat.
```

**Tap Action:**
- Open app to Chat screen
- Open conversation with Sarah

**Payload:**
```json
{
  "type": "match_approved",
  "match_id": "match-uuid-5678",
  "matched_user_id": "uuid-of-user-b",
  "matched_user_name": "Sarah Chen",
  "conversation_id": "conv-uuid-9999"
}
```

---

#### 3. Mutual Match

**Trigger:** Both users swipe right simultaneously

**Notification Title:**
```
🎉 Instant Match!
```

**Notification Body:**
```
You and Sarah Chen both swiped right!
```

**Tap Action:**
- Open app to full-screen match celebration modal
- Show both profile photos
- "Send Message" button

**Payload:**
```json
{
  "type": "mutual_match",
  "match_id": "match-uuid-5678",
  "matched_user_id": "uuid-of-user-b",
  "matched_user_name": "Sarah Chen",
  "is_mutual": true
}
```

---

### In-App Notifications

#### 1. Match Request Received

**Location:** Notification Bell on Matches screen

**Badge Count:** Number of unread match requests

**Notification Item:**
```
┌─────────────────────────────────────┐
│ 👤 Sarah Chen                       │
│ "Sarah is interested in you"        │
│ 2 hours ago                    [•]  │ ← Unread dot
└─────────────────────────────────────┘
```

**Tap Action:**
- Mark as read
- Navigate to Matches screen
- Scroll to Sarah's request card

---

#### 2. Request Approved

**Location:** Notification Bell on Chat screen

**Badge Count:** Includes new matches

**Notification Item:**
```
┌─────────────────────────────────────┐
│ ✓ Match Confirmed                   │
│ "Sarah Chen accepted your request!" │
│ 5 minutes ago                  [•]  │
└─────────────────────────────────────┘
```

**Tap Action:**
- Mark as read
- Open conversation with Sarah

---

### Toast Messages

#### Success Toasts (Green)

**Request Sent:**
```
✓ Request sent to Sarah!
```

**Match Approved:**
```
✓ You matched with Sarah!
  You can now chat.
```

**Mutual Match:**
```
✓ It's a match!
  You both swiped right.
```

---

#### Error Toasts (Red)

**Already Sent:**
```
⚠ You already sent a request to Sarah
```

**Already Matched:**
```
⚠ You're already matched with Sarah!
  Go to Chat to message.
```

**User Not Found:**
```
⚠ This profile is no longer available
```

---

### Modal Dialogs

#### 1. Match Celebration Modal

**Trigger:** Match is created (approval or mutual swipe)

**Design:**
```
┌─────────────────────────────────────┐
│                                     │
│          IT'S A MATCH! 🎉           │
│                                     │
│     ┌──────┐    ┌──────┐           │
│     │ You  │    │Sarah │           │
│     │ 👤   │    │ 👤   │           │
│     └──────┘    └──────┘           │
│                                     │
│  ┌────────────────────────────┐    │
│  │     Send Message           │    │
│  └────────────────────────────┘    │
│                                     │
│  └ Keep Swiping                     │
│                                     │
└─────────────────────────────────────┘
```

**Animation:**
- Fade in with confetti animation
- Profile photos slide in from sides
- Button pulse animation

**Actions:**
- "Send Message" → Opens chat with matched user
- "Keep Swiping" → Dismisses modal, returns to swipe cards

---

#### 2. Reject Confirmation Modal

**Trigger:** User taps "Reject" on a match request

**Design:**
```
┌─────────────────────────────────────┐
│                                     │
│      Reject Request?                │
│                                     │
│  Sarah won't be notified that you   │
│  rejected their request.            │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │ Cancel   │  │ Reject   │        │
│  └──────────┘  └──────────┘        │
│                                     │
└─────────────────────────────────────┘
```

**Actions:**
- "Cancel" → Dismisses modal, no action taken
- "Reject" → Deletes request, removes from UI

---

### Empty States

#### No Pending Requests

```
┌─────────────────────────────────────┐
│                                     │
│           📭                        │
│                                     │
│      No Pending Requests            │
│                                     │
│  When someone swipes right on you,  │
│  they'll appear here.               │
│                                     │
└─────────────────────────────────────┘
```

---

#### No Sent Requests

```
┌─────────────────────────────────────┐
│                                     │
│           📤                        │
│                                     │
│      No Sent Requests               │
│                                     │
│  Swipe right on profiles you like   │
│  to send a match request!           │
│                                     │
└─────────────────────────────────────┘
```

---

#### No More Profiles

```
┌─────────────────────────────────────┐
│                                     │
│           🎯                        │
│                                     │
│      No More Profiles               │
│                                     │
│  You've seen everyone nearby!       │
│  Check back later for new matches.  │
│                                     │
│  ┌────────────────────────────┐    │
│  │   Adjust Filters           │    │
│  └────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

---

## Implementation Checklist

### Phase 1: Database Setup

- [ ] Create migration file `006_create_matching_system.sql`
- [ ] Create `match_requests` table with indexes
- [ ] Create `matches` table with indexes
- [ ] Create `swipes` table with indexes
- [ ] Add RLS policies for all tables
- [ ] Create `check_mutual_match()` function
- [ ] Create `create_match_from_request()` function
- [ ] Create `get_match_feed()` function
- [ ] Test migrations on development database
- [ ] Add rollback migration

---

### Phase 2: API Layer

- [ ] Create `lib/api/matches.ts`
- [ ] Implement `sendMatchRequest()`
- [ ] Implement `approveMatchRequest()`
- [ ] Implement `rejectMatchRequest()`
- [ ] Implement `getReceivedMatchRequests()`
- [ ] Implement `getSentMatchRequests()`
- [ ] Implement `getMatches()`
- [ ] Implement `recordSwipe()`
- [ ] Add error handling for all functions
- [ ] Add TypeScript types for all responses

---

### Phase 3: TypeScript Types

- [ ] Update `types/index.ts`
- [ ] Add `MatchRequest` interface
- [ ] Add `Match` interface (update existing)
- [ ] Add `Swipe` interface
- [ ] Add `MatchRequestStatus` type
- [ ] Add `SwipeType` type
- [ ] Update `Conversation` interface with `match_id`

---

### Phase 4: UI Components

- [ ] Create `components/MatchRequestCard.tsx`
- [ ] Create `components/MatchCelebrationModal.tsx`
- [ ] Create `components/RejectConfirmationModal.tsx`
- [ ] Create `components/EmptyState.tsx`
- [ ] Add success toast component
- [ ] Add error toast component

---

### Phase 5: Matches Screen Updates

- [ ] Add "Pending Requests" section at top
- [ ] Fetch and display received match requests
- [ ] Implement approve action
- [ ] Implement reject action with confirmation
- [ ] Update swipe right logic to call API
- [ ] Handle mutual match scenario
- [ ] Update card feed to exclude swiped/matched users
- [ ] Add loading states

---

### Phase 6: Chat Screen Updates

- [ ] Add "Sent Requests" section
- [ ] Fetch and display sent match requests
- [ ] Filter conversations to show only matched users
- [ ] Remove "Pending Requests" logic (moved to Matches)
- [ ] Update notification badge logic

---

### Phase 7: Real-Time Features

- [ ] Subscribe to `match_requests` table for new requests
- [ ] Subscribe to `matches` table for new matches
- [ ] Update notification badges in real-time
- [ ] Show instant match modal when mutual match occurs
- [ ] Handle real-time request approvals/rejections

---

### Phase 8: Notifications

- [ ] Set up push notification service
- [ ] Send notification on match request received
- [ ] Send notification on request approved
- [ ] Send notification on mutual match
- [ ] Handle notification tap actions
- [ ] Update in-app notification system

---

### Phase 9: Edge Case Handling

- [ ] Prevent duplicate swipes (client-side check)
- [ ] Handle already matched scenario
- [ ] Implement request expiration (optional)
- [ ] Handle simultaneous mutual swipes
- [ ] Add retry logic for network failures
- [ ] Implement idempotent API operations
- [ ] Filter invisible/deleted users from requests

---

### Phase 10: Testing

- [ ] Unit tests for API functions
- [ ] Integration tests for matching flow
- [ ] Test mutual match scenario
- [ ] Test rejection flow (silent)
- [ ] Test approval flow (creates match + conversation)
- [ ] Test edge cases (duplicates, already matched, etc.)
- [ ] Test real-time subscriptions
- [ ] Test push notifications
- [ ] UI/UX testing on devices
- [ ] Performance testing with large datasets

---

### Phase 11: Documentation

- [ ] Add JSDoc comments to all functions
- [ ] Create API documentation
- [ ] Update README with new features
- [ ] Document database schema changes
- [ ] Create user-facing help documentation

---

### Phase 12: Deployment

- [ ] Run migrations on staging database
- [ ] Deploy API changes to staging
- [ ] Deploy frontend changes to staging
- [ ] QA testing on staging
- [ ] Run migrations on production database
- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Monitor performance metrics

---

## Appendix

### A. Sample Database Queries

#### Get all match requests for a user (with complementary type check)
```sql
SELECT
  mr.*,
  p.name,
  p.age,
  p.user_type,
  p.photos[1] as photo
FROM match_requests mr
JOIN profiles p ON p.id = mr.sender_id
WHERE mr.recipient_id = 'current-user-uuid'
  AND mr.status = 'pending'
  AND p.is_visible = true
  -- Optional: Verify sender is complementary type
  AND (
    (p.user_type = 'looking-for-place' AND
     (SELECT user_type FROM profiles WHERE id = 'current-user-uuid') = 'finding-roommate')
    OR
    (p.user_type = 'finding-roommate' AND
     (SELECT user_type FROM profiles WHERE id = 'current-user-uuid') = 'looking-for-place')
  )
ORDER BY mr.created_at DESC;
```

#### Check if two users are matched
```sql
SELECT EXISTS (
  SELECT 1 FROM matches
  WHERE (user_a_id = $1 AND user_b_id = $2)
     OR (user_a_id = $2 AND user_b_id = $1)
) as is_matched;
```

#### Get user's match count
```sql
SELECT COUNT(*)
FROM matches
WHERE user_a_id = $1 OR user_b_id = $1;
```

---

### B. Performance Considerations

**Index Optimization:**
- Index on `match_requests(recipient_id, status)` for pending requests query
- Index on `matches(user_a_id, user_b_id)` for match lookups
- Composite index on `swipes(swiper_id, swiped_user_id)` for duplicate check

**Query Optimization:**
- Use `LIMIT` and `OFFSET` for pagination
- Use `SELECT DISTINCT` to avoid duplicate results
- Cache frequently accessed data (user profiles) in Redis

**Real-Time Optimization:**
- Use Supabase real-time subscriptions instead of polling
- Debounce notification updates to prevent spam
- Batch multiple notifications into single update

---

### C. Future Enhancements

1. **Undo Last Swipe** - Allow users to undo accidental left swipe
2. **Super Swipe** - Premium feature to skip the request and auto-match
3. **Request Message** - Allow users to add a message with their request
4. **Request Reminders** - Notify users about old pending requests
5. **Match Suggestions** - ML-based recommendations
6. **Video Profiles** - Short video introductions
7. **Compatibility Score** - Show match percentage
8. **Batch Actions** - Approve/reject multiple requests at once
9. **Request Filters** - Filter by distance, age, etc.
10. **Analytics Dashboard** - Show swipe statistics to users

---

**End of Feature Specification**

*Version: 1.0*
*Last Updated: January 2025*
*Author: Claude (Anthropic)*
