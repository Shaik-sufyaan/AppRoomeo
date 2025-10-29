import { supabase } from '../supabase';
import { uploadImage, deleteImage } from '../storage';

// =====================================================
// Types (matching database schema)
// =====================================================

export interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: 'furniture' | 'household' | 'other';
  location: string;
  seller_id: string;
  sold: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceListingWithDetails extends MarketplaceListing {
  images: string[];
  seller: {
    id: string;
    name: string;
    photos: string[];
    user_type: 'looking-for-place' | 'finding-roommate';
  };
  is_saved: boolean; // Whether current user saved this
}

export interface CreateListingData {
  title: string;
  description: string;
  price: number;
  category: 'furniture' | 'household' | 'other';
  location: string;
  imageUris: string[]; // Local image URIs to upload
}

export interface UpdateListingData {
  title?: string;
  description?: string;
  price?: number;
  category?: 'furniture' | 'household' | 'other';
  location?: string;
}

// =====================================================
// API Functions
// =====================================================

/**
 * Get all active marketplace listings
 */
export async function getMarketplaceListings(filters?: {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
}): Promise<{
  success: boolean;
  data?: MarketplaceListingWithDetails[];
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Base query
    let query = supabase
      .from('marketplace_listings')
      .select(`
        *,
        seller:profiles!seller_id (
          id,
          name,
          photos,
          user_type
        ),
        images:marketplace_images (
          image_url,
          display_order
        ),
        saved:saved_listings!listing_id (
          user_id
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice);
    }
    if (filters?.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }
    if (filters?.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching listings:', error);
      return { success: false, error: error.message };
    }

    // Transform data to frontend format
    const listings: MarketplaceListingWithDetails[] = (data || []).map((listing: any) => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: parseFloat(listing.price),
      category: listing.category,
      location: listing.location,
      seller_id: listing.seller_id,
      sold: listing.sold,
      is_active: listing.is_active,
      created_at: listing.created_at,
      updated_at: listing.updated_at,
      images: (listing.images || [])
        .sort((a: any, b: any) => a.display_order - b.display_order)
        .map((img: any) => img.image_url),
      seller: listing.seller,
      is_saved: (listing.saved || []).some((s: any) => s.user_id === user.id),
    }));

    return { success: true, data: listings };
  } catch (error: any) {
    console.error('Exception in getMarketplaceListings:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get single listing by ID
 */
export async function getListingById(listingId: string): Promise<{
  success: boolean;
  data?: MarketplaceListingWithDetails;
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('marketplace_listings')
      .select(`
        *,
        seller:profiles!seller_id (
          id,
          name,
          photos,
          user_type
        ),
        images:marketplace_images (
          image_url,
          display_order
        ),
        saved:saved_listings!listing_id (
          user_id
        )
      `)
      .eq('id', listingId)
      .eq('is_active', true)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const listing: MarketplaceListingWithDetails = {
      id: data.id,
      title: data.title,
      description: data.description,
      price: parseFloat(data.price),
      category: data.category,
      location: data.location,
      seller_id: data.seller_id,
      sold: data.sold,
      is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at,
      images: (data.images || [])
        .sort((a: any, b: any) => a.display_order - b.display_order)
        .map((img: any) => img.image_url),
      seller: data.seller,
      is_saved: (data.saved || []).some((s: any) => s.user_id === user.id),
    };

    return { success: true, data: listing };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Create a new marketplace listing
 */
export async function createListing(listingData: CreateListingData): Promise<{
  success: boolean;
  data?: { listing_id: string };
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Create the listing
    const { data: listing, error: listingError } = await supabase
      .from('marketplace_listings')
      .insert({
        title: listingData.title,
        description: listingData.description,
        price: listingData.price,
        category: listingData.category,
        location: listingData.location,
        seller_id: user.id,
      })
      .select()
      .single();

    if (listingError) {
      return { success: false, error: listingError.message };
    }

    // Upload images
    const imageUrls: { listing_id: string; image_url: string; display_order: number }[] = [];

    for (let i = 0; i < listingData.imageUris.length; i++) {
      const imageUri = listingData.imageUris[i];
      const uploadResult = await uploadImage({
        userId: user.id,
        imageUri,
        bucket: 'marketplace-photos',
        fileName: `${listing.id}_${i}.jpg`,
      });

      if (uploadResult.url) {
        imageUrls.push({
          listing_id: listing.id,
          image_url: uploadResult.url,
          display_order: i,
        });
      }
    }

    // Insert image records
    if (imageUrls.length > 0) {
      const { error: imagesError } = await supabase
        .from('marketplace_images')
        .insert(imageUrls);

      if (imagesError) {
        console.error('Error inserting images:', imagesError);
      }
    }

    return { success: true, data: { listing_id: listing.id } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Update a marketplace listing
 */
export async function updateListing(
  listingId: string,
  updates: UpdateListingData
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
      .from('marketplace_listings')
      .update(updates)
      .eq('id', listingId)
      .eq('seller_id', user.id); // Ensure user owns the listing

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Mark a listing as sold
 */
export async function markListingAsSold(listingId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  return updateListing(listingId, { sold: true });
}

/**
 * Delete a marketplace listing (soft delete - sets is_active to false)
 */
export async function deleteListing(listingId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Soft delete (keep data but hide listing)
    const { error } = await supabase
      .from('marketplace_listings')
      .update({ is_active: false })
      .eq('id', listingId)
      .eq('seller_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Save/unsave a listing (toggle)
 */
export async function toggleSaveListing(listingId: string): Promise<{
  success: boolean;
  data?: { saved: boolean };
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if already saved
    const { data: existing, error: checkError } = await supabase
      .from('saved_listings')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', listingId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (not an error)
      return { success: false, error: checkError.message };
    }

    if (existing) {
      // Unsave
      const { error: deleteError } = await supabase
        .from('saved_listings')
        .delete()
        .eq('id', existing.id);

      if (deleteError) {
        return { success: false, error: deleteError.message };
      }

      return { success: true, data: { saved: false } };
    } else {
      // Save
      const { error: insertError } = await supabase
        .from('saved_listings')
        .insert({ user_id: user.id, listing_id: listingId });

      if (insertError) {
        return { success: false, error: insertError.message };
      }

      return { success: true, data: { saved: true } };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get user's saved listings
 */
export async function getSavedListings(): Promise<{
  success: boolean;
  data?: MarketplaceListingWithDetails[];
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('saved_listings')
      .select(`
        listing:marketplace_listings (
          *,
          seller:profiles!seller_id (
            id,
            name,
            photos,
            user_type
          ),
          images:marketplace_images (
            image_url,
            display_order
          )
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    const listings: MarketplaceListingWithDetails[] = (data || [])
      .map((item: any) => item.listing)
      .filter((listing: any) => listing && listing.is_active)
      .map((listing: any) => ({
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: parseFloat(listing.price),
        category: listing.category,
        location: listing.location,
        seller_id: listing.seller_id,
        sold: listing.sold,
        is_active: listing.is_active,
        created_at: listing.created_at,
        updated_at: listing.updated_at,
        images: (listing.images || [])
          .sort((a: any, b: any) => a.display_order - b.display_order)
          .map((img: any) => img.image_url),
        seller: listing.seller,
        is_saved: true, // All these are saved by definition
      }));

    return { success: true, data: listings };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
