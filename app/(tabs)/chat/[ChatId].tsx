import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Send, UserPlus } from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import Avatar from "@/components/Avatar";
import { useApp } from "@/contexts/AppContext";
import Badge from "@/components/Badge";

export default function ChatThreadScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { conversations, addFriend } = useApp();
  const [message, setMessage] = useState<string>("");

  const conversation = conversations.find((c) => c.id === chatId);

  if (!conversation) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Conversation not found</Text>
      </View>
    );
  }

  const handleAddFriend = () => {
    addFriend(conversation.user.id);
    console.log("Friend added:", conversation.user.name);
  };

  const handleSend = () => {
    if (message.trim()) {
      console.log("Send message:", message);
      setMessage("");
    }
  };

  const messages = [
    {
      id: "1",
      text: "Hey! Looking for a roommate?",
      isMe: false,
      timestamp: Date.now() - 3600000,
    },
    {
      id: "2",
      text: "Hi! Yes, I am interested.",
      isMe: true,
      timestamp: Date.now() - 3000000,
    },
    {
      id: "3",
      text: "Great! When can we meet?",
      isMe: false,
      timestamp: Date.now() - 1800000,
    },
    {
      id: "4",
      text: "How about this weekend? I'm free on Saturday afternoon.",
      isMe: true,
      timestamp: Date.now() - 1200000,
    },
    {
      id: "5",
      text: "Perfect! Saturday at 2 PM works for me. Coffee shop near campus?",
      isMe: false,
      timestamp: Date.now() - 600000,
    },
    {
      id: "6",
      text: "Sounds good! See you then.",
      isMe: true,
      timestamp: Date.now() - 300000,
    },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: conversation.user.name,
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleAddFriend}
              disabled={conversation.isFriend}
              style={styles.headerButton}
              testID="add-friend-button"
            >
              {conversation.isFriend ? (
                <Badge text="Friend" variant="success" />
              ) : (
                <UserPlus size={24} color={colors.accent} />
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
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
              {!item.isMe && (
                <Avatar
                  uri={conversation.user.photos[0]}
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
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={!message.trim()}
            testID="send-button"
          >
            <Send
              size={24}
              color={message.trim() ? colors.accent : colors.gray}
            />
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
  headerButton: {
    marginRight: spacing.md,
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

