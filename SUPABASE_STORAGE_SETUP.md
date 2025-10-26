# Supabase Storage Setup for Image Uploads

## Overview
This document explains the image upload functionality that has been set up for the MyCrib app. The implementation includes:
- Supabase Storage buckets for profile and room photos
- RLS policies to restrict room photos to "finding-roommate" users only
- Helper functions for uploading, deleting, and managing images
- Updated profile setup UI with conditional room photo uploads

---

## What Was Implemented

### 1. Storage Buckets Migration
**File:** `supabase/migrations/005_create_storage_buckets.sql`

Created two public storage buckets:
- **profile-photos**: For user profile pictures (5MB limit per file)
- **room-photos**: For room photos, restricted to users with `user_type = 'finding-roommate'` (5MB limit per file)

Both buckets support: JPEG, PNG, JPG, and WebP formats.

#### RLS Policies Implemented:
- **profile-photos bucket:**
  - Anyone can view (public bucket)
  - Users can upload/update/delete only their own photos

- **room-photos bucket:**
  - Anyone can view (public bucket)
  - Only users with `user_type = 'finding-roommate'` can upload room photos
  - Users can update/delete only their own photos

**To apply this migration:**
```bash
# In your Supabase project, run the migration file
psql -h <your-db-url> -U postgres -d postgres -f supabase/migrations/005_create_storage_buckets.sql
```

Or use the Supabase Dashboard:
1. Go to SQL Editor
2. Paste the contents of the migration file
3. Run the query

---

### 2. Storage Helper Functions
**File:** `lib/storage.ts`

Created comprehensive helper functions for image management:

#### Main Functions:
- `uploadImage()` - Upload a single image to Supabase Storage
- `uploadMultipleImages()` - Upload multiple images at once
- `deleteImage()` - Delete a single image
- `deleteMultipleImages()` - Delete multiple images
- `getPublicUrl()` - Get public URL for a storage file
- `pickImage()` - Pick a single image from device (uses expo-image-picker)
- `pickMultipleImages()` - Pick multiple images from device

#### TypeScript Types Defined:
- `ImageBucket` - Type for bucket names ('profile-photos' | 'room-photos')
- `UploadImageOptions` - Options for uploading images
- `UploadImageResult` - Result of image upload (url and path)

---

### 3. Updated Profile Setup UI
**File:** `app/onboarding/profile.tsx`

#### Changes Made:
1. **Conditional Room Photos Section:**
   - Room photo upload is now only shown to users with `userType === 'finding-roommate'`
   - Changed from checking `hasPlace` to checking `isFindingRoommate`

2. **Profile Photo Upload:**
   - Tap on avatar to select profile photo
   - Preview selected photo before upload
   - Photo is uploaded to Supabase Storage on profile completion

3. **Room Photos Upload:**
   - Only visible for "finding-roommate" users
   - Support for multiple photos
   - Photo preview in a 2-column grid
   - Remove button on each photo
   - Photos are uploaded to Supabase Storage on profile completion

4. **Image Upload Flow:**
   - User selects images from device
   - Images are displayed as previews
   - On "Complete Profile" button click:
     - Images are uploaded to Supabase Storage
     - Public URLs are stored in the database
     - Profile is created with image URLs

---

## User Types

The app has 2 user types:

1. **`looking-for-place`** - Users searching for a room/apartment
   - Can upload profile photos
   - Cannot upload room photos

2. **`finding-roommate`** - Users who have a place and need a roommate
   - Can upload profile photos
   - Can upload room photos

---

## Database Storage

Image URLs are stored in the `profiles` table:
- `photos` - TEXT[] array of profile photo URLs
- `room_photos` - TEXT[] array of room photo URLs

---

## Dependencies Installed

```json
{
  "expo-image-picker": "^15.x.x",
  "base64-arraybuffer": "^1.x.x"
}
```

---

## How to Test

### 1. Run Migrations
Apply the storage bucket migration in your Supabase project.

### 2. Test as "looking-for-place" User:
1. Go through onboarding and select "Looking for a place"
2. On profile setup, you should see:
   - Profile photo upload (tap avatar)
   - No room photos section
3. Complete profile and verify photo upload

### 3. Test as "finding-roommate" User:
1. Go through onboarding and select "Finding a roommate"
2. On profile setup, you should see:
   - Profile photo upload (tap avatar)
   - Room photos section with "Add Room Photos" button
3. Add multiple room photos
4. Verify you can remove photos
5. Complete profile and verify all photos upload

### 4. Verify in Supabase Dashboard:
1. Go to Storage > Buckets
2. Check `profile-photos` and `room-photos` buckets
3. Verify files are organized by userId: `userId/filename.jpg`
4. Verify you can access public URLs

---

## File Structure

```
lib/
  storage.ts                    # Image upload helper functions

supabase/
  migrations/
    005_create_storage_buckets.sql  # Storage bucket migration

app/
  onboarding/
    profile.tsx                 # Updated with image upload UI
```

---

## Security Notes

1. **RLS Policies:** All storage buckets have Row Level Security enabled
2. **File Size Limits:** 5MB per file to prevent abuse
3. **File Type Restrictions:** Only image formats (JPEG, PNG, WebP) allowed
4. **User-based Access:** Users can only upload/modify their own files
5. **Room Photo Restriction:** Only "finding-roommate" users can upload room photos

---

## Next Steps

1. Consider adding image compression before upload
2. Add image validation (dimensions, aspect ratio)
3. Implement image cropping/editing before upload
4. Add loading states during upload
5. Consider adding a maximum number of room photos (e.g., 10)
6. Add photo reordering functionality
7. Implement image optimization/CDN

---

## Troubleshooting

### Issue: Images not uploading
- Check if migrations have been applied
- Verify Supabase Storage is enabled
- Check network connectivity
- Verify file size < 5MB

### Issue: "Permission denied" error
- Check if user is authenticated
- Verify user_type in profiles table
- Check RLS policies in Supabase Dashboard

### Issue: Images not displaying
- Verify public URLs are correct
- Check if buckets are set to public
- Verify file paths are in format: `userId/filename.ext`

---

## API Reference

### uploadImage()
```typescript
await uploadImage({
  userId: 'user-uuid',
  imageUri: 'file:///path/to/image.jpg',
  bucket: 'profile-photos',
  fileName: 'optional-custom-name.jpg'
});
```

### pickMultipleImages()
```typescript
const uris = await pickMultipleImages({
  allowsEditing: false,
  aspect: [4, 3],
  quality: 0.8
});
```

---

## Summary

All image upload functionality is now complete and functional:
- ✅ Storage buckets created with RLS policies
- ✅ Room photos restricted to "finding-roommate" users only
- ✅ Helper functions for image management
- ✅ Profile setup UI updated with image upload
- ✅ Dependencies installed
- ✅ TypeScript types defined
