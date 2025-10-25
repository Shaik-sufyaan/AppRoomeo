export interface User {
  id: string;
  name: string;
  age: number;
  college?: string;
  workStatus: "part-time" | "full-time" | "not-working";
  smoker: boolean;
  pets: boolean;
  hasPlace: boolean;
  about?: string;
  photos: string[];
  roomPhotos?: string[];
  distance?: number;
}

export interface Match {
  id: string;
  user: User;
  timestamp: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  read: boolean;
}

export interface Conversation {
  id: string;
  user: User;
  lastMessage?: Message;
  unreadCount: number;
  isFriend: boolean;
  status: "pending" | "accepted";
  initiatedBy?: string;
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
