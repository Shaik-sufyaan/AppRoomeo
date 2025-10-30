import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import NotificationBell from "@/components/NotificationBell";
import MatchRequestCard from "@/components/MatchRequestCard";
import MatchCelebrationModal from "@/components/MatchCelebrationModal";
import RejectConfirmationModal from "@/components/RejectConfirmationModal";
import { Trash2 } from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  getReceivedMatchRequests,
  approveMatchRequest,
  rejectMatchRequest,
} from "@/lib/api/matches";
import {
  getConversations,
  ConversationWithDetails,
  getOrCreateConversation,
} from "@/lib/api/chat";
import { MatchRequestWithUser } from "@/types";

export default function ChatScreen() {
  const { user } = useAuth();
  const { notificationCounts, refreshNotifications } = useNotifications();
  const router = useRouter();

  // Conversation state
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  // Match request state
  const [matchRequests, setMatchRequests] = useState<MatchRequestWithUser[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  // Modal state
  const [celebrationModalVisible, setCelebrationModalVisible] = useState(false);
  const [celebratedUser, setCelebratedUser] = useState<any>(null);
  const [isMutualMatch, setIsMutualMatch] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<MatchRequestWithUser | null>(null);

  // Load conversations
  const loadConversations = async () => {
    try {
      setIsLoadingConversations(true);
      const result = await getConversations();
      if (result.success && result.data) {
        setConversations(result.data);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // Load match requests
  const loadMatchRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const result = await getReceivedMatchRequests();
      if (result.success && result.data) {
        setMatchRequests(result.data);
      }
    } catch (error) {
      console.error("Failed to load match requests:", error);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // Reload on screen focus
  useFocusEffect(
    useCallback(() => {
      loadConversations();
      loadMatchRequests();
      refreshNotifications(); // Refresh notification counts
    }, [refreshNotifications])
  );

  // Handle approve request
  const handleApproveRequest = async (requestId: string) => {
    console.log('🔍 [ChatScreen] Approving match request:', requestId);
    const request = matchRequests.find((r) => r.id === requestId);
    if (!request || !request.user) {
      console.error('❌ [ChatScreen] Request not found or missing user');
      return;
    }

    console.log('🔍 [ChatScreen] Request found:', {
      id: request.id,
      senderId: request.senderId,
      userName: request.user.name
    });

    console.log('🔍 [ChatScreen] Calling approveMatchRequest...');
    const result = await approveMatchRequest(requestId);
    console.log('🔍 [ChatScreen] Approve result:', result);

    if (result.success) {
      // Create conversation with the matched user
      console.log('🔍 [ChatScreen] Creating conversation with user:', request.senderId);
      const convResult = await getOrCreateConversation(request.senderId, 'match', result.data?.match_id);
      console.log('🔍 [ChatScreen] Conversation result:', convResult);

      if (!convResult.success) {
        console.error('❌ [ChatScreen] Failed to create conversation:', convResult.error);
        alert(`Failed to create conversation: ${convResult.error}`);
      } else {
        console.log('✅ [ChatScreen] Conversation created:', convResult.data?.conversation_id);
      }

      // Show celebration modal
      console.log('🔍 [ChatScreen] Showing celebration modal');
      setCelebratedUser({
        id: request.user.id,
        name: request.user.name,
        age: request.user.age,
        workStatus: request.user.workStatus,
        smoker: request.user.smoker || false,
        pets: request.user.pets || false,
        hasPlace: request.user.hasPlace,
        photos: request.user.photos || [],
      });
      setIsMutualMatch(result.data?.is_mutual || false);
      setCelebrationModalVisible(true);

      // Reload requests and conversations
      console.log('🔍 [ChatScreen] Reloading requests and conversations...');
      await loadMatchRequests();
      await loadConversations();
      console.log('✅ [ChatScreen] Finished approval process');
    } else {
      console.error('❌ [ChatScreen] Failed to approve request:', result.error);
      alert(`Failed to approve match: ${result.error}`);
    }
  };

  // Handle reject request
  const handleRejectRequest = (requestId: string) => {
    const request = matchRequests.find((r) => r.id === requestId);
    if (!request) return;

    setRejectingRequest(request);
    setRejectModalVisible(true);
  };

  // Confirm rejection
  const confirmRejectRequest = async () => {
    if (!rejectingRequest) return;

    const result = await rejectMatchRequest(rejectingRequest.id);

    if (result.success) {
      // Close modal
      setRejectModalVisible(false);
      setRejectingRequest(null);

      // Reload requests
      await loadMatchRequests();
    }
  };

  // Navigate to chat with matched user
  const handleSendMessage = async () => {
    console.log('🔍 [ChatScreen] Send message clicked');
    setCelebrationModalVisible(false);
    if (celebratedUser) {
      console.log('🔍 [ChatScreen] Getting conversation for user:', celebratedUser.id);
      // Get or create conversation with the matched user
      const result = await getOrCreateConversation(celebratedUser.id, 'match');
      console.log('🔍 [ChatScreen] Get conversation result:', result);

      if (result.success && result.data) {
        // Navigate to the conversation
        console.log('✅ [ChatScreen] Navigating to chat:', result.data.conversation_id);
        router.push(`/chat/${result.data.conversation_id}`);
      } else {
        console.error('❌ [ChatScreen] Failed to get conversation:', result.error);
        alert(`Failed to open chat: ${result.error}`);
      }
    } else {
      console.error('❌ [ChatScreen] No celebrated user');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Chat",
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerRight: () => (
            <NotificationBell
              count={notificationCounts.matchRequests + notificationCounts.messages}
              testID="chat-notifications"
            />
          ),
        }}
      />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Pending Match Requests Section */}
          {isLoadingRequests ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading requests...</Text>
            </View>
          ) : matchRequests.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                PENDING REQUESTS ({matchRequests.length})
              </Text>
              {matchRequests.map((request) => (
                <MatchRequestCard
                  key={request.id}
                  request={request}
                  onApprove={handleApproveRequest}
                  onReject={handleRejectRequest}
                  testID={`match-request-${request.id}`}
                />
              ))}
            </View>
          ) : null}

          {/* Conversations Section */}
          {isLoadingConversations ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading conversations...</Text>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Messages {conversations.length > 0 && `(${conversations.length})`}
              </Text>
              {conversations.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No conversations yet</Text>
                  <Text style={styles.emptySubtext}>
                    Match with someone to start chatting!
                  </Text>
                </View>
              ) : (
                conversations.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    testID={`chat-${item.id}`}
                    onPress={() => router.push(`/chat/${item.id}`)}
                  >
                    <Card style={styles.chatCard}>
                      <View style={styles.chatRow}>
                        <Avatar
                          uri={item.otherUser.photos?.[0]}
                          size="medium"
                        />
                        <View style={styles.chatInfo}>
                          <View style={styles.chatHeader}>
                            <Text style={styles.name}>{item.otherUser.name}</Text>
                            {item.lastMessage && (
                              <Text style={styles.timestamp}>
                                {new Date(item.lastMessage.createdAt).toLocaleDateString()}
                              </Text>
                            )}
                          </View>
                          <Text style={styles.lastMessage} numberOfLines={1}>
                            {item.lastMessage?.text || "Start a conversation"}
                          </Text>
                        </View>
                        {item.unreadCount > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{item.unreadCount}</Text>
                          </View>
                        )}
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Match Celebration Modal */}
      {celebratedUser && user && (
        <MatchCelebrationModal
          visible={celebrationModalVisible}
          matchedUser={celebratedUser}
          currentUser={{
            id: user.id,
            name: user.user_metadata?.name || 'You',
            age: user.user_metadata?.age || 0,
            workStatus: user.user_metadata?.work_status || 'not-working',
            smoker: user.user_metadata?.smoker || false,
            pets: user.user_metadata?.pets || false,
            hasPlace: user.user_metadata?.has_place || false,
            photos: user.user_metadata?.photos || [],
          }}
          isMutual={isMutualMatch}
          onClose={() => setCelebrationModalVisible(false)}
          onSendMessage={handleSendMessage}
          testID="match-celebration-modal"
        />
      )}

      {/* Reject Confirmation Modal */}
      {rejectingRequest && rejectingRequest.user && (
        <RejectConfirmationModal
          visible={rejectModalVisible}
          userName={rejectingRequest.user.name}
          onConfirm={confirmRejectRequest}
          onCancel={() => {
            setRejectModalVisible(false);
            setRejectingRequest(null);
          }}
          testID="reject-confirmation-modal"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: "600",
  },
  chatCard: {
    padding: spacing.md,
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  chatInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  timestamp: {
    ...typography.caption,
    color: colors.gray,
  },
  lastMessage: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  unreadBadge: {
    backgroundColor: colors.accent,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "600",
  },
  chatActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  addFriendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingLabel: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.gray,
    textAlign: "center",
  },
});
