import admin from "firebase-admin";
import dotenv from "dotenv";
import User from "./models/userModel.js";
dotenv.config();

// Prefer environment-based credentials; never require JSON from repo
function initFirebaseAdmin() {
  if (admin.apps?.length) return; // already initialized

  // Option A: Base64-encoded service account JSON (recommended for Render/Vercel)
  const saBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (saBase64) {
    const json = JSON.parse(Buffer.from(saBase64, "base64").toString("utf8"));
    admin.initializeApp({ credential: admin.credential.cert(json) });
    return;
  }

  // If env is not provided, throw a clear error to avoid insecure fallbacks
  throw new Error(
    "Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_BASE64 or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in the environment."
  );
}

initFirebaseAdmin();

// Export the auth instance for use in other parts of the application
export const auth = admin.auth();

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
          error: "User not found in database",
          code: "USER_NOT_FOUND"
        });
      }
      
      // If user was found by UID but email doesn't match, update the email
      if (user.email !== decodedToken.email) {
        console.log('📧 Updating user email from', user.email, 'to', decodedToken.email);
        user.email = decodedToken.email;
        await user.save();
      }
      
      // If this Firebase UID isn't in the user's UID array, add it
      if (!user.firebaseUids || !user.firebaseUids.includes(decodedToken.uid)) {
        console.log('🔗 Adding Firebase UID to user account');
        if (!user.firebaseUids) user.firebaseUids = [];
        user.firebaseUids.push(decodedToken.uid);
        await user.save();
      }
      
      console.log('✅ User found in database:', user.email, 'Role:', user.role, 'Verified:', user.verified);
      req.user = { 
        id: user._id,       
        uid: decodedToken.uid, // for backward compatibility
        name: decodedToken.name, 
        email: decodedToken.email, 
        role: user.role,
        verified: user.verified || false, // Include verification status
        firebaseUids: user.firebaseUids
      };
      console.log('👤 User object set:', req.user);
    } else {
      // For setup routes, just attach Firebase data
      req.user = {
        email: decodedToken.email,
        uid: decodedToken.uid,
        name: decodedToken.name,
        picture: decodedToken.picture
      };
      console.log('✅ Firebase user data attached for setup route');
    }
    
    next();
  } catch (error) {
    console.error('🚨 Token verification failed:', error.message);
    
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


