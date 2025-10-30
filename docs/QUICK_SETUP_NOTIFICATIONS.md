# Quick Setup: Real-Time Notifications

## 🚀 Run These Commands

```bash
# 1. Install expo-notifications
npx expo install expo-notifications

# 2. Clear cache and restart
npx expo start -c
```

## 📋 Apply Database Migration

**Copy and run this in your Supabase SQL Editor:**

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Open file: `supabase/migrations/009_add_notifications_system.sql`
3. Copy all contents
4. Paste into SQL Editor
5. Click "Run"

## ⚙️ Enable Realtime

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/database/replication
2. Enable realtime for:
   - ✅ messages
   - ✅ notifications
   - ✅ conversations
   - ✅ match_requests

## ✅ That's It!

Your app now has:
- ✅ Real-time messaging (WebSocket)
- ✅ Push notifications
- ✅ In-app toast notifications

**Test it:**
1. Open app on two devices
2. Match with each other
3. Send a message
4. Watch it appear instantly! 🎉

---

For detailed info, see: `REAL_TIME_NOTIFICATIONS_SETUP.md`
