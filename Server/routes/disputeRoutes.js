import express from "express";
import Dispute from "../models/disputeModel.js";
import Loan from "../models/loanModel.js";
import { verifyToken } from "../firebase.js";

const router = express.Router();

// POST /disputes → borrower/lender raises a dispute
router.post("/", verifyToken, async (req, res) => {
  try {
    const { loanId, category, subject, message, priority } = req.body;

    if (!loanId || !category || !subject || !message) {
      return res.status(400).json({ error: "All required fields must be provided" });
    }

    // Verify loan exists and user is involved
    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    // Check if user is involved in this loan
    const userRole = req.user.email === loan.collegeEmail ? "borrower" : "lender";
    if (userRole === "lender" && loan.lenderId?.toString() !== req.user.uid) {
      return res.status(403).json({ error: "You are not authorized to create a dispute for this loan" });
    }

    const dispute = new Dispute({
      loanId,
      raisedBy: req.user.uid,
      role: userRole,
      category: category || "other",
      subject,
      message,
      priority: priority || "medium"
    });

    await dispute.save();
    
    const populatedDispute = await Dispute.findById(dispute._id)
      .populate('raisedBy', 'name email')
      .populate('loanId', 'amount purpose collegeEmail');

    res.status(201).json(populatedDispute);
  } catch (error) {
    console.error("Error creating dispute:", error);
    res.status(500).json({ error: "Failed to create dispute" });
  }
});

// GET /disputes → get user's disputes or all disputes (admin)
router.get("/", verifyToken, async (req, res) => {
  try {
    let disputes;
    
    if (req.user.role === "admin") {
      // Admin can see all disputes
      disputes = await Dispute.find()
        .populate('raisedBy', 'name email')
        .populate('loanId', 'amount purpose collegeEmail')
        .populate('adminId', 'name email')
        .sort({ createdAt: -1 });
    } else {
      // Users can only see their own disputes
      disputes = await Dispute.find({ raisedBy: req.user.uid })
        .populate('loanId', 'amount purpose collegeEmail')
        .populate('adminId', 'name email')
        .sort({ createdAt: -1 });
    }

    res.json(disputes);
  } catch (error) {
    console.error("Error fetching disputes:", error);
    res.status(500).json({ error: "Failed to fetch disputes" });
  }
});

// GET /disputes/:loanId → get all disputes for a specific loan
router.get("/loan/:loanId", verifyToken, async (req, res) => {
  try {
    const { loanId } = req.params;
    
    // Verify loan exists and user is involved
    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    // Check if user is involved in this loan or is admin
    const userRole = req.user.email === loan.collegeEmail ? "borrower" : "lender";
    if (req.user.role !== "admin" && 
        userRole === "lender" && loan.lenderId?.toString() !== req.user.uid) {
      return res.status(403).json({ error: "You are not authorized to view disputes for this loan" });
    }

    const disputes = await Dispute.find({ loanId })
      .populate('raisedBy', 'name email')
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 });

    res.json(disputes);
  } catch (error) {
    console.error("Error fetching loan disputes:", error);
    res.status(500).json({ error: "Failed to fetch disputes" });
  }
});

// PATCH /disputes/:id/resolve → admin resolves or replies
router.patch("/:id/resolve", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;

    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    if (!status || !adminResponse) {
      return res.status(400).json({ error: "Status and admin response are required" });
    }

    const updateData = {
      status,
      adminResponse,
      adminId: req.user.uid
    };

    if (status === "resolved") {
      updateData.resolvedAt = new Date();
    }

    const updatedDispute = await Dispute.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('raisedBy', 'name email')
     .populate('loanId', 'amount purpose collegeEmail')
     .populate('adminId', 'name email');

    if (!updatedDispute) {
      return res.status(404).json({ error: "Dispute not found" });
    }

    res.json(updatedDispute);
  } catch (error) {
    console.error("Error resolving dispute:", error);
    res.status(500).json({ error: "Failed to resolve dispute" });
  }
});

// GET /disputes/stats → admin gets dispute statistics
router.get("/admin/stats", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const totalDisputes = await Dispute.countDocuments();
    const openDisputes = await Dispute.countDocuments({ status: "open" });
    const inProgressDisputes = await Dispute.countDocuments({ status: "in-progress" });
    const resolvedDisputes = await Dispute.countDocuments({ status: "resolved" });
    const rejectedDisputes = await Dispute.countDocuments({ status: "rejected" });

    const categoryStats = await Dispute.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    const priorityStats = await Dispute.aggregate([
      { $group: { _id: "$priority", count: { $sum: 1 } } }
    ]);

    res.json({
      total: totalDisputes,
      open: openDisputes,
      inProgress: inProgressDisputes,
      resolved: resolvedDisputes,
      rejected: rejectedDisputes,
      categoryBreakdown: categoryStats,
      priorityBreakdown: priorityStats
    });
  } catch (error) {
    console.error("Error fetching dispute stats:", error);
    res.status(500).json({ error: "Failed to fetch dispute statistics" });
  }
});

export default router;