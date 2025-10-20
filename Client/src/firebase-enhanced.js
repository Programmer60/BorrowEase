// Enhanced Firebase configuration with industrial-level implementation
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  getIdToken
} from "firebase/auth";

// Firebase configuration from Vite env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure Google Auth Provider with proper scopes
const provider = new GoogleAuthProvider();
provider.addScope('email');
provider.addScope('profile');
provider.setCustomParameters({
  prompt: 'select_account'
});

// Set persistence to local storage
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to set persistence:', error);
});

// Token management utilities
class TokenManager {
  static async getValidToken() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    try {
      // Force refresh if token is close to expiry
      const token = await getIdToken(currentUser, true);
      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  static async refreshTokenIfNeeded() {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    try {
      // Get fresh token
      const token = await getIdToken(currentUser, true);
      
      // Update API headers
      if (window.API && window.API.defaults) {
        window.API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }
      
      // Store in localStorage
      sessionStorage.setItem('token', token);
      
      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  static setupTokenRefreshInterval() {
    // Refresh token every 50 minutes (Firebase tokens expire after 1 hour)
    return setInterval(async () => {
      try {
        await TokenManager.refreshTokenIfNeeded();
        console.log('🔄 Token refreshed automatically');
      } catch (error) {
        console.error('🚨 Automatic token refresh failed:', error);
      }
    }, 50 * 60 * 1000); // 50 minutes
  }
}

// Enhanced auth state management
class AuthStateManager {
  static callbacks = new Set();

  static subscribe(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  static notify(user) {
    this.callbacks.forEach(callback => {
      try {
        callback(user);
      } catch (error) {
        console.error('Auth state callback error:', error);
      }
    });
  }

  static initialize() {
    return onAuthStateChanged(auth, async (user) => {
      console.log('🔄 Auth state changed:', user ? user.email : 'No user');
      
      if (user) {
        try {
          // Get fresh token when user signs in
          const token = await getIdToken(user, true);
          sessionStorage.setItem('token', token);
          
          // Update API headers if available
          if (window.API && window.API.defaults) {
            window.API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Failed to get token on auth state change:', error);
        }
      } else {
        // Clear token when user signs out
        sessionStorage.removeItem('token');
        if (window.API && window.API.defaults) {
          delete window.API.defaults.headers.common["Authorization"];
        }
      }

      this.notify(user);
    });
  }
}

// Enhanced error handling
export const AuthError = {
  INVALID_EMAIL: 'auth/invalid-email',
  USER_NOT_FOUND: 'auth/user-not-found',
  WRONG_PASSWORD: 'auth/wrong-password',
  EMAIL_ALREADY_IN_USE: 'auth/email-already-in-use',
  WEAK_PASSWORD: 'auth/weak-password',
  TOO_MANY_REQUESTS: 'auth/too-many-requests',
  POPUP_CLOSED: 'auth/popup-closed-by-user',
  POPUP_BLOCKED: 'auth/popup-blocked',
  ACCOUNT_EXISTS_DIFFERENT_CREDENTIAL: 'auth/account-exists-with-different-credential',
  INVALID_CREDENTIAL: 'auth/invalid-credential',
  OPERATION_NOT_ALLOWED: 'auth/operation-not-allowed',
  NETWORK_REQUEST_FAILED: 'auth/network-request-failed'
};

export const getErrorMessage = (error) => {
  const errorMessages = {
    [AuthError.INVALID_EMAIL]: 'Please enter a valid email address.',
    [AuthError.USER_NOT_FOUND]: 'No account found with this email address.',
    [AuthError.WRONG_PASSWORD]: 'Incorrect password. Please try again.',
    [AuthError.EMAIL_ALREADY_IN_USE]: 'This email is already registered. Try signing in instead.',
    [AuthError.WEAK_PASSWORD]: 'Password should be at least 6 characters long.',
    [AuthError.TOO_MANY_REQUESTS]: 'Too many failed attempts. Please try again later.',
    [AuthError.POPUP_CLOSED]: 'Sign-in was cancelled.',
    [AuthError.POPUP_BLOCKED]: 'Popup was blocked. Please allow popups and try again.',
    [AuthError.ACCOUNT_EXISTS_DIFFERENT_CREDENTIAL]: 'An account already exists with this email using a different sign-in method.',
    [AuthError.INVALID_CREDENTIAL]: 'Invalid credentials. Please check your email and password.',
    [AuthError.OPERATION_NOT_ALLOWED]: 'This sign-in method is not enabled. Please contact support.',
    [AuthError.NETWORK_REQUEST_FAILED]: 'Network error. Please check your connection and try again.'
  };
  
  return errorMessages[error.code] || error.message || 'An unexpected error occurred.';
};

// Initialize auth state management
let authStateUnsubscribe = null;
let tokenRefreshInterval = null;

export const initializeAuth = () => {
  // Initialize auth state listener
  authStateUnsubscribe = AuthStateManager.initialize();
  
  // Setup automatic token refresh
  tokenRefreshInterval = TokenManager.setupTokenRefreshInterval();
  
  console.log('🔐 Firebase Auth initialized with token management');
};

export const cleanupAuth = () => {
  if (authStateUnsubscribe) {
    authStateUnsubscribe();
  }
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
  }
};

// Export everything needed
export { 
  auth, 
  provider, 
  signInWithPopup, 
  signOut, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  TokenManager,
  AuthStateManager
};
