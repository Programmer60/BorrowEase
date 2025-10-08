import { 
  auth, 
  provider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} from '../firebase';
import API from '../api/api';

// Error handling utility
const getErrorMessage = (error) => {
  const errorMessages = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
    'auth/weak-password': 'Password should be at least 6 characters long.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/popup-blocked': 'Popup was blocked. Please allow popups and try again.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
    'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',
    'EMAIL_NOT_VERIFIED': 'Please verify your email address before signing in. Check your inbox for the verification link.'
  };
  
  return errorMessages[error.code] || errorMessages[error.message] || error.message || 'An unexpected error occurred.';
};

// Token management
const TokenManager = {
  async getValidToken() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    try {
      const token = await currentUser.getIdToken(true); // Force refresh
      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  },

  async refreshTokenIfNeeded() {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    try {
      const token = await currentUser.getIdToken(true);
      
      // Update API headers
      if (window.API && window.API.defaults) {
        window.API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }
      
      localStorage.setItem('token', token);
      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }
};

class AuthenticationService {
  constructor() {
    this.currentUser = null;
    this.isInitialized = false;
    this.authStateCallbacks = new Set();
  }

  // Initialize the service
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Wait for Firebase auth to initialize
      await this.waitForAuthInit();
      this.isInitialized = true;
      console.log('🔐 AuthenticationService initialized');
    } catch (error) {
      console.error('Failed to initialize AuthenticationService:', error);
      throw error;
    }
  }

  // Wait for Firebase auth to be ready
  waitForAuthInit() {
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        this.currentUser = user;
        resolve(user);
      });
    });
  }

  // Subscribe to auth state changes
  onAuthStateChanged(callback) {
    this.authStateCallbacks.add(callback);
    return () => this.authStateCallbacks.delete(callback);
  }

  // Notify all subscribers of auth state changes
  notifyAuthStateChange(user) {
    this.currentUser = user;
    this.authStateCallbacks.forEach(callback => {
      try {
        callback(user);
      } catch (error) {
        console.error('Auth state callback error:', error);
      }
    });
  }

  // Enhanced Google Sign-In
  async signInWithGoogle(role = 'borrower') {
    try {
      console.log('🔄 Starting Google sign-in...');
      
      // Configure Google provider for better UX
      provider.setCustomParameters({
        prompt: 'select_account',
        hd: null // Allow any domain
      });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      console.log('✅ Google sign-in successful:', user.email);

      // Get fresh token
      const token = await TokenManager.getValidToken();
      
      // Set up API headers
      API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      localStorage.setItem('token', token);

      // Check if user exists or create new user
      const userData = await this.setupUserAccount(role);
      
      this.notifyAuthStateChange(user);
      
      return {
        success: true,
        user: userData,
        token,
        isNewUser: !userData.existingUser
      };

    } catch (error) {
      console.error('Google sign-in failed:', error);
      
      // Handle specific Google sign-in errors
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in was cancelled');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked. Please allow popups and try again');
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        throw new Error('An account already exists with this email using a different sign-in method');
      }
      
      throw new Error(getErrorMessage(error));
    }
  }

  // Enhanced Email Sign-Up
  async signUpWithEmail(email, password, role = 'borrower') {
    try {
      console.log('🔄 Starting email sign-up for:', email);

      // Validate inputs
      this.validateEmailSignUp(email, password);

      // Create Firebase user
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      console.log('✅ Email sign-up successful:', user.email);

      // Get fresh token
      const token = await TokenManager.getValidToken();
      
      // Set up API headers
      API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      localStorage.setItem('token', token);

      // Create user account in database
      const userData = await this.setupUserAccount(role, 'email');
      
      this.notifyAuthStateChange(user);

      return {
        success: true,
        user: userData,
        token,
        isNewUser: true
      };

    } catch (error) {
      console.error('Email sign-up failed:', error);
      throw new Error(getErrorMessage(error));
    }
  }

  // Enhanced Email Sign-In
  async signInWithEmail(email, password) {
    try {
      console.log('🔄 Starting email sign-in for:', email);

      // Validate inputs
      this.validateEmailSignIn(email, password);

      // Sign in with Firebase
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;

      console.log('✅ Email sign-in successful:', user.email);

      // Check if email is verified
      if (!user.emailVerified) {
        console.log('❌ Email not verified for:', user.email);
        await auth.signOut(); // Sign out immediately
        throw new Error('EMAIL_NOT_VERIFIED');
      }

      // Get fresh token
      const token = await TokenManager.getValidToken();
      
      // Set up API headers
      API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      localStorage.setItem('token', token);

      // Get user data from database
      const userData = await this.getUserData();
      
      this.notifyAuthStateChange(user);

      return {
        success: true,
        user: userData,
        token,
        isNewUser: false
      };

    } catch (error) {
      console.error('Email sign-in failed:', error);
      throw new Error(getErrorMessage(error));
    }
  }

  // Setup user account in database
  async setupUserAccount(role, loginMethod = 'google') {
    try {
      console.log('🔄 Setting up user account with role:', role);

      // First try to get existing user
      let existingUser = true;
      let userData;

      try {
        const response = await API.get("/users/me");
        userData = response.data;
        console.log('✅ Existing user found:', userData.email);
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('🆕 Creating new user account...');
          const setupResponse = await API.post("/users/setup", { 
            role,
            loginMethod 
          });
          userData = setupResponse.data;
          existingUser = false;
          console.log('✅ New user created:', userData.email);
        } else {
          throw error;
        }
      }

      return {
        ...userData,
        existingUser
      };

    } catch (error) {
      console.error('User setup failed:', error);
      throw new Error('Failed to setup user account. Please try again.');
    }
  }

  // Get current user data
  async getUserData() {
    try {
      const response = await API.get("/users/me");
      return response.data;
    } catch (error) {
      console.error('Failed to get user data:', error);
      throw new Error('Failed to load user data');
    }
  }

  // Enhanced sign out
  async signOut() {
    try {
      console.log('🔄 Signing out...');
      
      await signOut(auth);
      
      // Clear local storage
      localStorage.removeItem('token');
      
      // Clear API headers
      delete API.defaults.headers.common["Authorization"];
      
      this.notifyAuthStateChange(null);
      
      console.log('✅ Sign out successful');
      
      return { success: true };

    } catch (error) {
      console.error('Sign out failed:', error);
      throw new Error('Failed to sign out. Please try again.');
    }
  }

  // Input validation
  validateEmailSignUp(email, password) {
    if (!email || !password) {
      throw new Error('Please fill in all fields');
    }

    if (!this.isValidEmail(email)) {
      throw new Error('Please enter a valid email address');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
  }

  validateEmailSignIn(email, password) {
    if (!email || !password) {
      throw new Error('Please fill in all fields');
    }

    if (!this.isValidEmail(email)) {
      throw new Error('Please enter a valid email address');
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Get current authentication status
  isAuthenticated() {
    return !!this.currentUser && !!localStorage.getItem('token');
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if current user's email is verified
  isEmailVerified() {
    return this.currentUser?.emailVerified ?? false;
  }

  // Refresh authentication token
  async refreshToken() {
    try {
      const token = await TokenManager.refreshTokenIfNeeded();
      if (token) {
        localStorage.setItem('token', token);
        return token;
      }
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Failed to refresh authentication token');
    }
  }

  // Link authentication methods
  async linkAuthMethods(method) {
    try {
      const response = await API.post('/users/link-auth-method', { method });
      return response.data;
    } catch (error) {
      console.error('Failed to link auth methods:', error);
      throw new Error('Failed to link authentication methods');
    }
  }

  // Check if email exists
  async checkEmailExists(email) {
    try {
      const response = await API.get(`/users/check-email?email=${encodeURIComponent(email)}`);
      return { exists: true, user: response.data };
    } catch (error) {
      if (error.response?.status === 404) {
        return { exists: false };
      }
      throw error;
    }
  }
}

// Create singleton instance
const authService = new AuthenticationService();

export default authService;
