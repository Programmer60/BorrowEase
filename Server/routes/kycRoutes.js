import express from "express";
import KYC from "../models/kycModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import { verifyToken } from "../firebase.js";

const router = express.Router();

// Submit KYC for verification
router.post("/submit", verifyToken, async (req, res) => {
  try {
    console.log("🔍 KYC Submit endpoint hit");
    console.log("👤 User from token:", req.user);
    console.log("📝 Request body keys:", Object.keys(req.body));
    console.log("🔐 Full req.user object:", JSON.stringify(req.user, null, 2));
    
    const { personalInfo, documents, verificationStatus } = req.body;
    
    if (!req.user) {
      console.log("❌ No user object in request");
      return res.status(401).json({ error: "User not authenticated - no user object" });
    }
    
    const userId = req.user.id;
    console.log("🆔 Extracted userId:", userId);

    if (!userId) {
      console.log("❌ No user ID found in request");
      console.log("🔍 Available user properties:", Object.keys(req.user || {}));
      return res.status(401).json({ error: "User not authenticated - no user ID" });
    }

    console.log("🔍 Checking existing KYC for user:", userId);

    // Check if KYC already exists for this user
    const existingKYC = await KYC.findOne({ userId });
    console.log("📋 Existing KYC found:", existingKYC ? 'Yes' : 'No');
    
    // Check if user has reached maximum attempts
    if (existingKYC && existingKYC.maxAttemptsReached) {
      console.log("⚠️ Max attempts reached for user:", userId);
      return res.status(400).json({ 
        error: "Maximum KYC submission attempts (3) reached. Please contact support for assistance.",
        maxAttemptsReached: true,
        attempts: existingKYC.submissionAttempts
      });
    }
    
    if (existingKYC && existingKYC.status !== 'rejected') {
      console.log("⚠️ KYC already exists with status:", existingKYC.status);
      return res.status(400).json({ error: "KYC already submitted or verified" });
    }

    const kycData = {
      userId,
      userName: req.user.name,
      userEmail: req.user.email,
      userPhone: req.user.phone,
      personalInfo,
      documents,
      verificationStatus: verificationStatus || {
        phoneVerification: {
          status: "pending",
          phoneNumber: personalInfo?.phoneNumber
        },
        addressVerification: {
          status: "pending"
        },
        biometricVerification: {
          status: "pending"
        }
      },
      status: 'pending',
      submittedAt: new Date()
    };

    console.log("📝 Prepared KYC data:", {
      userId: kycData.userId,
      userName: kycData.userName,
      userEmail: kycData.userEmail,
      userPhone: kycData.userPhone,
      hasPersonalInfo: !!personalInfo,
      hasDocuments: !!documents,
      hasVerificationStatus: !!verificationStatus,
      phoneVerificationStatus: verificationStatus?.phoneVerification?.status || 'pending',
      personalInfoKeys: personalInfo ? Object.keys(personalInfo) : [],
      documentsKeys: documents ? Object.keys(documents) : []
    });

    let kyc;
    if (existingKYC) {
      console.log("🔄 Updating existing KYC submission");
      // Increment attempt counter for resubmission
      const newAttempts = existingKYC.submissionAttempts + 1;
      const maxReached = newAttempts >= 3;
      
      kycData.submissionAttempts = newAttempts;
      kycData.maxAttemptsReached = maxReached;
      
      console.log("📊 Attempt info:", { newAttempts, maxReached });
      
      // Update existing rejected KYC
      kyc = await KYC.findByIdAndUpdate(existingKYC._id, kycData, { new: true });
    } else {
      console.log("🆕 Creating new KYC submission");
      // Create new KYC with first attempt
      kycData.submissionAttempts = 1;
      kycData.maxAttemptsReached = false;
      kyc = new KYC(kycData);
      await kyc.save();
    }

    console.log("✅ KYC saved successfully:", {
      id: kyc._id,
      status: kyc.status,
      attempts: kyc.submissionAttempts,
      maxReached: kyc.maxAttemptsReached
    });

    res.status(201).json({ 
      message: "KYC submitted successfully", 
      kyc,
      attempts: kyc.submissionAttempts,
      maxAttemptsReached: kyc.maxAttemptsReached
    });
  } catch (error) {
    console.error("❌ Error submitting KYC:", error);
    console.error("📍 Error stack:", error.stack);
    console.error("🔍 Error details:", {
      name: error.name,
      message: error.message,
      code: error.code
    });
    res.status(500).json({ error: "Failed to submit KYC: " + error.message });
  }
});

// Get user's KYC status
router.get("/status", verifyToken, async (req, res) => {
  try {
    const kyc = await KYC.findOne({ userId: req.user.id });
    if (!kyc) {
      return res.json({ status: 'not_submitted', message: 'KYC not submitted yet' });
    }
    res.json(kyc);
  } catch (error) {
    console.error("Error fetching KYC status:", error);
    res.status(500).json({ error: "Failed to fetch KYC status" });
  }
});

// Admin: Get all KYC submissions
router.get("/admin/all", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const kycSubmissions = await KYC.find()
      .populate('userId', 'name email phone')
      .sort({ submittedAt: -1 });

    res.json(kycSubmissions);
  } catch (error) {
    console.error("Error fetching KYC submissions:", error);
    res.status(500).json({ error: "Failed to fetch KYC submissions" });
  }
});

// Admin: Review KYC submission
router.put("/:id/review", verifyToken, async (req, res) => {
  try {
    console.log("🔍 KYC Review endpoint hit");
    console.log("👤 Admin user:", req.user);
    console.log("📝 Request body:", req.body);
    console.log("🆔 KYC ID:", req.params.id);

    if (req.user.role !== "admin") {
      console.log("❌ Access denied - not admin");
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const { status, comments } = req.body;
    const kycId = req.params.id;

    if (!['verified', 'rejected'].includes(status)) {
      console.log("❌ Invalid status:", status);
      return res.status(400).json({ error: "Invalid status. Must be 'verified' or 'rejected'" });
    }

    console.log("🔍 Finding existing KYC:", kycId);
    // First get the existing KYC to access current comments
    const existingKYC = await KYC.findById(kycId);
    if (!existingKYC) {
      console.log("❌ KYC not found:", kycId);
      return res.status(404).json({ error: "KYC submission not found" });
    }
    console.log("✅ Found existing KYC:", existingKYC._id);

    // Prepare the new comment object if comments are provided
    let updatedComments = existingKYC.comments || [];
    if (comments && comments.trim()) {
      const newComment = {
        comment: comments.trim(),
        addedBy: req.user.name,
        addedAt: new Date()
      };
      updatedComments.push(newComment);
      console.log("📝 Added new comment:", newComment);
    }

    console.log("🔄 Updating KYC status to:", status);
    // Update the KYC with new status and comments
    const kyc = await KYC.findByIdAndUpdate(
      kycId,
      {
        status,
        reviewedAt: new Date(),
        reviewedBy: req.user.name,
        comments: updatedComments
      },
      { new: true }
    ).populate('userId', 'name email');

    if (!kyc) {
      console.log("❌ Failed to update KYC");
      return res.status(404).json({ error: "Failed to update KYC submission" });
    }
    console.log("✅ KYC updated successfully:", kyc._id);

    if (!kyc.userId || !kyc.userId._id) {
      console.log("❌ No user ID found in KYC:", kyc.userId);
      return res.status(400).json({ error: "Invalid user data in KYC submission" });
    }

    console.log("🔄 Updating user KYC status for user:", kyc.userId._id);
    // Update user's KYC status
    const userUpdate = await User.findByIdAndUpdate(
      kyc.userId._id, 
      { kycStatus: status === 'verified' ? 'verified' : 'rejected' },
      { new: true }
    );
    
    if (!userUpdate) {
      console.log("⚠️ User not found, but continuing:", kyc.userId._id);
    } else {
      console.log("✅ User KYC status updated:", userUpdate.kycStatus);
    }

    console.log("📧 Creating notification for user:", kyc.userId._id);
    // Create notification for user
    const message = status === 'verified' 
      ? "Congratulations! Your KYC has been verified. You can now access all features."
      : `Your KYC submission has been rejected. ${comments ? `Reason: ${comments}` : 'Please review and resubmit.'}`;

    try {
      await Notification.create({
        userId: kyc.userId._id,
        type: `kyc_${status}`,
        message,
        isRead: false
      });
      console.log("✅ Notification created successfully");
    } catch (notificationError) {
      console.log("⚠️ Notification creation failed:", notificationError.message);
      // Don't fail the entire request if notification fails
    }

    console.log("✅ KYC review completed successfully");
    res.json({
      success: true,
      message: `KYC ${status} successfully`,
      kyc
    });
  } catch (error) {
    console.error("❌ Error reviewing KYC:", error);
    console.error("📍 Error stack:", error.stack);
    console.error("🔍 Error details:", {
      name: error.name,
      message: error.message,
      code: error.code
    });
    res.status(500).json({ error: "Failed to review KYC: " + error.message });
  }
});

// Admin: Get KYC statistics
router.get("/admin/stats", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const total = await KYC.countDocuments();
    const pending = await KYC.countDocuments({ status: 'pending' });
    const verified = await KYC.countDocuments({ status: 'verified' });
    const rejected = await KYC.countDocuments({ status: 'rejected' });

    const stats = {
      total,
      pending,
      verified,
      rejected,
      verificationRate: total > 0 ? ((verified / total) * 100).toFixed(1) : 0
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching KYC stats:", error);
    res.status(500).json({ error: "Failed to fetch KYC statistics" });
  }
});

// Admin: Get single KYC submission details
router.get("/admin/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const kyc = await KYC.findById(req.params.id)
      .populate('userId', 'name email phone createdAt');

    if (!kyc) {
      return res.status(404).json({ error: "KYC submission not found" });
    }

    res.json(kyc);
  } catch (error) {
    console.error("Error fetching KYC details:", error);
    res.status(500).json({ error: "Failed to fetch KYC details" });
  }
});

// Admin: Reset user's KYC attempts (in case of special circumstances)
router.put("/:id/reset-attempts", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const kycId = req.params.id;
    
    const kyc = await KYC.findByIdAndUpdate(
      kycId,
      {
        submissionAttempts: 0,
        maxAttemptsReached: false,
        status: 'rejected', // Allow resubmission
        reviewedAt: new Date(),
        reviewedBy: req.user.name
      },
      { new: true }
    ).populate('userId', 'name email');

    if (!kyc) {
      return res.status(404).json({ error: "KYC submission not found" });
    }

    // Update user's KYC status
    await User.findByIdAndUpdate(kyc.userId._id, { 
      kycStatus: 'rejected' 
    });

    // Create notification for user
    await Notification.create({
      userId: kyc.userId._id,
      type: 'kyc_attempts_reset',
      message: "Your KYC submission attempts have been reset by admin. You can now resubmit your documents.",
      isRead: false
    });

    res.json({
      success: true,
      message: "KYC attempts reset successfully",
      kyc
    });
  } catch (error) {
    console.error("Error resetting KYC attempts:", error);
    res.status(500).json({ error: "Failed to reset KYC attempts" });
  }
});

// Submit address verification document
router.post("/address-verification", verifyToken, async (req, res) => {
  try {
    const { documentType, documentUrl } = req.body;
    const userId = req.user.id;

    const kyc = await KYC.findOne({ userId });
    if (!kyc) {
      return res.status(404).json({ error: "KYC not found" });
    }

    // Update address verification status
    kyc.verificationStatus.addressVerification = {
      status: "submitted",
      documentType,
      documentUrl,
      submittedAt: new Date()
    };

    await kyc.save();

    // Create notification for admin
    await Notification.create({
      userId: null, // Admin notification
      type: 'address_verification_submitted',
      message: `Address verification document submitted by ${kyc.userName}`,
      isRead: false,
      metadata: { kycId: kyc._id, userId }
    });

    res.json({
      success: true,
      message: "Address verification document submitted successfully"
    });
  } catch (error) {
    console.error("Error submitting address verification:", error);
    res.status(500).json({ error: "Failed to submit address verification" });
  }
});

// Admin: Review address verification
router.post("/admin/address-verification/:kycId", verifyToken, async (req, res) => {
  try {
    const { kycId } = req.params;
    const { status, rejectionReason } = req.body; // status: 'verified' or 'rejected'

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const kyc = await KYC.findById(kycId);
    if (!kyc) {
      return res.status(404).json({ error: "KYC not found" });
    }

    // Update address verification status
    kyc.verificationStatus.addressVerification.status = status;
    kyc.verificationStatus.addressVerification.verifiedAt = new Date();
    
    if (status === 'rejected' && rejectionReason) {
      kyc.verificationStatus.addressVerification.rejectionReason = rejectionReason;
    }

    await kyc.save();

    // Create notification for user
    const message = status === 'verified' 
      ? "Your address verification has been approved"
      : `Your address verification was rejected. Reason: ${rejectionReason || 'Please resubmit with correct documents'}`;

    await Notification.create({
      userId: kyc.userId,
      type: `address_verification_${status}`,
      message,
      isRead: false
    });

    res.json({
      success: true,
      message: `Address verification ${status} successfully`,
      kyc
    });
  } catch (error) {
    console.error("Error reviewing address verification:", error);
    res.status(500).json({ error: "Failed to review address verification" });
  }
});

export default router;
