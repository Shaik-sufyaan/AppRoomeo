import { Notification, User, MarketplaceListing, Balance } from "@/types";

export const mockBackendDelay = (ms: number = 500) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const mockAPI = {
  async sendFriendRequest(userId: string): Promise<{ success: boolean }> {
    console.log("[Mock API] Sending friend request to user:", userId);
    await mockBackendDelay();
    return { success: true };
  },

  async acceptFriendRequest(userId: string): Promise<{ success: boolean }> {
    console.log("[Mock API] Accepting friend request from user:", userId);
    await mockBackendDelay();
    return { success: true };
  },

  async rejectFriendRequest(userId: string): Promise<{ success: boolean }> {
    console.log("[Mock API] Rejecting friend request from user:", userId);
    await mockBackendDelay();
    return { success: true };
  },

  async sendMatchRequest(userId: string): Promise<{ success: boolean; conversationId: string }> {
    console.log("[Mock API] Sending match request to user:", userId);
    await mockBackendDelay();
    return {
      success: true,
      conversationId: `conv-${Date.now()}-${userId}`,
    };
  },

  async acceptChatRequest(conversationId: string): Promise<{ success: boolean }> {
    console.log("[Mock API] Accepting chat request:", conversationId);
    await mockBackendDelay();
    return { success: true };
  },

  async rejectChatRequest(conversationId: string): Promise<{ success: boolean }> {
    console.log("[Mock API] Rejecting chat request:", conversationId);
    await mockBackendDelay();
    return { success: true };
  },

  async fetchNotifications(userId: string): Promise<Notification[]> {
    console.log("[Mock API] Fetching notifications for user:", userId);
    await mockBackendDelay();
    return [];
  },

  async markNotificationAsRead(notificationId: string): Promise<{ success: boolean }> {
    console.log("[Mock API] Marking notification as read:", notificationId);
    await mockBackendDelay();
    return { success: true };
  },

  async filterMarketplaceListings(filters: {
    minPrice?: number;
    maxPrice?: number;
    location?: string;
  }): Promise<MarketplaceListing[]> {
    console.log("[Mock API] Filtering marketplace listings:", filters);
    await mockBackendDelay();
    return [];
  },

  async markListingAsSold(listingId: string, sold: boolean): Promise<{ success: boolean }> {
    console.log("[Mock API] Marking listing as sold:", listingId, sold);
    await mockBackendDelay();
    return { success: true };
  },

  async expressInterestInListing(listingId: string): Promise<{ success: boolean }> {
    console.log("[Mock API] Expressing interest in listing:", listingId);
    await mockBackendDelay();
    return { success: true };
  },

  async calculateExpenseSummary(userId: string): Promise<{
    toReceive: number;
    youOwe: number;
  }> {
    console.log("[Mock API] Calculating expense summary for user:", userId);
    await mockBackendDelay();
    return {
      toReceive: 150,
      youOwe: 75.5,
    };
  },

  async getIndividualBalances(userId: string): Promise<Balance[]> {
    console.log("[Mock API] Fetching individual balances for user:", userId);
    await mockBackendDelay();
    return [];
  },

  async sendPaymentProof(
    expenseId: string,
    proofData: { amount: number; date: number }
  ): Promise<{ success: boolean }> {
    console.log("[Mock API] Sending payment proof for expense:", expenseId, proofData);
    await mockBackendDelay();
    return { success: true };
  },

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<{ success: boolean }> {
    console.log("[Mock API] Updating user profile:", userId, updates);
    await mockBackendDelay();
    return { success: true };
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    console.log("[Mock API] Changing password for user:", userId);
    await mockBackendDelay();
    if (currentPassword === "wrong") {
      return { success: false, error: "Current password is incorrect" };
    }
    return { success: true };
  },

  async deleteAccount(userId: string): Promise<{ success: boolean }> {
    console.log("[Mock API] Deleting account for user:", userId);
    await mockBackendDelay();
    return { success: true };
  },

  async toggleProfileVisibility(
    userId: string,
    isVisible: boolean
  ): Promise<{ success: boolean }> {
    console.log("[Mock API] Toggling profile visibility for user:", userId, isVisible);
    await mockBackendDelay();
    return { success: true };
  },
};

export default mockAPI;
