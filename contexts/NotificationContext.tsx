import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import NotificationToast from '@/components/NotificationToast';
import { useRouter } from 'expo-router';
import {
  registerPushToken,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  AppNotification,
} from '@/lib/api/notifications';

interface NotificationCounts {
  matchRequests: number;
  messages: number;
  marketplace: number;
  total: number;
}

interface NotificationContextType {
  notificationCounts: NotificationCounts;
  refreshNotifications: () => Promise<void>;
  markMatchRequestsAsViewed: () => void;
  markMessagesAsViewed: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [notificationCounts, setNotificationCounts] = useState<NotificationCounts>({
    matchRequests: 0,
    messages: 0,
    marketplace: 0,
    total: 0,
  });

  const [matchRequestChannel, setMatchRequestChannel] = useState<RealtimeChannel | null>(null);
  const [messageChannel, setMessageChannel] = useState<RealtimeChannel | null>(null);
  const notificationChannelRef = useRef<RealtimeChannel | null>(null);

  // Toast notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastData, setToastData] = useState<{
    title: string;
    message: string;
    type: 'match' | 'message' | 'general';
    senderName?: string;
    senderPhoto?: string;
    screen?: string;
    screenParams?: any;
  }>({
    title: '',
    message: '',
    type: 'general',
  });

  // Load notification counts
  const loadNotificationCounts = useCallback(async () => {
    if (!user) {
      setNotificationCounts({
        matchRequests: 0,
        messages: 0,
        marketplace: 0,
        total: 0,
      });
      return;
    }

    try {
      // Count pending match requests
      const { count: matchRequestCount } = await supabase
        .from('match_requests')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('status', 'pending');

      // First, get all conversation IDs for the user
      const { data: userConversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

      let messageCount = 0;

      if (userConversations && userConversations.length > 0) {
        // Get conversation IDs as an array
        const conversationIds = userConversations.map(c => c.id);

        // Count unread messages in those conversations
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('read', false)
          .neq('sender_id', user.id)
          .in('conversation_id', conversationIds);

        messageCount = count || 0;
      }

      const counts = {
        matchRequests: matchRequestCount || 0,
        messages: messageCount,
        marketplace: 0, // Implement marketplace notifications later
        total: (matchRequestCount || 0) + messageCount,
      };

      setNotificationCounts(counts);
    } catch (error) {
      console.error('Error loading notification counts:', error);
    }
  }, [user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) {
      // Clean up channels if user logs out
      if (matchRequestChannel) {
        supabase.removeChannel(matchRequestChannel);
        setMatchRequestChannel(null);
      }
      if (messageChannel) {
        supabase.removeChannel(messageChannel);
        setMessageChannel(null);
      }
      if (notificationChannelRef.current) {
        unsubscribeFromNotifications(notificationChannelRef.current);
        notificationChannelRef.current = null;
      }
      return;
    }

    // Register push notification token (disabled in Expo Go)
    registerPushToken();

    // Subscribe to notification table for real-time push notifications
    notificationChannelRef.current = subscribeToNotifications(
      user.id,
      async (notification: AppNotification) => {
        // Fetch related user details if available
        let senderName: string | undefined;
        let senderPhoto: string | undefined;

        if (notification.related_user_id) {
          const { data: relatedUser } = await supabase
            .from('profiles')
            .select('name, photos')
            .eq('id', notification.related_user_id)
            .single();

          senderName = relatedUser?.name;
          senderPhoto = relatedUser?.photos?.[0];
        }

        // Show in-app toast
        showInAppNotification(
          notification.title,
          notification.message,
          notification.type === 'new_message' ? 'message' : notification.type === 'match_request' ? 'match' : 'general',
          senderName,
          senderPhoto,
          notification.screen,
          notification.screen_params
        );

        // Refresh counts
        loadNotificationCounts();
      }
    );

    // Load initial counts
    loadNotificationCounts();

    // Subscribe to match requests
    const matchReqChannel = supabase
      .channel(`match-requests-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_requests',
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          setNotificationCounts((prev) => ({
            ...prev,
            matchRequests: prev.matchRequests + 1,
            total: prev.total + 1,
          }));

          // Fetch requester details
          const matchRequest = payload.new as any;
          const { data: requester } = await supabase
            .from('profiles')
            .select('name, photos')
            .eq('id', matchRequest.requester_id)
            .single();

          // Show in-app notification with requester info
          showInAppNotification(
            'New match request!',
            `${requester?.name || 'Someone'} wants to match with you`,
            'match',
            requester?.name,
            requester?.photos?.[0]
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'match_requests',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          // Reload counts as request might have been approved/rejected
          loadNotificationCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'match_requests',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          loadNotificationCounts();
        }
      )
      .subscribe();

    setMatchRequestChannel(matchReqChannel);

    // Subscribe to new messages
    const msgChannel = supabase
      .channel(`messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;

          // Only count if message is not from current user
          if (newMessage.sender_id !== user.id) {
            // Check if this message is in a conversation the user is part of
            const { data: conversation } = await supabase
              .from('conversations')
              .select('id')
              .eq('id', newMessage.conversation_id)
              .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
              .single();

            if (conversation) {
              setNotificationCounts((prev) => ({
                ...prev,
                messages: prev.messages + 1,
                total: prev.total + 1,
              }));

              // Fetch sender details for notification
              const { data: sender } = await supabase
                .from('profiles')
                .select('name, photos')
                .eq('id', newMessage.sender_id)
                .single();

              // Show in-app notification with sender info
              showInAppNotification(
                'New message',
                newMessage.text.substring(0, 50),
                'message',
                sender?.name,
                sender?.photos?.[0],
                `/chat/${newMessage.conversation_id}`,
                { conversationId: newMessage.conversation_id }
              );
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const updatedMessage = payload.new as any;
          // If message was marked as read, decrease count
          if (updatedMessage.read && updatedMessage.sender_id !== user.id) {
            setNotificationCounts((prev) => ({
              ...prev,
              messages: Math.max(0, prev.messages - 1),
              total: Math.max(0, prev.total - 1),
            }));
          }
        }
      )
      .subscribe();

    setMessageChannel(msgChannel);

    // Cleanup on unmount
    return () => {
      if (matchReqChannel) {
        supabase.removeChannel(matchReqChannel);
      }
      if (msgChannel) {
        supabase.removeChannel(msgChannel);
      }
    };
  }, [user, loadNotificationCounts]);

  // Helper function to show in-app notification
  const showInAppNotification = (
    title: string,
    body: string,
    type: 'match' | 'message' | 'general' = 'general',
    senderName?: string,
    senderPhoto?: string,
    screen?: string,
    screenParams?: any
  ) => {
    setToastData({
      title,
      message: body,
      type,
      senderName,
      senderPhoto,
      screen,
      screenParams,
    });
    setToastVisible(true);
  };

  const handleToastPress = () => {
    // Navigate based on notification data
    if (toastData.screen && toastData.screenParams) {
      const { conversationId } = toastData.screenParams;
      if (conversationId) {
        router.push(`/chat/${conversationId}`);
      } else {
        router.push('/chat');
      }
    } else {
      router.push('/chat');
    }
    setToastVisible(false);
  };

  const refreshNotifications = useCallback(async () => {
    await loadNotificationCounts();
  }, [loadNotificationCounts]);

  const markMatchRequestsAsViewed = useCallback(() => {
    setNotificationCounts((prev) => ({
      ...prev,
      matchRequests: 0,
      total: prev.total - prev.matchRequests,
    }));
  }, []);

  const markMessagesAsViewed = useCallback(() => {
    setNotificationCounts((prev) => ({
      ...prev,
      messages: 0,
      total: prev.total - prev.messages,
    }));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notificationCounts,
        refreshNotifications,
        markMatchRequestsAsViewed,
        markMessagesAsViewed,
      }}
    >
      {children}
      <NotificationToast
        visible={toastVisible}
        title={toastData.title}
        message={toastData.message}
        type={toastData.type}
        senderName={toastData.senderName}
        senderPhoto={toastData.senderPhoto}
        onPress={handleToastPress}
        onDismiss={() => setToastVisible(false)}
      />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
