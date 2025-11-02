import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import NotificationBell from "@/components/NotificationBell";
import CreateRoomModal from "@/components/CreateRoomModal";
import CreateEventModal from "@/components/CreateEventModal";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  MessageSquare,
  CheckCircle,
  Clock,
  Home,
  Calendar,
  Plus,
  Users,
  ChevronRight,
} from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  getExpenses,
  getExpenseRooms,
  getExpenseEvents,
  markSplitAsPaid,
  createExpenseRoom,
  createExpenseEvent,
  Expense,
  ExpenseRoom,
  ExpenseEvent,
} from "@/lib/api/expenses";

type TabType = "all" | "rooms" | "events";

export default function ExpensesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { notificationCounts } = useNotifications();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rooms, setRooms] = useState<ExpenseRoom[]>([]);
  const [events, setEvents] = useState<ExpenseEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);

  // Load all data
  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    try {
      await Promise.all([loadExpenses(), loadRooms(), loadEvents()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadExpenses = async () => {
    const result = await getExpenses();
    if (result.success && result.data) {
      setExpenses(result.data);
    }
  };

  const loadRooms = async () => {
    const result = await getExpenseRooms();
    if (result.success && result.data) {
      setRooms(result.data);
    }
  };

  const loadEvents = async () => {
    const result = await getExpenseEvents();
    if (result.success && result.data) {
      setEvents(result.data);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAllData();
  };

  const handleMarkAsPaid = async (splitId: string) => {
    try {
      const result = await markSplitAsPaid(splitId);
      if (result.success) {
        await loadExpenses();
      } else {
        alert(result.error || 'Failed to mark as paid');
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Failed to mark as paid');
    }
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
        memberIds
      );

      if (result.success) {
        setShowCreateRoomModal(false);
        await loadRooms();
        setActiveTab('rooms');
      } else {
        alert(result.error || 'Failed to create room');
      }
    } catch (error: any) {
      console.error('Error creating room:', error);
      alert(error.message || 'Failed to create room');
    }
  };

  const handleCreateEvent = async (eventData: any) => {
    try {
      // Extract participant IDs from the event data
      const memberIds = eventData.participants
        .filter((p: any) => p.id !== user?.id)
        .map((p: any) => p.id);

      // Convert timestamp to date string
      const eventDate = eventData.date
        ? new Date(eventData.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const result = await createExpenseEvent(
        eventData.name,
        eventData.description || '',
        eventDate,
        memberIds
      );

      if (result.success) {
        setShowCreateEventModal(false);
        await loadEvents();
        setActiveTab('events');
      } else {
        alert(result.error || 'Failed to create event');
      }
    } catch (error: any) {
      console.error('Error creating event:', error);
      alert(error.message || 'Failed to create event');
    }
  };

  // Calculate balance summary
  const balanceSummary = useMemo(() => {
    let toReceive = 0;
    let youOwe = 0;

    expenses.forEach((expense) => {
      if (expense.paid_by === user?.id) {
        expense.splits.forEach((split) => {
          if (split.user_id !== user?.id && !split.paid) {
            toReceive += Number(split.amount);
          }
        });
      } else {
        const mySplit = expense.splits.find((s) => s.user_id === user?.id);
        if (mySplit && !mySplit.paid) {
          youOwe += Number(mySplit.amount);
        }
      }
    });

    return { toReceive, youOwe };
  }, [expenses, user?.id]);

  const getUserName = (userId: string) => {
    if (userId === user?.id) return 'You';
    return 'User';
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Stack.Screen
          options={{
            title: "Expenses",
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.primary,
          }}
        />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
              count={notificationCounts.total}
              testID="expenses-notifications"
            />
          ),
        }}
      />
      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "all" && styles.tabActive]}
            onPress={() => setActiveTab("all")}
          >
            <DollarSign
              size={20}
              color={activeTab === "all" ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "all" && styles.tabTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "rooms" && styles.tabActive]}
            onPress={() => setActiveTab("rooms")}
          >
            <Home
              size={20}
              color={activeTab === "rooms" ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "rooms" && styles.tabTextActive,
              ]}
            >
              Rooms
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "events" && styles.tabActive]}
            onPress={() => setActiveTab("events")}
          >
            <Calendar
              size={20}
              color={activeTab === "events" ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "events" && styles.tabTextActive,
              ]}
            >
              Events
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          {/* All Expenses Tab */}
          {activeTab === "all" && (
            <>
              {/* Balance Summary Cards */}
              <View style={styles.summaryCards}>
                <Card style={styles.summaryCard}>
                  <View style={[styles.summaryIcon, { backgroundColor: '#e6f7f1' }]}>
                    <TrendingUp size={24} color={colors.success} />
                  </View>
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryLabel}>To Receive</Text>
                    <Text style={styles.summaryAmount}>
                      ${balanceSummary.toReceive.toFixed(2)}
                    </Text>
                  </View>
                </Card>

                <Card style={styles.summaryCard}>
                  <View style={[styles.summaryIcon, { backgroundColor: '#ffe6e6' }]}>
                    <TrendingDown size={24} color={colors.error} />
                  </View>
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryLabel}>You Owe</Text>
                    <Text style={styles.summaryAmountNegative}>
                      ${balanceSummary.youOwe.toFixed(2)}
                    </Text>
                  </View>
                </Card>
              </View>

              <Text style={styles.sectionTitle}>
                All Expenses ({expenses.length})
              </Text>

              {expenses.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No expenses yet</Text>
                  <Text style={styles.emptySubtext}>
                    Create split requests in chat or create rooms and events to track shared expenses
                  </Text>
                  <View style={styles.emptyButtons}>
                    <Button
                      title="Create Room"
                      onPress={() => setShowCreateRoomModal(true)}
                      variant="primary"
                      size="small"
                      style={styles.emptyButton}
                    />
                    <Button
                      title="Create Event"
                      onPress={() => setShowCreateEventModal(true)}
                      variant="secondary"
                      size="small"
                      style={styles.emptyButton}
                    />
                  </View>
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

                              return (
                                <View key={split.id} style={styles.splitRow}>
                                  <View style={styles.splitInfo}>
                                    <Text style={styles.splitName}>
                                      {isCurrentUser ? 'You' : getUserName(split.user_id)}
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
            </>
          )}

          {/* Rooms Tab */}
          {activeTab === "rooms" && (
            <>
              <View style={styles.tabHeader}>
                <Text style={styles.sectionTitle}>Expense Rooms ({rooms.length})</Text>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => setShowCreateRoomModal(true)}
                >
                  <Plus size={20} color={colors.white} />
                </TouchableOpacity>
              </View>

              {rooms.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Home size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>No rooms yet</Text>
                  <Text style={styles.emptySubtext}>
                    Create a room to track ongoing shared expenses with roommates
                  </Text>
                  <Button
                    title="Create Room"
                    onPress={() => setShowCreateRoomModal(true)}
                    variant="primary"
                    size="small"
                    style={styles.emptyCta}
                  />
                </Card>
              ) : (
                rooms.map((room) => (
                  <TouchableOpacity
                    key={room.id}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/expenses/room/${room.id}`)}
                  >
                    <Card style={styles.roomCard}>
                      <View style={styles.roomHeader}>
                        <View style={styles.roomIcon}>
                          <Home size={24} color={colors.primary} />
                        </View>
                        <View style={styles.roomInfo}>
                          <Text style={styles.roomName}>{room.name}</Text>
                          {room.description && (
                            <Text style={styles.roomDescription} numberOfLines={1}>
                              {room.description}
                            </Text>
                          )}
                          <View style={styles.roomMeta}>
                            <Users size={14} color={colors.textSecondary} />
                            <Text style={styles.roomMetaText}>
                              {room.members.length} members
                            </Text>
                          </View>
                        </View>
                        <ChevronRight size={20} color={colors.textSecondary} />
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}

          {/* Events Tab */}
          {activeTab === "events" && (
            <>
              <View style={styles.tabHeader}>
                <Text style={styles.sectionTitle}>Expense Events ({events.length})</Text>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => setShowCreateEventModal(true)}
                >
                  <Plus size={20} color={colors.white} />
                </TouchableOpacity>
              </View>

              {events.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Calendar size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>No events yet</Text>
                  <Text style={styles.emptySubtext}>
                    Create an event to track one-time expenses like trips or parties
                  </Text>
                  <Button
                    title="Create Event"
                    onPress={() => setShowCreateEventModal(true)}
                    variant="primary"
                    size="small"
                    style={styles.emptyCta}
                  />
                </Card>
              ) : (
                events.map((event) => (
                  <TouchableOpacity key={event.id} activeOpacity={0.7}>
                    <Card style={styles.eventCard}>
                      <View style={styles.eventHeader}>
                        <View style={styles.eventIcon}>
                          <Calendar size={24} color={colors.accent} />
                        </View>
                        <View style={styles.eventInfo}>
                          <Text style={styles.eventName}>{event.name}</Text>
                          {event.description && (
                            <Text style={styles.eventDescription} numberOfLines={1}>
                              {event.description}
                            </Text>
                          )}
                          <View style={styles.eventMeta}>
                            {event.event_date && (
                              <>
                                <Text style={styles.eventMetaText}>
                                  {new Date(event.event_date).toLocaleDateString()}
                                </Text>
                                <Text style={styles.eventMetaDot}>•</Text>
                              </>
                            )}
                            <Users size={14} color={colors.textSecondary} />
                            <Text style={styles.eventMetaText}>
                              {event.members.length} participants
                            </Text>
                          </View>
                        </View>
                        <ChevronRight size={20} color={colors.textSecondary} />
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* Modals */}
      <CreateRoomModal
        visible={showCreateRoomModal}
        onClose={() => setShowCreateRoomModal(false)}
        onCreateRoom={handleCreateRoom}
        currentUser={null}
        availableUsers={[]}
      />

      <CreateEventModal
        visible={showCreateEventModal}
        onClose={() => setShowCreateEventModal(false)}
        onCreateEvent={handleCreateEvent}
        currentUser={null}
        availableUsers={[]}
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionTitle: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: "600",
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
  emptyButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  emptyButton: {
    flex: 1,
  },
  emptyCta: {
    marginTop: spacing.sm,
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
  roomCard: {
    padding: spacing.md,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  roomIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e6f2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  roomName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  roomDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  roomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  roomMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  eventCard: {
    padding: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  eventName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  eventDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  eventMetaDot: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
