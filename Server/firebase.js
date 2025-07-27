import admin from "firebase-admin";
import dotenv from "dotenv";
import { createRequire } from "module";
import User from "./models/userModel.js";
dotenv.config();

const require = createRequire(import.meta.url);
const serviceAccount = require("./serviceAccountKey.json");

// ✅ Remove ".default"
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Export the auth instance for use in other parts of the application
export const auth = admin.auth();

export const verifyToken = async (req, res, next) => {
  console.log('🔐 verifyToken middleware called for:', req.method, req.path);
  
  const authHeader = req.headers.authorization;
  console.log('🔑 Auth header present:', !!authHeader);
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log('❌ No valid auth header found');
    return res.status(401).json({ error: "No token provided" });
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
      const user = await User.findOne({ email: decodedToken.email });
      
      if (!user) {
        console.log('❌ User not found in database for email:', decodedToken.email);
        return res.status(404).json({ error: "User not found" });
      }
      
      console.log('✅ User found in database:', user.email, 'Role:', user.role);
      req.user = { 
        id: user._id,       
        name: decodedToken.name, 
        email: decodedToken.email, 
        role: user.role 
      };
      console.log('👤 User object set:', req.user);
    } else {
      // For /setup route, just pass the decoded token info
      console.log('⚙️ Setup route - using token data only');
      req.user = { name: decodedToken.name, email: decodedToken.email };
    }
    
    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error);
    console.error("❌ Error type:", error.constructor.name);
    console.error("❌ Error message:", error.message);
    res.status(401).json({ error: "Invalid token" });
  }
};
