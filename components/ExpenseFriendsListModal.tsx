import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { X, UserMinus, Users, Search } from 'lucide-react-native';
import colors from '@/constants/colors';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import Button from '@/components/Button';
import Avatar from '@/components/Avatar';
import {
  getExpenseFriends,
  removeExpenseFriend,
  ExpenseFriend,
} from '@/lib/api/expenseFriends';

interface ExpenseFriendsListModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ExpenseFriendsListModal({
  visible,
  onClose,
  onSuccess,
}: ExpenseFriendsListModalProps) {
  const [friends, setFriends] = useState<ExpenseFriend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<ExpenseFriend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      loadFriends();
    } else {
      setSearchQuery('');
    }
  }, [visible]);

  useEffect(() => {
    // Filter friends based on search query
    if (searchQuery.trim() === '') {
      setFilteredFriends(friends);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredFriends(
        friends.filter(friend =>
          friend.friend_name.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, friends]);

  const loadFriends = async () => {
    setIsLoading(true);
    const result = await getExpenseFriends();
    if (result.success && result.data) {
      setFriends(result.data);
      setFilteredFriends(result.data);
    }
    setIsLoading(false);
  };

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendName} from your expense friends? You can add them back later.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingIds(prev => new Set(prev).add(friendId));

            const result = await removeExpenseFriend(friendId);

            if (result.success) {
              // Remove from list
              setFriends(prev => prev.filter(f => f.friend_id !== friendId));
              onSuccess();
            } else {
              alert(result.error || 'Failed to remove friend');
            }

            setRemovingIds(prev => {
              const next = new Set(prev);
              next.delete(friendId);
              return next;
            });
          },
        },
      ]
    );
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  const renderFriendItem = ({ item }: { item: ExpenseFriend }) => {
    const { friend_id, friend_name, friend_photos, friend_age, friendship_created_at } = item;
    const isRemoving = removingIds.has(friend_id);

    // Format friendship date
    const getFriendshipDuration = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      const diffWeeks = Math.floor(diffDays / 7);
      const diffMonths = Math.floor(diffDays / 30);
      const diffYears = Math.floor(diffDays / 365);

      if (diffDays < 1) return 'Friends since today';
      if (diffDays === 1) return 'Friends since yesterday';
      if (diffDays < 7) return `Friends for ${diffDays} days`;
      if (diffWeeks < 4) return `Friends for ${diffWeeks} weeks`;
      if (diffMonths < 12) return `Friends for ${diffMonths} months`;
      return `Friends for ${diffYears} years`;
    };

    return (
      <View style={styles.friendCard}>
        <Avatar uri={friend_photos?.[0]} size="medium" />
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{friend_name}</Text>
          <Text style={styles.friendAge}>{friend_age} years old</Text>
          <Text style={styles.friendshipDuration}>
            {getFriendshipDuration(friendship_created_at)}
          </Text>
        </View>

        <Button
          title="Remove"
          onPress={() => handleRemoveFriend(friend_id, friend_name)}
          variant="outline"
          size="small"
          disabled={isRemoving}
          testID={`remove-friend-${friend_id}`}
          style={styles.removeButton}
        />
      </View>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyStateText}>Loading friends...</Text>
        </View>
      );
    }

    if (searchQuery.trim() !== '' && filteredFriends.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Search size={64} color={colors.gray} />
          <Text style={styles.emptyStateTitle}>No Results</Text>
          <Text style={styles.emptyStateText}>
            No friends found matching "{searchQuery}"
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Users size={64} color={colors.gray} />
        <Text style={styles.emptyStateTitle}>No Expense Friends</Text>
        <Text style={styles.emptyStateText}>
          Add friends to easily split expenses together. Tap the "Add Friend" button to get started.
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.modalTitle}>Expense Friends</Text>
              {friends.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{friends.length}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={handleClose} testID="close-friends-modal">
              <X size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.infoText}>
              These friends are specifically for splitting expenses. They are separate from your roommate matches.
            </Text>

            {friends.length > 0 && (
              <View style={styles.searchContainer}>
                <Search size={20} color={colors.gray} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search friends..."
                  placeholderTextColor={colors.gray}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  testID="search-friends-input"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.clearButton}
                  >
                    <X size={20} color={colors.gray} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {filteredFriends.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                data={filteredFriends}
                keyExtractor={(item) => item.friend_id}
                renderItem={renderFriendItem}
                style={styles.friendsList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.friendsListContent}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  modalBody: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  clearButton: {
    padding: spacing.xs,
  },
  friendsList: {
    maxHeight: 500,
  },
  friendsListContent: {
    gap: spacing.md,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  friendInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  friendName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  friendAge: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  friendshipDuration: {
    ...typography.caption,
    color: colors.gray,
  },
  removeButton: {
    paddingHorizontal: spacing.md,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 300,
    justifyContent: 'center',
  },
  emptyStateTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
