import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
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
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  getExpenses,
  getExpenseRooms,
  getExpenseEvents,
  markSplitAsPaid,
  createExpenseRoom,
  createExpenseEvent,
  getPendingSettlements,
  approveSettlement,
  Expense,
  ExpenseRoom,
  ExpenseEvent,
  PendingSettlement,
} from "@/lib/api/expenses";
import { getMatches, MatchWithProfile } from "@/lib/api/matches";
import { User } from "@/types";

type TabType = "all" | "rooms" | "events";

export default function ExpensesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { notificationCounts } = useNotifications();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rooms, setRooms] = useState<ExpenseRoom[]>([]);
  const [events, setEvents] = useState<ExpenseEvent[]>([]);
  const [pendingSettlements, setPendingSettlements] = useState<PendingSettlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [expandedToReceive, setExpandedToReceive] = useState(false);
  const [expandedYouOwe, setExpandedYouOwe] = useState(false);

  // Load all data
  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    try {
      await Promise.all([
        loadExpenses(),
        loadRooms(),
        loadEvents(),
        loadPendingSettlements(),
        loadMatches(),
        loadCurrentUser()
      ]);
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

  const loadPendingSettlements = async () => {
    const result = await getPendingSettlements();
    if (result.success && result.data) {
      setPendingSettlements(result.data);
    }
  };

  const loadMatches = async () => {
    const result = await getMatches();
    if (result.success && result.data) {
      // Transform matches to User[] format
      const users: User[] = result.data.map((match: MatchWithProfile) => ({
        id: match.matched_user.id,
        name: match.matched_user.name,
        age: match.matched_user.age,
        userType: match.matched_user.user_type,
        college: match.matched_user.college,
        workStatus: match.matched_user.work_status,
        smoker: match.matched_user.smoker,
        pets: match.matched_user.pets,
        hasPlace: match.matched_user.has_place,
        about: match.matched_user.about,
        photos: match.matched_user.photos || [],
        roomPhotos: match.matched_user.room_photos,
        distance: match.matched_user.distance,
      }));
      setAvailableUsers(users);
    }
  };

  const loadCurrentUser = async () => {
    if (!user) return;

    // Fetch current user profile from database
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data && !error) {
      const userProfile: User = {
        id: data.id,
        name: data.name || '',
        age: data.age || 0,
        userType: data.user_type,
        college: data.college,
        workStatus: data.work_status || 'not-working',
        smoker: data.smoker || false,
        pets: data.pets || false,
        hasPlace: data.has_place || false,
        about: data.about,
        photos: data.photos || [],
        roomPhotos: data.room_photos,
      };
      setCurrentUserProfile(userProfile);
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

  const handleApproveSettlement = async (settlementId: string) => {
    try {
      const result = await approveSettlement(settlementId, true);
      if (result.success) {
        alert('Settlement approved!');
        await Promise.all([
          loadPendingSettlements(),
          loadExpenses(),
          loadRooms()
        ]);
      } else {
        alert(result.error || 'Failed to approve settlement');
      }
    } catch (error) {
      console.error('Error approving settlement:', error);
      alert('Failed to approve settlement');
    }
  };

  const handleRejectSettlement = async (settlementId: string) => {
    try {
      const result = await approveSettlement(settlementId, false);
      if (result.success) {
        alert('Settlement rejected');
        await loadPendingSettlements();
      } else {
        alert(result.error || 'Failed to reject settlement');
      }
    } catch (error) {
      console.error('Error rejecting settlement:', error);
      alert('Failed to reject settlement');
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

  // Calculate breakdown of who owes you
  const toReceiveBreakdown = useMemo(() => {
    const breakdown: { [userId: string]: { name: string; photos?: string[]; amount: number } } = {};

    expenses.forEach((expense) => {
      if (expense.paid_by === user?.id) {
        expense.splits.forEach((split) => {
          if (split.user_id !== user?.id && !split.paid) {
            if (!breakdown[split.user_id]) {
              breakdown[split.user_id] = {
                name: split.user?.name || 'User',
                photos: split.user?.photos,
                amount: 0,
              };
            }
            breakdown[split.user_id].amount += Number(split.amount);
          }
        });
      }
    });

    return Object.entries(breakdown)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, user?.id]);

  // Calculate breakdown of who you owe
  const youOweBreakdown = useMemo(() => {
    const breakdown: { [userId: string]: { name: string; photos?: string[]; amount: number } } = {};

    expenses.forEach((expense) => {
      if (expense.paid_by !== user?.id) {
        const mySplit = expense.splits.find((s) => s.user_id === user?.id);
        if (mySplit && !mySplit.paid) {
          const payerId = expense.paid_by;
          if (!breakdown[payerId]) {
            // Find the payer's info from the splits
            const payerSplit = expense.splits.find((s) => s.user_id === payerId);
            breakdown[payerId] = {
              name: payerSplit?.user?.name || 'User',
              photos: payerSplit?.user?.photos,
              amount: 0,
            };
          }
          breakdown[payerId].amount += Number(mySplit.amount);
        }
      }
    });

    return Object.entries(breakdown)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, user?.id]);

  const getUserName = (userId: string, userName?: string) => {
    if (userId === user?.id) return 'You';
    return userName || 'User';
  };

  const getUserAvatar = (userId: string, userPhotos?: string[]) => {
    if (userId === user?.id && currentUserProfile) {
      return currentUserProfile.photos[0];
    }
    return userPhotos && userPhotos.length > 0 ? userPhotos[0] : undefined;
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
                {/* To Receive Card - Expandable */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setExpandedToReceive(!expandedToReceive)}
                >
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
                    {toReceiveBreakdown.length > 0 && (
                      expandedToReceive ? (
                        <ChevronUp size={20} color={colors.success} />
                      ) : (
                        <ChevronDown size={20} color={colors.success} />
                      )
                    )}
                  </Card>

                  {/* Expanded Breakdown */}
                  {expandedToReceive && toReceiveBreakdown.length > 0 && (
                    <Card style={styles.breakdownCard}>
                      <Text style={styles.breakdownTitle}>Who Owes You</Text>
                      {toReceiveBreakdown.map((item) => (
                        <View key={item.userId} style={styles.breakdownRow}>
                          <Avatar uri={item.photos?.[0]} size="small" />
                          <Text style={styles.breakdownName}>{item.name}</Text>
                          <Text style={styles.breakdownAmount}>
                            ${item.amount.toFixed(2)}
                          </Text>
                        </View>
                      ))}
                    </Card>
                  )}
                </TouchableOpacity>

                {/* You Owe Card - Expandable */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setExpandedYouOwe(!expandedYouOwe)}
                >
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
                    {youOweBreakdown.length > 0 && (
                      expandedYouOwe ? (
                        <ChevronUp size={20} color={colors.error} />
                      ) : (
                        <ChevronDown size={20} color={colors.error} />
                      )
                    )}
                  </Card>

                  {/* Expanded Breakdown */}
                  {expandedYouOwe && youOweBreakdown.length > 0 && (
                    <Card style={styles.breakdownCard}>
                      <Text style={styles.breakdownTitle}>Who You Owe</Text>
                      {youOweBreakdown.map((item) => (
                        <View key={item.userId} style={styles.breakdownRow}>
                          <Avatar uri={item.photos?.[0]} size="small" />
                          <Text style={styles.breakdownName}>{item.name}</Text>
                          <Text style={[styles.breakdownAmount, { color: colors.error }]}>
                            ${item.amount.toFixed(2)}
                          </Text>
                        </View>
                      ))}
                    </Card>
                  )}
                </TouchableOpacity>
              </View>

              {/* Pending Settlements Section */}
              {pendingSettlements.length > 0 && (
                <>
                  <View style={styles.settlementsHeader}>
                    <Text style={styles.sectionTitle}>
                      Pending Settlements ({pendingSettlements.length})
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Review and approve payments
                    </Text>
                  </View>

                  {pendingSettlements.map((settlement) => (
                    <Card key={settlement.id} style={styles.settlementCard}>
                      <View style={styles.settlementHeader}>
                        <Avatar
                          uri={settlement.from_user_photos?.[0]}
                          size="medium"
                        />
                        <View style={styles.settlementInfo}>
                          <Text style={styles.settlementFrom}>
                            {settlement.from_user_name}
                          </Text>
                          <Text style={styles.settlementRoom}>
                            {settlement.room_name}
                          </Text>
                        </View>
                        <View style={styles.settlementAmountContainer}>
                          <Text style={styles.settlementAmount}>
                            ${Number(settlement.amount).toFixed(2)}
                          </Text>
                          {settlement.payment_method && (
                            <Text style={styles.settlementMethod}>
                              via {settlement.payment_method}
                            </Text>
                          )}
                        </View>
                      </View>

                      {settlement.note && (
                        <View style={styles.settlementNote}>
                          <Text style={styles.settlementNoteText}>
                            {settlement.note}
                          </Text>
                        </View>
                      )}

                      {settlement.proof_image && (
                        <TouchableOpacity
                          style={styles.proofImageContainer}
                          onPress={() => {
                            // TODO: Open full-screen image viewer
                            alert('Image preview - coming soon!');
                          }}
                        >
                          <Image
                            source={{ uri: settlement.proof_image }}
                            style={styles.proofImage}
                            resizeMode="cover"
                          />
                          <View style={styles.proofOverlay}>
                            <Text style={styles.proofText}>Payment Proof</Text>
                          </View>
                        </TouchableOpacity>
                      )}

                      <View style={styles.settlementActions}>
                        <Button
                          title="Reject"
                          onPress={() => handleRejectSettlement(settlement.id)}
                          variant="secondary"
                          size="small"
                          style={styles.settlementButton}
                          testID={`reject-settlement-${settlement.id}`}
                        />
                        <Button
                          title="Approve"
                          onPress={() => handleApproveSettlement(settlement.id)}
                          variant="primary"
                          size="small"
                          style={styles.settlementButton}
                          testID={`approve-settlement-${settlement.id}`}
                        />
                      </View>
                    </Card>
                  ))}
                </>
              )}

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
        currentUser={currentUserProfile}
        availableUsers={availableUsers}
      />

      <CreateEventModal
        visible={showCreateEventModal}
        onClose={() => setShowCreateEventModal(false)}
        onCreateEvent={handleCreateEvent}
        currentUser={currentUserProfile}
        availableUsers={availableUsers}
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
  settlementsHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  settlementCard: {
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  settlementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  settlementInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  settlementFrom: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  settlementRoom: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  settlementAmountContainer: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  settlementAmount: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.success,
  },
  settlementMethod: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  settlementNote: {
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  settlementNoteText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  proofImageContainer: {
    marginVertical: spacing.sm,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  proofImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.background,
  },
  proofOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: spacing.sm,
    alignItems: 'center',
  },
  proofText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  settlementActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  settlementButton: {
    flex: 1,
  },
  breakdownCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  breakdownTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakdownName: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  breakdownAmount: {
    ...typography.body,
    fontWeight: '600',
    color: colors.success,
  },
});
