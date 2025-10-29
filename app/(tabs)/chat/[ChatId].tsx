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
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { user } = useAuth();
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Load conversation details and messages
  useEffect(() => {
    if (!chatId || !user) return;

    loadConversationAndMessages();

    // Set up real-time subscription
    channelRef.current = subscribeToMessages(chatId, handleNewMessage);

    // Mark conversation as read when entering
    markConversationAsRead(chatId);

    // Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        unsubscribe(channelRef.current);
      }
    };
  }, [chatId, user]);

  const loadConversationAndMessages = async () => {
    setIsLoading(true);

    // Get conversation details to find other user
    const { data: conversation } = await supabase
      .from('conversations')
      .select(`
        *,
        user_a:profiles!user_a_id(id, name, photos, user_type, age),
        user_b:profiles!user_b_id(id, name, photos, user_type, age)
      `)
      .eq('id', chatId)
      .single();

    if (conversation) {
      // Determine the other user
      const other = conversation.user_a_id === user?.id
        ? conversation.user_b
        : conversation.user_a;
      setOtherUser(other);
    }

    // Load messages
    const result = await getMessages(chatId);
    if (result.success && result.data) {
      // Add isMe flag to messages
      const messagesWithIsMe = result.data.map(msg => ({
        ...msg,
        isMe: msg.sender_id === user?.id,
      }));
      setMessages(messagesWithIsMe);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }

    setIsLoading(false);
  };

  const handleNewMessage = (newMessage: any) => {
    // Add the new message to the list
    const messageWithSender: MessageWithSender = {
      ...newMessage,
      isMe: newMessage.sender_id === user?.id,
      sender: newMessage.sender_id === user?.id
        ? { id: user.id, name: 'You', photos: [] }
        : otherUser,
    };

    setMessages(prev => [...prev, messageWithSender]);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Mark as read if not sent by current user
    if (newMessage.sender_id !== user?.id) {
      markConversationAsRead(chatId);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    const messageText = message.trim();
    setMessage("");
    setIsSending(true);

    const result = await sendMessage(chatId, messageText);

    if (result.success && result.data) {
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

      setMessages(prev => [...prev, optimisticMessage]);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
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
                  uri={otherUser.photos[0]}
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

