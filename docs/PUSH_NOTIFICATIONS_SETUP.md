# Push Notifications Setup Guide (Optional)

## Overview

This guide explains how to add **push notifications** so users get notified even when the app is closed or in the background.

**Current State:**
- ✅ Real-time notifications work when app is OPEN
- ✅ In-app toast notifications show
- ❌ No notifications when app is CLOSED

**After Setup:**
- ✅ Users get push notifications on their device
- ✅ Works when app is closed, backgrounded, or open
- ✅ Shows on lock screen and notification center

---

## Prerequisites

Before setting up push notifications, you need:

1. ✅ Expo account (sign up at https://expo.dev)
2. ✅ Physical device (push notifications don't work on iOS simulator)
3. ✅ For iOS: Apple Developer Account ($99/year)
4. ✅ For Android: Google Cloud Project with FCM enabled

---

## Step 1: Install Expo Notifications

```bash
npx expo install expo-notifications expo-device expo-constants
```

---

## Step 2: Configure app.json

Add notification configuration to your `app.json`:

```json
{
  "expo": {
    "name": "MyCrib",
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "googleServicesFile": "./google-services.json",
      "permissions": [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "WAKE_LOCK"
      ]
    }
  }
}
```

---

## Step 3: Create Notification Service

Create `/lib/notifications.ts`:

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request notification permissions
export async function registerForPushNotificationsAsync() {
  let token;

  if (!Device.isDevice) {
    alert('Must use physical device for push notifications');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    alert('Failed to get push notification permissions!');
    return null;
  }

  // Get push token
  token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  // Configure Android channel
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token.data;
}

// Save push token to database
export async function savePushToken(userId: string, token: string) {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: userId,
        token: token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving push token:', error);
    }
  } catch (error) {
    console.error('Exception saving push token:', error);
  }
}

// Handle notification tap
export function setupNotificationHandlers() {
  // Notification received while app is foregrounded
  Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification);
  });

  // User tapped notification
  Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification tapped:', response);

    // Navigate based on notification data
    const data = response.notification.request.content.data;
    if (data.type === 'match_request') {
      // Navigate to chat screen
      // router.push('/chat');
    } else if (data.type === 'message') {
      // Navigate to specific conversation
      // router.push(`/chat/${data.conversationId}`);
    }
  });
}
```

---

## Step 4: Create Push Tokens Database Table

Run this SQL in Supabase:

```sql
-- Create push_tokens table
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users can manage own tokens"
  ON push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);

-- Grant permissions
GRANT ALL ON push_tokens TO authenticated;
```

---

## Step 5: Register Push Token on Login

Update your `AuthContext.tsx`:

```typescript
import { registerForPushNotificationsAsync, savePushToken, setupNotificationHandlers } from '@/lib/notifications';

// In AuthProvider component
useEffect(() => {
  if (user) {
    // Register for push notifications
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        savePushToken(user.id, token);
      }
    });

    // Setup notification handlers
    setupNotificationHandlers();
  }
}, [user]);
```

---

## Step 6: Create Supabase Edge Function to Send Notifications

Create `/supabase/functions/send-push-notification/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  try {
    const { userId, title, body, data } = await req.json();

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user's push tokens
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId);

    if (error || !tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No push tokens found' }),
        { status: 404 }
      );
    }

    // Send push notification to each token
    const messages = tokens.map((tokenData) => ({
      to: tokenData.token,
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});
```

---

## Step 7: Create Database Trigger to Send Notifications

Run this SQL in Supabase:

```sql
-- Function to send push notification via Edge Function
CREATE OR REPLACE FUNCTION send_match_request_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function to send push notification
  PERFORM
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.headers')::json->>'authorization'
      ),
      body := jsonb_build_object(
        'userId', NEW.recipient_id,
        'title', 'New Match Request!',
        'body', 'Someone wants to match with you',
        'data', jsonb_build_object(
          'type', 'match_request',
          'requestId', NEW.id
        )
      )
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new match requests
CREATE TRIGGER on_match_request_created
  AFTER INSERT ON match_requests
  FOR EACH ROW
  EXECUTE FUNCTION send_match_request_notification();

-- Similar trigger for messages
CREATE OR REPLACE FUNCTION send_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
BEGIN
  -- Get recipient ID from conversation
  SELECT
    CASE
      WHEN user_a_id = NEW.sender_id THEN user_b_id
      ELSE user_a_id
    END INTO recipient_id
  FROM conversations
  WHERE id = NEW.conversation_id;

  -- Get sender name
  SELECT name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Send notification
  PERFORM
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'userId', recipient_id,
        'title', 'New message from ' || sender_name,
        'body', LEFT(NEW.text, 100),
        'data', jsonb_build_object(
          'type', 'message',
          'conversationId', NEW.conversation_id
        )
      )
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_created
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION send_message_notification();
```

---

## Step 8: Deploy Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy send-push-notification
```

---

## Step 9: Test Push Notifications

### Test on iOS:
1. Build app: `eas build --platform ios --profile development`
2. Install on physical iPhone
3. Grant notification permissions
4. Send yourself a match request from another account
5. Close the app
6. Should receive push notification!

### Test on Android:
1. Build app: `eas build --platform android --profile development`
2. Install APK on physical Android device
3. Grant notification permissions
4. Send match request
5. Should receive push notification!

---

## Troubleshooting

### Notifications not received

**Check 1: Are permissions granted?**
```typescript
const { status } = await Notifications.getPermissionsAsync();
console.log('Permission status:', status); // Should be 'granted'
```

**Check 2: Is token saved to database?**
```sql
SELECT * FROM push_tokens WHERE user_id = 'YOUR_USER_ID';
```

**Check 3: Check Expo push logs**
Visit: https://expo.dev/accounts/YOUR_ACCOUNT/projects/YOUR_PROJECT/push-notifications

**Check 4: Supabase Edge Function logs**
Supabase Dashboard → Edge Functions → send-push-notification → Logs

### iOS specific issues

- Must use physical device (simulator doesn't support push)
- Need Apple Developer account
- Need to configure APNs credentials in Expo

### Android specific issues

- Need `google-services.json` file
- Need FCM configured in Firebase Console
- Check notification permissions in app settings

---

## Cost Considerations

**Expo Push Notifications:**
- Free tier: 1 million notifications/month
- Paid: $29/month for more

**Supabase Edge Functions:**
- Free tier: 500K invocations/month
- Paid: $25/month for more

**For most apps, free tier is sufficient!**

---

## Summary

### What You Get:

✅ Push notifications when app is closed
✅ Badge counts on app icon
✅ Lock screen notifications
✅ Notification center history
✅ Deep linking to specific screens

### Setup Time:

- Basic setup: 2-3 hours
- Testing and debugging: 1-2 hours
- **Total: ~4-5 hours**

### Complexity:

⭐⭐⭐⭐⚪ (Medium-High)

---

**Note:** Push notifications are optional. Your app already has real-time notifications when the app is open. Only add push notifications if you need to reach users when the app is closed.
