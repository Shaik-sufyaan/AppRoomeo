import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
  PanResponder,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  Handshake,
  ArrowRight,
  Briefcase,
  GraduationCap,
  Dog,
  Cigarette,
  ChevronDown,
  Home,
  Users,
} from "lucide-react-native";
import { Stack, useRouter } from "expo-router";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing, borderRadius } from "@/constants/spacing";
import Badge from "@/components/Badge";
import MatchCelebrationModal from "@/components/MatchCelebrationModal";
import NotificationBell from "@/components/NotificationBell";
import { User, UserType } from "@/types";
import { useApp } from "@/contexts/AppContext";
import {
  getMatchFeed,
  sendMatchRequest,
  recordSwipe,
} from "@/lib/api/matches";
import { getOrCreateConversation } from "@/lib/api/chat";
import { supabase } from "@/lib/supabase";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

const RESIDENCIES = [
  { id: "all", name: "All Residencies" },
  { id: "112", name: "112 Apartments" },
  { id: "reflections", name: "Reflections" },
  { id: "campus-towers", name: "Campus Towers" },
  { id: "university-plaza", name: "University Plaza" },
];

export default function MatchesScreen() {
  const router = useRouter();
  const { currentUser, notificationCounts } = useApp();

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedResidency, setSelectedResidency] = useState<string>("all");
  const [showResidencyPicker, setShowResidencyPicker] = useState(false);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  // Match celebration modal
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [isMutualMatch, setIsMutualMatch] = useState(false);

  // Animation
  const position = useRef(new Animated.ValueXY()).current;
  const rotation = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // Load data on mount
  useEffect(() => {
    loadMatchFeed();
  }, []);

  const loadMatchFeed = async () => {
    setIsLoadingFeed(true);
    try {
      const result = await getMatchFeed(20, 0);
      if (result.success && result.data) {
        // Convert API response to User type
        const usersData: User[] = result.data.map((profile) => ({
          id: profile.profile_id,
          name: profile.name,
          age: profile.age,
          userType: profile.user_type,
          college: profile.college,
          workStatus: profile.work_status,
          smoker: profile.smoker,
          pets: profile.pets,
          hasPlace: profile.has_place,
          about: profile.about,
          photos: profile.photos || [],
          roomPhotos: profile.room_photos || [],
          distance: profile.distance,
        }));
        setUsers(usersData);
      } else {
        console.error("Failed to load match feed:", result.error);
      }
    } catch (error) {
      console.error("Error loading match feed:", error);
    } finally {
      setIsLoadingFeed(false);
    }
  };


  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          swipeRight();
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          swipeLeft();
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const swipeRight = async () => {
    const swipedUser = users[currentIndex];

    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH + 100, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(async () => {
      if (swipedUser) {
        // Send match request
        const result = await sendMatchRequest(swipedUser.id);

        if (result.success) {
          if (result.data?.is_mutual) {
            // Mutual match! Create conversation immediately
            const conversationResult = await getOrCreateConversation(
              swipedUser.id,
              'match',
              result.data.match_id
            );

            if (conversationResult.success) {
              // Show mutual match modal
              setMatchedUser(swipedUser);
              setIsMutualMatch(true);
              setShowMatchModal(true);
            } else {
              Alert.alert('Match Created!', `You matched with ${swipedUser.name}! But failed to create chat.`);
            }
          } else {
            // Show success toast
            Alert.alert("Request Sent!", `Request sent to ${swipedUser.name}!`);
          }
        } else {
          if (result.error === "INCOMPATIBLE_USER_TYPES") {
            Alert.alert("Incompatible Match", "This user is not compatible with your profile type");
          } else if (result.error === "ALREADY_MATCHED") {
            Alert.alert("Already Matched", "You're already matched with this user!");
          } else if (result.error === "REQUEST_ALREADY_SENT") {
            Alert.alert("Request Pending", `You already sent a request to ${swipedUser.name}`);
          } else {
            Alert.alert("Error", result.error || "Failed to send request");
          }
        }
      }

      setCurrentIndex((prev) => prev + 1);
      position.setValue({ x: 0, y: 0 });
    });
  };

  const swipeLeft = async () => {
    const swipedUser = users[currentIndex];

    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(async () => {
      if (swipedUser) {
        // Record skip swipe
        await recordSwipe(swipedUser.id, "skip");
      }

      setCurrentIndex((prev) => prev + 1);
      position.setValue({ x: 0, y: 0 });
    });
  };


  const handleSendMessage = async () => {
    if (!matchedUser) return;

    try {
      setShowMatchModal(false);

      // Create or get conversation with matched user
      const result = await getOrCreateConversation(matchedUser.id, 'match');

      if (result.success && result.data) {
        // Navigate to the conversation (not user ID!)
        router.push(`/chat/${result.data.conversation_id}`);
      } else {
        Alert.alert('Error', 'Failed to create conversation. Please try again.');
        console.error('Failed to create conversation:', result.error);
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const getSmartFilterMessage = (): string => {
    if (!currentUser?.userType) return "";

    if (currentUser.userType === "finding-roommate") {
      return "💡 Showing: People looking for a place\n   (You have a place to share)";
    } else {
      return "💡 Showing: People with a place to share\n   (You're looking for a place)";
    }
  };

  const displayUser = users[currentIndex];

  if (isLoadingFeed && users.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading profiles...</Text>
      </View>
    );
  }

  if (!displayUser && !isLoadingFeed) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Matches",
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.primary,
            headerRight: () => (
              <NotificationBell
                count={notificationCounts.matches}
                testID="matches-notifications"
              />
            ),
          }}
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No more profiles</Text>
          <Text style={styles.emptyText}>Check back later for new matches!</Text>
        </View>
      </>
    );
  }

  const selectedResidencyName =
    RESIDENCIES.find((r) => r.id === selectedResidency)?.name || "All Residencies";

  return (
    <>
      <Stack.Screen
        options={{
          title: "Matches",
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerRight: () => (
            <NotificationBell
              count={notificationCounts.matches}
              testID="matches-notifications"
            />
          ),
        }}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Residency Selector */}
        <View style={styles.residencySelector}>
          <TouchableOpacity
            style={styles.residencyButton}
            onPress={() => setShowResidencyPicker(!showResidencyPicker)}
            testID="residency-selector"
          >
            <Text style={styles.residencyButtonText}>{selectedResidencyName}</Text>
            <ChevronDown size={20} color={colors.primary} />
          </TouchableOpacity>

          {showResidencyPicker && (
            <View style={styles.residencyDropdown}>
              <ScrollView style={styles.residencyList}>
                {RESIDENCIES.map((residency) => (
                  <TouchableOpacity
                    key={residency.id}
                    style={[
                      styles.residencyItem,
                      selectedResidency === residency.id && styles.residencyItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedResidency(residency.id);
                      setShowResidencyPicker(false);
                    }}
                    testID={`residency-${residency.id}`}
                  >
                    <Text
                      style={[
                        styles.residencyItemText,
                        selectedResidency === residency.id &&
                          styles.residencyItemTextSelected,
                      ]}
                    >
                      {residency.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Smart Filter Indicator */}
        {currentUser?.userType && (
          <View style={styles.smartFilterContainer}>
            <Text style={styles.smartFilterText}>{getSmartFilterMessage()}</Text>
          </View>
        )}

        {/* Discover Section */}
        {displayUser && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DISCOVER</Text>
            </View>

            <View style={styles.cardContainer}>
              {users.slice(currentIndex, currentIndex + 2).map((user, index) => {
                if (index === 0) {
                  return (
                    <Animated.View
                      key={user.id}
                      style={[
                        styles.card,
                        {
                          transform: [
                            { translateX: position.x },
                            { translateY: position.y },
                            { rotate: rotation },
                          ],
                          zIndex: 2,
                        },
                      ]}
                      {...panResponder.panHandlers}
                    >
                      <Image
                        source={{ uri: user.photos?.[0] }}
                        style={styles.cardImage}
                        resizeMode="cover"
                      />
                      <View style={styles.cardOverlay} />

                      <Animated.View style={[styles.connectLabel, { opacity: likeOpacity }]}>
                        <Text style={styles.labelText}>CONNECT</Text>
                      </Animated.View>

                      <Animated.View style={[styles.skipLabel, { opacity: nopeOpacity }]}>
                        <Text style={styles.labelText}>SKIP</Text>
                      </Animated.View>

                      <View style={styles.cardInfo}>
                        <View style={styles.header}>
                          <View>
                            <Text style={styles.name}>
                              {user.name}, {user.age}
                            </Text>
                            {user.college && (
                              <View style={styles.infoRow}>
                                <GraduationCap size={16} color={colors.white} />
                                <Text style={styles.college}>{user.college}</Text>
                              </View>
                            )}
                            {user.distance && (
                              <Text style={styles.distance}>{user.distance} miles away</Text>
                            )}
                          </View>
                        </View>

                        <View style={styles.badges}>
                          {user.userType === "looking-for-place" ? (
                            <View style={styles.userTypeBadge}>
                              <Home size={14} color={colors.white} />
                              <Text style={styles.userTypeBadgeText}>Looking for a place</Text>
                            </View>
                          ) : (
                            <View style={styles.userTypeBadge}>
                              <Users size={14} color={colors.white} />
                              <Text style={styles.userTypeBadgeText}>Has a place</Text>
                            </View>
                          )}

                          <Badge
                            label={
                              user.workStatus === "full-time"
                                ? "Full-time"
                                : user.workStatus === "part-time"
                                ? "Part-time"
                                : "Student"
                            }
                            variant="gold"
                          />
                          {user.hasPlace && <Badge label="Has Place" variant="primary" />}
                        </View>

                        <View style={styles.icons}>
                          <View style={styles.iconItem}>
                            <Briefcase
                              size={18}
                              color={user.workStatus !== "not-working" ? colors.accent : colors.gray}
                            />
                          </View>
                          <View style={styles.iconItem}>
                            <Dog size={18} color={user.pets ? colors.accent : colors.gray} />
                          </View>
                          <View style={styles.iconItem}>
                            <Cigarette
                              size={18}
                              color={user.smoker ? colors.error : colors.gray}
                            />
                          </View>
                        </View>

                        {user.about && (
                          <Text style={styles.about} numberOfLines={2}>
                            {user.about}
                          </Text>
                        )}
                      </View>
                    </Animated.View>
                  );
                }

                return (
                  <View key={user.id} style={[styles.card, { zIndex: 1 }]}>
                    <Image
                      source={{ uri: user.photos?.[0] }}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  </View>
                );
              })}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.skipButton]}
                onPress={swipeLeft}
                testID="skip-button"
              >
                <ArrowRight size={28} color={colors.gray} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.connectButton]}
                onPress={swipeRight}
                testID="connect-button"
              >
                <Handshake size={28} color={colors.accent} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Match Celebration Modal */}
      {matchedUser && currentUser && (
        <MatchCelebrationModal
          visible={showMatchModal}
          matchedUser={matchedUser}
          currentUser={currentUser as User}
          isMutual={isMutualMatch}
          onClose={() => setShowMatchModal(false)}
          onSendMessage={handleSendMessage}
          testID="match-celebration-modal"
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  residencySelector: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    zIndex: 1000,
  },
  residencyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  residencyButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  residencyDropdown: {
    position: "absolute",
    top: 60,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 250,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
  },
  residencyList: {
    maxHeight: 250,
  },
  residencyItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  residencyItemSelected: {
    backgroundColor: colors.accentLight,
  },
  residencyItemText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  residencyItemTextSelected: {
    color: colors.accent,
    fontWeight: "600",
  },
  smartFilterContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accentLight,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
  },
  smartFilterText: {
    ...typography.caption,
    color: colors.primary,
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  cardContainer: {
    height: SCREEN_HEIGHT - 400,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  card: {
    position: "absolute",
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT - 400,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.card,
    shadowColor: colors.primaryDark,
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 5,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  connectLabel: {
    position: "absolute",
    top: 50,
    right: 30,
    borderWidth: 4,
    borderColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    transform: [{ rotate: "20deg" }],
  },
  skipLabel: {
    position: "absolute",
    top: 50,
    left: 30,
    borderWidth: 4,
    borderColor: colors.gray,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    transform: [{ rotate: "-20deg" }],
  },
  labelText: {
    ...typography.h2,
    fontWeight: "800",
    color: colors.white,
  },
  cardInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  name: {
    ...typography.h2,
    color: colors.white,
    fontWeight: "800",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  college: {
    ...typography.bodySmall,
    color: colors.white,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  distance: {
    ...typography.caption,
    color: colors.white,
    marginTop: spacing.xs,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  userTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  userTypeBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
  icons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  iconItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  about: {
    ...typography.bodySmall,
    color: colors.white,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xl,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.md,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    shadowColor: colors.primaryDark,
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 4,
  },
  skipButton: {
    borderWidth: 2,
    borderColor: colors.gray,
  },
  connectButton: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
