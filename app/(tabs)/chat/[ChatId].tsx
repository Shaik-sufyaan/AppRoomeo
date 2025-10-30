import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Send } from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMessages,
  sendMessage,
  markConversationAsRead,
  subscribeToMessages,
  unsubscribe,
  MessageWithSender,
} from "@/lib/api/chat";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

export default function ChatThreadScreen() {
  const { ChatId } = useLocalSearchParams<{ ChatId: string }>();
  const chatId = ChatId; // Use the correct param name from route
  const { user } = useAuth();
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  console.log('🔍 [ChatThread] Component rendered with:', { ChatId, chatId, userId: user?.id });

  // Load conversation details and messages
  useEffect(() => {
    console.log('🔍 [ChatThread] useEffect triggered:', { chatId, hasUser: !!user });

    if (!chatId) {
      console.error('❌ [ChatThread] No chatId in route params');
      setIsLoading(false);
      return;
    }

    if (!user) {
      console.error('❌ [ChatThread] No user from AuthContext');
      setIsLoading(false);
      return;
    }

    console.log('✅ [ChatThread] Starting to load conversation...');
    loadConversationAndMessages();

    // Set up real-time subscription
    console.log('🔍 [ChatThread] Setting up real-time subscription...');
    try {
      channelRef.current = subscribeToMessages(chatId, handleNewMessage);
      console.log('✅ [ChatThread] Real-time subscription created');
    } catch (error) {
      console.error('❌ [ChatThread] Failed to set up subscription:', error);
    }

    // Set up polling as fallback (check for new messages every 3 seconds)
    console.log('🔍 [ChatThread] Setting up polling fallback...');
    pollingIntervalRef.current = setInterval(async () => {
      console.log('🔄 [ChatThread] Polling for new messages...');

      // Get the latest message ID
      const latestMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;

      // Only poll if we have messages (to get the reference point)
      if (latestMessageId || lastMessageIdRef.current) {
        const referenceId = latestMessageId || lastMessageIdRef.current;

        // Fetch messages newer than the last one we have
        const { data: newMessages } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!sender_id(id, name, photos)
          `)
          .eq('conversation_id', chatId)
          .order('created_at', { ascending: true });

        if (newMessages && newMessages.length > 0) {
          // Filter out messages we already have
          const messagesWeHave = new Set(messages.map(m => m.id));
          const trulyNewMessages = newMessages.filter((msg: any) => !messagesWeHave.has(msg.id));

          if (trulyNewMessages.length > 0) {
            console.log(`✅ [ChatThread] Found ${trulyNewMessages.length} new messages via polling`);

            trulyNewMessages.forEach((msg: any) => {
              const messageWithSender: MessageWithSender = {
                ...msg,
                isMe: msg.sender_id === user?.id,
              };
              handleNewMessage(messageWithSender);
            });
          }
        }
      }
    }, 3000); // Poll every 3 seconds

    // Mark conversation as read when entering
    markConversationAsRead(chatId);

    // Cleanup subscription and polling on unmount
    return () => {
      console.log('🔍 [ChatThread] Cleaning up subscriptions and polling');
      if (channelRef.current) {
        unsubscribe(channelRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [chatId, user]);

  const loadConversationAndMessages = async () => {
    try {
      console.log('🔍 [ChatThread] Starting to load conversation:', chatId);
      console.log('🔍 [ChatThread] Current user:', user?.id);
      setIsLoading(true);

      // Get conversation details to find other user
      console.log('🔍 [ChatThread] Querying conversation from database...');
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          user_a:profiles!user_a_id(id, name, photos, user_type, age),
          user_b:profiles!user_b_id(id, name, photos, user_type, age)
        `)
        .eq('id', chatId)
        .single();

      console.log('🔍 [ChatThread] Conversation query result:', { conversation, convError });

      if (convError || !conversation) {
        console.error('❌ [ChatThread] Error loading conversation:', convError);
        alert(`Failed to load conversation: ${convError?.message || 'Conversation not found'}`);
        setIsLoading(false);
        return;
      }

      console.log('🔍 [ChatThread] Conversation data:', {
        id: conversation.id,
        user_a_id: conversation.user_a_id,
        user_b_id: conversation.user_b_id,
        user_a: conversation.user_a,
        user_b: conversation.user_b,
      });

      // Determine the other user
      const other = conversation.user_a_id === user?.id
        ? conversation.user_b
        : conversation.user_a;

      console.log('🔍 [ChatThread] Other user:', other);

      if (!other) {
        console.error('❌ [ChatThread] Other user profile not found');
        alert('The other user\'s profile could not be loaded');
        setIsLoading(false);
        return;
      }

      setOtherUser(other);
      console.log('✅ [ChatThread] Set other user:', other.name);

      // Load messages
      console.log('🔍 [ChatThread] Loading messages...');
      const result = await getMessages(chatId);
      console.log('🔍 [ChatThread] Messages result:', result);

      if (result.success && result.data) {
        // Add isMe flag to messages
        const messagesWithIsMe = result.data.map(msg => ({
          ...msg,
          isMe: msg.sender_id === user?.id,
        }));
        setMessages(messagesWithIsMe);
        console.log(`✅ [ChatThread] Loaded ${messagesWithIsMe.length} messages`);

        // Update last message ID ref for polling
        if (messagesWithIsMe.length > 0) {
          lastMessageIdRef.current = messagesWithIsMe[messagesWithIsMe.length - 1].id;
          console.log('🔍 [ChatThread] Last message ID:', lastMessageIdRef.current);
        }

        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      } else {
        console.error('❌ [ChatThread] Error loading messages:', result.error);
        // Still show the chat even if there are no messages
        setMessages([]);
      }

      console.log('✅ [ChatThread] Finished loading conversation');
      setIsLoading(false);
    } catch (error) {
      console.error('❌ [ChatThread] Exception in loadConversationAndMessages:', error);
      alert(`Error loading chat: ${error}`);
      setIsLoading(false);
    }
  };

  const handleNewMessage = async (newMessage: any) => {
    console.log('🔔 [ChatThread] handleNewMessage called:', {
      messageId: newMessage.id,
      senderId: newMessage.sender_id,
      currentUserId: user?.id,
      text: newMessage.text?.substring(0, 50)
    });

    // Check if message already exists (prevent duplicates)
    const messageExists = messages.some(m => m.id === newMessage.id);
    if (messageExists) {
      console.log('⚠️ [ChatThread] Message already exists, skipping');
      return;
    }

    // Fetch sender details if not current user
    let senderData = otherUser;
    if (newMessage.sender_id !== user?.id && !senderData) {
      console.log('🔍 [ChatThread] Fetching sender details...');
      const { data: sender } = await supabase
        .from('profiles')
        .select('id, name, photos')
        .eq('id', newMessage.sender_id)
        .single();
      senderData = sender;
    }

    // Add the new message to the list
    const messageWithSender: MessageWithSender = {
      ...newMessage,
      isMe: newMessage.sender_id === user?.id,
      sender: newMessage.sender_id === user?.id
        ? { id: user.id, name: 'You', photos: [] }
        : senderData || { id: newMessage.sender_id, name: 'Unknown', photos: [] },
    };

    console.log('✅ [ChatThread] Adding message to list');
    setMessages(prev => [...prev, messageWithSender]);

    // Update last message ID ref
    lastMessageIdRef.current = newMessage.id;

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Mark as read if not sent by current user
    if (newMessage.sender_id !== user?.id) {
      console.log('🔍 [ChatThread] Marking message as read');
      markConversationAsRead(chatId);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    const messageText = message.trim();
    console.log('🔍 [ChatThread] Sending message:', messageText.substring(0, 50));
    setMessage("");
    setIsSending(true);

    const result = await sendMessage(chatId, messageText);
    console.log('🔍 [ChatThread] Send message result:', result);

    if (result.success && result.data) {
      console.log('✅ [ChatThread] Message sent successfully:', result.data.id);

      // Message will be added via real-time subscription
      // But we can add it optimistically for better UX
      const optimisticMessage: MessageWithSender = {
        ...result.data,
        isMe: true,
        sender: {
          id: user?.id || '',
          name: 'You',
          photos: [],
        },
      };

      // Check if message already exists before adding
      const messageExists = messages.some(m => m.id === result.data!.id);
      if (!messageExists) {
        console.log('✅ [ChatThread] Adding optimistic message to UI');
        setMessages(prev => [...prev, optimisticMessage]);

        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        console.log('⚠️ [ChatThread] Message already in list (from realtime)');
      }
    } else {
      console.error('❌ [ChatThread] Failed to send message:', result.error);
      // Show error - restore message text
      setMessage(messageText);
      alert(result.error || 'Failed to send message');
    }

    setIsSending(false);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: "Loading...",
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.primary,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!otherUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Conversation not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: otherUser.name,
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          contentContainerStyle={styles.messageList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageBubble,
                item.isMe ? styles.myMessage : styles.theirMessage,
              ]}
            >
              {!item.isMe && otherUser.photos?.[0] && (
                <Avatar
                  uri={otherUser.photos?.[0]}
                  size="small"
                  style={styles.avatar}
                />
              )}
              <View
                style={[
                  styles.bubble,
                  item.isMe ? styles.myBubble : styles.theirBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    item.isMe ? styles.myMessageText : styles.theirMessageText,
                  ]}
                >
                  {item.text}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>
                Start the conversation!
              </Text>
            </View>
          }
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            placeholderTextColor={colors.gray}
            multiline
            maxLength={500}
            testID="message-input"
            editable={!isSending}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={!message.trim() || isSending}
            testID="send-button"
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Send
                size={24}
                color={message.trim() ? colors.accent : colors.gray}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messageList: {
    padding: spacing.md,
    gap: spacing.md,
  },
  messageBubble: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  myMessage: {
    flexDirection: "row-reverse",
  },
  theirMessage: {
    flexDirection: "row",
  },
  avatar: {
    marginBottom: spacing.xs,
  },
  bubble: {
    maxWidth: "70%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: colors.accent,
  },
  theirBubble: {
    backgroundColor: colors.cardLight,
  },
  messageText: {
    ...typography.body,
  },
  myMessageText: {
    color: colors.white,
  },
  theirMessageText: {
    color: colors.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.gray,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});

