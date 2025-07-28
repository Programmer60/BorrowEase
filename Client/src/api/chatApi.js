import API from './api.js';

// Get unread count for a single loan
export const getUnreadCount = async (loanId) => {
  try {
    const response = await API.get(`/chat/unread-count/${loanId}`);
    return response.data.count;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    throw error;
  }
};

// Get unread counts for multiple loans in bulk (optimized)
export const getBulkUnreadCounts = async (loanIds) => {
  try {
    if (!loanIds || loanIds.length === 0) {
      return {};
    }

    const response = await API.post('/chat/unread-counts/bulk', {
      loanIds: loanIds
    });
    
    return response.data; // Returns object with loanId: count pairs
  } catch (error) {
    console.error('Error fetching bulk unread counts:', error);
    throw error;
  }
};

// Optimized function to load unread counts for loan arrays
export const loadChatUnreadCounts = async (loans) => {
  try {
    if (!loans || loans.length === 0) {
      return {};
    }

    // Extract loan IDs
    const loanIds = loans.map(loan => loan._id);
    
    // Use bulk API for better performance
    const unreadCounts = await getBulkUnreadCounts(loanIds);
    
    return unreadCounts;
  } catch (error) {
    console.error('Error loading chat unread counts:', error);
    return {}; // Return empty object on error
  }
};
