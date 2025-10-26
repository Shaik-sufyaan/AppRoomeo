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
import { UserPlus, Trash2 } from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import { useApp } from "@/contexts/AppContext";
import {
  getReceivedMatchRequests,
  approveMatchRequest,
  rejectMatchRequest,
} from "@/lib/api/matches";
import { MatchRequestWithUser } from "@/types";

export default function ChatScreen() {
  const { conversations, addFriend, currentUser, removeConversation } = useApp();
  const router = useRouter();

  // Match request state
  const [matchRequests, setMatchRequests] = useState<MatchRequestWithUser[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  // Modal state
  const [celebrationModalVisible, setCelebrationModalVisible] = useState(false);
  const [celebratedUser, setCelebratedUser] = useState<any>(null);
  const [isMutualMatch, setIsMutualMatch] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<MatchRequestWithUser | null>(null);

  const acceptedConversations = conversations.filter((c) => c.status === "accepted");

  const handleAddFriend = (userId: string) => {
    addFriend(userId);
    console.log("Friend added:", userId);
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
      loadMatchRequests();
    }, [])
  );

  // Handle approve request
  const handleApproveRequest = async (requestId: string) => {
    const request = matchRequests.find((r) => r.id === requestId);
    if (!request) return;

    const result = await approveMatchRequest(requestId);

    if (result.success) {
      // Show celebration modal
      setCelebratedUser(request.senderProfile);
      setIsMutualMatch(result.data?.is_mutual || false);
      setCelebrationModalVisible(true);

      // Reload requests
      await loadMatchRequests();
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
  const handleSendMessage = () => {
    setCelebrationModalVisible(false);
    if (celebratedUser) {
      // Navigate to chat with this user
      // You may need to create a conversation first or find existing one
      router.push("/chat");
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
              count={matchRequests.length}
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Messages</Text>
            {acceptedConversations.map((item) => (
              <TouchableOpacity
                key={item.id}
                testID={`chat-${item.id}`}
                onPress={() => router.push(`/chat/${item.id}`)}
              >
                <Card style={styles.chatCard}>
                  <View style={styles.chatRow}>
                    <Avatar uri={item.user.photos[0]} size="medium" />
                    <View style={styles.chatInfo}>
                      <View style={styles.chatHeader}>
                        <Text style={styles.name}>{item.user.name}</Text>
                        <Text style={styles.timestamp}>
                          {new Date(item.lastMessage?.timestamp || Date.now()).toLocaleDateString()}
                        </Text>
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
                    <View style={styles.chatActions}>
                      {!item.isFriend && (
                        <TouchableOpacity
                          onPress={() => handleAddFriend(item.user.id)}
                          style={styles.addFriendButton}
                          testID={`add-friend-${item.id}`}
                        >
                          <UserPlus size={20} color={colors.accent} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => {
                          removeConversation(item.id);
                          console.log("Removed conversation:", item.id);
                        }}
                        style={styles.removeButton}
                        testID={`remove-${item.id}`}
                      >
                        <Trash2 size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Match Celebration Modal */}
      {celebratedUser && currentUser && (
        <MatchCelebrationModal
          visible={celebrationModalVisible}
          matchedUser={celebratedUser}
          currentUser={currentUser}
          isMutual={isMutualMatch}
          onClose={() => setCelebrationModalVisible(false)}
          onSendMessage={handleSendMessage}
          testID="match-celebration-modal"
        />
      )}

      {/* Reject Confirmation Modal */}
      {rejectingRequest && (
        <RejectConfirmationModal
          visible={rejectModalVisible}
          userName={rejectingRequest.senderProfile.name}
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
});
