import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import NotificationToast from '@/components/NotificationToast';
import { useRouter } from 'expo-router';

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

  // Toast notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastData, setToastData] = useState<{
    title: string;
    message: string;
    type: 'match' | 'message' | 'general';
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
      return;
    }

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
        (payload) => {
          console.log('🔔 New match request received!', payload);
          setNotificationCounts((prev) => ({
            ...prev,
            matchRequests: prev.matchRequests + 1,
            total: prev.total + 1,
          }));

          // Show in-app notification
          showInAppNotification('New match request!', 'Someone wants to match with you', 'match');
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
          console.log('Match request updated', payload);
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
          console.log('Match request deleted');
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
              console.log('🔔 New message received!', newMessage);
              setNotificationCounts((prev) => ({
                ...prev,
                messages: prev.messages + 1,
                total: prev.total + 1,
              }));

              // Show in-app notification
              showInAppNotification('New message', newMessage.text.substring(0, 50), 'message');
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
  const showInAppNotification = (title: string, body: string, type: 'match' | 'message' | 'general' = 'general') => {
    console.log(`📬 ${title}: ${body}`);

    setToastData({
      title,
      message: body,
      type,
    });
    setToastVisible(true);
  };

  const handleToastPress = () => {
    // Navigate to chat screen when notification is tapped
    router.push('/chat');
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
