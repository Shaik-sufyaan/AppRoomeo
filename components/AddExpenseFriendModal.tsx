import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { X, UserPlus, Check, Clock } from 'lucide-react-native';
import colors from '@/constants/colors';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import Button from '@/components/Button';
import Avatar from '@/components/Avatar';
import {
  searchUsersForExpenseFriends,
  sendExpenseFriendRequest,
  SearchUserResult,
} from '@/lib/api/expenseFriends';

interface AddExpenseFriendModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddExpenseFriendModal({
  visible,
  onClose,
  onSuccess,
}: AddExpenseFriendModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const result = await searchUsersForExpenseFriends(searchQuery);
      if (result.success && result.data) {
        setSearchResults(result.data);
      }
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, visible]);

  const handleSendRequest = async (userId: string) => {
    const result = await sendExpenseFriendRequest(userId);

    if (result.success) {
      // Update the search results to reflect the sent request
      setSearchResults(prev =>
        prev.map(user =>
          user.user_id === userId
            ? { ...user, has_pending_request: true }
            : user
        )
      );
      onSuccess();
    } else {
      alert(result.error || 'Failed to send friend request');
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  const renderUserItem = ({ item }: { item: SearchUserResult }) => {
    const { user_id, user_name, user_photos, user_age, is_friend, has_pending_request } = item;

    return (
      <View style={styles.userRow}>
        <Avatar uri={user_photos?.[0]} size="medium" />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user_name}</Text>
          <Text style={styles.userAge}>{user_age} years old</Text>
        </View>

        {is_friend ? (
          <View style={styles.friendBadge}>
            <Check size={16} color={colors.success} />
            <Text style={styles.friendText}>Friends</Text>
          </View>
        ) : has_pending_request ? (
          <View style={styles.pendingBadge}>
            <Clock size={16} color={colors.textSecondary} />
            <Text style={styles.pendingText}>Pending</Text>
          </View>
        ) : (
          <Button
            title="Add"
            onPress={() => handleSendRequest(user_id)}
            variant="primary"
            size="small"
            testID={`add-friend-${user_id}`}
          />
        )}
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
            <Text style={styles.modalTitle}>Add Expense Friend</Text>
            <TouchableOpacity onPress={handleClose} testID="close-add-friend-modal">
              <X size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.infoText}>
              Add friends to split expenses together. These are separate from your roommate matches.
            </Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Search by name..."
              placeholderTextColor={colors.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              testID="search-friends-input"
            />

            {isSearching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : searchQuery.length < 2 ? (
              <View style={styles.emptyState}>
                <UserPlus size={48} color={colors.gray} />
                <Text style={styles.emptyStateText}>
                  Start typing to search for users
                </Text>
              </View>
            ) : searchResults.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No users found</Text>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.user_id}
                renderItem={renderUserItem}
                style={styles.resultsList}
                showsVerticalScrollIndicator={false}
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
  modalTitle: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '600',
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
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.card,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  resultsList: {
    maxHeight: 400,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  userName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  userAge: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: '#e6f7f1',
    borderRadius: 12,
  },
  friendText: {
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
});
