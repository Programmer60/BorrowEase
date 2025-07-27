import express from "express";
import KYC from "../models/kycModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import { verifyToken } from "../firebase.js";

const router = express.Router();

// Submit KYC for verification
router.post("/submit", verifyToken, async (req, res) => {
  try {
    const { personalInfo, documents } = req.body;
    const userId = req.user.id;

    // Check if KYC already exists for this user
    const existingKYC = await KYC.findOne({ userId });
    if (existingKYC && existingKYC.status !== 'rejected') {
      return res.status(400).json({ error: "KYC already submitted or verified" });
    }

    const kycData = {
      userId,
      userName: req.user.name,
      userEmail: req.user.email,
      personalInfo,
      documents,
      status: 'pending',
      submittedAt: new Date()
    };

    let kyc;
    if (existingKYC) {
      // Update existing rejected KYC
      kyc = await KYC.findByIdAndUpdate(existingKYC._id, kycData, { new: true });
    } else {
      // Create new KYC
      kyc = new KYC(kycData);
      await kyc.save();
    }

    res.status(201).json({ message: "KYC submitted successfully", kyc });
  } catch (error) {
    console.error("Error submitting KYC:", error);
    res.status(500).json({ error: "Failed to submit KYC" });
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
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const { status, comments } = req.body;
    const kycId = req.params.id;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be 'verified' or 'rejected'" });
    }

    const kyc = await KYC.findByIdAndUpdate(
      kycId,
      {
        status,
        reviewedAt: new Date(),
        reviewedBy: req.user.name,
        comments: comments ? [...(kyc?.comments || []), comments] : kyc?.comments || []
      },
      { new: true }
    ).populate('userId', 'name email');

    if (!kyc) {
      return res.status(404).json({ error: "KYC submission not found" });
    }

    // Update user's KYC status
    await User.findByIdAndUpdate(kyc.userId._id, { 
      kycStatus: status === 'verified' ? 'verified' : 'rejected' 
    });

    // Create notification for user
    const message = status === 'verified' 
      ? "Congratulations! Your KYC has been verified. You can now access all features."
      : `Your KYC submission has been rejected. ${comments ? `Reason: ${comments}` : 'Please review and resubmit.'}`;

    await Notification.create({
      userId: kyc.userId._id,
      type: `kyc_${status}`,
      message,
      isRead: false
    });

    res.json({
      success: true,
      message: `KYC ${status} successfully`,
      kyc
    });
  } catch (error) {
    console.error("Error reviewing KYC:", error);
    res.status(500).json({ error: "Failed to review KYC" });
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

export default router;
