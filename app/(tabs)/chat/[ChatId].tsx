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
import { LinearGradient } from "expo-linear-gradient";
import colors from "@/constants/colors";
import { chatColors, chatTypography, chatBorderRadius, chatSpacing } from "@/constants/chatColors";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import Avatar from "@/components/Avatar";
import QuickActions from "@/components/chat/QuickActions";
import DateDivider from "@/components/chat/DateDivider";
import PaymentCard from "@/components/chat/PaymentCard";
import TypingIndicator from "@/components/chat/TypingIndicator";
import CreateSplitModal from "@/components/chat/CreateSplitModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMessages,
  sendMessage,
  markConversationAsRead,
  subscribeToMessages,
  unsubscribe,
  MessageWithSender,
} from "@/lib/api/chat";
import {
  createSplitRequest,
  getSplitRequestByMessageId,
  acceptSplitRequest,
  declineSplitRequest,
  SplitRequestDetail,
} from "@/lib/api/expenses";
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
  const messageIdsRef = useRef<Set<string>>(new Set());
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [splitRequests, setSplitRequests] = useState<Map<string, SplitRequestDetail>>(new Map());
  const [settledSplits, setSettledSplits] = useState<Set<string>>(new Set()); // Track which split requests are settled

  // Load conversation details and messages
  useEffect(() => {
    if (!chatId) {
      setIsLoading(false);
      return;
    }

    if (!user) {
      setIsLoading(false);
      return;
    }

    loadConversationAndMessages();

    // Set up real-time subscription
    try {
      channelRef.current = subscribeToMessages(chatId, handleNewMessage);
    } catch (error) {
      console.error('Failed to set up subscription:', error);
    }

    // Mark conversation as read when entering
    markConversationAsRead(chatId);

    // Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        unsubscribe(channelRef.current);
      }
    };
  }, [chatId, user?.id]);

  const loadConversationAndMessages = async () => {
    try {
      setIsLoading(true);

      // Get conversation details to find other user
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          user_a:profiles!user_a_id(id, name, photos, user_type, age),
          user_b:profiles!user_b_id(id, name, photos, user_type, age)
        `)
        .eq('id', chatId)
        .single();

      if (convError || !conversation) {
        alert(`Failed to load conversation: ${convError?.message || 'Conversation not found'}`);
        setIsLoading(false);
        return;
      }

      // Determine the other user
      const other = conversation.user_a_id === user?.id
        ? conversation.user_b
        : conversation.user_a;

      if (!other) {
        alert('The other user\'s profile could not be loaded');
        setIsLoading(false);
        return;
      }

      setOtherUser(other);

      // Load messages
      const result = await getMessages(chatId);

      if (result.success && result.data) {
        // Add isMe flag to messages
        const messagesWithIsMe = result.data.map(msg => ({
          ...msg,
          isMe: msg.sender_id === user?.id,
        }));

        // Clear the message IDs set and populate with loaded messages
        messageIdsRef.current.clear();
        messagesWithIsMe.forEach(msg => messageIdsRef.current.add(msg.id));

        setMessages(messagesWithIsMe);

        // Load split requests for messages
        await loadSplitRequests(messagesWithIsMe);

        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      } else {
        // Still show the chat even if there are no messages
        setMessages([]);
        messageIdsRef.current.clear();
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Exception in loadConversationAndMessages:', error);
      alert(`Error loading chat: ${error}`);
      setIsLoading(false);
    }
  };

  const loadSplitRequests = async (msgs: MessageWithSender[]) => {
    const newSplitRequests = new Map<string, SplitRequestDetail>();
    const newSettledSplits = new Set<string>();

    // Find all messages that might have split requests
    for (const msg of msgs) {
      if (msg.text.includes('💰 Split request:')) {
        const result = await getSplitRequestByMessageId(msg.id);
        if (result.success && result.data) {
          newSplitRequests.set(msg.id, result.data);

          // Check if this split is settled (only for accepted splits)
          if (result.data.status === 'accepted') {
            const { getExpenseBySplitRequest } = await import('@/lib/api/expenses');
            const expenseResult = await getExpenseBySplitRequest(result.data.id);

            if (expenseResult.success && expenseResult.data) {
              const expense = expenseResult.data;
              const userSplit = expense.splits.find((s) => s.user_id === user?.id);

              // If user's split is paid, mark this split request as settled
              if (userSplit && userSplit.paid) {
                newSettledSplits.add(msg.id);
              }
            }
          }
        }
      }
    }

    setSplitRequests(newSplitRequests);
    setSettledSplits(newSettledSplits);
  };

  const handleNewMessage = async (newMessage: any) => {
    // Check if message already exists using the Set (prevents duplicates)
    if (messageIdsRef.current.has(newMessage.id)) {
      return;
    }

    // Fetch sender details if not already included
    let senderData = newMessage.sender;
    if (!senderData) {
      if (newMessage.sender_id === user?.id) {
        senderData = { id: user.id, name: 'You', photos: [] };
      } else if (otherUser && otherUser.id === newMessage.sender_id) {
        senderData = { id: otherUser.id, name: otherUser.name, photos: otherUser.photos || [] };
      } else {
        const { data: sender } = await supabase
          .from('profiles')
          .select('id, name, photos')
          .eq('id', newMessage.sender_id)
          .single();
        senderData = sender;
      }
    }

    // Add the new message to the list
    const messageWithSender: MessageWithSender = {
      ...newMessage,
      isMe: newMessage.sender_id === user?.id,
      sender: senderData || { id: newMessage.sender_id, name: 'Unknown', photos: [] },
    };

    // Add to Set to track it
    messageIdsRef.current.add(newMessage.id);

    setMessages(prev => [...prev, messageWithSender]);

    // If it's a split request message, load the split request data
    if (newMessage.text.includes('💰 Split request:')) {
      const result = await getSplitRequestByMessageId(newMessage.id);
      if (result.success && result.data) {
        setSplitRequests((prev) => new Map(prev).set(newMessage.id, result.data!));
      }
    }

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
    if (!message.trim() || isSending) {
      return;
    }

    const messageText = message.trim();

    // Clear input and set sending state
    setMessage("");
    setIsSending(true);

    try {
      const result = await sendMessage(chatId, messageText);

      if (result.success && result.data) {
        // Don't add optimistically - let real-time handle it
        // This prevents duplicates
      } else {
        // Show error - restore message text
        setMessage(messageText);
        alert(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Exception in handleSend:', error);
      setMessage(messageText);
      alert('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateSplitRequest = async (splitRequest: {
    itemName: string;
    itemEmoji: string;
    totalAmount: number;
    splits: { userId: string; userName: string; amount: number }[];
  }) => {
    try {
      const result = await createSplitRequest(chatId, splitRequest);

      if (result.success) {
        setShowSplitModal(false);
        // Message will appear via real-time subscription
      } else {
        alert(result.error || 'Failed to create split request');
      }
    } catch (error) {
      console.error('Exception in handleCreateSplitRequest:', error);
      alert('Failed to create split request');
    }
  };

  const handleAcceptSplit = async (splitRequestId: string) => {
    try {
      const result = await acceptSplitRequest(splitRequestId);

      if (result.success) {
        // Find the message ID for this split request
        const messageId = Array.from(splitRequests.entries()).find(
          ([_, sr]) => sr.id === splitRequestId
        )?.[0];

        if (messageId) {
          // Reload the split request to get updated status
          const updated = await getSplitRequestByMessageId(messageId);
          if (updated.success && updated.data) {
            setSplitRequests((prev) => new Map(prev).set(messageId, updated.data!));
          }
        }
      } else {
        alert(result.error || 'Failed to accept split request');
      }
    } catch (error) {
      console.error('Exception in handleAcceptSplit:', error);
      alert('Failed to accept split request');
    }
  };

  const handleDeclineSplit = async (splitRequestId: string) => {
    try {
      const result = await declineSplitRequest(splitRequestId);

      if (result.success) {
        // Find the message ID for this split request
        const messageId = Array.from(splitRequests.entries()).find(
          ([_, sr]) => sr.id === splitRequestId
        )?.[0];

        if (messageId) {
          // Reload the split request to get updated status
          const updated = await getSplitRequestByMessageId(messageId);
          if (updated.success && updated.data) {
            setSplitRequests((prev) => new Map(prev).set(messageId, updated.data!));
          }
        }
      } else {
        alert(result.error || 'Failed to decline split request');
      }
    } catch (error) {
      console.error('Exception in handleDeclineSplit:', error);
      alert('Failed to decline split request');
    }
  };

  const handleSettleUp = async (splitRequestId: string) => {
    try {
      // Import the function we'll create
      const { getExpenseBySplitRequest, markSplitAsPaid } = await import('@/lib/api/expenses');

      // Get the expense for this split request
      const expenseResult = await getExpenseBySplitRequest(splitRequestId);

      if (!expenseResult.success || !expenseResult.data) {
        alert('Could not find expense for this split request');
        return;
      }

      const expense = expenseResult.data;

      // Find the split of the person who OWES money (not the creator/payer)
      // The creator is marking that the other person paid them back
      const otherUserSplit = expense.splits.find(
        (s) => s.user_id !== expense.paid_by
      );

      if (!otherUserSplit) {
        alert('Could not find the other user\'s split in this expense');
        return;
      }

      // Mark the other user's split as paid
      const result = await markSplitAsPaid(otherUserSplit.id);

      if (result.success) {
        alert('✅ Payment marked as settled!');

        // Update settled splits state to show "Settled" badge
        setSettledSplits((prev) => {
          const newSet = new Set(prev);
          // Find the message ID for this split request
          const messageId = Array.from(splitRequests.entries()).find(
            ([_, sr]) => sr.id === splitRequestId
          )?.[0];
          if (messageId) {
            newSet.add(messageId);
          }
          return newSet;
        });
      } else {
        alert(result.error || 'Failed to settle payment');
      }
    } catch (error) {
      console.error('Exception in handleSettleUp:', error);
      alert('Failed to settle payment');
    }
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Loading...",
            headerShown: true,
            headerStyle: { backgroundColor: chatColors.tealLight },
            headerTintColor: chatColors.onDarkBackground,
          }}
        />
        <LinearGradient
          colors={[chatColors.tealLight, chatColors.tealMedium, chatColors.tealDark]}
          style={styles.container}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={chatColors.onDarkBackground} />
          </View>
        </LinearGradient>
      </>
    );
  }

  if (!otherUser) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Chat",
            headerShown: true,
            headerStyle: { backgroundColor: chatColors.tealLight },
            headerTintColor: chatColors.onDarkBackground,
          }}
        />
        <LinearGradient
          colors={[chatColors.tealLight, chatColors.tealMedium, chatColors.tealDark]}
          style={styles.container}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>Conversation not found</Text>
          </View>
        </LinearGradient>
      </>
    );
  }

  // Helper function to check if we should show date divider
  const shouldShowDateDivider = (currentIndex: number): boolean => {
    if (currentIndex === 0) return true;
    const currentMsg = messages[currentIndex];
    const prevMsg = messages[currentIndex - 1];
    const currentDate = new Date(currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.created_at).toDateString();
    return currentDate !== prevDate;
  };

  // Get user initials for typing indicator
  const getUserInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: otherUser.name,
          headerShown: true,
          headerStyle: { backgroundColor: chatColors.tealLight },
          headerTintColor: chatColors.onDarkBackground,
        }}
      />
      <LinearGradient
        colors={[chatColors.tealLight, chatColors.tealMedium, chatColors.tealDark]}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={90}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            contentContainerStyle={styles.messageList}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              const splitRequest = splitRequests.get(item.id);
              const isSplitMessage = item.text.includes('💰 Split request:');

              return (
                <View>
                  {shouldShowDateDivider(index) && (
                    <DateDivider date={item.created_at} />
                  )}
                  {isSplitMessage ? (
                    // Render PaymentCard for split request messages
                    <View style={[
                      styles.paymentCardContainer,
                      item.isMe ? styles.myMessage : styles.theirMessage
                    ]}>
                      {splitRequest ? (
                        <PaymentCard
                          splitRequest={splitRequest}
                          onAccept={() => handleAcceptSplit(splitRequest.id)}
                          onDecline={() => handleDeclineSplit(splitRequest.id)}
                          onSettleUp={() => handleSettleUp(splitRequest.id)}
                          isCreator={splitRequest.created_by === user?.id}
                          isSettled={settledSplits.has(item.id)}
                        />
                      ) : (
                        <View style={[styles.bubble, styles.theirBubble, styles.loadingBubble]}>
                          <ActivityIndicator size="small" color={chatColors.primary} />
                          <Text style={[styles.messageText, styles.theirMessageText]}>
                            Loading split request...
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    // Render normal message
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
                      {item.isMe ? (
                        <LinearGradient
                          colors={[chatColors.accentGreen, chatColors.successGreen]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.bubble, styles.myBubble]}
                        >
                          <Text style={[styles.messageText, styles.myMessageText]}>
                            {item.text}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View style={[styles.bubble, styles.theirBubble]}>
                          <Text style={[styles.messageText, styles.theirMessageText]}>
                            {item.text}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySubtext}>
                  Start the conversation!
                </Text>
              </View>
            }
            ListFooterComponent={
              isTyping ? (
                <TypingIndicator
                  userName={otherUser.name}
                  userInitials={getUserInitials(otherUser.name)}
                />
              ) : null
            }
          />
          <QuickActions
            onRequestSplit={() => setShowSplitModal(true)}
            onShareItem={() => {}}
            onSendLocation={() => {}}
          />
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              placeholder="Type a message..."
              placeholderTextColor={chatColors.secondaryText}
              multiline
              maxLength={500}
              testID="message-input"
              editable={!isSending}
              blurOnSubmit={false}
              returnKeyType="default"
            />
            <TouchableOpacity
              style={styles.sendButtonContainer}
              onPress={handleSend}
              disabled={!message.trim() || isSending}
              testID="send-button"
            >
              <LinearGradient
                colors={[chatColors.accentGreen, chatColors.successGreen]}
                style={styles.sendButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color={chatColors.onDarkBackground} />
                ) : (
                  <Send
                    size={20}
                    color={chatColors.onDarkBackground}
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        <CreateSplitModal
          visible={showSplitModal}
          onClose={() => setShowSplitModal(false)}
          onSubmit={handleCreateSplitRequest}
          participants={[
            { id: user?.id || '', name: 'You' },
            { id: otherUser.id, name: otherUser.name }
          ]}
        />
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messageList: {
    padding: chatSpacing.md,
    paddingBottom: chatSpacing.lg,
  },
  messageBubble: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: chatSpacing.sm,
    marginVertical: chatSpacing.xs,
  },
  myMessage: {
    flexDirection: "row-reverse",
  },
  theirMessage: {
    flexDirection: "row",
  },
  avatar: {
    marginBottom: chatSpacing.xs,
  },
  bubble: {
    maxWidth: "70%",
    paddingHorizontal: chatSpacing.lg,
    paddingVertical: chatSpacing.md,
    borderRadius: chatBorderRadius.xlarge,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  myBubble: {
    borderBottomRightRadius: chatBorderRadius.small,
  },
  theirBubble: {
    backgroundColor: chatColors.receivedBubble,
    borderBottomLeftRadius: chatBorderRadius.small,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: chatSpacing.sm,
    paddingVertical: chatSpacing.md + 4,
  },
  messageText: {
    fontSize: chatTypography.messageText.fontSize,
    fontWeight: chatTypography.messageText.fontWeight,
    lineHeight: chatTypography.messageText.lineHeight,
  },
  myMessageText: {
    color: chatColors.onDarkBackground,
  },
  theirMessageText: {
    color: chatColors.onLightBackground,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: chatSpacing.xl * 2,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: chatColors.onDarkBackground,
    marginBottom: chatSpacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: chatColors.tertiaryText,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: chatSpacing.md,
    paddingBottom: Platform.OS === 'ios' ? chatSpacing.xl : chatSpacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderTopWidth: 1,
    borderTopColor: chatColors.borderLight,
    gap: chatSpacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    backgroundColor: chatColors.inputBackground,
    borderWidth: 1,
    borderColor: chatColors.inputBorder,
    borderRadius: chatBorderRadius.xxlarge,
    paddingHorizontal: chatSpacing.lg,
    paddingVertical: chatSpacing.sm + 2,
    maxHeight: 100,
    color: chatColors.onLightBackground,
  },
  sendButtonContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: chatColors.accentGreen,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: "center",
    marginTop: chatSpacing.xl,
  },
  paymentCardContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: chatSpacing.md,
    marginVertical: chatSpacing.sm,
  },
});

