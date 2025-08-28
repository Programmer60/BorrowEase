// Advanced authentication error handler for different scenarios
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  AuthErrorCodes 
} from 'firebase/auth';
import { auth } from '../firebase';

export class AuthErrorHandler {
  // Check what sign-in methods are available for an email
  static async checkSignInMethods(email) {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      return {
        success: true,
        methods,
        hasGoogle: methods.includes('google.com'),
        hasPassword: methods.includes('password'),
        hasPhone: methods.includes('phone')
      };
    } catch (error) {
      console.error('Error checking sign-in methods:', error);
      return {
        success: false,
        error: error.message,
        methods: []
      };
    }
  }

  // Handle email/password sign-in with better error detection
  static async handleEmailSignIn(email, password) {
    try {
      // First check what sign-in methods exist for this email
      const methodsCheck = await this.checkSignInMethods(email);
      
      if (methodsCheck.success && methodsCheck.methods.length > 0) {
        // Email exists but check if password sign-in is available
        if (!methodsCheck.hasPassword && methodsCheck.hasGoogle) {
          return {
            success: false,
            error: 'ACCOUNT_EXISTS_WITH_GOOGLE',
            message: 'This email is already registered with Google. Please use "Continue with Google" to sign in.',
            suggestedMethod: 'google'
          };
        }
      }

      // Attempt email/password sign-in
      const result = await signInWithEmailAndPassword(auth, email, password);
      return {
        success: true,
        user: result.user,
        method: 'password'
      };

    } catch (error) {
      return this.handleFirebaseError(error, email);
    }
  }

  // Handle email/password sign-up with conflict detection
  static async handleEmailSignUp(email, password) {
    try {
      // Check if email already exists with other methods
      const methodsCheck = await this.checkSignInMethods(email);
      
      if (methodsCheck.success && methodsCheck.methods.length > 0) {
        if (methodsCheck.hasGoogle) {
          return {
            success: false,
            error: 'EMAIL_EXISTS_WITH_GOOGLE',
            message: 'This email is already registered with Google. Please use "Continue with Google" to sign in, or use a different email.',
            suggestedMethod: 'google'
          };
        }
        
        if (methodsCheck.hasPassword) {
          return {
            success: false,
            error: 'EMAIL_ALREADY_EXISTS',
            message: 'An account with this email already exists. Please sign in instead.',
            suggestedMethod: 'signin'
          };
        }
      }

      // Attempt to create account
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return {
        success: true,
        user: result.user,
        method: 'password',
        isNewUser: true
      };

    } catch (error) {
      return this.handleFirebaseError(error, email);
    }
  }

  // Centralized Firebase error handling
  static handleFirebaseError(error, email = null) {
    console.error('Firebase Auth Error:', error);

    const errorMappings = {
      [AuthErrorCodes.INVALID_EMAIL]: {
        message: 'Please enter a valid email address.',
        type: 'validation'
      },
      [AuthErrorCodes.USER_DELETED]: {
        message: 'No account found with this email address.',
        type: 'not_found'
      },
      [AuthErrorCodes.INVALID_PASSWORD]: {
        message: 'Incorrect password. Please try again.',
        type: 'auth_failed'
      },
      [AuthErrorCodes.EMAIL_EXISTS]: {
        message: 'An account with this email already exists. Please sign in instead.',
        type: 'exists',
        suggestedMethod: 'signin'
      },
      [AuthErrorCodes.WEAK_PASSWORD]: {
        message: 'Password should be at least 6 characters long.',
        type: 'validation'
      },
      [AuthErrorCodes.TOO_MANY_REQUESTS]: {
        message: 'Too many failed attempts. Please try again later.',
        type: 'rate_limit'
      },
      [AuthErrorCodes.NETWORK_REQUEST_FAILED]: {
        message: 'Network error. Please check your connection and try again.',
        type: 'network'
      },
      'auth/invalid-credential': {
        message: 'Invalid email or password. Please check your credentials.',
        type: 'auth_failed'
      },
      'auth/user-not-found': {
        message: 'No account found with this email address.',
        type: 'not_found'
      },
      'auth/wrong-password': {
        message: 'Incorrect password. Please try again.',
        type: 'auth_failed'
      },
      'auth/account-exists-with-different-credential': {
        message: 'An account already exists with this email using a different sign-in method.',
        type: 'method_conflict',
        suggestedMethod: 'google'
      }
    };

    const errorInfo = errorMappings[error.code] || {
      message: error.message || 'An unexpected error occurred.',
      type: 'unknown'
    };

    return {
      success: false,
      error: error.code,
      message: errorInfo.message,
      type: errorInfo.type,
      suggestedMethod: errorInfo.suggestedMethod,
      originalError: error
    };
  }

  // Get user-friendly suggestions based on error type
  static getSuggestions(errorResult) {
    const suggestions = {
      'ACCOUNT_EXISTS_WITH_GOOGLE': [
        {
          action: 'google_signin',
          text: 'Sign in with Google',
          primary: true
        },
        {
          action: 'different_email',
          text: 'Use a different email',
          primary: false
        }
      ],
      'EMAIL_EXISTS_WITH_GOOGLE': [
        {
          action: 'google_signin',
          text: 'Sign in with Google',
          primary: true
        },
        {
          action: 'different_email',
          text: 'Use a different email for sign up',
          primary: false
        }
      ],
      'EMAIL_ALREADY_EXISTS': [
        {
          action: 'signin',
          text: 'Sign in instead',
          primary: true
        },
        {
          action: 'forgot_password',
          text: 'Forgot password?',
          primary: false
        }
      ],
      'auth_failed': [
        {
          action: 'retry',
          text: 'Try again',
          primary: true
        },
        {
          action: 'forgot_password',
          text: 'Forgot password?',
          primary: false
        }
      ],
      'not_found': [
        {
          action: 'signup',
          text: 'Create an account',
          primary: true
        },
        {
          action: 'different_email',
          text: 'Try a different email',
          primary: false
        }
      ]
    };

    return suggestions[errorResult.error] || suggestions[errorResult.type] || [];
  }
}

export default AuthErrorHandler;
