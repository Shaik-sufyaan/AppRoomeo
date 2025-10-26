-- Create storage buckets for user photos and room photos
-- Storage buckets are used to store files like images in Supabase

-- Create bucket for profile photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true, -- Public bucket so photos can be accessed via public URL
  5242880, -- 5MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
);

-- Create bucket for room photos (only for users finding roommates)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'room-photos',
  'room-photos',
  true, -- Public bucket
  5242880, -- 5MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
);

-- Storage RLS Policies for profile-photos bucket

-- Anyone can view profile photos (public bucket)
CREATE POLICY "Anyone can view profile photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

-- Authenticated users can upload their own profile photos
CREATE POLICY "Users can upload their own profile photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own profile photos
CREATE POLICY "Users can update their own profile photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own profile photos
CREATE POLICY "Users can delete their own profile photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS Policies for room-photos bucket

-- Anyone can view room photos (public bucket)
CREATE POLICY "Anyone can view room photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'room-photos');

-- Only users with user_type 'finding-roommate' can upload room photos
CREATE POLICY "Only finding-roommate users can upload room photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'room-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type = 'finding-roommate'
    )
  );

-- Users can update their own room photos (if they have finding-roommate type)
CREATE POLICY "Users can update their own room photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'room-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type = 'finding-roommate'
    )
  );

-- Users can delete their own room photos
CREATE POLICY "Users can delete their own room photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'room-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
