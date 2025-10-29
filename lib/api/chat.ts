import { supabase } from '../supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// =====================================================
// Types (matching database schema)
// =====================================================

export interface Conversation {
  id: string;
  user_a_id: string;
  user_b_id: string;
  context_type?: 'marketplace' | 'match' | 'general';
  context_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithDetails extends Conversation {
  other_user: {
    id: string;
    name: string;
    photos: string[];
    user_type: 'looking-for-place' | 'finding-roommate';
    age: number;
  };
  last_message?: {
    id: string;
    text: string;
    sender_id: string;
    created_at: string;
    read: boolean;
  };
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  read: boolean;
  read_at?: string;
  created_at: string;
}

export interface MessageWithSender extends Message {
  sender: {
    id: string;
    name: string;
    photos: string[];
  };
}

// =====================================================
// API Functions
// =====================================================

/**
 * Get or create a conversation between current user and another user
 * Uses the database function to ensure unique conversations
 */
export async function getOrCreateConversation(
  otherUserId: string,
  contextType?: 'marketplace' | 'match' | 'general',
  contextId?: string
): Promise<{
  success: boolean;
  data?: { conversation_id: string };
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Call database function to get or create conversation
    const { data: conversationId, error: convError } = await supabase
      .rpc('get_or_create_conversation', {
        user_1_uuid: user.id,
        user_2_uuid: otherUserId,
        context_type_param: contextType || null,
        context_id_param: contextId || null,
      });

    if (convError) {
      console.error('Error getting/creating conversation:', convError);
      return { success: false, error: convError.message };
    }

    return { success: true, data: { conversation_id: conversationId } };
  } catch (error: any) {
    console.error('Exception in getOrCreateConversation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all conversations for current user
 * Includes other user details, last message, and unread count
 */
export async function getConversations(): Promise<{
  success: boolean;
  data?: ConversationWithDetails[];
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get all conversations for the user
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        user_a:profiles!user_a_id(id, name, photos, user_type, age),
        user_b:profiles!user_b_id(id, name, photos, user_type, age)
      `)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (convError) {
      console.error('Error fetching conversations:', convError);
      return { success: false, error: convError.message };
    }

    // For each conversation, get last message and unread count
    const conversationsWithDetails = await Promise.all(
      (conversations || []).map(async (conv: any) => {
        // Determine the other user
        const otherUser = conv.user_a_id === user.id ? conv.user_b : conv.user_a;

        // Get last message
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('id, text, sender_id, created_at, read')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get unread count (messages sent to current user that are unread)
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('read', false)
          .neq('sender_id', user.id); // Not sent by current user

        return {
          id: conv.id,
          user_a_id: conv.user_a_id,
          user_b_id: conv.user_b_id,
          context_type: conv.context_type,
          context_id: conv.context_id,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          other_user: otherUser,
          last_message: lastMessage || undefined,
          unread_count: unreadCount || 0,
        };
      })
    );

    return { success: true, data: conversationsWithDetails };
  } catch (error: any) {
    console.error('Exception in getConversations:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all messages in a conversation
 */
export async function getMessages(conversationId: string): Promise<{
  success: boolean;
  data?: MessageWithSender[];
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is part of this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('user_a_id, user_b_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return { success: false, error: 'Conversation not found' };
    }

    if (conversation.user_a_id !== user.id && conversation.user_b_id !== user.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Fetch messages with sender details
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(id, name, photos)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return { success: false, error: messagesError.message };
    }

    return { success: true, data: messages as any };
  } catch (error: any) {
    console.error('Exception in getMessages:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a new message in a conversation
 */
export async function sendMessage(
  conversationId: string,
  text: string
): Promise<{
  success: boolean;
  data?: Message;
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is part of this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('user_a_id, user_b_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return { success: false, error: 'Conversation not found' };
    }

    if (conversation.user_a_id !== user.id && conversation.user_b_id !== user.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate message
    if (!text.trim()) {
      return { success: false, error: 'Message cannot be empty' };
    }

    if (text.length > 500) {
      return { success: false, error: 'Message too long (max 500 characters)' };
    }

    // Insert message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        text: text.trim(),
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error sending message:', messageError);
      return { success: false, error: messageError.message };
    }

    return { success: true, data: message };
  } catch (error: any) {
    console.error('Exception in sendMessage:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark a message as read
 */
export async function markMessageAsRead(messageId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Update message - RLS policy ensures user is part of conversation
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .neq('sender_id', user.id); // Only mark as read if not the sender

    if (updateError) {
      console.error('Error marking message as read:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Exception in markMessageAsRead:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark all messages in a conversation as read
 */
export async function markConversationAsRead(conversationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Update all unread messages in conversation that were sent by the other user
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .eq('read', false)
      .neq('sender_id', user.id);

    if (updateError) {
      console.error('Error marking conversation as read:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Exception in markConversationAsRead:', error);
    return { success: false, error: error.message };
  }
}

// =====================================================
// Real-time Subscriptions
// =====================================================

/**
 * Subscribe to new messages in a conversation
 * Returns the channel that can be unsubscribed later
 */
export function subscribeToMessages(
  conversationId: string,
  onNewMessage: (message: Message) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onNewMessage(payload.new as Message);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to message updates (e.g., read status changes)
 */
export function subscribeToMessageUpdates(
  conversationId: string,
  onMessageUpdate: (message: Message) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`message-updates:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessageUpdate(payload.new as Message);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to conversation list updates
 * Useful for the conversation list screen to show new conversations
 */
export function subscribeToConversations(
  userId: string,
  onConversationUpdate: () => void
): RealtimeChannel {
  const channel = supabase
    .channel(`conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
      },
      () => {
        onConversationUpdate();
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
      },
      () => {
        onConversationUpdate();
      }
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribe(channel: RealtimeChannel): Promise<void> {
  await supabase.removeChannel(channel);
}
