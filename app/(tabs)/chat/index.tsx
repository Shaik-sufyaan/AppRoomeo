import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import NotificationBell from "@/components/NotificationBell";
import { UserPlus, Check, X, Trash2 } from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import { useApp } from "@/contexts/AppContext";

export default function ChatScreen() {
  const { conversations, addFriend, acceptChatRequest, rejectChatRequest, currentUser, pendingChatRequests, notificationCounts, removeConversation } = useApp();
  const router = useRouter();

  const acceptedConversations = conversations.filter((c) => c.status === "accepted");
  const sentPendingConversations = conversations.filter(
    (c) => c.status === "pending" && c.initiatedBy === currentUser?.id
  );

  const handleAddFriend = (userId: string) => {
    addFriend(userId);
    console.log("Friend added:", userId);
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
              count={notificationCounts.chat}
              testID="chat-notifications"
            />
          ),
        }}
      />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {pendingChatRequests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Requests</Text>
              {pendingChatRequests.map((item) => (
                <Card key={item.id} style={styles.chatCard}>
                  <View style={styles.chatRow}>
                    <Avatar uri={item.user.photos[0]} size="medium" />
                    <View style={styles.chatInfo}>
                      <Text style={styles.name}>{item.user.name}</Text>
                      <Text style={styles.pendingLabel}>Wants to connect</Text>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        onPress={() => {
                          acceptChatRequest(item.id);
                          console.log("Accepted chat request from:", item.user.name);
                        }}
                        style={styles.acceptButton}
                        testID={`accept-${item.id}`}
                      >
                        <Check size={20} color={colors.white} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          rejectChatRequest(item.id);
                          console.log("Rejected chat request from:", item.user.name);
                        }}
                        style={styles.rejectButton}
                        testID={`reject-${item.id}`}
                      >
                        <X size={20} color={colors.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}

          {sentPendingConversations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sent Requests</Text>
              {sentPendingConversations.map((item) => (
                <Card key={item.id} style={styles.chatCard}>
                  <View style={styles.chatRow}>
                    <Avatar uri={item.user.photos[0]} size="medium" />
                    <View style={styles.chatInfo}>
                      <Text style={styles.name}>{item.user.name}</Text>
                      <Text style={styles.pendingLabel}>Pending...</Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}

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
});
