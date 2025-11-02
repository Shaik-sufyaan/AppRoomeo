import { supabase } from '../supabase';

// =====================================================
// Types
// =====================================================

export interface SplitRequestInput {
  itemName: string;
  itemEmoji: string;
  totalAmount: number;
  splits: {
    userId: string;
    userName: string;
    amount: number;
  }[];
}

export interface SplitRequestDetail {
  id: string;
  message_id: string;
  item_name: string;
  item_emoji: string;
  total_amount: number;
  status: 'pending' | 'accepted' | 'declined';
  created_by: string;
  created_at: string;
  updated_at: string;
  splits: {
    id: string;
    user_id: string;
    user_name: string;
    amount: number;
  }[];
}

export interface Expense {
  id: string;
  room_id?: string;
  split_request_id?: string;
  title: string;
  description?: string;
  amount: number;
  category?: string;
  paid_by: string;
  expense_date: string;
  created_at: string;
  updated_at: string;
  splits: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  paid: boolean;
  paid_at?: string;
}

// =====================================================
// Split Request Functions
// =====================================================

/**
 * Create a split request in a chat conversation
 */
export async function createSplitRequest(
  conversationId: string,
  splitRequest: SplitRequestInput
): Promise<{
  success: boolean;
  data?: { messageId: string; splitRequestId: string };
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Create a message for the split request
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        text: `💰 Split request: ${splitRequest.itemName} - $${splitRequest.totalAmount.toFixed(2)}`,
        type: 'split_request',
      })
      .select()
      .single();

    if (messageError || !message) {
      return { success: false, error: messageError?.message || 'Failed to create message' };
    }

    // Use the database function to create split request with details
    const { data: splitRequestId, error: splitError } = await supabase
      .rpc('create_split_request', {
        p_message_id: message.id,
        p_item_name: splitRequest.itemName,
        p_item_emoji: splitRequest.itemEmoji,
        p_total_amount: splitRequest.totalAmount,
        p_splits: splitRequest.splits,
      });

    if (splitError) {
      // Clean up the message if split request creation failed
      await supabase.from('messages').delete().eq('id', message.id);
      return { success: false, error: splitError.message };
    }

    return {
      success: true,
      data: {
        messageId: message.id,
        splitRequestId: splitRequestId,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get split request details
 */
export async function getSplitRequest(
  splitRequestId: string
): Promise<{
  success: boolean;
  data?: SplitRequestDetail;
  error?: string;
}> {
  try {
    const { data: splitRequest, error: splitError } = await supabase
      .from('split_requests')
      .select(`
        *,
        splits:split_details(id, user_id, user_name, amount)
      `)
      .eq('id', splitRequestId)
      .single();

    if (splitError || !splitRequest) {
      return { success: false, error: splitError?.message || 'Split request not found' };
    }

    return {
      success: true,
      data: splitRequest as any,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get split request by message ID
 */
export async function getSplitRequestByMessageId(
  messageId: string
): Promise<{
  success: boolean;
  data?: SplitRequestDetail;
  error?: string;
}> {
  try {
    const { data: splitRequest, error: splitError } = await supabase
      .from('split_requests')
      .select(`
        *,
        splits:split_details(id, user_id, user_name, amount)
      `)
      .eq('message_id', messageId)
      .single();

    if (splitError || !splitRequest) {
      return { success: false, error: splitError?.message || 'Split request not found' };
    }

    return {
      success: true,
      data: splitRequest as any,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Accept a split request
 */
export async function acceptSplitRequest(
  splitRequestId: string
): Promise<{
  success: boolean;
  data?: { expenseId: string };
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .rpc('accept_split_request', { p_split_request_id: splitRequestId });

    if (error) {
      return { success: false, error: error.message };
    }

    // Get the created expense ID
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('id')
      .eq('split_request_id', splitRequestId)
      .single();

    return {
      success: true,
      data: { expenseId: expense?.id || '' },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Decline a split request
 */
export async function declineSplitRequest(
  splitRequestId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .rpc('decline_split_request', { p_split_request_id: splitRequestId });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// Expense Room Functions
// =====================================================

export interface ExpenseRoom {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  members: {
    id: string;
    user_id: string;
    role: 'admin' | 'member';
    joined_at: string;
  }[];
}

export interface ExpenseEvent {
  id: string;
  name: string;
  description?: string;
  event_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  members: {
    id: string;
    user_id: string;
    role: 'admin' | 'member';
    joined_at: string;
  }[];
}

/**
 * Create an expense room
 */
export async function createExpenseRoom(
  name: string,
  description: string,
  memberIds: string[]
): Promise<{
  success: boolean;
  data?: { roomId: string };
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Create the room
    const { data: room, error: roomError } = await supabase
      .from('expense_rooms')
      .insert({
        name,
        description,
        created_by: user.id,
      })
      .select()
      .single();

    if (roomError || !room) {
      return { success: false, error: roomError?.message || 'Failed to create room' };
    }

    // Add creator as admin
    const { error: creatorError } = await supabase
      .from('expense_room_members')
      .insert({
        room_id: room.id,
        user_id: user.id,
        role: 'admin',
      });

    if (creatorError) {
      // Rollback room creation
      await supabase.from('expense_rooms').delete().eq('id', room.id);
      return { success: false, error: creatorError.message };
    }

    // Add other members
    if (memberIds.length > 0) {
      const members = memberIds.map((memberId) => ({
        room_id: room.id,
        user_id: memberId,
        role: 'member' as const,
      }));

      const { error: membersError } = await supabase
        .from('expense_room_members')
        .insert(members);

      if (membersError) {
        return { success: false, error: membersError.message };
      }
    }

    return {
      success: true,
      data: { roomId: room.id },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all expense rooms for current user
 */
export async function getExpenseRooms(): Promise<{
  success: boolean;
  data?: ExpenseRoom[];
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get rooms where user is a member
    const { data: rooms, error: roomsError } = await supabase
      .from('expense_rooms')
      .select(`
        *,
        members:expense_room_members(*)
      `)
      .in('id',
        supabase
          .from('expense_room_members')
          .select('room_id')
          .eq('user_id', user.id)
      )
      .order('created_at', { ascending: false });

    if (roomsError) {
      return { success: false, error: roomsError.message };
    }

    return {
      success: true,
      data: rooms as any,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get room details with expenses
 */
export async function getRoomDetails(roomId: string): Promise<{
  success: boolean;
  data?: {
    room: ExpenseRoom;
    expenses: Expense[];
    balance: number;
  };
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get room
    const { data: room, error: roomError } = await supabase
      .from('expense_rooms')
      .select(`
        *,
        members:expense_room_members(*)
      `)
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return { success: false, error: roomError?.message || 'Room not found' };
    }

    // Get room expenses
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select(`
        *,
        splits:expense_splits(*)
      `)
      .eq('room_id', roomId)
      .order('expense_date', { ascending: false });

    if (expensesError) {
      return { success: false, error: expensesError.message };
    }

    // Calculate balance using database function
    const { data: balance, error: balanceError } = await supabase
      .rpc('get_user_balance_in_room', {
        p_user_id: user.id,
        p_room_id: roomId,
      });

    return {
      success: true,
      data: {
        room: room as any,
        expenses: expenses as any,
        balance: balance || 0,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// Expense Event Functions
// =====================================================

/**
 * Create an expense event
 */
export async function createExpenseEvent(
  name: string,
  description: string,
  eventDate: string,
  memberIds: string[]
): Promise<{
  success: boolean;
  data?: { eventId: string };
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Create the event
    const { data: event, error: eventError } = await supabase
      .from('expense_events')
      .insert({
        name,
        description,
        event_date: eventDate,
        created_by: user.id,
      })
      .select()
      .single();

    if (eventError || !event) {
      return { success: false, error: eventError?.message || 'Failed to create event' };
    }

    // Add creator as admin
    const { error: creatorError } = await supabase
      .from('expense_event_members')
      .insert({
        event_id: event.id,
        user_id: user.id,
        role: 'admin',
      });

    if (creatorError) {
      // Rollback event creation
      await supabase.from('expense_events').delete().eq('id', event.id);
      return { success: false, error: creatorError.message };
    }

    // Add other members
    if (memberIds.length > 0) {
      const members = memberIds.map((memberId) => ({
        event_id: event.id,
        user_id: memberId,
        role: 'member' as const,
      }));

      const { error: membersError } = await supabase
        .from('expense_event_members')
        .insert(members);

      if (membersError) {
        return { success: false, error: membersError.message };
      }
    }

    return {
      success: true,
      data: { eventId: event.id },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all expense events for current user
 */
export async function getExpenseEvents(): Promise<{
  success: boolean;
  data?: ExpenseEvent[];
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get events where user is a member
    const { data: events, error: eventsError } = await supabase
      .from('expense_events')
      .select(`
        *,
        members:expense_event_members(*)
      `)
      .in('id',
        supabase
          .from('expense_event_members')
          .select('event_id')
          .eq('user_id', user.id)
      )
      .order('event_date', { ascending: false });

    if (eventsError) {
      return { success: false, error: eventsError.message };
    }

    return {
      success: true,
      data: events as any,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get event details with expenses
 */
export async function getEventDetails(eventId: string): Promise<{
  success: boolean;
  data?: {
    event: ExpenseEvent;
    expenses: Expense[];
    balance: number;
  };
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get event
    const { data: event, error: eventError } = await supabase
      .from('expense_events')
      .select(`
        *,
        members:expense_event_members(*)
      `)
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return { success: false, error: eventError?.message || 'Event not found' };
    }

    // Get event expenses
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select(`
        *,
        splits:expense_splits(*)
      `)
      .eq('event_id', eventId)
      .order('expense_date', { ascending: false });

    if (expensesError) {
      return { success: false, error: expensesError.message };
    }

    // Calculate balance using database function
    const { data: balance, error: balanceError } = await supabase
      .rpc('get_user_balance_in_event', {
        p_user_id: user.id,
        p_event_id: eventId,
      });

    return {
      success: true,
      data: {
        event: event as any,
        expenses: expenses as any,
        balance: balance || 0,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// Expense Functions
// =====================================================

/**
 * Create an expense directly (not from split request)
 */
export async function createExpense(
  title: string,
  amount: number,
  splits: { userId: string; amount: number }[],
  roomId?: string,
  eventId?: string,
  description?: string
): Promise<{
  success: boolean;
  data?: { expenseId: string };
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Create the expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        room_id: roomId,
        event_id: eventId,
        title,
        description,
        amount,
        paid_by: user.id,
        expense_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (expenseError || !expense) {
      return { success: false, error: expenseError?.message || 'Failed to create expense' };
    }

    // Create expense splits
    const splitRecords = splits.map((split) => ({
      expense_id: expense.id,
      user_id: split.userId,
      amount: split.amount,
    }));

    const { error: splitsError } = await supabase
      .from('expense_splits')
      .insert(splitRecords);

    if (splitsError) {
      // Rollback expense creation
      await supabase.from('expenses').delete().eq('id', expense.id);
      return { success: false, error: splitsError.message };
    }

    return {
      success: true,
      data: { expenseId: expense.id },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all expenses for current user
 */
export async function getExpenses(): Promise<{
  success: boolean;
  data?: Expense[];
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select(`
        *,
        splits:expense_splits(*)
      `)
      .order('expense_date', { ascending: false });

    if (expensesError) {
      return { success: false, error: expensesError.message };
    }

    return {
      success: true,
      data: expenses as any,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get expense by split request ID
 */
export async function getExpenseBySplitRequest(
  splitRequestId: string
): Promise<{
  success: boolean;
  data?: Expense;
  error?: string;
}> {
  try {
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select(`
        *,
        splits:expense_splits(*)
      `)
      .eq('split_request_id', splitRequestId)
      .single();

    if (expenseError || !expense) {
      return { success: false, error: expenseError?.message || 'Expense not found' };
    }

    return {
      success: true,
      data: expense as any,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Mark an expense split as paid
 */
export async function markSplitAsPaid(
  splitId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from('expense_splits')
      .update({
        paid: true,
        paid_at: new Date().toISOString(),
      })
      .eq('id', splitId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe to split request updates
 */
export function subscribeToSplitRequestUpdates(
  messageId: string,
  callback: (splitRequest: SplitRequestDetail) => void
) {
  const channel = supabase
    .channel(`split-request-${messageId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'split_requests',
        filter: `message_id=eq.${messageId}`,
      },
      async (payload) => {
        // Fetch full split request with details
        const result = await getSplitRequestByMessageId(messageId);
        if (result.success && result.data) {
          callback(result.data);
        }
      }
    )
    .subscribe();

  return channel;
}
