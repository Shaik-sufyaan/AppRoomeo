import { useState, useEffect, useCallback, useMemo } from "react";
import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  User,
  Match,
  Conversation,
  MarketplaceListing,
  ExpenseRoom,
  ExpenseEvent,
  Notification,
  UserProfile,
  NotificationCounts,
  Balance,
} from "@/types";
import { mockMarketplaceListings } from "@/mocks/marketplace";

interface AppState {
  currentUser: UserProfile | null;
  hasCompletedOnboarding: boolean;
  matches: Match[];
  conversations: Conversation[];
  marketplaceListings: MarketplaceListing[];
  expenseRooms: ExpenseRoom[];
  expenseEvents: ExpenseEvent[];
  notifications: Notification[];
  isLoading: boolean;
}

export const [AppProvider, useApp] = createContextHook(() => {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    hasCompletedOnboarding: false,
    matches: [],
    conversations: [],
    marketplaceListings: [],
    expenseRooms: [],
    expenseEvents: [],
    notifications: [],
    isLoading: true,
  });

  useEffect(() => {
    loadAppState();
  }, []);

  const loadAppState = async () => {
    try {
      const stored = await AsyncStorage.getItem("appState");
      if (stored) {
        const parsed = JSON.parse(stored);
        setState((prev) => ({ 
          ...prev, 
          ...parsed, 
          marketplaceListings: parsed.marketplaceListings?.length > 0 
            ? parsed.marketplaceListings 
            : mockMarketplaceListings,
          isLoading: false 
        }));
      } else {
        setState((prev) => ({ 
          ...prev, 
          marketplaceListings: mockMarketplaceListings,
          isLoading: false 
        }));
      }
    } catch (error) {
      console.error("Error loading app state:", error);
      setState((prev) => ({ 
        ...prev, 
        marketplaceListings: mockMarketplaceListings,
        isLoading: false 
      }));
    }
  };

  const saveAppState = useCallback(async (newState: Partial<AppState>) => {
    try {
      const updated = { ...state, ...newState };
      await AsyncStorage.setItem("appState", JSON.stringify(updated));
      setState(updated);
    } catch (error) {
      console.error("Error saving app state:", error);
    }
  }, [state]);

  const completeOnboarding = useCallback(async (user: User) => {
    const userProfile: UserProfile = {
      ...user,
      email: undefined,
      isVisible: true,
    };
    await saveAppState({
      currentUser: userProfile,
      hasCompletedOnboarding: true,
    });
  }, [saveAppState]);

  const addMatch = useCallback((match: Match) => {
    setState((prev) => ({
      ...prev,
      matches: [...prev.matches, match],
    }));
  }, []);

  const addConversation = useCallback((conversation: Conversation) => {
    setState((prev) => ({
      ...prev,
      conversations: [...prev.conversations, conversation],
    }));
  }, []);

  const createPendingChat = useCallback((user: User, currentUserId: string) => {
    const existingConv = state.conversations.find((c) => c.user.id === user.id);
    if (existingConv) {
      return existingConv.id;
    }

    const newConversation: Conversation = {
      id: `conv-${Date.now()}-${user.id}`,
      user,
      unreadCount: 0,
      isFriend: false,
      status: "pending",
      initiatedBy: currentUserId,
    };

    setState((prev) => ({
      ...prev,
      conversations: [...prev.conversations, newConversation],
    }));

    const notification: Notification = {
      id: `notif-${Date.now()}`,
      type: "match_request",
      title: "Someone liked your profile",
      message: `Someone is interested in connecting with you!`,
      timestamp: Date.now(),
      read: false,
      userId: currentUserId,
    };

    setState((prev) => ({
      ...prev,
      notifications: [...prev.notifications, notification],
    }));

    return newConversation.id;
  }, [state.conversations]);

  const acceptChatRequest = useCallback((conversationId: string) => {
    setState((prev) => ({
      ...prev,
      conversations: prev.conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, status: "accepted" as const }
          : conv
      ),
    }));
  }, []);

  const rejectChatRequest = useCallback((conversationId: string) => {
    setState((prev) => ({
      ...prev,
      conversations: prev.conversations.filter((conv) => conv.id !== conversationId),
    }));
  }, []);

  const addFriend = useCallback((userId: string) => {
    setState((prev) => ({
      ...prev,
      conversations: prev.conversations.map((conv) =>
        conv.user.id === userId ? { ...conv, isFriend: true } : conv
      ),
    }));
  }, []);

  const startConversation = useCallback((userId: string): string => {
    const existingConv = state.conversations.find((c) => c.user.id === userId);
    if (existingConv) {
      return existingConv.id;
    }

    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      user: state.matches.find((m) => m.user.id === userId)?.user || 
            state.marketplaceListings.find((l) => l.seller.id === userId)?.seller as User,
      unreadCount: 0,
      isFriend: false,
      status: "accepted",
      initiatedBy: state.currentUser?.id,
    };

    setState((prev) => ({
      ...prev,
      conversations: [...prev.conversations, newConversation],
    }));

    return newConversation.id;
  }, [state.conversations, state.matches, state.marketplaceListings]);

  const addMarketplaceListing = useCallback((listing: MarketplaceListing) => {
    setState((prev) => ({
      ...prev,
      marketplaceListings: [...prev.marketplaceListings, listing],
    }));
  }, []);

  const toggleSaveListing = useCallback((listingId: string) => {
    setState((prev) => ({
      ...prev,
      marketplaceListings: prev.marketplaceListings.map((listing) =>
        listing.id === listingId
          ? { ...listing, saved: !listing.saved }
          : listing
      ),
    }));
  }, []);

  const addExpenseRoom = useCallback((room: ExpenseRoom) => {
    setState((prev) => ({
      ...prev,
      expenseRooms: [...prev.expenseRooms, room],
    }));
  }, []);

  const addExpenseEvent = useCallback((event: ExpenseEvent) => {
    setState((prev) => ({
      ...prev,
      expenseEvents: [...prev.expenseEvents, event],
    }));
  }, []);

  const addNotification = useCallback((notification: Notification) => {
    setState((prev) => ({
      ...prev,
      notifications: [...prev.notifications, notification],
    }));
  }, []);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      ),
    }));
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((notif) => ({ ...notif, read: true })),
    }));
  }, []);

  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!state.currentUser) return;
    const updated = { ...state.currentUser, ...updates };
    await saveAppState({ currentUser: updated });
  }, [state.currentUser, saveAppState]);

  const toggleProfileVisibility = useCallback(async () => {
    if (!state.currentUser) return;
    const updated = { ...state.currentUser, isVisible: !state.currentUser.isVisible };
    await saveAppState({ currentUser: updated });
  }, [state.currentUser, saveAppState]);

  const markListingAsSold = useCallback((listingId: string) => {
    setState((prev) => ({
      ...prev,
      marketplaceListings: prev.marketplaceListings.map((listing) =>
        listing.id === listingId
          ? { ...listing, sold: !listing.sold }
          : listing
      ),
    }));
  }, []);

  const removeConversation = useCallback((conversationId: string) => {
    setState((prev) => ({
      ...prev,
      conversations: prev.conversations.filter((conv) => conv.id !== conversationId),
    }));
  }, []);

  const settleRoomBalance = useCallback((roomId: string, userId: string) => {
    setState((prev) => ({
      ...prev,
      expenseRooms: prev.expenseRooms.map((room) => {
        if (room.id !== roomId) return room;
        
        const updatedBalances = room.balances.map((balance) =>
          balance.userId === userId ? { ...balance, settled: true } : balance
        );
        
        const allSettled = updatedBalances.every((b) => b.settled);
        
        return {
          ...room,
          balances: updatedBalances,
          status: allSettled ? ("closed" as const) : room.status,
          settledAt: allSettled ? Date.now() : room.settledAt,
        };
      }),
    }));
  }, []);

  const unreadNotificationCount = useMemo(() => {
    return state.notifications.filter((n) => !n.read).length;
  }, [state.notifications]);

  const notificationCounts = useMemo((): NotificationCounts => {
    const chatUnread = state.conversations.filter(
      (c) => c.unreadCount > 0 && c.status === "accepted"
    ).length;
    const chatPending = state.conversations.filter(
      (c) => c.status === "pending" && c.initiatedBy !== state.currentUser?.id
    ).length;
    
    const marketplaceNotifs = state.notifications.filter(
      (n) => n.type === "marketplace_interest" && !n.read
    ).length;
    
    const expenseNotifs = state.notifications.filter(
      (n) => (n.type === "expense_added" || n.type === "payment_proof") && !n.read
    ).length;
    
    const matchNotifs = state.notifications.filter(
      (n) => n.type === "match_request" && !n.read
    ).length;
    
    return {
      chat: chatUnread + chatPending,
      marketplace: marketplaceNotifs,
      expenses: expenseNotifs,
      matches: matchNotifs,
      total: unreadNotificationCount,
    };
  }, [state.notifications, state.conversations, state.currentUser, unreadNotificationCount]);

  const pendingChatRequests = useMemo(() => {
    return state.conversations.filter(
      (c) => c.status === "pending" && c.initiatedBy !== state.currentUser?.id
    );
  }, [state.conversations, state.currentUser]);

  return useMemo(() => ({
    ...state,
    unreadNotificationCount,
    notificationCounts,
    pendingChatRequests,
    completeOnboarding,
    addMatch,
    addConversation,
    createPendingChat,
    acceptChatRequest,
    rejectChatRequest,
    removeConversation,
    addFriend,
    startConversation,
    addMarketplaceListing,
    toggleSaveListing,
    markListingAsSold,
    addExpenseRoom,
    addExpenseEvent,
    settleRoomBalance,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    updateUserProfile,
    toggleProfileVisibility,
  }), [
    state,
    unreadNotificationCount,
    notificationCounts,
    pendingChatRequests,
    completeOnboarding,
    addMatch,
    addConversation,
    createPendingChat,
    acceptChatRequest,
    rejectChatRequest,
    removeConversation,
    addFriend,
    startConversation,
    addMarketplaceListing,
    toggleSaveListing,
    markListingAsSold,
    addExpenseRoom,
    addExpenseEvent,
    settleRoomBalance,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    updateUserProfile,
    toggleProfileVisibility,
  ]);
});
