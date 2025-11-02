import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  MessageSquare,
  CheckCircle,
  Clock,
  Users,
  ArrowLeft,
} from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Avatar from "@/components/Avatar";
import SettlementModal from "@/components/SettlementModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  getRoomDetails,
  markSplitAsPaid,
  submitSettlement,
  ExpenseRoom,
  Expense,
  PaymentMethod,
} from "@/lib/api/expenses";

export default function RoomDetailsScreen() {
  const { roomId } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const [room, setRoom] = useState<ExpenseRoom | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);

  useEffect(() => {
    if (roomId && typeof roomId === 'string') {
      loadRoomDetails();
    }
  }, [roomId]);

  const loadRoomDetails = async () => {
    try {
      if (typeof roomId !== 'string') return;

      const result = await getRoomDetails(roomId);
      if (result.success && result.data) {
        setRoom(result.data.room);
        setExpenses(result.data.expenses);
        setBalance(result.data.balance);
      }
    } catch (error) {
      console.error('Error loading room details:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadRoomDetails();
  };

  const handleMarkAsPaid = async (splitId: string) => {
    try {
      const result = await markSplitAsPaid(splitId);
      if (result.success) {
        await loadRoomDetails();
      } else {
        alert(result.error || 'Failed to mark as paid');
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Failed to mark as paid');
    }
  };

  const getUserName = (userId: string, userName?: string) => {
    if (userId === user?.id) return 'You';
    return userName || 'User';
  };

  const handleSubmitSettlement = async (
    amount: number,
    paymentMethod: PaymentMethod,
    proofImage?: string,
    note?: string
  ) => {
    if (!room || typeof roomId !== 'string') return;

    try {
      const result = await submitSettlement(
        roomId,
        room.created_by,
        amount,
        paymentMethod,
        proofImage,
        note
      );

      if (result.success) {
        alert('Settlement submitted successfully! Waiting for approval.');
        await loadRoomDetails();
      } else {
        throw new Error(result.error || 'Failed to submit settlement');
      }
    } catch (error: any) {
      throw error;
    }
  };

  // Get the room creator's name
  const getRoomCreatorName = () => {
    if (!room) return '';
    const creator = room.members.find((m) => m.user_id === room.created_by);
    return creator?.user?.name || 'Room Creator';
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Stack.Screen
          options={{
            title: "Loading...",
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.primary,
          }}
        />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!room) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Stack.Screen
          options={{
            title: "Room Not Found",
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.primary,
          }}
        />
        <Text style={styles.errorText}>Room not found</Text>
        <Button title="Go Back" onPress={() => router.back()} variant="primary" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: room.name,
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
        }}
      />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Room Info Card */}
          <Card style={styles.roomInfoCard}>
            <View style={styles.roomHeader}>
              <Text style={styles.roomName}>{room.name}</Text>
              {room.description && (
                <Text style={styles.roomDescription}>{room.description}</Text>
              )}
              <View style={styles.roomMeta}>
                <Users size={16} color={colors.textSecondary} />
                <Text style={styles.roomMetaText}>
                  {room.members.length} members
                </Text>
              </View>
            </View>
          </Card>

          {/* Members Card */}
          <Card style={styles.membersCard}>
            <Text style={styles.membersTitle}>Members</Text>
            <View style={styles.membersList}>
              {room.members.map((member) => (
                <View key={member.id} style={styles.memberItem}>
                  <Avatar
                    uri={member.user?.photos?.[0]}
                    size="medium"
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {member.user_id === user?.id ? 'You' : (member.user?.name || 'User')}
                    </Text>
                    <Text style={styles.memberRole}>
                      {member.role === 'admin' ? 'Admin' : 'Member'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>

          {/* Balance Card */}
          <Card style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Your Balance</Text>
            <View style={styles.balanceRow}>
              {balance >= 0 ? (
                <TrendingUp size={32} color={colors.success} />
              ) : (
                <TrendingDown size={32} color={colors.error} />
              )}
              <Text
                style={[
                  styles.balanceAmount,
                  { color: balance >= 0 ? colors.success : colors.error },
                ]}
              >
                ${Math.abs(balance).toFixed(2)}
              </Text>
            </View>
            <Text style={styles.balanceSubtext}>
              {balance >= 0
                ? balance === 0
                  ? "You're all settled up!"
                  : "You are owed this amount"
                : "You owe this amount"}
            </Text>

            {/* Settle Up Button - Only show if user owes money and is not the creator */}
            {balance < 0 && user?.id !== room.created_by && (
              <Button
                title="Settle Up"
                onPress={() => setShowSettlementModal(true)}
                variant="primary"
                style={styles.settleUpButton}
                testID="settle-up-button"
              />
            )}
          </Card>

          {/* Expenses List */}
          <Text style={styles.sectionTitle}>
            Expenses ({expenses.length})
          </Text>

          {expenses.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No expenses yet</Text>
              <Text style={styles.emptySubtext}>
                Create split requests in chat to add expenses to this room
              </Text>
            </Card>
          ) : (
            expenses.map((expense) => {
              const isExpanded = expandedExpense === expense.id;
              const isPayer = expense.paid_by === user?.id;
              const mySplit = expense.splits.find((s) => s.user_id === user?.id);
              const fromChat = !!expense.split_request_id;

              return (
                <TouchableOpacity
                  key={expense.id}
                  onPress={() => setExpandedExpense(isExpanded ? null : expense.id)}
                  activeOpacity={0.7}
                >
                  <Card style={styles.expenseCard}>
                    <View style={styles.expenseHeader}>
                      <View style={styles.expenseIcon}>
                        {fromChat ? (
                          <MessageSquare size={20} color={colors.accent} />
                        ) : (
                          <DollarSign size={20} color={colors.primary} />
                        )}
                      </View>
                      <View style={styles.expenseInfo}>
                        <Text style={styles.expenseTitle}>{expense.title}</Text>
                        <Text style={styles.expenseDate}>
                          {new Date(expense.expense_date).toLocaleDateString()}
                          {fromChat && ' • From Chat'}
                        </Text>
                      </View>
                      <View style={styles.expenseAmount}>
                        <Text style={styles.expenseTotal}>
                          ${Number(expense.amount).toFixed(2)}
                        </Text>
                        {isPayer ? (
                          <Text style={styles.expenseRole}>You paid</Text>
                        ) : (
                          <Text style={[styles.expenseRole, { color: colors.error }]}>
                            You owe ${mySplit ? Number(mySplit.amount).toFixed(2) : '0.00'}
                          </Text>
                        )}
                      </View>
                    </View>

                    {isExpanded && (
                      <View style={styles.expenseDetails}>
                        <View style={styles.divider} />
                        <Text style={styles.detailsTitle}>Split Breakdown</Text>
                        {expense.splits.map((split) => {
                          const isCurrentUser = split.user_id === user?.id;
                          const splitPayer = split.user_id === expense.paid_by;
                          const splitUserName = split.user?.name;

                          return (
                            <View key={split.id} style={styles.splitRow}>
                              <View style={styles.splitInfo}>
                                <Text style={styles.splitName}>
                                  {isCurrentUser ? 'You' : getUserName(split.user_id, splitUserName)}
                                  {splitPayer && ' (paid)'}
                                </Text>
                                <Text style={styles.splitAmount}>
                                  ${Number(split.amount).toFixed(2)}
                                </Text>
                              </View>

                              {split.paid ? (
                                <View style={styles.paidBadge}>
                                  <CheckCircle size={16} color={colors.success} />
                                  <Text style={styles.paidText}>Paid</Text>
                                </View>
                              ) : splitPayer ? (
                                <View style={styles.pendingBadge}>
                                  <Clock size={16} color={colors.textSecondary} />
                                  <Text style={styles.pendingText}>Waiting</Text>
                                </View>
                              ) : isCurrentUser ? (
                                <Button
                                  title="Mark Paid"
                                  onPress={() => handleMarkAsPaid(split.id)}
                                  variant="primary"
                                  size="small"
                                />
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </Card>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Settlement Modal */}
      {room && (
        <SettlementModal
          visible={showSettlementModal}
          onClose={() => setShowSettlementModal(false)}
          onSubmit={handleSubmitSettlement}
          recipientName={getRoomCreatorName()}
          maxAmount={Math.abs(balance)}
          roomName={room.name}
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  roomInfoCard: {
    padding: spacing.lg,
  },
  roomHeader: {
    gap: spacing.sm,
  },
  roomName: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
  },
  roomDescription: {
    ...typography.body,
    color: colors.textSecondary,
  },
  roomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  roomMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  membersCard: {
    padding: spacing.lg,
  },
  membersTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  membersList: {
    gap: spacing.md,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  memberInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  memberName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  memberRole: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  balanceCard: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  balanceLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  balanceAmount: {
    ...typography.h1,
    fontWeight: '700',
  },
  balanceSubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  settleUpButton: {
    marginTop: spacing.md,
    width: '100%',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  expenseCard: {
    padding: spacing.md,
  },
  expenseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  expenseTitle: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  expenseDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  expenseAmount: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  expenseTotal: {
    ...typography.h3,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  expenseRole: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  expenseDetails: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  detailsTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  splitInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginRight: spacing.md,
  },
  splitName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  splitAmount: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: '#e6f7f1',
    borderRadius: 12,
  },
  paidText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  pendingText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  errorText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
});
