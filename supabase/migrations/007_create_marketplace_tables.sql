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
