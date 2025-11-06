import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { X, UserCheck, UserX, Inbox } from 'lucide-react-native';
import colors from '@/constants/colors';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import Button from '@/components/Button';
import Avatar from '@/components/Avatar';
import {
  getPendingExpenseFriendRequests,
  acceptExpenseFriendRequest,
  rejectExpenseFriendRequest,
  ExpenseFriendRequestWithUser,
} from '@/lib/api/expenseFriends';

interface ExpenseFriendRequestsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ExpenseFriendRequestsModal({
  visible,
  onClose,
  onSuccess,
}: ExpenseFriendRequestsModalProps) {
  const [requests, setRequests] = useState<ExpenseFriendRequestWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      loadRequests();
    }
  }, [visible]);

  const loadRequests = async () => {
    setIsLoading(true);
    const result = await getPendingExpenseFriendRequests();
    if (result.success && result.data) {
      setRequests(result.data);
    }
    setIsLoading(false);
  };

  const handleAccept = async (requestId: string) => {
    setProcessingIds(prev => new Set(prev).add(requestId));

    const result = await acceptExpenseFriendRequest(requestId);

    if (result.success) {
      // Remove from list
      setRequests(prev => prev.filter(req => req.id !== requestId));
      onSuccess();
    } else {
      alert(result.error || 'Failed to accept friend request');
    }

    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(requestId);
      return next;
    });
  };

  const handleReject = async (requestId: string) => {
    setProcessingIds(prev => new Set(prev).add(requestId));

    const result = await rejectExpenseFriendRequest(requestId);

    if (result.success) {
      // Remove from list
      setRequests(prev => prev.filter(req => req.id !== requestId));
      onSuccess();
    } else {
      alert(result.error || 'Failed to reject friend request');
    }

    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(requestId);
      return next;
    });
  };

  const handleClose = () => {
    setRequests([]);
    onClose();
  };

  const renderRequestItem = ({ item }: { item: ExpenseFriendRequestWithUser }) => {
    const { id, sender, message, created_at } = item;
    const isProcessing = processingIds.has(id);

    // Format created_at to relative time
    const getRelativeTime = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    };

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <Avatar uri={sender.photos?.[0]} size="medium" />
          <View style={styles.requestInfo}>
            <Text style={styles.senderName}>{sender.name}</Text>
            <Text style={styles.senderAge}>{sender.age} years old</Text>
            <Text style={styles.requestTime}>{getRelativeTime(created_at)}</Text>
          </View>
        </View>

        {message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        )}

        <View style={styles.actionButtons}>
          <Button
            title="Reject"
            onPress={() => handleReject(id)}
            variant="outline"
            size="small"
            disabled={isProcessing}
            testID={`reject-request-${id}`}
            style={styles.rejectButton}
          />
          <Button
            title="Accept"
            onPress={() => handleAccept(id)}
            variant="primary"
            size="small"
            disabled={isProcessing}
            testID={`accept-request-${id}`}
            style={styles.acceptButton}
          />
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyStateText}>Loading requests...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Inbox size={64} color={colors.gray} />
        <Text style={styles.emptyStateTitle}>No Pending Requests</Text>
        <Text style={styles.emptyStateText}>
          You don't have any friend requests at the moment.
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
              <Text style={styles.modalTitle}>Friend Requests</Text>
              {requests.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{requests.length}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={handleClose} testID="close-requests-modal">
              <X size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.infoText}>
              Accept or reject friend requests from users who want to split expenses with you.
            </Text>

            {requests.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                data={requests}
                keyExtractor={(item) => item.id}
                renderItem={renderRequestItem}
                style={styles.requestsList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.requestsListContent}
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
    backgroundColor: colors.error,
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
  requestsList: {
    maxHeight: 500,
  },
  requestsListContent: {
    gap: spacing.md,
  },
  requestCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.md,
  },
  requestHeader: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  requestInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  senderName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  senderAge: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  requestTime: {
    ...typography.caption,
    color: colors.gray,
  },
  messageContainer: {
    backgroundColor: colors.card,
    padding: spacing.sm,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  messageText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  rejectButton: {
    flex: 1,
  },
  acceptButton: {
    flex: 1,
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
