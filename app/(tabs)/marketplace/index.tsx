import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import NotificationBell from "@/components/NotificationBell";
import { Heart, Plus, Filter, X, UserPlus, Tag } from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import Card from "@/components/Card";
import Avatar from "@/components/Avatar";
import { useApp } from "@/contexts/AppContext";
import Button from "@/components/Button";
import Badge from "@/components/Badge";

export default function MarketplaceScreen() {
  const { marketplaceListings, toggleSaveListing, markListingAsSold, addFriend, startConversation, notificationCounts } = useApp();
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [location, setLocation] = useState<string>("");

  const filteredListings = useMemo(() => {
    return marketplaceListings.filter((listing) => {
      const min = minPrice ? parseFloat(minPrice) : 0;
      const max = maxPrice ? parseFloat(maxPrice) : Infinity;
      const matchesPrice = listing.price >= min && listing.price <= max;
      const matchesLocation = !location || listing.location.toLowerCase().includes(location.toLowerCase());
      return matchesPrice && matchesLocation;
    });
  }, [marketplaceListings, minPrice, maxPrice, location]);

  const handleClearFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setLocation("");
  };

  const handleMessageSeller = (sellerId: string) => {
    const convId = startConversation(sellerId);
    router.push(`/chat/${convId}`);
  };
  return (
    <>
      <Stack.Screen
        options={{
          title: "Marketplace",
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerRight: () => (
            <View style={styles.headerButtons}>
              <NotificationBell
                count={notificationCounts.marketplace}
                testID="marketplace-notifications"
              />
              <TouchableOpacity
                onPress={() => setShowFilters(true)}
                style={styles.iconButton}
                testID="filter-button"
              >
                <Filter size={24} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/marketplace/create")}
                style={styles.iconButton}
                testID="create-listing-button"
              >
                <Plus size={24} color={colors.accent} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <View style={styles.container}>
        <FlatList
          data={filteredListings}
          contentContainerStyle={styles.list}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`listing-${item.id}`}
              onPress={() => router.push(`/marketplace/${item.id}`)}
            >
              <Card style={styles.listingCard}>
                <Image
                  source={{ uri: item.images[0] }}
                  style={styles.listingImage}
                  resizeMode="cover"
                />
                {item.sold && (
                  <View style={styles.soldBadge}>
                    <Badge label="SOLD" variant="gold" />
                  </View>
                )}
                <View style={styles.topActions}>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={() => toggleSaveListing(item.id)}
                    testID={`save-${item.id}`}
                  >
                    <Heart
                      size={20}
                      color={item.saved ? colors.accent : colors.white}
                      fill={item.saved ? colors.accent : "none"}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.listingInfo}>
                  <Text style={styles.price}>${item.price}</Text>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.location}>{item.location}</Text>
                  <View style={styles.sellerRow}>
                    <View style={styles.seller}>
                      <Avatar uri={item.seller.photos?.[0]} size="small" />
                      <Text style={styles.sellerName}>{item.seller.name}</Text>
                    </View>
                    <View style={styles.listingActions}>
                      <TouchableOpacity
                        onPress={() => addFriend(item.seller.id)}
                        style={styles.actionIconButton}
                        testID={`add-friend-seller-${item.id}`}
                      >
                        <UserPlus size={18} color={colors.accent} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />

        <Modal
          visible={showFilters}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filters</Text>
                <TouchableOpacity
                  onPress={() => setShowFilters(false)}
                  testID="close-filter-modal"
                >
                  <X size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.filterContent}>
                <Text style={styles.filterLabel}>Min Price</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="$0"
                  placeholderTextColor={colors.gray}
                  value={minPrice}
                  onChangeText={setMinPrice}
                  keyboardType="numeric"
                  testID="min-price-input"
                />

                <Text style={styles.filterLabel}>Max Price</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="$999999"
                  placeholderTextColor={colors.gray}
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="numeric"
                  testID="max-price-input"
                />

                <Text style={styles.filterLabel}>Location</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Enter location"
                  placeholderTextColor={colors.gray}
                  value={location}
                  onChangeText={setLocation}
                  testID="location-input"
                />

                <View style={styles.filterButtons}>
                  <Button
                    title="Clear Filters"
                    onPress={handleClearFilters}
                    variant="secondary"
                    style={styles.filterButton}
                    testID="clear-filters-button"
                  />
                  <Button
                    title="Apply"
                    onPress={() => setShowFilters(false)}
                    variant="primary"
                    style={styles.filterButton}
                    testID="apply-filters-button"
                  />
                </View>
              </View>
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
  list: {
    padding: spacing.md,
    gap: spacing.md,
  },
  listingCard: {
    padding: 0,
    overflow: "hidden",
  },
  listingImage: {
    width: "100%",
    height: 200,
  },
  saveButton: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  listingInfo: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  price: {
    ...typography.h3,
    color: colors.accent,
    fontWeight: "700",
  },
  title: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  location: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  seller: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sellerName: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginRight: spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  topActions: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  soldBadge: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
  },
  sellerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listingActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
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
  filterContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  filterLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  filterInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.card,
  },
  filterButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  filterButton: {
    flex: 1,
  },
});
        