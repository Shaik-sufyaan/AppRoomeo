# Marketplace & Chat Messaging Implementation Guide

## Overview
This document provides step-by-step instructions to implement marketplace listings and chat messaging features with Supabase integration, maintaining consistency with the existing codebase.

---

## 📋 Step 1: Verified Codebase Patterns

### Existing Database Naming Conventions
✅ **Tables**: `snake_case` (e.g., `profiles`, `match_requests`, `matches`)
✅ **Columns**: `snake_case` (e.g., `sender_id`, `created_at`, `user_type`)
✅ **IDs**: `UUID` type
✅ **Timestamps**: `TIMESTAMPTZ` with `DEFAULT NOW()`
✅ **Foreign Keys**: Reference with `ON DELETE CASCADE`
✅ **RLS**: Enabled on all tables
✅ **Indexes**: Created on foreign keys and frequently queried columns

### Existing TypeScript Type Patterns
✅ **Frontend Types**: `camelCase` (e.g., `senderId`, `createdAt`)
✅ **Database Types**: `snake_case` (transform in API layer)
✅ **Return Type**: `{ success: boolean; data?: T; error?: string; }`

### Verified Existing Types (from `types/index.ts`)

```typescript
export interface MarketplaceListing {
  id: string;
  title: string;
  price: number;
  description: string;
  category: "furniture" | "household" | "other";
  images: string[];          // Array of image URLs
  seller: User;              // Full seller profile
  location: string;
  timestamp: number;
  saved: boolean;            // User saved this listing
  sold: boolean;             // Marked as sold
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  read: boolean;
}

export interface Conversation {
  id: string;
  user: User;               // Other participant
  lastMessage?: Message;
  unreadCount: number;
  isFriend: boolean;
  status: "pending" | "accepted";
  initiatedBy?: string;
}
```

---

## 📋 Step 2: Database Schema - SQL Migrations

### Migration 007: Marketplace Tables

**File**: `supabase/migrations/007_create_marketplace_tables.sql`

```sql
-- =====================================================
-- MARKETPLACE LISTINGS TABLE
-- =====================================================

-- Create enum for marketplace categories
CREATE TYPE marketplace_category AS ENUM ('furniture', 'household', 'other');

-- Create marketplace_listings table
CREATE TABLE marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Listing information
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  category marketplace_category NOT NULL DEFAULT 'other',
  location TEXT NOT NULL,

  -- Seller reference
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Status
  sold BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create marketplace_images table (separate for multiple images per listing)
CREATE TABLE marketplace_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create saved_listings table (many-to-many for users saving listings)
CREATE TABLE saved_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure user can only save a listing once
  UNIQUE(user_id, listing_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_marketplace_listings_seller_id ON marketplace_listings(seller_id);
CREATE INDEX idx_marketplace_listings_category ON marketplace_listings(category);
CREATE INDEX idx_marketplace_listings_sold ON marketplace_listings(sold);
CREATE INDEX idx_marketplace_listings_active ON marketplace_listings(is_active);
CREATE INDEX idx_marketplace_listings_created_at ON marketplace_listings(created_at DESC);
CREATE INDEX idx_marketplace_images_listing_id ON marketplace_images(listing_id);
CREATE INDEX idx_saved_listings_user_id ON saved_listings(user_id);
CREATE INDEX idx_saved_listings_listing_id ON saved_listings(listing_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;

-- marketplace_listings policies
CREATE POLICY "Anyone can view active listings"
  ON marketplace_listings FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can create their own listings"
  ON marketplace_listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their own listings"
  ON marketplace_listings FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can delete their own listings"
  ON marketplace_listings FOR DELETE
  USING (auth.uid() = seller_id);

-- marketplace_images policies
CREATE POLICY "Anyone can view listing images"
  ON marketplace_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_listings ml
      WHERE ml.id = listing_id AND ml.is_active = true
    )
  );

CREATE POLICY "Sellers can manage their listing images"
  ON marketplace_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM marketplace_listings ml
      WHERE ml.id = listing_id AND ml.seller_id = auth.uid()
    )
  );

-- saved_listings policies
CREATE POLICY "Users can view their saved listings"
  ON saved_listings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save listings"
  ON saved_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave their listings"
  ON saved_listings FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp on marketplace_listings
CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORAGE BUCKET FOR MARKETPLACE IMAGES
-- =====================================================

-- Create storage bucket (if not exists from migration 005)
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-photos', 'marketplace-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Anyone can view marketplace photos
CREATE POLICY "Anyone can view marketplace photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketplace-photos');

-- Storage policy: Authenticated users can upload marketplace photos
CREATE POLICY "Authenticated users can upload marketplace photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'marketplace-photos'
    AND auth.role() = 'authenticated'
  );

-- Storage policy: Users can update their own marketplace photos
CREATE POLICY "Users can update their own marketplace photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'marketplace-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: Users can delete their own marketplace photos
CREATE POLICY "Users can delete their own marketplace photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'marketplace-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON TYPE marketplace_category TO authenticated;
GRANT ALL ON marketplace_listings TO authenticated;
GRANT ALL ON marketplace_images TO authenticated;
GRANT ALL ON saved_listings TO authenticated;
```

---

### Migration 008: Messaging System

**File**: `supabase/migrations/008_create_messaging_system.sql`

```sql
-- =====================================================
-- CONVERSATIONS TABLE
-- =====================================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Participants (always 2 users)
  user_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Context (optional - if conversation started from marketplace)
  context_type TEXT, -- 'marketplace', 'match', 'general'
  context_id UUID,   -- listing_id or match_id

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique conversation per pair (order-independent)
  CONSTRAINT unique_conversation CHECK (user_a_id < user_b_id),
  UNIQUE(user_a_id, user_b_id)
);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation reference
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Message content
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (length(text) > 0),

  -- Read status
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_conversations_user_a ON conversations(user_a_id);
CREATE INDEX idx_conversations_user_b ON conversations(user_b_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_read ON messages(read);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() = user_a_id OR auth.uid() = user_b_id
  );

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user_a_id = auth.uid() OR c.user_b_id = auth.uid())
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  user_1_uuid UUID,
  user_2_uuid UUID,
  context_type_param TEXT DEFAULT NULL,
  context_id_param UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  conversation_uuid UUID;
  smaller_uuid UUID;
  larger_uuid UUID;
BEGIN
  -- Ensure consistent ordering (user_a < user_b)
  IF user_1_uuid < user_2_uuid THEN
    smaller_uuid := user_1_uuid;
    larger_uuid := user_2_uuid;
  ELSE
    smaller_uuid := user_2_uuid;
    larger_uuid := user_1_uuid;
  END IF;

  -- Try to find existing conversation
  SELECT id INTO conversation_uuid
  FROM conversations
  WHERE user_a_id = smaller_uuid AND user_b_id = larger_uuid;

  -- If not found, create new conversation
  IF conversation_uuid IS NULL THEN
    INSERT INTO conversations (user_a_id, user_b_id, context_type, context_id)
    VALUES (smaller_uuid, larger_uuid, context_type_param, context_id_param)
    RETURNING id INTO conversation_uuid;
  END IF;

  RETURN conversation_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update conversation's updated_at when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp on new message
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON conversations TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_conversation TO authenticated;
```

---

## 📋 Step 3: Confirmed Variable Names

### Database Column Names (snake_case)
```
✅ marketplace_listings:
   - id, title, description, price, category, location
   - seller_id, sold, is_active, created_at, updated_at

✅ marketplace_images:
   - id, listing_id, image_url, display_order, created_at

✅ saved_listings:
   - id, user_id, listing_id, created_at

✅ conversations:
   - id, user_a_id, user_b_id, context_type, context_id
   - created_at, updated_at

✅ messages:
   - id, conversation_id, sender_id, text, read, read_at, created_at
```

### TypeScript Interface Names (camelCase)
```typescript
✅ MarketplaceListing: {
   id, title, price, description, category, images,
   seller, location, timestamp, saved, sold
}

✅ Message: {
   id, senderId, receiverId, text, timestamp, read
}

✅ Conversation: {
   id, user, lastMessage, unreadCount, isFriend, status, initiatedBy
}
```

---

## 📋 Step 4: API Implementation

### File: `lib/api/marketplace.ts`

```typescript
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
```

### File: `lib/api/messaging.ts`

```typescript
import { supabase } from '../supabase';

// =====================================================
// Types
// =====================================================

export interface Conversation {
  id: string;
  user_a_id: string;
  user_b_id: string;
  context_type?: string;
  context_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithDetails extends Conversation {
  other_user: {
    id: string;
    name: string;
    photos: string[];
  };
  last_message?: Message;
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
 */
export async function getOrCreateConversation(
  otherUserId: string,
  contextType?: string,
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

    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      user_1_uuid: user.id,
      user_2_uuid: otherUserId,
      context_type_param: contextType,
      context_id_param: contextId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: { conversation_id: data } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all conversations for current user
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

    // Get conversations where user is participant
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        user_a:profiles!user_a_id (id, name, photos),
        user_b:profiles!user_b_id (id, name, photos)
      `)
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (convError) {
      return { success: false, error: convError.message };
    }

    // For each conversation, get last message and unread count
    const conversationsWithDetails: ConversationWithDetails[] = [];

    for (const conv of conversations || []) {
      // Determine other user
      const otherUser = conv.user_a_id === user.id ? conv.user_b : conv.user_a;

      // Get last message
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get unread count
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('read', false)
        .neq('sender_id', user.id); // Don't count own messages

      conversationsWithDetails.push({
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
      });
    }

    return { success: true, data: conversationsWithDetails };
  } catch (error: any) {
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

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id (id, name, photos)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Send a message
 */
export async function sendMessage(
  conversationId: string,
  text: string
): Promise<{
  success: boolean;
  data?: { message_id: string };
  error?: string;
}> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (!text.trim()) {
      return { success: false, error: 'Message cannot be empty' };
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        text: text.trim(),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: { message_id: data.id } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
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

    const { error } = await supabase
      .from('messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('read', false)
      .neq('sender_id', user.id); // Don't mark own messages

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe to new messages in a conversation (real-time)
 */
export function subscribeToMessages(
  conversationId: string,
  onNewMessage: (message: Message) => void
) {
  return supabase
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
}
```

---

## 📋 Step 5: Integration Steps

### Step 5.1: Run Database Migrations

```bash
# Using Supabase CLI
supabase db push

# OR manually in Supabase Dashboard SQL Editor:
# 1. Copy contents of 007_create_marketplace_tables.sql
# 2. Execute in SQL Editor
# 3. Copy contents of 008_create_messaging_system.sql
# 4. Execute in SQL Editor
```

### Step 5.2: Verify Tables Created

```sql
-- Check tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'marketplace_listings',
  'marketplace_images',
  'saved_listings',
  'conversations',
  'messages'
);

-- Should return 5 rows
```

### Step 5.3: Test RLS Policies

```sql
-- Test as authenticated user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'your-user-uuid';

-- Should see listings
SELECT * FROM marketplace_listings WHERE is_active = true;

-- Should be able to insert your own listing
INSERT INTO marketplace_listings (title, description, price, category, location, seller_id)
VALUES ('Test Item', 'Test description', 100, 'furniture', 'Test Location', 'your-user-uuid');
```

---

## 📋 Step 6: Usage Examples

### Create a Marketplace Listing

```typescript
import { createListing } from '@/lib/api/marketplace';
import { pickMultipleImages } from '@/lib/storage';

async function handleCreateListing() {
  // Pick images
  const imageUris = await pickMultipleImages(5);

  if (imageUris.length === 0) {
    alert('Please select at least one image');
    return;
  }

  // Create listing
  const result = await createListing({
    title: 'Modern Grey Couch',
    description: 'Barely used, like new condition',
    price: 450,
    category: 'furniture',
    location: 'San Jose, CA',
    imageUris,
  });

  if (result.success) {
    console.log('Listing created:', result.data?.listing_id);
  } else {
    console.error('Error:', result.error);
  }
}
```

### Chat with Seller

```typescript
import { getOrCreateConversation } from '@/lib/api/messaging';
import { router } from 'expo-router';

async function handleChatWithSeller(sellerId: string, listingId: string) {
  const result = await getOrCreateConversation(
    sellerId,
    'marketplace',
    listingId
  );

  if (result.success) {
    // Navigate to chat screen
    router.push(`/chat/${result.data?.conversation_id}`);
  } else {
    console.error('Error:', result.error);
  }
}
```

### Send Message

```typescript
import { sendMessage, subscribeToMessages } from '@/lib/api/messaging';

// Send message
async function handleSendMessage(conversationId: string, text: string) {
  const result = await sendMessage(conversationId, text);

  if (result.success) {
    console.log('Message sent:', result.data?.message_id);
  }
}

// Subscribe to real-time messages
useEffect(() => {
  const subscription = subscribeToMessages(conversationId, (newMessage) => {
    setMessages((prev) => [...prev, newMessage]);
  });

  return () => {
    subscription.unsubscribe();
  };
}, [conversationId]);
```

---

## 📋 Step 7: Checklist

### Database Setup
- [ ] Run migration 007 (marketplace tables)
- [ ] Run migration 008 (messaging tables)
- [ ] Verify tables created
- [ ] Test RLS policies
- [ ] Verify storage bucket exists

### API Implementation
- [ ] Create `lib/api/marketplace.ts`
- [ ] Create `lib/api/messaging.ts`
- [ ] Test marketplace CRUD operations
- [ ] Test messaging operations

### Frontend Integration
- [ ] Update marketplace screen to use real API
- [ ] Add create listing form
- [ ] Add edit/delete listing functionality
- [ ] Update chat screen for seller messaging
- [ ] Add real-time message subscriptions

---

## 🎉 Summary

**Verified Naming Conventions:**
- Database: `snake_case` (marketplace_listings, seller_id, created_at)
- TypeScript: `camelCase` (sellerId, createdAt, isSaved)
- Return type: `{ success: boolean; data?: T; error?: string; }`

**New Tables Created:**
- `marketplace_listings` - Core listing data
- `marketplace_images` - Multiple images per listing
- `saved_listings` - User-saved listings
- `conversations` - Chat conversations
- `messages` - Chat messages

**API Functions Available:**
- Marketplace: create, read, update, delete, toggle save, mark sold
- Messaging: get/create conversation, send message, mark as read, real-time subscribe

**Next Steps:**
1. Run the SQL migrations
2. Create the API files
3. Update UI screens to use real API instead of mock data
4. Test end-to-end flow
