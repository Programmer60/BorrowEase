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

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const idToken = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Only check user in database for non-setup routes
    if (!req.path.endsWith('/setup')) {
      const user = await User.findOne({ email: decodedToken.email });
      if (!user) return res.status(404).json({ error: "User not found" });
      req.user = { name: decodedToken.name, email: decodedToken.email, role: user.role };
    } else {
      // For /setup route, just pass the decoded token info
      req.user = { name: decodedToken.name, email: decodedToken.email };
    }
    
    next();
  } catch (error) {
    console.error("Token verification failed", error);
    res.status(401).json({ error: "Invalid token" });
  }
};
