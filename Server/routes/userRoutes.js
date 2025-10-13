import express from "express";
import User from "../models/userModel.js";
import Loan from "../models/loanModel.js"; // Added for account summary stats
import AuditLog from "../models/auditLogModel.js";
import { verifyToken as verifyTokenFirebase } from "../firebase.js";
import { verifyToken, verifyTokenAllowUnverified } from "../middlewares/authMiddleware.js";
import { calculateCreditScore as computeCreditScore } from "../services/creditScore.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { logAdminAction } from "../utils/auditLogger.js";
import { sendEmailVerification } from "firebase/auth";


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
router.patch("/verify", verifyTokenAllowUnverified, async (req, res) => {
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

// Add resend verification email endpoint
router.post("/resend-verification", verifyTokenAllowUnverified, async (req, res) => {
  try {
    console.log('📧 Resending verification email for user:', req.user?.email);
    
    // Check if user is already verified
    const user = await User.findOne({ email: req.user.email });
    if (user?.verified && req.user.emailVerified) {
      return res.status(400).json({ 
        error: "User is already verified",
        code: "ALREADY_VERIFIED"
      });
    }
    
    // Use Firebase to send verification email
    const { auth } = await import('../firebase.js');
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return res.status(400).json({ 
        error: "Firebase user not found",
        code: "FIREBASE_USER_NOT_FOUND"
      });
    }
    
    // This would need to be implemented on the frontend
    // For now, just acknowledge the request
    console.log('✅ Verification email resend requested');
    res.json({ 
      message: 'Verification email will be resent. Please check your email.',
      email: req.user.email
    });
    
  } catch (error) {
    console.error('❌ Error resending verification email:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Get user statistics endpoint  
router.get("/me", verifyTokenAllowUnverified, async (req, res) => {
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
    console.log('📊 User profile fields from DB:', {
      phone: user.phone,
      location: user.location,
      bio: user.bio,
      university: user.university,
      graduationYear: user.graduationYear
    });
    
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
      // Expose profile fields so ProfilePage can render saved data
      phone: user.phone || '',
      phoneVerified: user.phoneVerified || false,
      city: user.city || '',
      occupation: user.occupation || '',
      location: user.location || '',
      bio: user.bio || '',
      university: user.university || '',
      graduationYear: user.graduationYear || '',
      kycStatus: kycStatus,
      kyc: kycData ? {
        status: kycData.status,
        submittedAt: kycData.submittedAt,
        verifiedAt: kycData.verifiedAt,
        reason: kycData.reason
      } : null
    };
    
    console.log('✅ Sending GET /users/me response:', JSON.stringify({
      phone: responseData.phone,
      location: responseData.location,
      bio: responseData.bio,
      university: responseData.university,
      graduationYear: responseData.graduationYear
    }));
    res.json(responseData);
  } catch (error) {
    console.error('❌ Error in /users/me:', error);
    res.status(500).json({ error: error.message });
  }
});

// Real-time account summary stats for borrower or lender
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = Date.now();
    // Always compute borrower perspective (even if primary role is lender)
    const borrowerLoans = await Loan.find({ borrowerId: user._id });
    const borrowerFunded = borrowerLoans.filter(l => l.funded);
    const borrowerActive = borrowerFunded.filter(l => !l.repaid);
    const borrowerRepaid = borrowerFunded.filter(l => l.repaid);
    const borrowerOverdue = borrowerActive.filter(l => l.repaymentDate && new Date(l.repaymentDate).getTime() < now);

    // Always compute lender perspective (in case user also lends)
    const lenderLoans = await Loan.find({ lenderId: user._id, funded: true });
    const lenderActive = lenderLoans.filter(l => !l.repaid);
    const lenderRepaid = lenderLoans.filter(l => l.repaid);
    const lenderOverdue = lenderActive.filter(l => l.repaymentDate && new Date(l.repaymentDate).getTime() < now);

    const successRate = lenderLoans.length ? Math.round((lenderRepaid.length / lenderLoans.length) * 100) : 0;

    // Compute true credit score using the same algorithm as /credit/score
    let computedScore = 0;
    try {
      const calc = await computeCreditScore(user._id);
      computedScore = calc?.score || 0;
    } catch (e) {
      // Fallback to trustScore if calculation fails
      computedScore = user.creditScore || user.trustScore || 650;
    }

    const response = {
      creditScore: user.role === 'borrower' ? computedScore : successRate,
      successRate,
      // Generic / legacy fields used by current UI
      activeLoans: user.role === 'borrower' ? borrowerActive.length : lenderActive.length,
      totalBorrowed: borrowerFunded.reduce((s,l)=> s + (l.amount || 0), 0),
      totalLent: lenderLoans.reduce((s,l)=> s + (l.amount || 0), 0),
      repaidLoans: user.role === 'borrower' ? borrowerRepaid.length : lenderRepaid.length,
      overdueLoans: user.role === 'borrower' ? borrowerOverdue.length : lenderOverdue.length,
      // Expanded fields so frontend can show both perspectives simultaneously
      borrowerActiveLoans: borrowerActive.length,
      borrowerRepaidLoans: borrowerRepaid.length,
      borrowerOverdueLoans: borrowerOverdue.length,
      lenderActiveLoans: lenderActive.length,
      lenderRepaidLoans: lenderRepaid.length,
      lenderOverdueLoans: lenderOverdue.length,
      loansFunded: lenderLoans.length,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (err) {
    console.error('Error computing user stats', err);
    res.status(500).json({ error: 'Failed to compute user stats' });
  }
});

// Update role (and now profile picture too)
router.patch("/me", verifyToken, async (req, res) => {
  const { email } = req.user;
  
  try {
    console.log('📝 PATCH /users/me for', email, 'payload:', req.body);

    // Find the user first
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Helper to safely trim and validate strings
    const safeTrim = (v) => {
      if (v === null || v === undefined) return undefined;
      const s = String(v).trim();
      return s.length ? s : undefined;
    };

    // Build update object with only provided, non-empty values
    const updates = {};
    
    // String fields that should be trimmed
    const stringFields = ['name', 'phone', 'location', 'bio', 'university', 'graduationYear'];
    for (const field of stringFields) {
      if (field in req.body) {
        const trimmed = safeTrim(req.body[field]);
        if (trimmed !== undefined) {
          updates[field] = trimmed;
        }
      }
    }
    
    // Special fields (no trim)
    if ('role' in req.body && req.body.role) updates.role = req.body.role;
    if ('profilePicture' in req.body && req.body.profilePicture) updates.profilePicture = req.body.profilePicture;

    console.log('📝 Applying updates:', Object.keys(updates));
    console.log('📝 Updates object:', updates);

    // Apply updates to the user document
    Object.assign(user, updates);
    
    console.log('💾 User document before save:', {
      phone: user.phone,
      location: user.location,
      bio: user.bio
    });
    
    await user.save();

    console.log('✅ Profile updated for', email, '-> _id:', user._id.toString());
    console.log('✅ User document after save:', {
      phone: user.phone,
      location: user.location,
      bio: user.bio
    });
    
    // Return the same shape as GET /users/me for consistency
    const response = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      profilePicture: user.profilePicture,
      phone: user.phone || '',
      location: user.location || '',
      bio: user.bio || '',
      university: user.university || '',
      graduationYear: user.graduationYear || '',
    };
    
    res.json(response);
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update phone number and verification status (after OTP verification)
router.post("/update-phone", verifyToken, async (req, res) => {
  const { email } = req.user;
  const { phone, phoneVerified } = req.body;
  
  try {
    console.log('📱 Updating phone for', email, ':', phone, 'verified:', phoneVerified);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update phone and verification status
    user.phone = phone;
    user.phoneVerified = phoneVerified || false;
    
    await user.save();

    console.log('✅ Phone updated for', email);
    
    res.json({ 
      success: true,
      message: "Phone number updated successfully",
      phone: user.phone,
      phoneVerified: user.phoneVerified
    });
  } catch (error) {
    console.error('❌ Error updating phone:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update profile (extended with city, occupation, onboardingComplete)
router.patch("/profile", verifyToken, async (req, res) => {
  const { email } = req.user;
  const { name, bio, occupation, city, onboardingComplete } = req.body;
  
  try {
    console.log('📝 Updating profile for', email);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update fields if provided
    if (name) user.name = name.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (occupation) user.occupation = occupation.trim();
    if (city) user.city = city.trim();
    if (onboardingComplete !== undefined) user.onboardingComplete = onboardingComplete;
    
    await user.save();

    console.log('✅ Profile updated for', email);
    
    res.json({ 
      success: true,
      message: "Profile updated successfully",
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        occupation: user.occupation,
        bio: user.bio,
        role: user.role,
        phoneVerified: user.phoneVerified
      }
    });
  } catch (error) {
    console.error('❌ Error updating profile:', error);
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
    console.log('🔐 Auth header:', req.headers.authorization ? 'Present' : 'Missing');
    console.log('✅ Middleware passed, user authenticated:', {
      email: req.user?.email,
      role: req.user?.role,
      verified: req.user?.verified,
      uid: req.user?.uid
    });
    
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
