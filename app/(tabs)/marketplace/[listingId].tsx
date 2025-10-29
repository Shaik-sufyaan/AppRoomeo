import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { UserPlus, Heart, MapPin, Tag } from "lucide-react-native";
import colors from "@/constants/colors";
import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import { useApp } from "@/contexts/AppContext";
import Badge from "@/components/Badge";
import { getOrCreateConversation } from "@/lib/api/chat";

const { width } = Dimensions.get("window");

export default function ListingDetailScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { marketplaceListings, toggleSaveListing, addFriend, markListingAsSold, currentUser } = useApp();
  const router = useRouter();
  const [imageIndex] = useState<number>(0);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const listing = marketplaceListings.find((l) => l.id === listingId);

  if (!listing) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Listing not found</Text>
      </View>
    );
  }

  const handleMessageSeller = async () => {
    setIsCreatingChat(true);
    try {
      // Create or get existing conversation with marketplace context
      const result = await getOrCreateConversation(
        listing.seller.id,
        'marketplace',
        listing.id
      );

      if (result.success && result.data) {
        router.push(`/chat/${result.data.conversation_id}`);
      } else {
        alert(result.error || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Failed to start conversation');
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleAddFriend = () => {
    addFriend(listing.seller.id);
    console.log("Friend added:", listing.seller.name);
  };

  const handleToggleSold = () => {
    markListingAsSold(listing.id);
    console.log("Marked as", listing.sold ? "available" : "sold");
  };

  const isOwnListing = currentUser?.id === listing.seller.id;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Listing Details",
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
        }}
      />
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: listing.images[imageIndex] }}
              style={styles.image}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => toggleSaveListing(listing.id)}
              testID="save-listing-button"
            >
              <Heart
                size={24}
                color={listing.saved ? colors.accent : colors.white}
                fill={listing.saved ? colors.accent : "none"}
              />
            </TouchableOpacity>
            {listing.images.length > 1 && (
              <View style={styles.imageIndicators}>
                {listing.images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicator,
                      index === imageIndex && styles.activeIndicator,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={styles.content}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>${listing.price}</Text>
              {listing.sold && <Badge label="SOLD" variant="gold" />}
            </View>
            <Text style={styles.title}>{listing.title}</Text>

            <View style={styles.locationRow}>
              <MapPin size={16} color={colors.gray} />
              <Text style={styles.location}>{listing.location}</Text>
            </View>

            <Badge label={listing.category} variant="secondary" style={styles.categoryBadge} />

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{listing.description}</Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Seller</Text>
            <View style={styles.sellerCard}>
              <Avatar uri={listing.seller.photos[0]} size="medium" />
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{listing.seller.name}</Text>
                <Text style={styles.sellerDetails}>
                  {listing.seller.age} years old
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleAddFriend}
                style={styles.addFriendButton}
                testID="add-friend-button"
              >
                <UserPlus size={20} color={colors.accent} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {isOwnListing ? (
            <View style={styles.ownListingFooter}>
              <Tag size={20} color={colors.accent} style={styles.tagIcon} />
              <Button
                title={listing.sold ? "Mark as Available" : "Mark as Sold"}
                onPress={handleToggleSold}
                variant={listing.sold ? "secondary" : "primary"}
                testID="toggle-sold-button"
                style={styles.footerButton}
              />
            </View>
          ) : (
            <Button
              title={isCreatingChat ? "Starting chat..." : "Message Seller"}
              onPress={handleMessageSeller}
              variant="primary"
              disabled={isCreatingChat || listing.sold}
              testID="message-seller-button"
            />
          )}
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
  imageContainer: {
    position: "relative",
  },
  image: {
    width: width,
    height: 300,
  },
  saveButton: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageIndicators: {
    position: "absolute",
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  activeIndicator: {
    backgroundColor: colors.white,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  price: {
    ...typography.h1,
    color: colors.accent,
    fontWeight: "700",
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  location: {
    ...typography.body,
    color: colors.textSecondary,
  },
  categoryBadge: {
    alignSelf: "flex-start",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: "600",
  },
  description: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  sellerInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  sellerName: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  sellerDetails: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  addFriendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  ownListingFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  tagIcon: {
    marginLeft: spacing.xs,
  },
  footerButton: {
    flex: 1,
  },
});
