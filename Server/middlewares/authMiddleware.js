import { auth } from '../firebase.js';
import User from '../models/userModel.js';

// Simple in-memory cache for token verification
const tokenCache = new Map();
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up expired cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tokenCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      tokenCache.delete(key);
    }
  }
  for (const [key, value] of userCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      userCache.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute

// Routes that should bypass email verification requirement
const BYPASS_VERIFICATION_ROUTES = [
  '/users/setup',
  '/users/me', 
  '/users/verify',
  '/users/resend-verification',
  '/users/all-borrowers', // Lenders need this to assess borrowers
  '/ai/assess-borrower' // Assessment endpoint should also work for verified lenders
];

// Check if the current route should bypass verification
const shouldBypassVerification = (path) => {
  return BYPASS_VERIFICATION_ROUTES.some(route => path.endsWith(route));
};

// Basic token verification middleware
export const verifyToken = async (req, res, next) => {
  console.log('🔐 verifyToken middleware called for:', req.method, req.path);
  
  const authHeader = req.headers.authorization;
  console.log('🔑 Auth header present:', !!authHeader);
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log('❌ No valid auth header found');
    return res.status(401).json({ 
      error: "No token provided",
      code: "NO_TOKEN"
    });
  }

  const idToken = authHeader.split(" ")[1];
  console.log('🎫 Token extracted, length:', idToken?.length);

  try {
    console.log('🔍 Verifying Firebase token...');
    const decodedToken = await auth.verifyIdToken(idToken);
    console.log('✅ Token verified for user:', decodedToken.email);
    
    // Only check user in database for non-setup routes
    if (!req.path.endsWith('/setup')) {
      console.log('👤 Looking up user in database...');
      
      // First try to find by email (primary identifier)
      let user = await User.findOne({ email: decodedToken.email });
      
      // If not found by email, try to find by Firebase UID (backup)
      if (!user) {
        user = await User.findOne({ firebaseUids: decodedToken.uid });
      }
      
      if (!user) {
        console.log('❌ User not found in database for email:', decodedToken.email);
        return res.status(404).json({ 
          error: "User not found in database. Please complete account setup.",
          code: "USER_NOT_FOUND",
          setupRequired: true
        });
      }
      
      console.log('✅ User found in database:', user.name || user.email, 'Role:', user.role || 'borrower', 'Verified:', user.verified);
      
      // SECURITY CHECK: Enforce email verification ONLY for email/password accounts
      // OAuth providers (Google, etc.) already verify emails, so skip verification for them
      const signInProvider = decodedToken.firebase?.sign_in_provider || decodedToken.sign_in_provider;
      const isOAuthAccount = signInProvider && ['google.com', 'facebook.com', 'apple.com'].includes(signInProvider);
      const isEmailPasswordAccount = signInProvider === 'password';
      const isEmailVerified = decodedToken.email_verified;
      const isDatabaseVerified = user.verified;
      const bypassVerification = shouldBypassVerification(req.path);
      
      console.log('🔐 Auth check:', {
        signInProvider,
        isOAuthAccount,
        isEmailPasswordAccount,
        firebaseEmailVerified: isEmailVerified,
        databaseVerified: isDatabaseVerified,
        bypassVerification
      });
      
      // Only enforce verification for email/password accounts (OAuth accounts are pre-verified)
      // Skip verification check for specific routes that need to work for unverified users
      if (isEmailPasswordAccount && (!isEmailVerified || !isDatabaseVerified) && !bypassVerification) {
        console.log('❌ Email verification required for email/password account. Firebase verified:', isEmailVerified, 'Database verified:', isDatabaseVerified, 'Route:', req.path);
        return res.status(403).json({ 
          error: "Email verification required. Please verify your email to continue.",
          code: "EMAIL_VERIFICATION_REQUIRED",
          emailVerified: isEmailVerified,
          databaseVerified: isDatabaseVerified,
          verificationRequired: true
        });
      }
      
      // Add user data to request object
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        mongoId: user._id,
        name: user.name || decodedToken.name || user.email?.split('@')[0],
        displayName: user.name || decodedToken.name || user.email?.split('@')[0],
        role: user.role || 'borrower',
        verified: user.verified || false,
        photoURL: decodedToken.picture,
        emailVerified: decodedToken.email_verified,
        id: user._id, // Add id field for loan routes
        ...decodedToken
      };
      
      console.log('� User object set:', {
        id: req.user.id,
        uid: req.user.uid,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        verified: req.user.verified,
        firebaseUids: user.firebaseUids
      });
    } else {
      // For setup routes, just add basic Firebase data
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name,
        photoURL: decodedToken.picture,
        emailVerified: decodedToken.email_verified,
        ...decodedToken
      };
    }
    
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    
    // Handle different types of Firebase errors
    let errorResponse = {
      error: "Invalid token",
      code: "INVALID_TOKEN"
    };
    
    if (error.code === 'auth/id-token-expired') {
      errorResponse = {
        error: "Token expired",
        code: "TOKEN_EXPIRED",
        message: "Your session has expired. Please sign in again."
      };
    } else if (error.code === 'auth/invalid-id-token') {
      errorResponse = {
        error: "Invalid token format",
        code: "INVALID_TOKEN_FORMAT"
      };
    } else if (error.code === 'auth/argument-error') {
      errorResponse = {
        error: "Malformed token",
        code: "MALFORMED_TOKEN"
      };
    }
    
    return res.status(401).json(errorResponse);
  }
};

// Token verification middleware that allows unverified users (for verification-related routes)
export const verifyTokenAllowUnverified = async (req, res, next) => {
  console.log('🔐 verifyTokenAllowUnverified middleware called for:', req.method, req.path);
  
  const authHeader = req.headers.authorization;
  console.log('🔑 Auth header present:', !!authHeader);
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log('❌ No valid auth header found');
    return res.status(401).json({ 
      error: "No token provided",
      code: "NO_TOKEN"
    });
  }

  const idToken = authHeader.split(" ")[1];
  console.log('🎫 Token extracted, length:', idToken?.length);

  try {
    console.log('🔍 Verifying Firebase token...');
    const decodedToken = await auth.verifyIdToken(idToken);
    console.log('✅ Token verified for user:', decodedToken.email);
    
    // Only check user in database for non-setup routes
    if (!req.path.endsWith('/setup')) {
      console.log('👤 Looking up user in database...');
      
      // First try to find by email (primary identifier)
      let user = await User.findOne({ email: decodedToken.email });
      
      // If not found by email, try to find by Firebase UID (backup)
      if (!user) {
        user = await User.findOne({ firebaseUids: decodedToken.uid });
      }
      
      if (!user) {
        console.log('❌ User not found in database for email:', decodedToken.email);
        return res.status(404).json({ 
          error: "User not found in database. Please complete account setup.",
          code: "USER_NOT_FOUND",
          setupRequired: true
        });
      }
      
      console.log('✅ User found in database:', user.name || user.email, 'Role:', user.role || 'borrower', 'Verified:', user.verified);
      
      // Add user data to request object (no verification enforcement)
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        mongoId: user._id,
        name: user.name || decodedToken.name || user.email?.split('@')[0],
        displayName: user.name || decodedToken.name || user.email?.split('@')[0],
        role: user.role || 'borrower',
        verified: user.verified || false,
        photoURL: decodedToken.picture,
        emailVerified: decodedToken.email_verified,
        id: user._id, // Add id field for loan routes
        ...decodedToken
      };
      
      console.log('✅ User object set (unverified allowed):', {
        id: req.user.id,
        uid: req.user.uid,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        verified: req.user.verified,
        emailVerified: req.user.emailVerified,
        firebaseUids: user.firebaseUids
      });
    } else {
      // For setup routes, just add basic Firebase data
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name,
        photoURL: decodedToken.picture,
        emailVerified: decodedToken.email_verified,
        ...decodedToken
      };
    }
    
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    
    // Handle different types of Firebase errors
    let errorResponse = {
      error: "Invalid token",
      code: "INVALID_TOKEN"
    };
    
    if (error.code === 'auth/id-token-expired') {
      errorResponse = {
        error: "Token expired",
        code: "TOKEN_EXPIRED",
        message: "Your session has expired. Please sign in again."
      };
    } else if (error.code === 'auth/invalid-id-token') {
      errorResponse = {
        error: "Invalid token format",
        code: "INVALID_TOKEN_FORMAT"
      };
    } else if (error.code === 'auth/argument-error') {
      errorResponse = {
        error: "Malformed token",
        code: "MALFORMED_TOKEN"
      };
    }
    
    return res.status(401).json(errorResponse);
  }
};

// Admin authentication middleware
export const adminAuth = async (req, res, next) => {
  try {
    console.log('🔐 Admin auth middleware called for:', req.method, req.path);
    
    // First verify the token using the standard verifyToken middleware
    await new Promise((resolve, reject) => {
      verifyToken(req, res, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    
    // Check if user has admin role
    if (!req.user || req.user.role !== 'admin') {
      console.log('❌ Access denied. User role:', req.user?.role);
      return res.status(403).json({ 
        error: "Access denied. Admin privileges required.",
        code: "INSUFFICIENT_PRIVILEGES",
        userRole: req.user?.role || 'unknown'
      });
    }
    
    console.log('✅ Admin access granted for:', req.user.email);
    next();
  } catch (error) {
    console.error('❌ Admin authentication failed:', error.message);
    return res.status(401).json({ 
      error: "Authentication failed",
      code: "AUTH_FAILED"
    });
  }
};
