import { supabase } from '../supabase';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { RealtimeChannel } from '@supabase/supabase-js';

// =====================================================
// Types
// =====================================================

export interface AppNotification {
  id: string;
  user_id: string;
  type: 'match_request' | 'match_approved' | 'mutual_match' | 'new_message' | 'marketplace_interest' | 'expense_added';
  title: string;
  message: string;
  related_user_id?: string;
  related_item_id?: string;
  screen?: string;
  screen_params?: any;
  read: boolean;
  created_at: string;
  read_at?: string;
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  device_type: 'ios' | 'android';
  created_at: string;
  updated_at: string;
}

// =====================================================
// Push Notification Configuration
// =====================================================

// Configure how notifications are displayed
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// =====================================================
// API Functions
// =====================================================

/**
 * Register push notification token for the current user
 */
export async function registerPushToken(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log('🔍 [Notifications] Registering push token...');

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ [Notifications] Not authenticated:', userError);
      return { success: false, error: 'Not authenticated' };
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('⚠️ [Notifications] Permission not granted');
      return { success: false, error: 'Permission not granted' };
    }

    // Get push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    const token = tokenData.data;
    console.log('✅ [Notifications] Got push token:', token);

    // Save token to database
    const { error: insertError } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: user.id,
        token,
        device_type: Platform.OS as 'ios' | 'android',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,token'
      });

    if (insertError) {
      console.error('❌ [Notifications] Error saving token:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log('✅ [Notifications] Token registered successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ [Notifications] Exception registering token:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all notifications for current user
 */
export async function getNotifications(limit: number = 50): Promise<{
  success: boolean;
  data?: AppNotification[];
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (notifError) {
      console.error('Error fetching notifications:', notifError);
      return { success: false, error: notifError.message };
    }

    return { success: true, data: notifications as AppNotification[] };
  } catch (error: any) {
    console.error('Exception in getNotifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: count, error: countError } = await supabase
      .rpc('get_unread_notification_count');

    if (countError) {
      console.error('Error getting unread count:', countError);
      return { success: false, error: countError.message };
    }

    return { success: true, count: count || 0 };
  } catch (error: any) {
    console.error('Exception in getUnreadCount:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .rpc('mark_notification_read', { notification_id: notificationId });

    if (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Exception in markAsRead:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase.rpc('mark_all_notifications_read');

    if (error) {
      console.error('Error marking all as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Exception in markAllAsRead:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe to new notifications for real-time updates
 */
export function subscribeToNotifications(
  userId: string,
  onNewNotification: (notification: AppNotification) => void
): RealtimeChannel {
  console.log('🔍 [Notifications] Subscribing to real-time notifications for user:', userId);

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        console.log('✅ [Notifications] New notification received:', payload.new);
        const notification = payload.new as AppNotification;

        // Show local push notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notification.title,
            body: notification.message,
            data: {
              screen: notification.screen,
              params: notification.screen_params,
              notificationId: notification.id,
            },
          },
          trigger: null, // Show immediately
        });

        // Call callback
        onNewNotification(notification);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from notifications
 */
export async function unsubscribeFromNotifications(channel: RealtimeChannel): Promise<void> {
  console.log('🔍 [Notifications] Unsubscribing from notifications');
  await supabase.removeChannel(channel);
}

/**
 * Send a local notification (for testing or immediate feedback)
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: any
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: null,
  });
}
