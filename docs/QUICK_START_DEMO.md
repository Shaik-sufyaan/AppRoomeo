# 🚀 Quick Start - Chat Demo

## See Your Chat Feature in 2 Minutes!

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** → **New query**

### Step 2: Run the Demo Script
1. Open file: `/supabase/seed_demo_chat.sql`
2. Copy **all** the contents
3. Paste into SQL Editor
4. Click **Run** (or press `Ctrl+Enter`)
5. Wait for success message ✅

### Step 3: Refresh Your App
1. Close and reopen the app
2. Go to **Chat** tab
3. See 3 demo conversations! 🎉

---

## What You'll See

### Chat List
```
┌─────────────────────────────────────────┐
│  Chat                            🔔 2   │
├─────────────────────────────────────────┤
│  PENDING REQUESTS (0)                   │
├─────────────────────────────────────────┤
│  Messages (3)                           │
│                                         │
│  [👤] Sarah Johnson       🔴 1          │
│       Saturday at 2pm works...          │
│       5 min ago                         │
│                                         │
│  [👤] Mike Chen          🔴 1           │
│       Hey, just wanted to follow up...  │
│       3 hours ago                       │
│                                         │
│  [👤] Emma Martinez                     │
│       Really chill, lots of cafes...    │
│       2 days ago                        │
└─────────────────────────────────────────┘
```

### Open a Conversation
Tap any conversation to see full message history and send messages!

---

## Demo Conversations

### 🏠 Sarah Johnson
- **Status:** 1 unread message
- **Topic:** Apartment viewing scheduled
- **Messages:** 7 back-and-forth messages
- **Try:** Send a reply confirming the viewing time

### 💻 Mike Chen
- **Status:** 1 unread message
- **Topic:** Remote work setup discussion
- **Messages:** 5 messages
- **Try:** Reply to his follow-up question

### 🎨 Emma Martinez
- **Status:** All read
- **Topic:** Artistic apartment, neighborhood chat
- **Messages:** 5 messages
- **Try:** Continue the conversation or start a new topic

---

## Test These Features

✅ **Send a message** - Type and hit send
✅ **Real-time updates** - Message appears instantly
✅ **Read receipts** - Unread badges disappear
✅ **Auto-scroll** - Scrolls to newest messages
✅ **Message validation** - Try empty/long messages

---

## Cleanup

When done testing, run this in SQL Editor:

```sql
DELETE FROM profiles
WHERE name IN ('Sarah Johnson', 'Mike Chen', 'Emma Martinez');
```

---

## Need Help?

📖 Full guide: `/docs/DEMO_CHAT_SETUP.md`
🔧 Technical docs: `/docs/CHAT_IMPLEMENTATION.md`
💬 Can't see conversations? Check you're logged in and refresh the app

---

**That's it! Start chatting!** 💬
