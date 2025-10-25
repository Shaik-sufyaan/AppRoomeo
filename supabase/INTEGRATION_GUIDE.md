# MyCrib - Supabase Integration Guide

## Overview
This guide shows how to integrate the SQL schema with your React Native code. All variable names match exactly between SQL and TypeScript.

## Database Schema

### Tables Created
1. **`profiles`** - User profiles (extends `auth.users`)
2. **Custom Types**: `work_status`, `user_type`

### Variable Name Mapping (SQL ↔ TypeScript)

| TypeScript (types/index.ts) | SQL (profiles table) | Type |
|----------------------------|---------------------|------|
| `id` | `id` | UUID |
| `name` | `name` | TEXT |
| `age` | `age` | INTEGER |
| `college` | `college` | TEXT (nullable) |
| `workStatus` | `work_status` | ENUM |
| `smoker` | `smoker` | BOOLEAN |
| `pets` | `pets` | BOOLEAN |
| `hasPlace` | `has_place` | BOOLEAN |
| `about` | `about` | TEXT (nullable) |
| `photos` | `photos` | TEXT[] |
| `roomPhotos` | `room_photos` | TEXT[] |
| `isVisible` | `is_visible` | BOOLEAN |
| - | `user_type` | ENUM |
| - | `location` | TEXT |
| - | `latitude` | DECIMAL |
| - | `longitude` | DECIMAL |
| - | `created_at` | TIMESTAMPTZ |
| - | `updated_at` | TIMESTAMPTZ |

## How to Run Migrations

### Option 1: Supabase Dashboard
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Copy and paste the content of each migration file in order:
   - `001_create_profiles_table.sql`
   - `002_auth_functions.sql`
4. Click **Run**

### Option 2: Supabase CLI
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## Integration with React Native Code

### 1. Sign Up Flow (auth.tsx)

**Current Code (Simulated):**
```typescript
const handleAuth = () => {
  if (mode === "signup") {
    router.push("/onboarding/user-type");
  } else {
    router.replace("/(tabs)/matches");
  }
};
```

**With Supabase:**
```typescript
import { supabase } from "@/lib/supabase";

const handleAuth = async () => {
  try {
    if (mode === "signup") {
      // Sign up new user
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) throw error;

      // Profile is auto-created by trigger
      // Navigate to user type selection
      router.push("/onboarding/user-type");
    } else {
      // Sign in existing user
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      // Check if user completed onboarding
      const { data: hasCompleted } = await supabase.rpc(
        'has_completed_onboarding',
        { p_user_id: data.user.id }
      );

      if (hasCompleted) {
        router.replace("/(tabs)/matches");
      } else {
        router.push("/onboarding/user-type");
      }
    }
  } catch (error) {
    console.error("Auth error:", error);
    alert(error.message);
  }
};
```

### 2. User Type Selection (user-type.tsx)

**Current Code:**
```typescript
const handleContinue = () => {
  if (selectedType) {
    router.push("/onboarding/profile");
  }
};
```

**With Supabase:**
```typescript
import { supabase } from "@/lib/supabase";
import AsyncStorage from '@react-native-async-storage/async-storage';

const handleContinue = async () => {
  if (selectedType) {
    // Store user type temporarily
    await AsyncStorage.setItem('pending_user_type', selectedType);
    router.push("/onboarding/profile");
  }
};
```

### 3. Profile Completion (profile.tsx)

**Current Code:**
```typescript
const handleComplete = async () => {
  const user: User = {
    id: Date.now().toString(),
    name,
    age: parseInt(age, 10),
    college,
    workStatus,
    smoker,
    pets,
    hasPlace,
    about,
    photos: ["https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800"],
    roomPhotos: hasPlace ? ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"] : [],
  };

  await completeOnboarding(user);
  router.replace("/matches");
};
```

**With Supabase:**
```typescript
import { supabase } from "@/lib/supabase";
import AsyncStorage from '@react-native-async-storage/async-storage';

const handleComplete = async () => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

    // Get stored user type from previous step
    const userType = await AsyncStorage.getItem('pending_user_type');
    if (!userType) throw new Error("User type not selected");

    // Upload photos to Supabase Storage (if any)
    // const photoUrls = await uploadPhotos(selectedPhotos);
    // const roomPhotoUrls = await uploadPhotos(selectedRoomPhotos);

    // Update profile using SQL function
    const { data, error } = await supabase.rpc('update_user_profile', {
      p_user_id: user.id,
      p_user_type: userType,
      p_name: name,
      p_age: parseInt(age, 10),
      p_college: college || null,
      p_work_status: workStatus,
      p_smoker: smoker,
      p_pets: pets,
      p_has_place: hasPlace,
      p_about: about || null,
      p_photos: photos, // Upload these first
      p_room_photos: hasPlace ? roomPhotos : []
    });

    if (error) throw error;

    // Clear temporary storage
    await AsyncStorage.removeItem('pending_user_type');

    // Navigate to main app
    router.replace("/(tabs)/matches");
  } catch (error) {
    console.error("Profile completion error:", error);
    alert(error.message);
  }
};
```

## SQL Commands Summary

### Sign Up (New User)
```sql
-- Automatically handled by Supabase Auth + trigger
-- When user signs up, a profile is auto-created

-- Example in code:
-- await supabase.auth.signUp({ email, password })
```

### Store User Type Selection
```sql
-- Called after user selects type in user-type.tsx
UPDATE profiles
SET user_type = 'looking-for-place' -- or 'finding-roommate'
WHERE id = 'user-uuid';
```

### Complete Profile
```sql
-- Use the function we created
SELECT update_user_profile(
  'user-uuid'::UUID,
  'looking-for-place'::user_type,
  'John Doe',
  25,
  'MIT',
  'full-time'::work_status,
  false, -- smoker
  true,  -- pets
  false, -- has_place
  'I love clean spaces and quiet evenings',
  ARRAY['https://example.com/photo1.jpg'],
  ARRAY[]::TEXT[]
);
```

### Check if User Completed Onboarding
```sql
SELECT has_completed_onboarding('user-uuid'::UUID);
-- Returns: true if profile is complete, false otherwise
```

### Get User Profile
```sql
SELECT * FROM profiles WHERE id = 'user-uuid';

-- Or use the function:
SELECT get_user_profile('user-uuid'::UUID);
```

## Testing the Schema

### Test Sign Up Flow
```sql
-- 1. Create a test user (simulate auth.users insert)
INSERT INTO auth.users (id, email)
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'test@example.com');

-- 2. Profile should be auto-created by trigger
SELECT * FROM profiles WHERE id = '123e4567-e89b-12d3-a456-426614174000';

-- 3. Update with user type
UPDATE profiles
SET user_type = 'looking-for-place'
WHERE id = '123e4567-e89b-12d3-a456-426614174000';

-- 4. Complete profile
SELECT update_user_profile(
  '123e4567-e89b-12d3-a456-426614174000'::UUID,
  'looking-for-place'::user_type,
  'Test User',
  22,
  'Stanford',
  'part-time'::work_status,
  false,
  false,
  false,
  'Test bio',
  ARRAY['https://example.com/photo.jpg'],
  ARRAY[]::TEXT[]
);

-- 5. Check onboarding status
SELECT has_completed_onboarding('123e4567-e89b-12d3-a456-426614174000'::UUID);
```

## Next Steps

1. **Set up Supabase client** in `/lib/supabase.ts`
2. **Run migrations** in your Supabase project
3. **Update auth.tsx** with real Supabase auth calls
4. **Update user-type.tsx** to store user type
5. **Update profile.tsx** with profile completion logic
6. **Add photo upload** to Supabase Storage
7. **Test the complete flow**

## Variable Name Convention

✅ **SQL uses snake_case**: `work_status`, `has_place`, `user_type`
✅ **TypeScript uses camelCase**: `workStatus`, `hasPlace`, `userType`

Supabase automatically converts between these when using the client library!
