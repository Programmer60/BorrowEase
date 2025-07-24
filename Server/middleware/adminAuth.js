import { verifyToken } from "../firebase.js";

// Middleware to check if user is admin
export const requireAdmin = async (req, res, next) => {
  try {
    // First verify the token
    await verifyToken(req, res, () => {});
    
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: "Access denied. Admin privileges required." 
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: "Authentication failed" 
    });
  }
};
