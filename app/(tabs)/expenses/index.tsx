import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Stack } from "expo-router";
import NotificationBell from "@/components/NotificationBell";
import { Plus, Users, Calendar, UserPlus, X, TrendingUp, TrendingDown, History, DollarSign } from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Avatar from "@/components/Avatar";
import { useApp } from "@/contexts/AppContext";
import { mockUsers } from "@/mocks/users";
import CreateRoomModal from "@/components/CreateRoomModal";
import CreateEventModal from "@/components/CreateEventModal";
import { ExpenseRoom, ExpenseEvent } from "@/types";

export default function ExpensesScreen() {
  const { addFriend, currentUser, notificationCounts, addExpenseRoom, addExpenseEvent, expenseRooms, expenseEvents, settleRoomBalance } = useApp();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [showBalances, setShowBalances] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [selectedRoomDetail, setSelectedRoomDetail] = useState<ExpenseRoom | null>(null);

  const mockExpenses = [
    {
      id: "exp1",
      title: "Apartment Expenses",
      members: [mockUsers[0], mockUsers[1], mockUsers[2]],
      expenseCount: 12,
      balance: 150,
    },
    {
      id: "exp2",
      title: "Weekend Trip",
      members: [mockUsers[0], mockUsers[1], mockUsers[2], mockUsers[3], mockUsers[4]],
      expenseCount: 8,
      balance: -75.5,
    },
  ];

  const handleAddFriend = (userId: string) => {
    addFriend(userId);
    console.log("Friend added:", userId);
  };

  const availableUsers = mockUsers.filter((u) => u.id !== currentUser?.id);

  const balanceSummary = useMemo(() => {
    let toReceive = 0;
    let youOwe = 0;

    expenseRooms.forEach((room) => {
      if (room.status === "active") {
        room.balances.forEach((balance) => {
          if (!balance.settled) {
            toReceive += balance.amount;
          }
        });
      }
    });

    return { toReceive, youOwe };
  }, [expenseRooms]);

  const mockPaymentHistory = [
    {
      id: "pay1",
      from: mockUsers[1],
      to: currentUser || mockUsers[0],
      amount: 75,
      date: Date.now() - 86400000,
      settled: true,
    },
    {
      id: "pay2",
      from: currentUser || mockUsers[0],
      to: mockUsers[2],
      amount: 50,
      date: Date.now() - 172800000,
      settled: true,
    },
  ];

  const individualBalances = useMemo(() => {
    const balanceMap = new Map<string, number>();
    
    expenseRooms.forEach((room) => {
      if (room.status === "active") {
        room.balances.forEach((balance) => {
          if (!balance.settled) {
            const currentAmount = balanceMap.get(balance.userId) || 0;
            balanceMap.set(balance.userId, currentAmount + balance.amount);
          }
        });
      }
    });

    return Array.from(balanceMap.entries()).map(([userId, amount]) => {
      const user = mockUsers.find((u) => u.id === userId);
      return {
        userId,
        userName: user?.name || "Unknown",
        amount,
      };
    });
  }, [expenseRooms]);

  const handleCreateRoom = (room: ExpenseRoom) => {
    addExpenseRoom(room);
    console.log("Room created:", room);
  };

  const handleCreateEvent = (event: ExpenseEvent) => {
    addExpenseEvent(event);
    console.log("Event created:", event);
  };

  const handleSettleBalance = (roomId: string, userId: string) => {
    settleRoomBalance(roomId, userId);
    console.log("Balance settled for room:", roomId, "user:", userId);
  };
  return (
    <>
      <Stack.Screen
        options={{
          title: "Expenses",
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerRight: () => (
            <NotificationBell
              count={notificationCounts.expenses}
              testID="expenses-notifications"
            />
          ),
        }}
      />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryCards}>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <TrendingUp size={24} color={colors.success} />
              </View>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>Money to Receive</Text>
                <Text style={styles.summaryAmount}>${balanceSummary.toReceive.toFixed(2)}</Text>
              </View>
            </Card>

            <Card style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <TrendingDown size={24} color={colors.error} />
              </View>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>Money You Owe</Text>
                <Text style={styles.summaryAmountNegative}>${balanceSummary.youOwe.toFixed(2)}</Text>
              </View>
            </Card>
          </View>

          <View style={styles.actionBar}>
            <Button
              title="View Balances"
              onPress={() => setShowBalances(true)}
              variant="secondary"
              size="small"
              style={styles.actionButton}
              testID="view-balances-button"
            />
            <Button
              title="Add Friend"
              onPress={() => console.log("Add friend")}
              variant="secondary"
              size="small"
              style={styles.actionButton}
              testID="add-friend-expenses-button"
            />
          </View>

          <View style={styles.header}>
            <Button
              title="Create Event"
              onPress={() => setShowCreateEvent(true)}
              variant="primary"
              size="small"
              style={styles.button}
              testID="create-event-button"
            />
            <Button
              title="Create Room"
              onPress={() => setShowCreateRoom(true)}
              variant="secondary"
              size="small"
              style={styles.button}
              testID="create-room-button"
            />
          </View>

          <Text style={styles.sectionTitle}>Active Rooms</Text>
          {expenseRooms.filter((r) => r.status === "active").length === 0 && (
            <Text style={styles.emptyText}>No active rooms. Create one to get started!</Text>
          )}
          {expenseRooms
            .filter((r) => r.status === "active")
            .map((room) => (
              <TouchableOpacity
                key={room.id}
                onPress={() => setSelectedRoomDetail(room)}
                testID={`room-${room.id}`}
              >
                <Card style={styles.expenseCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.iconContainer}>
                      <Users size={20} color={colors.accent} />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{room.name}</Text>
                      <Text style={styles.cardSubtitle}>
                        {room.members.length} members {"•"} ${room.amount.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.balanceRow}>
                    <Text style={styles.balanceLabel}>Total</Text>
                    <Text style={[styles.balance, styles.balancePositive]}>
                      ${room.totalBalance.toFixed(2)}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}

          <Text style={styles.sectionTitle}>Events</Text>
          {expenseEvents.filter((e) => e.status === "active").length === 0 && (
            <Text style={styles.emptyText}>No active events.</Text>
          )}
          {expenseEvents
            .filter((e) => e.status === "active")
            .map((event) => (
              <TouchableOpacity
                key={event.id}
                testID={`event-${event.id}`}
              >
                <Card style={styles.expenseCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.iconContainer}>
                      <Calendar size={20} color={colors.gold} />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{event.name}</Text>
                      <Text style={styles.cardSubtitle}>
                        {event.participants.length} participants {"•"} Budget: ${event.amount.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}

          <Text style={styles.sectionTitle}>Payment History</Text>
          {mockPaymentHistory.map((payment) => (
            <Card key={payment.id} style={styles.paymentCard}>
              <View style={styles.paymentRow}>
                <View style={styles.paymentIcon}>
                  <DollarSign size={18} color={colors.accent} />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentText}>
                    {payment.from.name} paid {payment.to.name}
                  </Text>
                  <Text style={styles.paymentDate}>
                    {new Date(payment.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.paymentAmount}>${payment.amount.toFixed(2)}</Text>
              </View>
            </Card>
          ))}
        </ScrollView>

        <Modal
          visible={selectedRoomDetail !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedRoomDetail(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedRoomDetail?.name}</Text>
                <TouchableOpacity
                  onPress={() => setSelectedRoomDetail(null)}
                  testID="close-room-detail-modal"
                >
                  <X size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.participantList}>
                {selectedRoomDetail?.description && (
                  <Text style={styles.roomDescription}>{selectedRoomDetail.description}</Text>
                )}
                <Text style={styles.sectionTitle}>Split Breakdown</Text>
                {selectedRoomDetail?.balances.map((balance) => (
                  <View key={balance.userId} style={styles.balanceDetailRow}>
                    <View style={styles.balanceDetailInfo}>
                      <Text style={styles.balanceDetailName}>{balance.userName}</Text>
                      <Text style={styles.balanceDetailAmount}>
                        ${balance.amount.toFixed(2)}
                      </Text>
                    </View>
                    {!balance.settled && selectedRoomDetail.createdBy === currentUser?.id && (
                      <Button
                        title="Mark Paid"
                        onPress={() => handleSettleBalance(selectedRoomDetail.id, balance.userId)}
                        variant="primary"
                        size="small"
                        testID={`settle-${balance.userId}`}
                      />
                    )}
                    {balance.settled && (
                      <Text style={styles.settledText}>Settled ✓</Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <CreateRoomModal
          visible={showCreateRoom}
          onClose={() => setShowCreateRoom(false)}
          onCreateRoom={handleCreateRoom}
          currentUser={currentUser}
          availableUsers={availableUsers}
        />

        <CreateEventModal
          visible={showCreateEvent}
          onClose={() => setShowCreateEvent(false)}
          onCreateEvent={handleCreateEvent}
          currentUser={currentUser}
          availableUsers={availableUsers}
        />

        <Modal
          visible={showBalances}
          transparent
          animationType="slide"
          onRequestClose={() => setShowBalances(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Individual Balances</Text>
                <TouchableOpacity
                  onPress={() => setShowBalances(false)}
                  testID="close-balances-modal"
                >
                  <X size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.balanceList}>
                {individualBalances.map((balance) => (
                  <View key={balance.userId} style={styles.individualBalanceRow}>
                    <View style={styles.balanceInfo}>
                      <Text style={styles.balanceName}>{balance.userName}</Text>
                      <Text style={styles.balanceDescription}>
                        {balance.amount > 0 ? "Owes you" : "You owe"}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.balanceAmount,
                        balance.amount > 0
                          ? styles.balancePositive
                          : styles.balanceNegative,
                      ]}
                    >
                      ${Math.abs(balance.amount).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  summaryCards: {
    gap: spacing.md,
  },
  summaryCard: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryAmount: {
    ...typography.h2,
    color: colors.success,
    fontWeight: "700",
  },
  summaryAmountNegative: {
    ...typography.h2,
    color: colors.error,
    fontWeight: "700",
  },
  actionBar: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  expenseCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  balanceLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  balance: {
    ...typography.h3,
    fontWeight: "700",
  },
  balancePositive: {
    color: colors.success,
  },
  balanceNegative: {
    color: colors.error,
  },
  paymentCard: {
    padding: spacing.md,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  paymentText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  paymentDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  paymentAmount: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  balanceList: {
    padding: spacing.lg,
  },
  individualBalanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  balanceInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  balanceName: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  balanceDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  balanceAmount: {
    ...typography.h3,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: "600",
  },
  participantList: {
    padding: spacing.lg,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  participantInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  participantName: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  participantAge: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  addFriendIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    padding: spacing.lg,
  },
  roomDescription: {
    ...typography.body,
    color: colors.textSecondary,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 10,
    marginBottom: spacing.md,
  },
  balanceDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  balanceDetailInfo: {
    flex: 1,
  },
  balanceDetailName: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  balanceDetailAmount: {
    ...typography.h3,
    color: colors.accent,
    fontWeight: "700",
  },
  settledText: {
    ...typography.body,
    color: colors.success,
    fontWeight: "600",
  },
});
