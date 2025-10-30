# Real-Time Messaging & Push Notifications Setup Guide

## ✅ What I've Implemented

### 1. **WebSocket (Supabase Realtime) for Live Messaging** ✅
- Messages appear instantly in both users' chats
- No need to refresh - uses Supabase's real-time subscriptions
- Already working in your chat screen!

### 2. **Database Notification System** ✅
- Created `notifications` table to store all notifications
- Created `push_tokens` table to store device tokens
- Added automatic trigger: when someone sends you a message, a notification is created in the database
- Migration file: `supabase/migrations/009_add_notifications_system.sql`

### 3. **Push Notification Integration** ✅
- Integrated Expo Notifications
- Auto-registers device tokens when user logs in
- Shows local notifications when new messages arrive
- Notifications work even when app is in background

### 4. **In-App Toast Notifications** ✅
- Beautiful toast notifications appear at the top when you receive a message
- Tap the notification to go directly to the chat
- Shows sender name and message preview

## 🚀 Setup Instructions

### Step 1: Install Dependencies

```bash
npx expo install expo-notifications
```

### Step 2: Run Database Migration

You need to apply the new migration to your Supabase database:

**Option A: Using Supabase CLI (Recommended)**
```bash
# If you have Supabase CLI installed
supabase db push

# Or apply the specific migration
supabase migration up
```

**Option B: Manual SQL Execution**
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/009_add_notifications_system.sql`
4. Paste and run it

### Step 3: Enable Realtime in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Replication**
3. Enable realtime for these tables:
   - ✅ `messages`
   - ✅ `notifications`
   - ✅ `conversations`
   - ✅ `match_requests`

### Step 4: Configure Expo Notifications (for Production)

For push notifications to work in production, you need to configure your Expo project:

1. **Get your Project ID:**
   ```bash
   npx expo whoami
   # If not logged in: npx expo login
   # Then run: npx expo whoami
   ```

2. **Add Project ID to .env:**
   ```
   EXPO_PUBLIC_PROJECT_ID=your-project-id-here
   ```

3. **For iOS (Apple Push Notifications):**
   - You'll need an Apple Developer account
   - Configure APNs in Expo dashboard
   - See: https://docs.expo.dev/push-notifications/push-notifications-setup/

4. **For Android (Firebase Cloud Messaging):**
   - Create a Firebase project
   - Download `google-services.json`
   - Place it in your project root
   - See: https://docs.expo.dev/push-notifications/push-notifications-setup/

### Step 5: Rebuild Your App

Since we added a new native module (expo-notifications), you need to rebuild:

```bash
# Clear cache and restart
npx expo start -c

# If you're using a development build:
npx expo prebuild
npx expo run:ios
# or
npx expo run:android
```

## 🧪 How to Test

### Test 1: Real-Time Messaging (WebSocket)

1. **Open the app on two devices/simulators** (or use two different users)
2. User A and User B match with each other
3. User A opens chat with User B
4. User B opens chat with User A
5. **User A sends a message**
6. ✅ **User B should see it INSTANTLY** without refreshing
7. **User B sends a message**
8. ✅ **User A should see it INSTANTLY**

**Expected Console Logs:**
```
🔍 [ChatThread] Component rendered with...
✅ [ChatThread] Finished loading conversation
[When message is sent by other user]
✅ [Notifications] New notification received
```

### Test 2: Background Notifications

1. User A has the app open in chat with User B
2. **User B closes or backgrounds the app**
3. User A sends a message
4. ✅ **User B should receive a push notification** (even with app closed)
5. User B taps the notification
6. ✅ **App opens directly to the chat**

**Expected Console Logs:**
```
🔍 [NotificationContext] Registering push notifications...
✅ [NotificationContext] Push notifications registered
🔔 [NotificationContext] New notification from DB
```

### Test 3: In-App Toast Notifications

1. User A and User B are matched
2. User A is browsing other screens (NOT in chat)
3. User B sends User A a message
4. ✅ **Toast notification should appear at top of User A's screen**
5. User A taps the toast
6. ✅ **Navigates directly to the conversation**

## 📊 How It Works

### Architecture

```
User A sends message
    ↓
Message saved to database
    ↓
Database trigger fires (create_message_notification)
    ↓
Notification row created in notifications table
    ↓
Supabase Realtime broadcasts notification
    ↓
User B's app receives real-time event
    ↓
[Three things happen simultaneously]
    ├─→ 1. Show local push notification
    ├─→ 2. Show in-app toast
    └─→ 3. Update message list in real-time
```

### Real-Time Subscriptions

The app subscribes to 4 real-time channels:

1. **Messages Channel** (`messages`)
   - Listens for new messages in conversations you're part of
   - Updates chat UI instantly

2. **Notifications Channel** (`notifications`)
   - Listens for new notifications in the notifications table
   - Triggers push notifications and toasts

3. **Match Requests Channel** (`match_requests`)
   - Listens for new match requests sent to you
   - Updates notification count

4. **Conversation Updates Channel** (`conversations`)
   - Listens for changes to conversations
   - Updates conversation list

## 🔧 Troubleshooting

### Issue: Messages don't appear in real-time

**Check:**
1. Console logs - look for `[ChatThread]` subscription logs
2. Supabase Dashboard → Database → Replication → Ensure `messages` table has realtime enabled
3. Try refreshing the app

### Issue: No push notifications

**Check:**
1. Console logs - look for: `✅ [NotificationContext] Push notifications registered`
2. If you see `⚠️ Permission not granted` - check device notification settings
3. Ensure migration 009 was applied (check Supabase SQL Editor)
4. Verify notifications table exists:
   ```sql
   SELECT * FROM notifications LIMIT 5;
   ```

### Issue: Notifications work but don't navigate to chat

**Check:**
1. The notification should have `screen` and `screen_params` fields
2. Console logs: `🔍 [ChatScreen] Navigating to chat: <id>`
3. Make sure the conversation ID is valid

### Issue: Database trigger not firing

**Check trigger exists:**
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_create_message_notification';
```

**Manually test the trigger:**
```sql
-- This should create a notification automatically
INSERT INTO messages (conversation_id, sender_id, text)
VALUES ('<valid-conversation-id>', '<valid-sender-id>', 'Test message');

-- Check if notification was created
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 1;
```

## 📱 Production Considerations

### Before Going Live:

1. **Set up Expo Push Notification Service:**
   - Configure in https://expo.dev
   - Add FCM server key for Android
   - Add APNs certificates for iOS

2. **Test on physical devices:**
   - Simulators have limited notification support
   - Test with real iOS and Android devices

3. **Handle notification permissions gracefully:**
   - Don't spam users with permission requests
   - Explain why notifications are useful
   - Provide settings to disable notifications

4. **Optimize real-time subscriptions:**
   - Unsubscribe when not needed
   - Limit number of active channels
   - Clean up on logout

5. **Monitor database performance:**
   - Notifications table will grow quickly
   - Consider adding a cleanup job for old notifications
   - Add indexes for better query performance

## 🎉 Summary

You now have:
- ✅ **Real-time messaging** using Supabase Realtime (WebSocket)
- ✅ **Push notifications** for new messages (works in background)
- ✅ **In-app toast notifications** when app is open
- ✅ **Database-driven notification system** for future expansion
- ✅ **Automatic notification creation** via database triggers

No external services needed - everything runs on Supabase! 🚀
