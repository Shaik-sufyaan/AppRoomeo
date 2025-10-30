import { supabase } from '../supabase';

// =====================================================
// Types
// =====================================================

export interface MatchRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface MatchRequestWithProfile extends MatchRequest {
  sender: {
    id: string;
    name: string;
    age: number;
    user_type: 'looking-for-place' | 'finding-roommate';
    college?: string;
    photos: string[];
    work_status: 'part-time' | 'full-time' | 'not-working';
    has_place: boolean;
    distance?: number;
  };
}

export interface Match {
  id: string;
  user_a_id: string;
  user_b_id: string;
  matched_at: string;
  is_mutual: boolean;
}

export interface MatchWithProfile extends Match {
  matched_user: {
    id: string;
    name: string;
    age: number;
    user_type: 'looking-for-place' | 'finding-roommate';
    college?: string;
    work_status: 'part-time' | 'full-time' | 'not-working';
    smoker: boolean;
    pets: boolean;
    has_place: boolean;
    about?: string;
    photos: string[];
    room_photos?: string[];
    distance?: number;
  };
}

export interface SwipeRecord {
  id: string;
  swiper_id: string;
  swiped_user_id: string;
  swipe_type: 'like' | 'skip' | 'reject';
  created_at: string;
}

export interface MatchFeedProfile {
  profile_id: string;
  name: string;
  age: number;
  user_type: 'looking-for-place' | 'finding-roommate';
  college?: string;
  work_status: 'part-time' | 'full-time' | 'not-working';
  smoker: boolean;
  pets: boolean;
  has_place: boolean;
  about?: string;
  photos: string[];
  room_photos?: string[];
  distance?: number;
}

// =====================================================
// API Functions
// =====================================================

/**
 * Send a match request (right swipe)
 * Checks for mutual match and creates match immediately if both users swiped right
 */
export async function sendMatchRequest(recipientId: string): Promise<{
  success: boolean;
  data?: {
    request_id?: string;
    match_id?: string;
    is_mutual?: boolean;
  };
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const senderId = user.id;

    // Check if users are compatible (complementary user types)
    const { data: compatible, error: compatibleError } = await supabase
      .rpc('are_users_compatible', {
        user_a_uuid: senderId,
        user_b_uuid: recipientId,
      });

    if (compatibleError) {
      console.error('Error checking compatibility:', compatibleError);
      return { success: false, error: 'Failed to check compatibility' };
    }

    if (!compatible) {
      return { success: false, error: 'INCOMPATIBLE_USER_TYPES' };
    }

    // Check if already matched
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('id')
      .or(`and(user_a_id.eq.${senderId},user_b_id.eq.${recipientId}),and(user_a_id.eq.${recipientId},user_b_id.eq.${senderId})`)
      .single();

    if (existingMatch) {
      return { success: false, error: 'ALREADY_MATCHED' };
    }

    // Check if already sent a request
    const { data: existingRequest } = await supabase
      .from('match_requests')
      .select('id')
      .eq('sender_id', senderId)
      .eq('recipient_id', recipientId)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return { success: false, error: 'REQUEST_ALREADY_SENT' };
    }

    // Check for mutual match (recipient already sent request to sender)
    const { data: isMutual } = await supabase
      .rpc('check_mutual_match', {
        sender_uuid: senderId,
        recipient_uuid: recipientId,
      });

    if (isMutual) {
      // Create mutual match immediately
      const { data: matchId, error: matchError } = await supabase
        .rpc('create_mutual_match', {
          user_a_uuid: senderId,
          user_b_uuid: recipientId,
        });

      if (matchError) {
        console.error('Error creating mutual match:', matchError);
        return { success: false, error: 'Failed to create match' };
      }

      // Record the swipe
      await supabase.from('swipes').insert({
        swiper_id: senderId,
        swiped_user_id: recipientId,
        swipe_type: 'like',
      });

      return {
        success: true,
        data: {
          match_id: matchId,
          is_mutual: true,
        },
      };
    }

    // Create match request
    const { data: request, error: requestError } = await supabase
      .from('match_requests')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        status: 'pending',
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating match request:', requestError);
      return { success: false, error: 'Failed to send request' };
    }

    // Record the swipe
    await supabase.from('swipes').insert({
      swiper_id: senderId,
      swiped_user_id: recipientId,
      swipe_type: 'like',
    });

    return {
      success: true,
      data: {
        request_id: request.id,
        is_mutual: false,
      },
    };
  } catch (error: any) {
    console.error('Error in sendMatchRequest:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Approve a match request
 * Creates a match and conversation between users
 */
export async function approveMatchRequest(requestId: string): Promise<{
  success: boolean;
  data?: {
    match_id: string;
    is_mutual: boolean;
  };
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify the request belongs to current user
    const { data: request, error: requestError } = await supabase
      .from('match_requests')
      .select('*')
      .eq('id', requestId)
      .eq('recipient_id', user.id)
      .eq('status', 'pending')
      .single();

    if (requestError || !request) {
      return { success: false, error: 'Request not found or unauthorized' };
    }

    // Create match using database function
    const { data: matchId, error: matchError } = await supabase
      .rpc('create_match_from_request', {
        request_uuid: requestId,
      });

    if (matchError) {
      console.error('Error creating match:', matchError);
      return { success: false, error: 'Failed to create match' };
    }

    return {
      success: true,
      data: {
        match_id: matchId,
        is_mutual: true, // Always true when approving a request
      },
    };
  } catch (error: any) {
    console.error('Error in approveMatchRequest:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Reject a match request (silent rejection)
 * Deletes the request and records rejection in swipes table
 */
export async function rejectMatchRequest(requestId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get request details before deleting
    const { data: request, error: requestError } = await supabase
      .from('match_requests')
      .select('sender_id')
      .eq('id', requestId)
      .eq('recipient_id', user.id)
      .eq('status', 'pending')
      .single();

    if (requestError || !request) {
      return { success: false, error: 'Request not found or unauthorized' };
    }

    // Delete the request
    const { error: deleteError } = await supabase
      .from('match_requests')
      .delete()
      .eq('id', requestId);

    if (deleteError) {
      console.error('Error deleting request:', deleteError);
      return { success: false, error: 'Failed to reject request' };
    }

    // Record the rejection in swipes table
    await supabase.from('swipes').insert({
      swiper_id: user.id,
      swiped_user_id: request.sender_id,
      swipe_type: 'reject',
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error in rejectMatchRequest:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Get all match requests received by current user
 */
export async function getReceivedMatchRequests(): Promise<{
  success: boolean;
  data?: MatchRequestWithProfile[];
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: requests, error: requestsError } = await supabase
      .from('match_requests')
      .select(`
        *,
        sender:sender_id (
          id,
          name,
          age,
          user_type,
          college,
          photos,
          work_status,
          has_place
        )
      `)
      .eq('recipient_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('Error fetching requests:', requestsError);
      return { success: false, error: 'Failed to fetch requests' };
    }

    // Transform data to match expected interface (map sender to user)
    const transformedRequests = requests?.map((request: any) => ({
      id: request.id,
      senderId: request.sender_id,
      recipientId: request.recipient_id,
      status: request.status,
      message: request.message,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
      expiresAt: request.expires_at,
      user: request.sender ? {
        id: request.sender.id,
        name: request.sender.name,
        age: request.sender.age,
        userType: request.sender.user_type,
        college: request.sender.college,
        photos: request.sender.photos || [],
        workStatus: request.sender.work_status,
        hasPlace: request.sender.has_place,
        smoker: false, // Default values for optional fields
        pets: false,
        about: undefined,
        roomPhotos: undefined,
        distance: undefined,
      } : undefined,
    }));

    return {
      success: true,
      data: transformedRequests as any,
    };
  } catch (error: any) {
    console.error('Error in getReceivedMatchRequests:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Get all match requests sent by current user
 */
export async function getSentMatchRequests(): Promise<{
  success: boolean;
  data?: MatchRequestWithProfile[];
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: requests, error: requestsError } = await supabase
      .from('match_requests')
      .select(`
        *,
        recipient:recipient_id (
          id,
          name,
          age,
          user_type,
          college,
          photos,
          work_status,
          has_place
        )
      `)
      .eq('sender_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('Error fetching sent requests:', requestsError);
      return { success: false, error: 'Failed to fetch sent requests' };
    }

    return {
      success: true,
      data: requests as any,
    };
  } catch (error: any) {
    console.error('Error in getSentMatchRequests:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Get all matches for current user
 */
export async function getMatches(): Promise<{
  success: boolean;
  data?: MatchWithProfile[];
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .order('matched_at', { ascending: false });

    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      return { success: false, error: 'Failed to fetch matches' };
    }

    // Fetch profile details for each matched user
    const matchesWithProfiles = await Promise.all(
      matches.map(async (match) => {
        const matchedUserId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id;

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', matchedUserId)
          .single();

        return {
          ...match,
          matched_user: profile,
        };
      })
    );

    return {
      success: true,
      data: matchesWithProfiles as any,
    };
  } catch (error: any) {
    console.error('Error in getMatches:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Record a left swipe (skip)
 */
export async function recordSwipe(
  swipedUserId: string,
  swipeType: 'skip'
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error: swipeError } = await supabase
      .from('swipes')
      .insert({
        swiper_id: user.id,
        swiped_user_id: swipedUserId,
        swipe_type: swipeType,
      });

    if (swipeError) {
      // Ignore unique constraint violations (duplicate swipe)
      if (swipeError.code === '23505') {
        return { success: true };
      }

      console.error('Error recording swipe:', swipeError);
      return { success: false, error: 'Failed to record swipe' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in recordSwipe:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Get match feed for swiping
 * Returns profiles filtered by complementary user type
 */
export async function getMatchFeed(
  limit: number = 20,
  offset: number = 0
): Promise<{
  success: boolean;
  data?: MatchFeedProfile[];
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get current user's location (if available)
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('latitude, longitude')
      .eq('id', user.id)
      .single();

    const { data: profiles, error: profilesError } = await supabase
      .rpc('get_match_feed', {
        user_uuid: user.id,
        user_latitude: currentProfile?.latitude || null,
        user_longitude: currentProfile?.longitude || null,
        max_distance_miles: 50,
        result_limit: limit,
        result_offset: offset,
      });

    if (profilesError) {
      console.error('Error fetching match feed:', profilesError);
      return { success: false, error: 'Failed to fetch match feed' };
    }

    return {
      success: true,
      data: profiles,
    };
  } catch (error: any) {
    console.error('Error in getMatchFeed:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Check if two users are matched
 */
export async function areUsersMatched(userId: string): Promise<{
  success: boolean;
  matched?: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .or(`and(user_a_id.eq.${user.id},user_b_id.eq.${userId}),and(user_a_id.eq.${userId},user_b_id.eq.${user.id})`)
      .single();

    return {
      success: true,
      matched: !!match,
    };
  } catch (error: any) {
    console.error('Error in areUsersMatched:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}
