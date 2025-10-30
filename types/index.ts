export type UserType = "looking-for-place" | "finding-roommate";

export interface User {
  id: string;
  name: string;
  age: number;
  userType?: UserType;
  college?: string;
  workStatus: "part-time" | "full-time" | "not-working";
  smoker: boolean;
  pets: boolean;
  hasPlace: boolean;
  about?: string;
  photos: string[];
  roomPhotos?: string[];
  distance?: number;
  // Online status (for chat)
  isOnline?: boolean;
  lastSeen?: string;
}

export interface Match {
  id: string;
  user: User;
  timestamp: number;
}

// New matching system types
export interface MatchRequest {
  id: string;
  senderId: string;
  recipientId: string;
  status: "pending" | "approved" | "rejected";
  message?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface MatchRequestWithUser extends MatchRequest {
  user: User;
}

export interface ConfirmedMatch {
  id: string;
  userAId: string;
  userBId: string;
  matchedAt: string;
  isMutual: boolean;
}

export interface ConfirmedMatchWithUser extends ConfirmedMatch {
  matchedUser: User;
}

export type SwipeType = "like" | "skip" | "reject";

export interface SwipeRecord {
  id: string;
  swiperId: string;
  swipedUserId: string;
  swipeType: SwipeType;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  // Message delivery status
  isDelivered?: boolean;
}

export interface MessageWithSender extends Message {
  sender: {
    id: string;
    name: string;
    photos: string[];
  };
  isMe?: boolean; // Helper for UI
}

// Enhanced message type supporting different message types
export type MessageType = 'text' | 'split' | 'system';

export interface EnhancedMessage extends Message {
  type: MessageType;
  splitRequest?: SplitRequest;
}

export interface EnhancedMessageWithSender extends EnhancedMessage {
  sender: {
    id: string;
    name: string;
    photos: string[];
  };
  isMe?: boolean;
}

export interface Conversation {
  id: string;
  userAId: string;
  userBId: string;
  contextType?: 'marketplace' | 'match' | 'general';
  contextId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationWithDetails extends Conversation {
  otherUser: {
    id: string;
    name: string;
    photos: string[];
    userType: 'looking-for-place' | 'finding-roommate';
    age: number;
  };
  lastMessage?: {
    id: string;
    text: string;
    senderId: string;
    createdAt: string;
    read: boolean;
  };
  unreadCount: number;
}

export interface MarketplaceListing {
  id: string;
  title: string;
  price: number;
  description: string;
  category: "furniture" | "household" | "other";
  images: string[];
  seller: User;
  location: string;
  timestamp: number;
  saved: boolean;
  sold: boolean;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  participants: string[];
  splitMethod: "equal" | "custom";
  timestamp: number;
  settled: boolean;
}

export interface ExpenseRoom {
  id: string;
  name: string;
  description?: string;
  amount: number;
  members: User[];
  createdBy: string;
  balances: Balance[];
  expenses: Expense[];
  totalBalance: number;
  status: "active" | "closed";
  createdAt: number;
  settledAt?: number;
}

export interface ExpenseEvent {
  id: string;
  name: string;
  description?: string;
  amount: number;
  date: number;
  participants: User[];
  createdBy: string;
  rooms: ExpenseRoom[];
  expenses: Expense[];
  totalBalance: number;
  status: "active" | "closed";
  createdAt: number;
}

export type NotificationType =
  | "match_request"
  | "match_approved"
  | "mutual_match"
  | "marketplace_interest"
  | "expense_added"
  | "chat_message"
  | "payment_proof";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  userId?: string;
  itemId?: string;
}

export interface UserProfile extends User {
  email?: string;
  isVisible: boolean;
}

export interface Balance {
  userId: string;
  userName: string;
  amount: number;
  settled: boolean;
}

export interface ChatNotificationCount {
  unread: number;
  pending: number;
}

export interface NotificationCounts {
  chat: number;
  marketplace: number;
  expenses: number;
  matches: number;
  total: number;
}

// =====================================================
// SPLIT REQUEST TYPES (for Share & Split Chat feature)
// =====================================================

export interface SplitDetail {
  id?: string;
  userId: string;
  userName: string;
  userInitials?: string;
  amount: number;
}

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

export interface CreateSplitRequestInput {
  messageId: string;
  itemName: string;
  itemEmoji: string;
  totalAmount: number;
  splits: {
    userId: string;
    userName: string;
    amount: number;
  }[];
}

// =====================================================
// TYPING INDICATOR TYPES
// =====================================================

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  updatedAt: string;
}
