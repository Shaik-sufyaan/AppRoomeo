# Disable Email Confirmation (For Development)

The error "No user found" is likely because email confirmation is enabled in Supabase.

## Quick Fix - Disable Email Confirmation

### Option 1: Via Supabase Dashboard (RECOMMENDED)

1. Go to your Supabase project dashboard
2. Click on **Authentication** in the left sidebar
3. Click on **Providers**
4. Click on **Email** provider
5. Scroll down to find **"Confirm email"**
6. **Toggle it OFF** (disable it)
7. Click **Save**

### Option 2: Via SQL (if dashboard doesn't work)

Run this in SQL Editor:

```sql
-- This updates the auth configuration to disable email confirmation
-- WARNING: This is for development only!
UPDATE auth.config
SET email_confirm_change_email_enabled = false;
```

## After Disabling Email Confirmation

1. **Delete any test users** you created before:
   - Go to **Authentication** → **Users**
   - Delete all test users

2. **Restart your Expo app:**
   ```bash
   npx expo start --clear
   ```

3. **Try signing up again** with a NEW email

## Why This Happens

When email confirmation is enabled:
- User signs up → Supabase creates the user
- BUT the session is NOT active until email is confirmed
- User can't complete profile without an active session

## For Production

**Re-enable email confirmation** before launching your app:
1. Go to **Authentication** → **Providers** → **Email**
2. Toggle **"Confirm email"** back ON
3. Update your app to handle email confirmation flow properly

## Verify It's Fixed

After disabling, you should be able to:
1. Sign up with a new email
2. Select user type
3. Complete profile
4. See your data in Supabase dashboard
