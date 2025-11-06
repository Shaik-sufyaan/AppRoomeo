import { supabase } from '../supabase';

// =====================================================
// Types
// =====================================================

export interface ExpenseFriend {
  friend_id: string;
  friend_name: string;
  friend_photos: string[];
  friend_age: number;
  friendship_created_at: string;
}

export interface ExpenseFriendRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseFriendRequestWithUser extends ExpenseFriendRequest {
  sender: {
    id: string;
    name: string;
    photos: string[];
    age: number;
  };
}

export interface SearchUserResult {
  user_id: string;
  user_name: string;
  user_photos: string[];
  user_age: number;
  is_friend: boolean;
  has_pending_request: boolean;
}

// =====================================================
// Friend Request Functions
// =====================================================

/**
 * Send a friend request to another user
 */
export async function sendExpenseFriendRequest(
  recipientId: string,
  message?: string
): Promise<{
  success: boolean;
  data?: { requestId: string };
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('send_expense_friend_request', {
      p_recipient_id: recipientId,
      p_message: message,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { requestId: data },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Accept a friend request
 */
export async function acceptExpenseFriendRequest(
  requestId: string
): Promise<{
  success: boolean;
  data?: { friendshipId: string };
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('accept_expense_friend_request', {
      p_request_id: requestId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { friendshipId: data },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Reject a friend request
 */
export async function rejectExpenseFriendRequest(
  requestId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase.rpc('reject_expense_friend_request', {
      p_request_id: requestId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get pending friend requests (received)
 */
export async function getPendingExpenseFriendRequests(): Promise<{
  success: boolean;
  data?: ExpenseFriendRequestWithUser[];
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('expense_friend_requests')
      .select(`
        *,
        sender:profiles!sender_id(id, name, photos, age)
      `)
      .eq('recipient_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as any,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get sent friend requests
 */
export async function getSentExpenseFriendRequests(): Promise<{
  success: boolean;
  data?: ExpenseFriendRequest[];
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('expense_friend_requests')
      .select('*')
      .eq('sender_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as ExpenseFriendRequest[],
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Cancel a sent friend request
 */
export async function cancelExpenseFriendRequest(
  requestId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('expense_friend_requests')
      .delete()
      .eq('id', requestId)
      .eq('sender_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// Friend Management Functions
// =====================================================

/**
 * Get all expense friends
 */
export async function getExpenseFriends(): Promise<{
  success: boolean;
  data?: ExpenseFriend[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_expense_friends_for_user');

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as ExpenseFriend[],
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Remove a friend
 */
export async function removeExpenseFriend(
  friendUserId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase.rpc('remove_expense_friend', {
      p_friend_user_id: friendUserId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Search users to add as expense friends
 */
export async function searchUsersForExpenseFriends(
  searchQuery: string
): Promise<{
  success: boolean;
  data?: SearchUserResult[];
  error?: string;
}> {
  try {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return { success: true, data: [] };
    }

    const { data, error } = await supabase.rpc('search_users_for_expense_friends', {
      p_search_query: searchQuery.trim(),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data as SearchUserResult[],
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if user is an expense friend
 */
export async function isExpenseFriend(
  userId: string
): Promise<{
  success: boolean;
  data?: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const userA = user.id < userId ? user.id : userId;
    const userB = user.id < userId ? userId : user.id;

    const { data, error } = await supabase
      .from('expense_friends')
      .select('id')
      .eq('user_a_id', userA)
      .eq('user_b_id', userB)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: !!data,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// Real-time Subscriptions
// =====================================================

/**
 * Subscribe to friend request updates
 */
export function subscribeToExpenseFriendRequests(
  callback: (request: ExpenseFriendRequestWithUser) => void
) {
  const channel = supabase
    .channel('expense-friend-requests')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'expense_friend_requests',
      },
      async (payload) => {
        // Reload the request with user data
        const { data, error } = await supabase
          .from('expense_friend_requests')
          .select(`
            *,
            sender:profiles!sender_id(id, name, photos, age)
          `)
          .eq('id', payload.new.id)
          .single();

        if (!error && data) {
          callback(data as any);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to expense friends updates
 */
export function subscribeToExpenseFriends(
  callback: () => void
) {
  const channel = supabase
    .channel('expense-friends')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'expense_friends',
      },
      () => {
        callback();
      }
    )
    .subscribe();

  return channel;
}
