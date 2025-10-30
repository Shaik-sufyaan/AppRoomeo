/**
 * Sample Data for Share & Split Chat Interface Testing
 * Use this data to test the chat interface components
 */

import { EnhancedMessageWithSender, SplitRequest } from '@/types';

// =====================================================
// Sample Users
// =====================================================

export const sampleUsers = {
  currentUser: {
    id: 'user-123',
    name: 'Alex Johnson',
    initials: 'AJ',
    isOnline: true,
  },
  otherUser: {
    id: 'user-456',
    name: 'Sarah Kim',
    initials: 'SK',
    isOnline: true,
  },
};

// =====================================================
// Sample Split Requests
// =====================================================

export const sampleSplitRequests: SplitRequest[] = [
  {
    id: 'split-001',
    messageId: 'msg-004',
    itemName: 'Living Room Couch',
    itemEmoji: '🛋️',
    totalAmount: 200.0,
    splits: [
      {
        userId: 'user-456',
        userName: 'Sarah Kim',
        userInitials: 'SK',
        amount: 100.0,
      },
      {
        userId: 'user-123',
        userName: 'Alex Johnson',
        userInitials: 'AJ',
        amount: 100.0,
      },
    ],
    status: 'pending',
    createdBy: 'user-456',
    createdAt: '2025-10-29T14:17:00.000Z',
    updatedAt: '2025-10-29T14:17:00.000Z',
  },
  {
    id: 'split-002',
    messageId: 'msg-007',
    itemName: 'Pizza Night',
    itemEmoji: '🍕',
    totalAmount: 45.0,
    splits: [
      {
        userId: 'user-456',
        userName: 'Sarah Kim',
        userInitials: 'SK',
        amount: 22.5,
      },
      {
        userId: 'user-123',
        userName: 'Alex Johnson',
        userInitials: 'AJ',
        amount: 22.5,
      },
    ],
    status: 'accepted',
    createdBy: 'user-123',
    createdAt: '2025-10-28T19:30:00.000Z',
    updatedAt: '2025-10-28T19:35:00.000Z',
  },
];

// =====================================================
// Sample Messages
// =====================================================

export const sampleMessages: EnhancedMessageWithSender[] = [
  // Day 1 - Yesterday
  {
    id: 'msg-001',
    conversationId: 'conv-123',
    senderId: 'user-456',
    text: 'Hey! I found this couch on the marketplace 🛋️',
    type: 'text',
    read: true,
    readAt: '2025-10-28T14:16:00.000Z',
    createdAt: '2025-10-28T14:15:00.000Z',
    isDelivered: true,
    sender: {
      id: 'user-456',
      name: 'Sarah Kim',
      photos: [],
    },
    isMe: false,
  },
  {
    id: 'msg-002',
    conversationId: 'conv-123',
    senderId: 'user-456',
    text: "It's $200. Want to split it?",
    type: 'text',
    read: true,
    readAt: '2025-10-28T14:16:30.000Z',
    createdAt: '2025-10-28T14:15:30.000Z',
    isDelivered: true,
    sender: {
      id: 'user-456',
      name: 'Sarah Kim',
      photos: [],
    },
    isMe: false,
  },
  {
    id: 'msg-003',
    conversationId: 'conv-123',
    senderId: 'user-123',
    text: 'Perfect! That works for me 👍',
    type: 'text',
    read: true,
    readAt: '2025-10-28T14:17:00.000Z',
    createdAt: '2025-10-28T14:16:00.000Z',
    isDelivered: true,
    sender: {
      id: 'user-123',
      name: 'Alex Johnson',
      photos: [],
    },
    isMe: true,
  },
  {
    id: 'msg-004',
    conversationId: 'conv-123',
    senderId: 'user-456',
    text: 'Split request: Living Room Couch',
    type: 'split',
    read: true,
    readAt: '2025-10-28T14:18:00.000Z',
    createdAt: '2025-10-28T14:17:00.000Z',
    isDelivered: true,
    splitRequest: sampleSplitRequests[0],
    sender: {
      id: 'user-456',
      name: 'Sarah Kim',
      photos: [],
    },
    isMe: false,
  },
  {
    id: 'msg-005',
    conversationId: 'conv-123',
    senderId: 'user-123',
    text: 'Great! When can we pick it up?',
    type: 'text',
    read: true,
    readAt: '2025-10-28T14:20:00.000Z',
    createdAt: '2025-10-28T14:19:00.000Z',
    isDelivered: true,
    sender: {
      id: 'user-123',
      name: 'Alex Johnson',
      photos: [],
    },
    isMe: true,
  },
  {
    id: 'msg-006',
    conversationId: 'conv-123',
    senderId: 'user-456',
    text: 'The seller said we can pick it up this weekend!',
    type: 'text',
    read: true,
    readAt: '2025-10-28T14:21:00.000Z',
    createdAt: '2025-10-28T14:20:30.000Z',
    isDelivered: true,
    sender: {
      id: 'user-456',
      name: 'Sarah Kim',
      photos: [],
    },
    isMe: false,
  },

  // Day 2 - Today
  {
    id: 'msg-007',
    conversationId: 'conv-123',
    senderId: 'user-123',
    text: 'Split request: Pizza Night',
    type: 'split',
    read: true,
    readAt: '2025-10-29T19:32:00.000Z',
    createdAt: '2025-10-29T19:30:00.000Z',
    isDelivered: true,
    splitRequest: sampleSplitRequests[1],
    sender: {
      id: 'user-123',
      name: 'Alex Johnson',
      photos: [],
    },
    isMe: true,
  },
  {
    id: 'msg-008',
    conversationId: 'conv-123',
    senderId: 'user-456',
    text: 'Sounds good! What toppings did you get?',
    type: 'text',
    read: true,
    readAt: '2025-10-29T19:36:00.000Z',
    createdAt: '2025-10-29T19:35:00.000Z',
    isDelivered: true,
    sender: {
      id: 'user-456',
      name: 'Sarah Kim',
      photos: [],
    },
    isMe: false,
  },
  {
    id: 'msg-009',
    conversationId: 'conv-123',
    senderId: 'user-123',
    text: 'Pepperoni and veggie supreme!',
    type: 'text',
    read: true,
    readAt: '2025-10-29T19:37:00.000Z',
    createdAt: '2025-10-29T19:36:30.000Z',
    isDelivered: true,
    sender: {
      id: 'user-123',
      name: 'Alex Johnson',
      photos: [],
    },
    isMe: true,
  },
  {
    id: 'msg-010',
    conversationId: 'conv-123',
    senderId: 'user-456',
    text: '🎉 Perfect combo!',
    type: 'text',
    read: false,
    createdAt: '2025-10-29T19:37:30.000Z',
    isDelivered: true,
    sender: {
      id: 'user-456',
      name: 'Sarah Kim',
      photos: [],
    },
    isMe: false,
  },
];

// =====================================================
// Utility Functions for Testing
// =====================================================

/**
 * Get messages for a specific date
 */
export function getMessagesByDate(date: string): EnhancedMessageWithSender[] {
  return sampleMessages.filter(msg =>
    msg.createdAt.startsWith(date)
  );
}

/**
 * Get messages from today
 */
export function getTodayMessages(): EnhancedMessageWithSender[] {
  const today = new Date().toISOString().split('T')[0];
  return getMessagesByDate(today);
}

/**
 * Get messages from yesterday
 */
export function getYesterdayMessages(): EnhancedMessageWithSender[] {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  return getMessagesByDate(yesterdayStr);
}

/**
 * Group messages by date
 */
export function groupMessagesByDate(messages: EnhancedMessageWithSender[]): {
  date: string;
  messages: EnhancedMessageWithSender[];
}[] {
  const groups: { [key: string]: EnhancedMessageWithSender[] } = {};

  messages.forEach(msg => {
    const date = new Date(msg.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(msg);
  });

  return Object.entries(groups).map(([date, messages]) => ({
    date,
    messages,
  }));
}

// =====================================================
// Mock API Responses
// =====================================================

/**
 * Simulate sending a message
 */
export function mockSendMessage(text: string): EnhancedMessageWithSender {
  return {
    id: `msg-${Date.now()}`,
    conversationId: 'conv-123',
    senderId: sampleUsers.currentUser.id,
    text,
    type: 'text',
    read: false,
    createdAt: new Date().toISOString(),
    isDelivered: true,
    sender: {
      id: sampleUsers.currentUser.id,
      name: sampleUsers.currentUser.name,
      photos: [],
    },
    isMe: true,
  };
}

/**
 * Simulate creating a split request
 */
export function mockCreateSplitRequest(
  itemName: string,
  itemEmoji: string,
  totalAmount: number
): EnhancedMessageWithSender {
  const splitRequest: SplitRequest = {
    id: `split-${Date.now()}`,
    messageId: `msg-${Date.now()}`,
    itemName,
    itemEmoji,
    totalAmount,
    splits: [
      {
        userId: sampleUsers.currentUser.id,
        userName: sampleUsers.currentUser.name,
        userInitials: sampleUsers.currentUser.initials,
        amount: totalAmount / 2,
      },
      {
        userId: sampleUsers.otherUser.id,
        userName: sampleUsers.otherUser.name,
        userInitials: sampleUsers.otherUser.initials,
        amount: totalAmount / 2,
      },
    ],
    status: 'pending',
    createdBy: sampleUsers.currentUser.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    id: splitRequest.messageId,
    conversationId: 'conv-123',
    senderId: sampleUsers.currentUser.id,
    text: `Split request: ${itemName}`,
    type: 'split',
    read: false,
    createdAt: new Date().toISOString(),
    isDelivered: true,
    splitRequest,
    sender: {
      id: sampleUsers.currentUser.id,
      name: sampleUsers.currentUser.name,
      photos: [],
    },
    isMe: true,
  };
}
