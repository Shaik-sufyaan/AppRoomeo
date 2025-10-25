# MyCrib - Supabase Setup Guide

## 📋 Prerequisites
- A Supabase account (free tier is fine)
- Node.js and npm installed
- Your MyCrib React Native app

---

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"New Project"**
3. Fill in the details:
   - **Project Name**: MyCrib (or any name you prefer)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
4. Click **"Create new project"**
5. Wait 2-3 minutes for the project to be set up

---

## Step 2: Get Your API Keys

### You need TWO keys:

1. **Go to your Supabase Dashboard**
2. Click on **Settings** (gear icon) in the left sidebar
3. Click on **API** in the settings menu

### Copy these two values:

#### 1. **Project URL**
- Look for: **Project URL**
- It looks like: `https://xxxxxxxxxxxxx.supabase.co`
- Example: `https://abcdefghijklmnop.supabase.co`

#### 2. **Anon Key (Public Key)**
- Look for: **Project API keys** section
- Find: **`anon` `public`** key
- It's a long string starting with `eyJ...`
- Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (very long)

⚠️ **DO NOT use the `service_role` key** - that's a secret key!

---

## Step 3: Run the Database Setup Script

1. In your Supabase Dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the file: `/supabase/setup.sql` from your project
4. Copy the **entire content** of that file
5. Paste it into the SQL Editor
6. Click **Run** (or press Ctrl/Cmd + Enter)
7. You should see: **"Success. No rows returned"** ✅

This creates:
- `profiles` table
- Custom types (`work_status`, `user_type`)
- Security policies
- Helper functions
- Triggers

---

## Step 4: Install Required Packages

Run these commands in your project directory:

```bash
npm install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

**Package breakdown:**
- `@supabase/supabase-js` - Supabase client library
- `@react-native-async-storage/async-storage` - For storing auth sessions
- `react-native-url-polyfill` - Required for React Native compatibility

---

## Step 5: Create Your .env File

1. In the root of your project (same level as `package.json`), create a file named `.env`

2. Copy this template and **replace with your actual values**:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Replace:
   - `https://your-project-id.supabase.co` with your **Project URL** from Step 2
   - `your-anon-key-here` with your **anon public key** from Step 2

**Example .env file:**
```env
EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5MDAwMDAwMCwiZXhwIjoyMDA1NTc2MDAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **Important**:
- The `.env` file is already in `.gitignore` - do NOT commit it to git
- Never share your keys publicly

---

## Step 6: Verify the Setup

### Test the Supabase Connection

Create a test file or add this to your app temporarily:

```typescript
import { supabase } from './lib/supabase';

// Test connection
async function testConnection() {
  const { data, error } = await supabase
    .from('profiles')
    .select('count');

  if (error) {
    console.error('Connection failed:', error);
  } else {
    console.log('✅ Connected to Supabase!');
  }
}

testConnection();
```

---

## Step 7: Restart Your Expo Server

**Important!** After creating the `.env` file, you MUST restart Expo:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm start
```

Or:
```bash
npx expo start --clear
```

Environment variables are only loaded when Expo starts!

---

## 🎯 What You Have Now

✅ Supabase project created
✅ Database schema set up (profiles table, functions, etc.)
✅ API keys configured in `.env`
✅ Supabase client configured in `lib/supabase.ts`
✅ Required packages installed

---

## 🔐 Security Best Practices

1. **Never commit `.env` to git** ✅ (already in .gitignore)
2. **Only use `anon` key in your app** (not `service_role`)
3. **RLS policies are enabled** - users can only access allowed data
4. **Use Row Level Security** for all tables

---

## 📱 Next Steps

Now you can integrate Supabase into your auth screens:

1. **Update `auth.tsx`** - Use `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()`
2. **Update `profile.tsx`** - Use `supabase.rpc('update_user_profile', ...)`
3. **Test the flow** - Sign up → Select user type → Complete profile

See `INTEGRATION_GUIDE.md` for code examples!

---

## 🆘 Troubleshooting

### Error: "Missing Supabase environment variables"
- Make sure `.env` file exists in the root directory
- Make sure variable names start with `EXPO_PUBLIC_`
- Restart Expo server after creating `.env`

### Error: "Invalid API key"
- Double-check you copied the correct `anon` key
- Make sure there are no extra spaces or line breaks
- The key should be one long string

### Error: "relation 'profiles' does not exist"
- Make sure you ran the `setup.sql` script in Supabase SQL Editor
- Check the SQL Editor for any error messages

### Can't connect to Supabase
- Check your internet connection
- Verify the Project URL is correct
- Make sure your Supabase project is not paused (free tier pauses after 1 week of inactivity)

---

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth with React Native](https://supabase.com/docs/guides/auth/auth-helpers/react-native)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**You're all set! 🚀**
