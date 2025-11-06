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
  Calendar,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  Home,
} from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Avatar from "@/components/Avatar";
import CreateRoomModal from "@/components/CreateRoomModal";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "@/types";
import {
  getEventDetails,
  markSplitAsPaid,
  createExpenseRoom,
  ExpenseEvent,
  Expense,
} from "@/lib/api/expenses";

export default function EventDetailsScreen() {
  const { eventId } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const [event, setEvent] = useState<ExpenseEvent | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);

  useEffect(() => {
    if (eventId && typeof eventId === 'string') {
      loadEventDetails();
    }
  }, [eventId]);

  const loadEventDetails = async () => {
    try {
      if (typeof eventId !== 'string') return;

      const result = await getEventDetails(eventId);
      if (result.success && result.data) {
        setEvent(result.data.event);
        setExpenses(result.data.expenses);
        setBalance(result.data.balance);
      }
    } catch (error) {
      console.error('Error loading event details:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadEventDetails();
  };

  const handleMarkAsPaid = async (splitId: string) => {
    try {
      const result = await markSplitAsPaid(splitId);
      if (result.success) {
        await loadEventDetails();
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

  const handleCreateRoom = async (roomData: any) => {
    try {
      // Extract member IDs from the room data
      const memberIds = roomData.members
        .filter((m: any) => m.id !== user?.id)
        .map((m: any) => m.id);

      const result = await createExpenseRoom(
        roomData.name,
        roomData.description || '',
        memberIds,
        typeof eventId === 'string' ? eventId : undefined
      );

      if (result.success) {
        setShowCreateRoomModal(false);
        alert('Room created successfully!');
        await loadEventDetails();
      } else {
        alert(result.error || 'Failed to create room');
      }
    } catch (error: any) {
      console.error('Error creating room:', error);
      alert(error.message || 'Failed to create room');
    }
  };

  // Transform event members to User[] format for the modal
  const eventMembersAsUsers: User[] = event?.members.map(member => ({
    id: member.user_id,
    name: member.user?.name || 'User',
    age: 0,
    userType: 'renter' as const,
    college: '',
    workStatus: '',
    smoker: false,
    drinker: false,
    earlyBird: false,
    nightOwl: false,
    cleanliness: 5,
    socialLevel: 5,
    hasAllergies: false,
    hasPets: false,
    photos: member.user?.photos || [],
  })) || [];

  // Calculate statistics
  const statistics = {
    totalExpenses: expenses.length,
    totalAmount: expenses.reduce((sum, exp) => sum + Number(exp.amount), 0),
    paidExpenses: expenses.filter(exp =>
      exp.splits.every(split => split.paid || split.user_id === exp.paid_by)
    ).length,
    pendingExpenses: expenses.filter(exp =>
      exp.splits.some(split => !split.paid && split.user_id !== exp.paid_by)
    ).length,
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Stack.Screen
          options={{
            title: "Event Details",
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.primary,
          }}
        />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Stack.Screen
          options={{
            title: "Event Details",
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.primary,
          }}
        />
        <Text style={styles.errorText}>Event not found</Text>
        <Button
          title="Go Back"
          onPress={() => router.back()}
          variant="primary"
        />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: event.name,
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Event Info Card */}
        <Card style={styles.eventCard}>
          <View style={styles.eventHeader}>
            <View style={styles.eventIcon}>
              <Calendar size={32} color={colors.accent} />
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventName}>{event.name}</Text>
              {event.description && (
                <Text style={styles.eventDescription}>{event.description}</Text>
              )}
              {event.event_date && (
                <Text style={styles.eventDate}>
                  {new Date(event.event_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              )}
            </View>
          </View>
        </Card>

        {/* Statistics Cards */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#e6f2ff' }]}>
              <DollarSign size={20} color={colors.accent} />
            </View>
            <Text style={styles.statValue}>
              ${statistics.totalAmount.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#f0f9ff' }]}>
              <Home size={20} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{statistics.totalExpenses}</Text>
            <Text style={styles.statLabel}>Expenses</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#e6f7f1' }]}>
              <CheckCircle size={20} color={colors.success} />
            </View>
            <Text style={styles.statValue}>{statistics.paidExpenses}</Text>
            <Text style={styles.statLabel}>Settled</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#fff4e6' }]}>
              <Clock size={20} color={colors.warning} />
            </View>
            <Text style={styles.statValue}>{statistics.pendingExpenses}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </Card>
        </View>

        {/* Your Balance Card */}
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your Balance</Text>
          <Text
            style={[
              styles.balanceAmount,
              balance >= 0 ? styles.balancePositive : styles.balanceNegative,
            ]}
          >
            {balance >= 0 ? '+' : ''}${balance.toFixed(2)}
          </Text>
          <Text style={styles.balanceSubtext}>
            {balance > 0
              ? `You are owed $${balance.toFixed(2)} for this event`
              : balance < 0
              ? `You owe $${Math.abs(balance).toFixed(2)} for this event`
              : 'You are all settled up for this event'}
          </Text>
        </Card>

        {/* Participants Card */}
        <Card style={styles.participantsCard}>
          <View style={styles.participantsHeader}>
            <Users size={20} color={colors.primary} />
            <Text style={styles.participantsTitle}>
              Participants ({event.members.length})
            </Text>
          </View>
          <View style={styles.participantsList}>
            {event.members.map((member) => (
              <View key={member.id} style={styles.participantItem}>
                <Avatar uri={member.user?.photos?.[0]} size="medium" />
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>
                    {member.user_id === user?.id ? 'You' : (member.user?.name || 'User')}
                  </Text>
                  <Text style={styles.participantRole}>
                    {member.role === 'admin' ? 'Organizer' : 'Participant'}
                  </Text>
                </View>
                {member.user_id === event.created_by && (
                  <View style={styles.organizerBadge}>
                    <Text style={styles.organizerBadgeText}>Organizer</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <Button
            title="Create Room for Event"
            onPress={() => setShowCreateRoomModal(true)}
            variant="secondary"
            style={styles.createRoomButton}
          />
        </Card>

        {/* Expenses List */}
        <View style={styles.expensesSection}>
          <Text style={styles.sectionTitle}>
            Expenses ({expenses.length})
          </Text>

          {expenses.length === 0 ? (
            <Card style={styles.emptyCard}>
              <DollarSign size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No expenses yet</Text>
              <Text style={styles.emptySubtext}>
                Expenses for this event will appear here
              </Text>
            </Card>
          ) : (
            expenses.map((expense) => {
              const isExpanded = expandedExpense === expense.id;
              const isPayer = expense.paid_by === user?.id;
              const mySplit = expense.splits.find((s) => s.user_id === user?.id);

              return (
                <TouchableOpacity
                  key={expense.id}
                  activeOpacity={0.7}
                  onPress={() =>
                    setExpandedExpense(isExpanded ? null : expense.id)
                  }
                >
                  <Card style={styles.expenseCard}>
                    <View style={styles.expenseHeader}>
                      <View style={styles.expenseIcon}>
                        <DollarSign size={20} color={colors.accent} />
                      </View>
                      <View style={styles.expenseInfo}>
                        <Text style={styles.expenseTitle}>
                          {expense.description}
                        </Text>
                        <Text style={styles.expenseDate}>
                          {new Date(expense.created_at).toLocaleDateString()}
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
        </View>
      </ScrollView>

      {/* Create Room Modal */}
      <CreateRoomModal
        visible={showCreateRoomModal}
        onClose={() => setShowCreateRoomModal(false)}
        onCreateRoom={handleCreateRoom}
        currentUser={
          user
            ? {
                id: user.id,
                name: user.user_metadata?.name || 'You',
                age: 0,
                userType: 'renter' as const,
                college: '',
                workStatus: '',
                smoker: false,
                drinker: false,
                earlyBird: false,
                nightOwl: false,
                cleanliness: 5,
                socialLevel: 5,
                hasAllergies: false,
                hasPets: false,
                photos: [],
              }
            : null
        }
        availableUsers={eventMembersAsUsers}
        eventId={typeof eventId === 'string' ? eventId : undefined}
        eventName={event?.name}
        eventMembers={eventMembersAsUsers}
      />
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
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  eventCard: {
    padding: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  eventIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  eventName: {
    ...typography.h2,
    fontWeight: '700',
    color: colors.primary,
  },
  eventDescription: {
    ...typography.body,
    color: colors.textSecondary,
  },
  eventDate: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.h2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  balanceCard: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  balanceLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    ...typography.h1,
    fontWeight: '700',
  },
  balancePositive: {
    color: colors.success,
  },
  balanceNegative: {
    color: colors.error,
  },
  balanceSubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  participantsCard: {
    padding: spacing.md,
  },
  participantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  participantsTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
  participantsList: {
    gap: spacing.md,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  participantInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  participantName: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  participantRole: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  organizerBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  organizerBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  expensesSection: {
    gap: spacing.md,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  expenseTitle: {
    ...typography.body,
    fontWeight: '600',
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
    fontWeight: '700',
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
  createRoomButton: {
    marginTop: spacing.md,
  },
});
