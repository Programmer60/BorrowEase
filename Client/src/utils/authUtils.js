// Notification utility for user feedback
export const showNotification = (message, type = 'info', duration = 5000) => {
  // Create a custom event for notifications
  const event = new CustomEvent('showNotification', {
    detail: { message, type, duration }
  });
  window.dispatchEvent(event);
};

// Account linking helper
export const linkAuthMethods = async (method, API) => {
  try {
    const response = await API.post('/users/link-auth-method', { method });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error linking authentication methods:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to link authentication methods' 
    };
  }
};

// Check for existing user by email
export const checkExistingUser = async (email, API) => {
  try {
    const response = await API.get(`/users/check-email?email=${email}`);
    return { exists: true, user: response.data };
  } catch (error) {
    if (error.response?.status === 404) {
      return { exists: false };
    }
    throw error;
  }
};

// Format auth error messages
export const formatAuthError = (error) => {
  const errorMessages = {
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
    'auth/weak-password': 'Password should be at least 6 characters long.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/popup-blocked': 'Popup was blocked. Please allow popups and try again.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
  };
  
  return errorMessages[error.code] || error.message || 'An unexpected error occurred.';
};
