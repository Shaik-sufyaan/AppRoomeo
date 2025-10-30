# Share & Split Chat Interface - Complete Implementation Specification

## Overview
This is a complete specification for implementing a chat interface for the Share & Split app - a marketplace and expense-splitting platform for students. The chat enables users to discuss items, request expense splits, and coordinate purchases.

## Table of Contents
1. [Design System](#design-system)
2. [Component Architecture](#component-architecture)
3. [Features & Functionality](#features--functionality)
4. [Data Structures](#data-structures)
5. [Animations & Interactions](#animations--interactions)
6. [Implementation Notes](#implementation-notes)

---

## Design System

### Color Palette
```
Primary Colors:
- Teal Light: #5a9a9a (header, background gradient start)
- Teal Medium: #3d7373 (mid-gradient, secondary elements)
- Teal Dark: #2d5555 (deep gradient, text color, borders)

Accent Colors:
- Accent Green: #6dd5b1 (CTA buttons, sent messages, primary actions)
- Success Green: #4db896 (gradient end, active states)

Background:
- Main Background: linear-gradient(180deg, #5a9a9a 0%, #3d7373 50%, #2d5555 100%)

Message Bubbles:
- Received: rgba(255,255,255,0.95) with 0 2px 8px rgba(0,0,0,0.15) shadow
- Sent: linear-gradient(135deg, #6dd5b1 0%, #4db896 100%) with 0 4px 12px rgba(109,213,177,0.4) shadow

Text Colors:
- On Light Background: #2d5555
- On Dark Background: #ffffff
- Secondary Text: #5a9a9a
- Tertiary Text: rgba(255,255,255,0.6)
- Muted Text: #b3d9d9
```

### Typography
```
Font Family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif

Font Sizes:
- User Name: 16px, font-weight: 700
- User Status: 12px, font-weight: 500
- Message Text: 15px, font-weight: 400, line-height: 1.4
- Timestamp: 11px, font-weight: 400
- Button Text: 14px, font-weight: 600
- Quick Action: 13px, font-weight: 600
- Payment Amount: 24px, font-weight: 700
- Payment Title: 15px, font-weight: 700
- Payment Info: 13px, font-weight: 400
```

### Spacing System
```
- Extra Small: 4px (tight gaps)
- Small: 8px (standard gaps between elements)
- Medium: 12px (section spacing)
- Large: 16px (major spacing, container padding)
- Extra Large: 32px (bottom safe area)
```

### Border Radius
```
- Small: 4px (message bubble corners - directional)
- Medium: 12px (payment card elements)
- Large: 16px (cards)
- X-Large: 18px (message bubbles)
- XX-Large: 20px (input field, badges)
- Circle: 50% (avatars, buttons)
```

### Shadows
```
- Subtle: 0 2px 8px rgba(0,0,0,0.15)
- Medium: 0 4px 12px rgba(0,0,0,0.2)
- Accent Glow: 0 4px 12px rgba(109,213,177,0.4)
- Hover Glow: 0 4px 15px rgba(109,213,177,0.6)
```

---

## Component Architecture

### 1. ChatContainer (Main Component)
The root component containing all chat functionality.

**Props:**
- `chatId: string` - Unique identifier for the chat
- `currentUserId: string` - ID of current logged-in user
- `otherUser: User` - Information about the chat partner
- `messages: Message[]` - Array of messages
- `onSendMessage: (content: string) => void` - Callback for sending messages
- `onSplitRequest: (split: SplitRequest) => void` - Callback for split requests
- `onAcceptSplit: (splitId: string) => void` - Callback for accepting splits
- `onDeclineSplit: (splitId: string) => void` - Callback for declining splits

**Structure:**
```
ChatContainer
├── StatusBar
├── ChatHeader
├── MessagesContainer
│   ├── DateDivider (multiple)
│   ├── MessageGroup (multiple)
│   │   ├── MessageAvatar
│   │   ├── MessageContent
│   │   │   ├── MessageBubble or PaymentCard
│   │   │   └── MessageTime
│   │   └── ReadReceipt (for sent messages)
│   └── TypingIndicator (conditional)
└── InputContainer
    ├── QuickActions
    └── InputWrapper
        ├── AttachButton
        ├── MessageInput
        └── SendButton
```

### 2. ChatHeader
Displays user information and actions.

**Elements:**
- Back button (circle, 32px diameter)
- User avatar (42px diameter) with gradient background (#6dd5b1 to #4db896)
- Online indicator (14px circle, #6dd5b1, pulsing animation)
- User name (16px, bold)
- User status ("Active now" in #b3d9d9)
- More options button (36px diameter)

**Styling:**
- Background: rgba(0,0,0,0.2) with backdrop-filter: blur(10px)
- Border: 1px solid rgba(255,255,255,0.1) bottom
- Padding: 12px 16px
- Height: auto

### 3. MessageBubble
Standard text message display.

**Props:**
- `content: string` - Message text
- `isSent: boolean` - Whether current user sent it
- `timestamp: Date` - When message was sent
- `isRead: boolean` - Read status (for sent messages)

**Styling for Received Messages:**
- Background: rgba(255,255,255,0.95)
- Color: #2d5555
- Border-radius: 18px (4px bottom-left)
- Shadow: 0 2px 8px rgba(0,0,0,0.15)
- Padding: 12px 16px
- Max-width: 70%
- Align: left

**Styling for Sent Messages:**
- Background: linear-gradient(135deg, #6dd5b1 0%, #4db896 100%)
- Color: white
- Border-radius: 18px (4px bottom-right)
- Shadow: 0 4px 12px rgba(109,213,177,0.4)
- Padding: 12px 16px
- Max-width: 70%
- Align: right

### 4. PaymentCard (Split Request Card)
Special message type for expense splitting.

**Props:**
- `splitId: string` - Unique identifier
- `itemName: string` - Name of item/expense
- `itemEmoji: string` - Emoji icon (e.g., "🛋️")
- `totalAmount: number` - Total cost
- `splits: SplitDetail[]` - Array of split details
- `status: 'pending' | 'accepted' | 'declined'` - Current status
- `onAccept: () => void` - Accept handler
- `onDecline: () => void` - Decline handler

**Structure:**
```html
<div class="payment-card">
  <div class="payment-header">
    <div class="payment-icon">{emoji}</div>
    <div class="payment-info">
      <h4>{itemName}</h4>
      <p>Split expense request</p>
    </div>
  </div>
  <div class="payment-amount">${totalAmount}</div>
  <div class="payment-splits">
    {splits.map(split => (
      <div class="payment-split">
        <div class="split-user">
          <div class="split-avatar">{initials}</div>
          <span>{name}</span>
        </div>
        <div class="split-amount">${amount}</div>
      </div>
    ))}
  </div>
  <div class="payment-actions">
    <button class="payment-button primary" onClick={onAccept}>
      Accept Split
    </button>
    <button class="payment-button secondary" onClick={onDecline}>
      Decline
    </button>
  </div>
</div>
```

**Styling:**
- Background: rgba(255,255,255,0.95)
- Border-radius: 16px
- Padding: 16px
- Shadow: 0 4px 12px rgba(0,0,0,0.15)
- Max-width: 85%

**Payment Icon:**
- Size: 40px × 40px
- Border-radius: 12px
- Background: linear-gradient(135deg, #6dd5b1 0%, #4db896 100%)
- Center emoji (font-size: 20px)

**Amount Display:**
- Font-size: 24px
- Font-weight: 700
- Color: #2d5555
- Margin: 12px 0

**Split Details:**
- Border-top: 1px solid rgba(93,154,154,0.2)
- Padding: 12px 0
- Display: flex, justify-content: space-between

**Buttons:**
Primary (Accept):
- Background: linear-gradient(135deg, #6dd5b1 0%, #4db896 100%)
- Color: white
- Border: none
- Border-radius: 12px
- Padding: 10px
- Font-weight: 600
- Shadow: 0 2px 8px rgba(109,213,177,0.3)
- Hover: shadow increases, translateY(-1px)

Secondary (Decline):
- Background: transparent
- Color: #5a9a9a
- Border: 2px solid rgba(93,154,154,0.3)
- Border-radius: 12px
- Padding: 10px
- Font-weight: 600
- Hover: border solid, background rgba(93,154,154,0.1)

### 5. TypingIndicator
Shows when other user is typing.

**Structure:**
```html
<div class="typing-indicator">
  <div class="message-avatar">{initials}</div>
  <div class="typing-dots">
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  </div>
</div>
```

**Dot Animation:**
```css
@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-8px);
    opacity: 1;
  }
}

.typing-dot {
  width: 8px;
  height: 8px;
  background: #5a9a9a;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
```

### 6. QuickActions
Shortcut buttons for common actions.

**Actions:**
1. "💰 Request split" - Opens split request form
2. "📦 Share item" - Opens item sharing
3. "📍 Send location" - Shares location

**Styling:**
- Background: rgba(255,255,255,0.15) with backdrop-filter: blur(10px)
- Border: 1px solid rgba(255,255,255,0.2)
- Color: white
- Padding: 8px 16px
- Border-radius: 20px
- Font-size: 13px, font-weight: 600
- Display: horizontal scroll (hide scrollbar)
- Hover: background rgba(109,213,177,0.3), border #6dd5b1

### 7. MessageInput
Text input area for composing messages.

**Features:**
- Auto-resize textarea (min 40px, max 100px)
- Placeholder: "Type a message..."
- Attach button (left)
- Send button (right)

**Styling:**
- Background: rgba(255,255,255,0.95)
- Border: 1px solid rgba(255,255,255,0.3)
- Border-radius: 20px
- Padding: 10px 16px
- Font-size: 15px
- Color: #2d5555
- Resize: none

**Focus State:**
- Background: white
- Border-color: #6dd5b1
- Box-shadow: 0 0 0 3px rgba(109,213,177,0.2)
- Transition: all 0.3s

**Buttons (40px diameter, circular):**
Attach Button:
- Background: rgba(255,255,255,0.15)
- Color: white
- Icon: paperclip (20px)

Send Button:
- Background: linear-gradient(135deg, #6dd5b1 0%, #4db896 100%)
- Color: white
- Icon: paper plane (20px)
- Shadow: 0 2px 8px rgba(109,213,177,0.4)
- Hover: scale(1.1), shadow 0 4px 12px rgba(109,213,177,0.6)

---

## Features & Functionality

### 1. Standard Messaging
- Send and receive text messages
- Messages grouped by sender
- Show avatar for first message in group
- Timestamp below each message group
- Read receipts (✓✓) for sent messages
- Auto-scroll to bottom on new message

### 2. Split Request System
**Creating a Split:**
1. User clicks "💰 Request split" quick action
2. Form opens with fields:
   - Item name (text input)
   - Item emoji (emoji picker)
   - Total amount (number input)
   - Participants (checkboxes)
   - Split type (equal/custom)
3. Submit creates PaymentCard message
4. Card appears in chat with "Pending" status

**Accepting a Split:**
1. User clicks "Accept Split" button
2. Confirmation modal shows details
3. On confirm, processes payment
4. Card updates to "Accepted" status
5. Confirmation message appears
6. Both users notified

**Declining a Split:**
1. User clicks "Decline" button
2. Optional reason field
3. Card updates to "Declined" status
4. Sender notified

### 3. Typing Indicators
- Show when other user is typing
- Appear with slide-in animation
- Remove when user stops typing (3s timeout)
- Three animated dots in teal color

### 4. Read Receipts
- Single checkmark: Delivered
- Double checkmark: Read
- Green color (#6dd5b1)
- Appear to right of timestamp on sent messages

### 5. Date Dividers
- Show "TODAY" for today's messages
- Show "YESTERDAY" for yesterday
- Show formatted date (e.g., "Oct 21, 2025") for older
- Centered badge with:
  - Background: rgba(0,0,0,0.3)
  - Backdrop-filter: blur(10px)
  - Color: rgba(255,255,255,0.8)
  - Padding: 6px 14px
  - Border-radius: 20px
  - Font-size: 11px, uppercase

### 6. Online Status
- Green dot (14px) on avatar
- "Active now" text in header
- Update in real-time
- Pulsing animation on indicator

### 7. Quick Actions
- Three buttons above input
- Click to trigger action or fill input
- Horizontal scroll on mobile
- Hover effects

---

## Data Structures

### User Type
```typescript
interface User {
  id: string;
  name: string;
  initials: string;
  avatar?: string; // URL to avatar image (optional)
  isOnline: boolean;
  lastSeen?: Date;
}
```

### Message Type
```typescript
interface Message {
  id: string;
  chatId: string;
  senderId: string;
  type: 'text' | 'split' | 'system';
  content?: string; // For text messages
  splitRequest?: SplitRequest; // For split messages
  timestamp: Date;
  isRead: boolean;
  isDelivered: boolean;
}
```

### SplitRequest Type
```typescript
interface SplitRequest {
  id: string;
  itemName: string;
  itemEmoji: string;
  totalAmount: number;
  splits: SplitDetail[];
  status: 'pending' | 'accepted' | 'declined';
  createdBy: string;
  createdAt: Date;
}

interface SplitDetail {
  userId: string;
  userName: string;
  userInitials: string;
  amount: number;
}
```

### Chat State
```typescript
interface ChatState {
  messages: Message[];
  otherUser: User;
  currentUserId: string;
  isTyping: boolean;
  isLoading: boolean;
}
```

---

## Animations & Interactions

### Message Slide-In
```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-group {
  animation: slideIn 0.3s ease-out;
}
```

### Button Hover Effects
```css
.input-button:hover {
  transform: scale(1.05);
  transition: all 0.3s;
}

.send-button:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(109,213,177,0.6);
}

.payment-button.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(109,213,177,0.5);
}
```

### Input Focus
```css
.message-input:focus {
  background: white;
  border-color: #6dd5b1;
  box-shadow: 0 0 0 3px rgba(109,213,177,0.2);
  transition: all 0.3s;
}
```

### Online Indicator Pulse
```css
@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(16,185,129,0.7);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(16,185,129,0);
  }
}

.online-indicator {
  animation: pulse 2s infinite;
}
```

### Message Bubble Hover
```css
.message-bubble:hover {
  transform: scale(1.02);
  transition: transform 0.2s;
}
```

---

## Implementation Notes

### State Management
Use React hooks (useState, useEffect) or a state management library (Redux, Zustand) to handle:
- Messages array
- Typing status
- User online status
- Input value
- Split request modals

### Real-time Updates
Integrate with WebSocket or Firebase for:
- Receiving new messages
- Typing indicators
- Read receipts
- Online status changes

### Scroll Behavior
- Auto-scroll to bottom on mount
- Auto-scroll on new message (if already near bottom)
- Smooth scroll animation
- "Scroll to bottom" button if user scrolls up

### Input Auto-resize
```javascript
const handleInput = (e) => {
  e.target.style.height = 'auto';
  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
};
```

### Message Grouping
Group consecutive messages from same sender within 2 minutes:
```javascript
const shouldGroupWithPrevious = (currentMsg, prevMsg) => {
  if (!prevMsg) return false;
  if (currentMsg.senderId !== prevMsg.senderId) return false;
  
  const timeDiff = currentMsg.timestamp - prevMsg.timestamp;
  return timeDiff < 2 * 60 * 1000; // 2 minutes
};
```

### Date Formatting
```javascript
const formatMessageDate = (date) => {
  const today = new Date();
  const msgDate = new Date(date);
  
  if (isSameDay(today, msgDate)) return 'TODAY';
  if (isYesterday(msgDate)) return 'YESTERDAY';
  return msgDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};
```

### Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus management for modals
- Screen reader announcements for new messages
- Sufficient color contrast (already met)
- Touch targets minimum 44×44px (already met)

### Performance
- Virtualize message list for long conversations (react-window)
- Lazy load older messages on scroll up
- Optimize re-renders with React.memo
- Debounce typing indicator updates
- Compress images before sending

### Error Handling
- Show error toast for failed messages
- Retry button for failed sends
- Validate payment amounts
- Handle network errors gracefully
- Clear error states appropriately

### Mobile Optimization
- Touch-friendly button sizes (44px minimum)
- Prevent zoom on input focus
- Handle keyboard appearance
- Safe area insets for notched devices
- Swipe gestures (optional: swipe to reply)

---

## Example Implementation Structure

```
src/
├── components/
│   ├── Chat/
│   │   ├── ChatContainer.tsx
│   │   ├── ChatHeader.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── PaymentCard.tsx
│   │   ├── TypingIndicator.tsx
│   │   ├── MessageInput.tsx
│   │   ├── QuickActions.tsx
│   │   └── DateDivider.tsx
│   └── shared/
│       ├── Avatar.tsx
│       └── Button.tsx
├── types/
│   └── chat.types.ts
├── hooks/
│   ├── useChat.ts
│   └── useTypingIndicator.ts
├── utils/
│   ├── dateFormatting.ts
│   └── messageGrouping.ts
└── styles/
    └── chat.css
```

---

## Sample Data

### Sample Messages
```javascript
const sampleMessages = [
  {
    id: '1',
    chatId: 'chat-123',
    senderId: 'user-456',
    type: 'text',
    content: 'Hey! I found this couch on the marketplace 🛋️',
    timestamp: new Date('2025-10-29T14:15:00'),
    isRead: true,
    isDelivered: true,
  },
  {
    id: '2',
    chatId: 'chat-123',
    senderId: 'user-456',
    type: 'text',
    content: 'It\'s $200. Want to split it?',
    timestamp: new Date('2025-10-29T14:15:30'),
    isRead: true,
    isDelivered: true,
  },
  {
    id: '3',
    chatId: 'chat-123',
    senderId: 'user-789',
    type: 'text',
    content: 'Perfect! That works for me 👍',
    timestamp: new Date('2025-10-29T14:16:00'),
    isRead: true,
    isDelivered: true,
  },
  {
    id: '4',
    chatId: 'chat-123',
    senderId: 'user-456',
    type: 'split',
    splitRequest: {
      id: 'split-001',
      itemName: 'Living Room Couch',
      itemEmoji: '🛋️',
      totalAmount: 200.00,
      splits: [
        {
          userId: 'user-456',
          userName: 'Sarah',
          userInitials: 'SK',
          amount: 100.00,
        },
        {
          userId: 'user-789',
          userName: 'You',
          userInitials: 'ME',
          amount: 100.00,
        },
      ],
      status: 'pending',
      createdBy: 'user-456',
      createdAt: new Date('2025-10-29T14:17:00'),
    },
    timestamp: new Date('2025-10-29T14:17:00'),
    isRead: false,
    isDelivered: true,
  },
];
```

---

## Testing Checklist

### Visual Testing
- [ ] Messages display correctly (sent/received)
- [ ] Colors match specification exactly
- [ ] Gradients render smoothly
- [ ] Shadows appear as specified
- [ ] Text is readable on all backgrounds
- [ ] Avatars display properly
- [ ] PaymentCard renders correctly
- [ ] Buttons styled correctly

### Functional Testing
- [ ] Send message works
- [ ] Messages appear in correct order
- [ ] Typing indicator shows/hides
- [ ] Read receipts update
- [ ] Split request accepts
- [ ] Split request declines
- [ ] Quick actions trigger correctly
- [ ] Input auto-resizes
- [ ] Scroll behavior works
- [ ] Date dividers show correctly

### Interaction Testing
- [ ] All buttons respond to hover
- [ ] All buttons respond to click
- [ ] Input focus works
- [ ] Animations play smoothly
- [ ] Touch targets are adequate
- [ ] Keyboard navigation works

### Responsive Testing
- [ ] Works on iPhone SE (375px)
- [ ] Works on iPhone Pro (390px)
- [ ] Works on iPhone Pro Max (430px)
- [ ] Works on iPad (768px+)
- [ ] Keyboard doesn't cover input
- [ ] Safe areas respected

### Performance Testing
- [ ] Smooth scrolling with 100+ messages
- [ ] No lag on input
- [ ] Animations run at 60fps
- [ ] Memory usage acceptable
- [ ] No memory leaks

---

## Additional Features (Future Enhancement)

### Phase 2 Features
1. **Message Reactions** - Emoji reactions like 👍 ❤️ 😂
2. **Reply to Message** - Quote and reply to specific messages
3. **Edit Messages** - Edit sent messages (with indicator)
4. **Delete Messages** - Delete for self or everyone
5. **Voice Messages** - Record and send audio
6. **Image Sharing** - Share photos from gallery or camera
7. **Link Previews** - Rich previews for shared URLs
8. **Search Messages** - Search within conversation
9. **Message Forwarding** - Forward to other chats
10. **Pin Messages** - Pin important messages to top

### Phase 3 Features
1. **Video Messages** - Record and send video clips
2. **Location Sharing** - Share current location on map
3. **Poll Creation** - Create polls for group decisions
4. **Scheduled Messages** - Schedule messages for later
5. **Message Translation** - Translate messages to other languages
6. **Dark Mode** - Full dark theme support
7. **Custom Themes** - User-selectable color themes
8. **Message Export** - Export chat history
9. **Backup & Restore** - Cloud backup of conversations
10. **End-to-End Encryption** - Secure messaging

---

## Support & Documentation

For questions or issues during implementation:
1. Refer to this specification document
2. Check React/React Native documentation
3. Review accessibility guidelines (WCAG 2.1)
4. Test on real devices, not just simulators
5. Follow mobile best practices

**Version:** 1.0  
**Last Updated:** October 29, 2025  
**Platform:** React / React Native  
**Target Devices:** iOS 14+, Android 10+

---

END OF SPECIFICATION