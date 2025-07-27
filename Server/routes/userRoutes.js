import express from "express";
import User from "../models/userModel.js";
import AuditLog from "../models/auditLogModel.js";
import { verifyToken } from "../firebase.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { logAdminAction } from "../utils/auditLogger.js";

const router = express.Router();

// First login: save role
router.post("/setup", verifyToken, async (req, res) => {
  const { role } = req.body;
  const { name, email } = req.user;

  // Check if this is the first user ever (make them admin)
  const userCount = await User.countDocuments();
  const isFirstUser = userCount === 0;

  let user = await User.findOne({ email });
  if (!user) {
    // If it's the first user, make them admin regardless of requested role
    const assignedRole = isFirstUser ? "admin" : role;
    user = await User.create({ name, email, role: assignedRole });
    return res.json(user);
  }

  // User exists → return their role
  return res.json(user);
});

// Get my user profile
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
    
    console.log('✅ Sending user data:', responseData);
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
