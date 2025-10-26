import React, { useState, useRef } from "react";
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
} from "react-native";
import { Handshake, ArrowRight, Briefcase, GraduationCap, Dog, Cigarette, ChevronDown } from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing, borderRadius } from "@/constants/spacing";
import Badge from "@/components/Badge";
import { mockUsers } from "@/mocks/users";
import { User } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { Stack } from "expo-router";
import NotificationBell from "@/components/NotificationBell";

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
  const [users] = useState<User[]>(mockUsers);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedResidency, setSelectedResidency] = useState<string>("all");
  const [showResidencyPicker, setShowResidencyPicker] = useState(false);
  const { createPendingChat, currentUser, notificationCounts } = useApp();
  
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

  const swipeRight = () => {
    const connectedUser = users[currentIndex];
    
    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH + 100, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      if (currentUser && connectedUser) {
        console.log("Creating connection request for user:", connectedUser.name);
        createPendingChat(connectedUser, currentUser.id);
      }
      
      setCurrentIndex((prev) => prev + 1);
      position.setValue({ x: 0, y: 0 });
    });
  };

  const swipeLeft = () => {
    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      setCurrentIndex((prev) => prev + 1);
      position.setValue({ x: 0, y: 0 });
    });
  };

  const displayUser = users[currentIndex];

  if (!displayUser) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No more profiles</Text>
        <Text style={styles.emptyText}>Check back later for new matches!</Text>
      </View>
    );
  }

  const selectedResidencyName = RESIDENCIES.find(r => r.id === selectedResidency)?.name || "All Residencies";

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
      <View style={styles.container}>
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
                        selectedResidency === residency.id && styles.residencyItemTextSelected,
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
                  source={{ uri: user.photos[0] }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
                <View style={styles.cardOverlay} />

                <Animated.View
                  style={[styles.connectLabel, { opacity: likeOpacity }]}
                >
                  <Text style={styles.labelText}>CONNECT</Text>
                </Animated.View>

                <Animated.View
                  style={[styles.skipLabel, { opacity: nopeOpacity }]}
                >
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
                    <Badge
                      label={user.workStatus === "full-time" ? "Full-time" : user.workStatus === "part-time" ? "Part-time" : "Student"}
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
                      <Dog
                        size={18}
                        color={user.pets ? colors.accent : colors.gray}
                      />
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
            <View
              key={user.id}
              style={[styles.card, { zIndex: 1 }]}
            >
              <Image
                source={{ uri: user.photos[0] }}
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  cardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    position: "absolute",
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT - 300,
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
    gap: spacing.sm,
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
