# Share & Split Chat Interface - Implementation Plan

## Overview
This document outlines the complete implementation plan for enhancing the existing chat interface with Share & Split features, including expense splitting, typing indicators, enhanced styling, and more.

## Current State Analysis

### ✅ Already Implemented
- Basic messaging system (conversations and messages tables)
- Message sending and receiving
- Real-time message updates via Supabase
- Read status tracking
- User profiles integration
- Basic React Native chat UI

### ⚠️ Partially Implemented
- Read receipts (backend ready, UI needs enhancement)
- Message grouping (basic implementation exists)

### ❌ Not Implemented (Required by Spec)
- Split request system (database + UI)
- Typing indicators
- Message delivery status
- User online status
- Quick actions UI
- Date dividers
- Enhanced styling matching teal gradient spec
- Payment card component

## Database Changes Required

### 1. Split Requests Table
```sql
CREATE TABLE split_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_emoji TEXT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE split_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_request_id UUID REFERENCES split_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  user_name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL
);
```

### 2. User Online Status
```sql
ALTER TABLE profiles ADD COLUMN is_online BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN last_seen TIMESTAMPTZ;
```

### 3. Message Delivery Status
```sql
ALTER TABLE messages ADD COLUMN is_delivered BOOLEAN DEFAULT TRUE;
```

## Component Architecture

### New Components to Create

#### 1. `components/chat/PaymentCard.tsx`
- Displays split request information
- Shows item emoji, name, total amount
- Lists split details for each participant
- Accept/Decline buttons
- Status badges (pending/accepted/declined)

#### 2. `components/chat/TypingIndicator.tsx`
- Animated three-dot indicator
- User avatar
- Fade in/out animation

#### 3. `components/chat/QuickActions.tsx`
- Horizontal scroll of action buttons
- Request split, Share item, Send location actions
- Emoji + text buttons with hover effects

#### 4. `components/chat/DateDivider.tsx`
- Shows "TODAY", "YESTERDAY", or formatted date
- Centered badge with blur effect
- Groups messages by date

#### 5. `components/chat/CreateSplitModal.tsx`
- Modal for creating split requests
- Item name, emoji picker, amount inputs
- Participant selection
- Split type (equal/custom)

### Components to Update

#### 1. `app/(tabs)/chat/[ChatId].tsx`
- Integrate new components
- Apply teal gradient styling from spec
- Add quick actions above input
- Add date dividers between message groups
- Handle split request messages
- Show typing indicators

#### 2. `components/Avatar.tsx` (if needed)
- Add online indicator support
- Pulsing animation for online status

## API Changes Required

### New API Functions in `lib/api/chat.ts`

```typescript
// Split request functions
export async function createSplitRequest(...)
export async function acceptSplitRequest(splitId: string)
export async function declineSplitRequest(splitId: string)

// Typing indicator functions
export async function sendTypingStatus(conversationId: string, isTyping: boolean)
export function subscribeToTypingStatus(conversationId: string, callback: ...)

// Online status functions
export async function updateOnlineStatus(isOnline: boolean)
export function subscribeToOnlineStatus(userId: string, callback: ...)
```

## TypeScript Type Updates

### Add to `types/index.ts`

```typescript
// Split request types
export interface SplitRequest {
  id: string;
  messageId: string;
  itemName: string;
  itemEmoji: string;
  totalAmount: number;
  splits: SplitDetail[];
  status: 'pending' | 'accepted' | 'declined';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SplitDetail {
  userId: string;
  userName: string;
  amount: number;
}

// Enhanced message type
export interface EnhancedMessage extends Message {
  type: 'text' | 'split' | 'system';
  splitRequest?: SplitRequest;
  isDelivered: boolean;
}

// User with online status
export interface UserWithOnlineStatus extends User {
  isOnline: boolean;
  lastSeen?: string;
}
```

## Styling System

### Color Constants
Create `constants/chatColors.ts`:
```typescript
export const chatColors = {
  // Teal palette
  tealLight: '#5a9a9a',
  tealMedium: '#3d7373',
  tealDark: '#2d5555',

  // Accent
  accentGreen: '#6dd5b1',
  successGreen: '#4db896',

  // Gradients
  background: ['#5a9a9a', '#3d7373', '#2d5555'],
  sentMessage: ['#6dd5b1', '#4db896'],

  // Message bubbles
  receivedBubble: 'rgba(255,255,255,0.95)',

  // Text
  onLight: '#2d5555',
  onDark: '#ffffff',
  secondary: '#5a9a9a',
  muted: '#b3d9d9',
};
```

## Implementation Steps

### Phase 1: Database Setup (Day 1)
1. ✅ Create migration for split_requests table
2. ✅ Create migration for split_details table
3. ✅ Add user online status columns
4. ✅ Add message delivery status column
5. ✅ Create RLS policies for all new tables
6. ✅ Create database functions for split operations
7. ✅ Test migrations in Supabase

### Phase 2: Type Definitions (Day 1)
1. ✅ Update types/index.ts with new types
2. ✅ Create chat-specific types file
3. ✅ Update existing Message type to support split requests

### Phase 3: API Layer (Day 2)
1. ✅ Create split request API functions
2. ✅ Create typing indicator functions
3. ✅ Create online status functions
4. ✅ Add real-time subscriptions for new features
5. ✅ Test all API functions

### Phase 4: UI Components (Day 3-4)
1. ✅ Create PaymentCard component
2. ✅ Create TypingIndicator component
3. ✅ Create QuickActions component
4. ✅ Create DateDivider component
5. ✅ Create CreateSplitModal component
6. ✅ Create chat color constants

### Phase 5: Integration (Day 5)
1. ✅ Update chat screen with new components
2. ✅ Apply new styling system
3. ✅ Integrate split request functionality
4. ✅ Add typing indicators
5. ✅ Add date dividers
6. ✅ Add quick actions

### Phase 6: Testing & Polish (Day 6)
1. ✅ Create sample data file
2. ✅ Test all features
3. ✅ Verify animations
4. ✅ Test real-time updates
5. ✅ Mobile responsiveness testing

## File Structure

```
AppRoomeo/
├── supabase/
│   └── migrations/
│       ├── 010_create_split_requests.sql (NEW)
│       ├── 011_add_online_status.sql (NEW)
│       └── 012_add_delivery_status.sql (NEW)
│
├── components/
│   └── chat/ (NEW)
│       ├── PaymentCard.tsx
│       ├── TypingIndicator.tsx
│       ├── QuickActions.tsx
│       ├── DateDivider.tsx
│       └── CreateSplitModal.tsx
│
├── constants/
│   └── chatColors.ts (NEW)
│
├── types/
│   ├── index.ts (UPDATE)
│   └── chat.types.ts (NEW)
│
├── lib/api/
│   └── chat.ts (UPDATE - add split request functions)
│
├── app/(tabs)/chat/
│   └── [ChatId].tsx (UPDATE)
│
└── docs/
    ├── SHARE_SPLIT_CHAT_IMPLEMENTATION_PLAN.md (THIS FILE)
    └── chat_sample_data.ts (NEW)
```

## Risk Assessment

### Potential Issues
1. **Database Migration Conflicts**: Ensure migrations run in order
2. **Real-time Performance**: Typing indicators may cause too many updates
3. **State Management**: Complex state with split requests + messages
4. **Styling Conflicts**: New teal theme vs existing app theme

### Mitigation Strategies
1. Test migrations in development first
2. Debounce typing indicator updates (3s timeout)
3. Use React state carefully, consider context if needed
4. Keep chat-specific colors in separate file

## Success Criteria

### Must Have
- ✅ Split requests can be created, accepted, and declined
- ✅ Messages display with proper styling (teal gradient)
- ✅ Typing indicators show/hide correctly
- ✅ Date dividers appear between message groups
- ✅ Quick actions are functional
- ✅ Real-time updates work for all features
- ✅ Mobile-friendly design

### Nice to Have
- ⏳ Smooth animations on all interactions
- ⏳ Optimistic UI updates for better UX
- ⏳ Error handling and retry mechanisms
- ⏳ Loading states for all async operations

## Testing Checklist

### Database Tests
- [ ] Migrations run without errors
- [ ] RLS policies work correctly
- [ ] Split request creation
- [ ] Split request acceptance/decline
- [ ] Online status updates
- [ ] Delivery status tracking

### API Tests
- [ ] Create split request
- [ ] Accept split request
- [ ] Decline split request
- [ ] Send typing indicator
- [ ] Subscribe to typing indicator
- [ ] Update online status

### UI Tests
- [ ] PaymentCard renders correctly
- [ ] Accept/Decline buttons work
- [ ] TypingIndicator animates
- [ ] QuickActions scroll horizontally
- [ ] DateDividers show correct dates
- [ ] Messages group correctly
- [ ] Styling matches spec
- [ ] Gradients render properly
- [ ] Real-time updates appear

### Integration Tests
- [ ] Full split request flow
- [ ] Multiple users chatting
- [ ] Typing indicators between users
- [ ] Online status updates
- [ ] Date changes handle correctly

## Next Steps

1. Review this plan
2. Get approval to proceed
3. Start with Phase 1 (Database Setup)
4. Work through each phase sequentially
5. Test thoroughly after each phase

---

**Created:** October 29, 2025
**Status:** Ready for Implementation
**Estimated Time:** 6 days (full-time) or 2-3 weeks (part-time)
