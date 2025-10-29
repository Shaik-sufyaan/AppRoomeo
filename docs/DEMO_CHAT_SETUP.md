# Demo Chat Setup Guide

## Quick Start - See Chat Feature Immediately!

Follow these steps to populate your app with demo conversations so you can test the chat feature without matching with real users.

---

## Step 1: Run the Demo Seed Script

### Option A: Using Supabase Dashboard (Easiest)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy & Paste the Script**
   - Open `/supabase/seed_demo_chat.sql`
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Run the Script**
   - Click "Run" or press `Ctrl+Enter` / `Cmd+Enter`
   - Wait for completion (should take 1-2 seconds)

5. **Check the Output**
   - You should see success messages like:
   ```
   ✅ Demo data created successfully!
   📱 You now have:
      - 3 demo users (Sarah, Mike, Emma)
      - 3 conversations with different states
      - Multiple messages in each conversation
      - 2 unread messages (from Sarah and Mike)
   ```

---

## Step 2: View Demo Conversations in Your App

1. **Refresh Your App**
   - Close and reopen the app
   - Or pull to refresh on the Chat screen

2. **Navigate to Chat Tab**
   - You should now see 3 conversations:
     - **Sarah Johnson** - Most recent (5 min ago) with 1 unread message
     - **Mike Chen** - 3 hours ago with 1 unread message
     - **Emma Martinez** - 2 days ago, all read

3. **Open a Conversation**
   - Tap any conversation to see the message history
   - Try sending a message - it should work in real-time!

---

## What You'll See

### Chat List Screen (`/chat`)

You'll see 3 conversations with:
- ✅ Profile pictures (from placeholder service)
- ✅ Last message preview
- ✅ Timestamps (5 min ago, 3 hours ago, 2 days ago)
- 🔴 Unread badges (Sarah has 1, Mike has 1)
- 📊 Total message count shown

### Individual Chat Threads

**Sarah's Conversation (Most Active)**
- 7 total messages back and forth
- Conversation about viewing her apartment
- Last message: "Saturday at 2pm works perfectly! I'll send you the address."
- Status: 1 unread message

**Mike's Conversation (Needs Response)**
- 5 messages about remote work setup
- Mike asking if you're still interested
- Status: 1 unread message from 3 hours ago

**Emma's Conversation (Older)**
- 5 messages about her artistic apartment
- Discussion about neighborhood
- Status: All messages read, last activity 2 days ago

---

## Features You Can Test

### 1. Real-time Messaging
- Open a conversation
- Send a message
- It should appear immediately
- Check Supabase database - message is saved

### 2. Read Receipts
- Open Sarah's or Mike's conversation (with unread badge)
- Unread badge should disappear
- Messages automatically marked as read

### 3. Conversation List Updates
- Send a message in Emma's chat
- Go back to chat list
- Emma's conversation should move to the top
- Last message preview updates

### 4. Message Validation
- Try sending an empty message (disabled)
- Try sending a very long message (500+ chars, gets blocked)

### 5. Optimistic Updates
- Send a message
- Notice it appears immediately (before database confirms)
- Check that it has proper timestamp and sender info

---

## Demo User Details

### Sarah Johnson
- **Age:** 24
- **Type:** Finding roommate (has place)
- **College:** UCLA
- **Work:** Full-time
- **About:** Grad student with 2BR apartment, loves cooking and yoga
- **Rent:** $850/month including utilities
- **Personality:** Friendly, organized, social

### Mike Chen
- **Age:** 26
- **Type:** Finding roommate (has place)
- **College:** USC
- **Work:** Full-time (Software Engineer, WFH)
- **About:** Quiet, clean, tech-focused
- **Setup:** Home office, fiber internet
- **Personality:** Low-key, gamer, professional

### Emma Martinez
- **Age:** 23
- **Type:** Finding roommate (has place)
- **College:** UCLA
- **Work:** Part-time (Art student)
- **About:** Creative, plant-lover, artistic
- **Vibe:** Cozy apartment with art and plants
- **Personality:** Creative, chill, bohemian

---

## Troubleshooting

### "No conversations found"

**Problem:** Script ran but no conversations appear

**Solutions:**
1. Make sure you're logged in to the app
2. Pull to refresh on the chat screen
3. Check Supabase logs for errors
4. Verify your user ID is correct in the script

### "Permission denied" error

**Problem:** RLS policy blocking access

**Solutions:**
1. Make sure you're authenticated in the app
2. Check that your user profile exists in the `profiles` table
3. Verify RLS policies are enabled on `conversations` and `messages` tables

### Messages not appearing in real-time

**Problem:** Real-time subscriptions not working

**Solutions:**
1. Check Supabase Realtime is enabled for your project
2. Verify you have an active internet connection
3. Try closing and reopening the conversation
4. Check browser console for subscription errors

---

## Cleanup - Remove Demo Data

When you're done testing and want to remove the demo conversations:

### Option 1: Manual Delete in App
- Swipe to delete conversations (if you add this feature)
- Or manually delete from database

### Option 2: Run Cleanup Script

1. Open Supabase SQL Editor
2. Copy this script:
```sql
DO $$
BEGIN
  -- Delete demo users (cascades to conversations and messages)
  DELETE FROM profiles
  WHERE name IN ('Sarah Johnson', 'Mike Chen', 'Emma Martinez');

  RAISE NOTICE '✅ All demo data has been deleted!';
END $$;
```
3. Run it
4. Refresh your app - demo conversations will be gone

---

## Next Steps After Testing

Once you've tested the demo chat:

1. **Real User Testing**
   - Create real user accounts
   - Test matching flow
   - Test marketplace conversations

2. **Performance Testing**
   - Add more conversations
   - Test with longer message history
   - Test real-time updates across multiple devices

3. **Production Preparation**
   - Remove demo data
   - Test with production Supabase instance
   - Set up monitoring for real-time connections

---

## FAQ

**Q: Can I customize the demo messages?**
A: Yes! Edit the `seed_demo_chat.sql` file and change the message text, usernames, or add more conversations.

**Q: Will demo users show up in the matches feed?**
A: Yes, if their `user_type` is complementary to yours and they're marked as `is_visible: true`.

**Q: Can I add more demo conversations?**
A: Absolutely! Copy the conversation creation pattern in the SQL script and add as many as you want.

**Q: Are the profile pictures real?**
A: No, they're from `pravatar.cc`, a placeholder avatar service. Replace with real image URLs if needed.

**Q: How do I test with multiple users?**
A: Create another Supabase account or use incognito mode with a different email to create a second user account.

---

## Demo Conversation Flows

### Scenario 1: Active Apartment Hunt (Sarah)
**Context:** Recently matched, actively discussing moving in
**Stage:** Scheduling apartment viewing
**Next Steps:** Confirm viewing time, exchange contact info

### Scenario 2: Follow-up Needed (Mike)
**Context:** Initial discussion went well, but you haven't responded
**Stage:** Mike is checking if you're still interested
**Next Steps:** Respond to Mike's question about room availability

### Scenario 3: Casual Interest (Emma)
**Context:** Early conversation, getting to know each other
**Stage:** Discussing neighborhood and lifestyle
**Next Steps:** Continue conversation or let it naturally fade

---

**Enjoy testing your fully functional chat feature!** 🎉

If you have any issues, check the Supabase logs or open the browser console for debugging information.
