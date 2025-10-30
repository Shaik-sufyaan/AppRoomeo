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
  otherUser: {
    id: string;
    name: string;
    photos: string[];
    user_type: 'looking-for-place' | 'finding-roommate';
    age: number;
  };
  lastMessage?: {
    id: string;
    text: string;
    sender_id: string;
    created_at: string;
    read: boolean;
  };
  unreadCount: number;
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
    console.log('🔍 [Chat API] getOrCreateConversation called:', { otherUserId, contextType, contextId });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ [Chat API] Not authenticated:', userError);
      return { success: false, error: 'Not authenticated' };
    }

    console.log('🔍 [Chat API] Current user:', user.id);

    // Call database function to get or create conversation
    console.log('🔍 [Chat API] Calling RPC function get_or_create_conversation...');
    const { data: conversationId, error: convError } = await supabase
      .rpc('get_or_create_conversation', {
        user_1_uuid: user.id,
        user_2_uuid: otherUserId,
        context_type_param: contextType || null,
        context_id_param: contextId || null,
      });

    console.log('🔍 [Chat API] RPC result:', { conversationId, convError });

    if (convError) {
      console.error('❌ [Chat API] Error getting/creating conversation:', convError);
      return { success: false, error: convError.message };
    }

    console.log('✅ [Chat API] Successfully got/created conversation:', conversationId);
    return { success: true, data: { conversation_id: conversationId } };
  } catch (error: any) {
    console.error('❌ [Chat API] Exception in getOrCreateConversation:', error);
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
    console.log('🔍 [Chat API] getConversations called');

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ [Chat API] Not authenticated:', userError);
      return { success: false, error: 'Not authenticated' };
    }

    console.log('🔍 [Chat API] Current user:', user.id);

    // Get all conversations for the user
    console.log('🔍 [Chat API] Querying conversations...');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        user_a:profiles!user_a_id(id, name, photos, user_type, age),
        user_b:profiles!user_b_id(id, name, photos, user_type, age)
      `)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    console.log('🔍 [Chat API] Conversations query result:', { count: conversations?.length, convError });

    if (convError) {
      console.error('❌ [Chat API] Error fetching conversations:', convError);
      return { success: false, error: convError.message };
    }

    // For each conversation, get last message and unread count
    const conversationsWithDetails = await Promise.all(
      (conversations || []).map(async (conv: any) => {
        // Determine the other user
        const otherUser = conv.user_a_id === user.id ? conv.user_b : conv.user_a;

        // Skip conversations where the other user profile doesn't exist
        if (!otherUser) {
          return null;
        }

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
          otherUser: otherUser,
          lastMessage: lastMessage || undefined,
          unreadCount: unreadCount || 0,
        };
      })
    );

    // Filter out null conversations (where other user doesn't exist)
    const validConversations = conversationsWithDetails.filter((conv): conv is ConversationWithDetails => conv !== null);

    return { success: true, data: validConversations };
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
    console.log('🔍 [Chat API] getMessages called for conversation:', conversationId);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ [Chat API] Not authenticated:', userError);
      return { success: false, error: 'Not authenticated' };
    }

    console.log('🔍 [Chat API] Current user:', user.id);

    // Verify user is part of this conversation
    console.log('🔍 [Chat API] Verifying user is part of conversation...');
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('user_a_id, user_b_id')
      .eq('id', conversationId)
      .single();

    console.log('🔍 [Chat API] Conversation check:', { conversation, convError });

    if (convError || !conversation) {
      console.error('❌ [Chat API] Conversation not found:', convError);
      return { success: false, error: 'Conversation not found' };
    }

    if (conversation.user_a_id !== user.id && conversation.user_b_id !== user.id) {
      console.error('❌ [Chat API] User not authorized for this conversation');
      return { success: false, error: 'Unauthorized' };
    }

    console.log('✅ [Chat API] User is authorized');

    // Fetch messages with sender details
    console.log('🔍 [Chat API] Fetching messages...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(id, name, photos)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    console.log('🔍 [Chat API] Messages query result:', { count: messages?.length, messagesError });

    if (messagesError) {
      console.error('❌ [Chat API] Error fetching messages:', messagesError);
      return { success: false, error: messagesError.message };
    }

    console.log(`✅ [Chat API] Successfully fetched ${messages?.length || 0} messages`);
    return { success: true, data: messages as any };
  } catch (error: any) {
    console.error('❌ [Chat API] Exception in getMessages:', error);
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
  console.log('🔍 [Chat API] Setting up message subscription for conversation:', conversationId);

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
        console.log('🔔 [Chat API] New message received via Realtime:', payload.new);
        onNewMessage(payload.new as Message);
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ [Chat API] Successfully subscribed to messages channel');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ [Chat API] Channel subscription error:', err);
      } else if (status === 'TIMED_OUT') {
        console.error('❌ [Chat API] Channel subscription timed out');
      } else {
        console.log('🔍 [Chat API] Channel status:', status);
      }
    });

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
