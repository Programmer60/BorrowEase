import express from "express";
import User from "../models/userModel.js";
import AuditLog from "../models/auditLogModel.js";
import { verifyToken } from "../firebase.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { logAdminAction } from "../utils/auditLogger.js";


const router = express.Router();

// Test connection endpoint - no auth required
router.get("/test-connection", (req, res) => {
  console.log('🔍 Test connection endpoint hit');
  res.json({ 
    status: 'success', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// First login: save role with duplicate prevention
router.post("/setup", verifyToken, async (req, res) => {
  const { role, verified = false } = req.body; // Accept verification status from client
  const { name, email, uid } = req.user;

  try {
    // Check if this is the first user ever (make them admin)
    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    // Check if user already exists by email (primary identifier)
    let user = await User.findOne({ email });
    
    if (user) {
      console.log('🔍 User already exists with email:', email);
      
      // If user exists but doesn't have this Firebase UID, add it as an alternative login method
      if (!user.firebaseUids.includes(uid)) {
        console.log('🔗 Adding new Firebase UID to existing user');
        user.firebaseUids.push(uid);
        await user.save();
      }
      
      // Update name if it's better than what we have
      if (name && (!user.name || user.name === 'Gamer' || user.name.toLowerCase().includes('user'))) {
        console.log('📝 Updating user name from', user.name, 'to', name);
        user.name = name;
        await user.save();
      }
      
      console.log('✅ Returning existing user with updated UIDs');
      return res.json(user);
    }

    // Create new user
    console.log('👤 Creating new user for email:', email);
    
    // Use a better name fallback - if Firebase name is generic, use email prefix
    let userName = name;
    if (!name || name === 'Gamer' || name.toLowerCase().includes('user')) {
      // Extract name from email (everything before @)
      userName = email.split('@')[0];
    }
    
    // If it's the first user, make them admin regardless of requested role
    const assignedRole = isFirstUser ? "admin" : role;
    
    user = await User.create({ 
      name: userName, 
      email, 
      role: assignedRole,
      verified: verified || isFirstUser, // Admin users are automatically verified, others follow verification flow
      firebaseUids: [uid], // Store as array to support multiple login methods
      createdAt: new Date()
    });
    
    console.log('✅ Created new user:', user.email, 'with role:', assignedRole, 'verified:', user.verified);
    return res.json(user);
    
  } catch (error) {
    console.error('❌ Error in user setup:', error);
    return res.status(500).json({ error: 'Failed to setup user account' });
  }
});

// Check if email exists (for duplicate user detection)
router.get("/check-email", async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    console.log('🔍 Checking if email exists:', email);
    
    const user = await User.findOne({ email });
    
    if (user) {
      res.json({ 
        exists: true, 
        loginMethods: user.loginMethods || [],
        message: `Account found with ${user.loginMethods?.join(' and ') || 'unknown'} authentication`
      });
    } else {
      res.status(404).json({ exists: false, message: "No account found with this email" });
    }
    
  } catch (error) {
    console.error('❌ Error checking email:', error);
    res.status(500).json({ error: 'Failed to check email' });
  }
});

// Link authentication methods (for when user wants to add email login to Google account or vice versa)
router.post("/link-auth-method", verifyToken, async (req, res) => {
  try {
    const { email, uid } = req.user;
    const { method } = req.body; // 'google', 'email', or 'phone'
    
    console.log('🔗 Linking authentication method:', method, 'for user:', email);
    
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Add the Firebase UID if not already present
    if (!user.firebaseUids.includes(uid)) {
      user.firebaseUids.push(uid);
    }
    
    // Add the login method if not already present
    if (!user.loginMethods.includes(method)) {
      user.loginMethods.push(method);
    }
    
    await user.save();
    
    console.log('✅ Authentication method linked successfully');
    res.json({ 
      message: 'Authentication method linked successfully',
      user: {
        email: user.email,
        loginMethods: user.loginMethods,
        firebaseUids: user.firebaseUids.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error linking auth method:', error);
    res.status(500).json({ error: 'Failed to link authentication method' });
  }
});

// Update email verification status (Industry Standard)
router.patch("/verify", verifyToken, async (req, res) => {
  try {
    console.log('📧 Updating verification status for user:', req.user?.email);
    
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Update verification status
    user.verified = true;
    user.lastLogin = new Date();
    await user.save();
    
    console.log('✅ User verification status updated');
    res.json({ 
      message: 'Email verification confirmed',
      verified: true
    });
    
  } catch (error) {
    console.error('❌ Error updating verification status:', error);
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

// Get user statistics endpoint
router.get("/me", verifyToken, async (req, res) => {
  try {
    console.log('👤 /users/me endpoint hit');
    console.log('🔍 Looking for user with email:', req.user?.email);
    console.log('👤 Request user object:', req.user);
    
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(404).json({ error: "User not found" });
    }
    
    console.log('✅ User found:', user.email, 'Role:', user.role);
    
    // Get KYC status from KYC collection if it exists
    let kycData = null;
    let kycStatus = user.kycStatus || 'not_submitted';
    
    try {
      const KYC = await import("../models/kycModel.js").then(module => module.default);
      kycData = await KYC.findOne({ userId: user._id });
      if (kycData) {
        kycStatus = kycData.status;
        console.log('📋 KYC status found:', kycStatus);
      } else {
        console.log('📋 No KYC data found');
      }
    } catch (kycError) {
      console.log("⚠️ KYC data not available:", kycError.message);
    }
    
    const responseData = {
      _id: user._id, // Add the MongoDB _id for frontend comparison
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      profilePicture: user.profilePicture,
      kycStatus: kycStatus,
      kyc: kycData ? {
        status: kycData.status,
        submittedAt: kycData.submittedAt,
        verifiedAt: kycData.verifiedAt,
        reason: kycData.reason
      } : null
    };
    
    console.log('✅ Sending user data with _id:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('❌ Error in /users/me:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update role (and now profile picture too)
router.patch("/me", verifyToken, async (req, res) => {
  const { role, profilePicture } = req.body;
  const { email } = req.user;

  try {
    const user = await User.findOneAndUpdate(
      { email },
      { ...(role && { role }), ...(profilePicture && { profilePicture }) },
      { new: true }
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (Admin only)
router.get("/all", requireAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change user role (Admin only)
router.patch("/:id/role", requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    
    // Validate role
    if (!['borrower', 'lender', 'admin'].includes(role)) {
      return res.status(400).json({ error: "Invalid role specified" });
    }

    const oldUser = await User.findById(req.params.id);
    if (!oldUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );
    
    // Log the admin action
    await logAdminAction(req, 'ROLE_CHANGE', user, {
      oldValue: oldUser.role,
      newValue: role,
      additionalInfo: `Role changed from ${oldUser.role} to ${role}`
    });
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (Admin only)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent admin from deleting themselves
    if (req.user.id === userId) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await User.findByIdAndDelete(userId);
    
    // Log the admin action
    await logAdminAction(req, 'USER_DELETE', user, {
      additionalInfo: `Deleted user: ${user.name} (${user.email})`
    });
    
    res.json({ message: "User deleted successfully", deletedUser: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get admin stats (Admin only)
router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const borrowers = await User.countDocuments({ role: 'borrower' });
    const lenders = await User.countDocuments({ role: 'lender' });
    const admins = await User.countDocuments({ role: 'admin' });
    
    // You can add more stats here like loan stats when needed
    const stats = {
      totalUsers,
      borrowers,
      lenders,
      admins,
      // Add these when you implement loan stats
      // totalLoans: 0,
      // activeLoans: 0,
      // repaidLoans: 0
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all borrowers (for lender assessment)
router.get("/all-borrowers", verifyToken, async (req, res) => {
  try {
    console.log('🔍 Fetching all borrowers for assessment');
    console.log('👤 Request from user:', req.user?.email, 'Role:', req.user?.role);
    
    const borrowers = await User.find({ role: 'borrower' })
      .select('_id name email kycStatus createdAt')
      .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${borrowers.length} borrowers`);
    console.log('📋 Borrower details:');
    borrowers.forEach((borrower, index) => {
      console.log(`  ${index + 1}. ${borrower.name} (${borrower.email}) - ID: ${borrower._id}`);
    });
    
    console.log('📤 Sending response to frontend...');
    res.json(borrowers);
  } catch (error) {
    console.error('❌ Error fetching borrowers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get audit logs (Admin only)
router.get("/admin/audit-logs", requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, adminId } = req.query;
    
    const query = {};
    if (action) query.action = action;
    if (adminId) query.adminId = adminId;
    
    const auditLogs = await AuditLog.find(query)
      .populate('adminId', 'name email')
      .populate('targetUserId', 'name email')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    const total = await AuditLog.countDocuments(query);
    
    res.json({
      auditLogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get KYC status for a specific user (for lenders to see borrower KYC status)
router.get("/kyc-status/:userId", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Only allow lenders and admins to view KYC status of others
    const requestingUser = await User.findOne({ email: req.user.email });
    if (!requestingUser || !['lender', 'admin'].includes(requestingUser.role)) {
      return res.status(403).json({ error: "Access denied. Only lenders and admins can view KYC status." });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Get KYC status from KYC collection if it exists
    let kycStatus = user.kycStatus || 'not_submitted';
    let kycData = null;
    
    try {
      const KYC = await import("../models/kycModel.js").then(module => module.default);
      kycData = await KYC.findOne({ userId: user._id });
      if (kycData) {
        kycStatus = kycData.status;
      }
    } catch (kycError) {
      console.log("KYC data not available:", kycError.message);
    }
    
    res.json({
      userId: user._id,
      userName: user.name,
      kycStatus: kycStatus,
      kyc: kycData ? {
        status: kycData.status,
        submittedAt: kycData.submittedAt,
        verifiedAt: kycData.verifiedAt
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
