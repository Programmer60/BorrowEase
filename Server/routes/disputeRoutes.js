import express from "express";
import mongoose from "mongoose";
import Dispute from "../models/disputeModel.js";
import Loan from "../models/loanModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import { verifyToken } from "../firebase.js";

const router = express.Router();

// Create a new dispute
router.post("/", verifyToken, async (req, res) => {
  try {
    console.log("=== DISPUTE CREATION START ===");
    console.log("Request body:", req.body);
  console.log("User from token:", req.user);
  console.log("User ID:", req.user?.id);

  const { loanId, category, subject, message, priority, expectedResolution, evidence } = req.body;

    // Validate required fields
    if (!loanId || !category || !subject || !message) {
      console.log("Missing required fields");
      return res.status(400).json({ 
        error: "All required fields must be provided",
        missing: {
          loanId: !loanId,
          category: !category,
          subject: !subject,
          message: !message
        }
      });
    }

    // Ensure we have a requester id (fallback via uid/email if missing)
    if (!req.user || !req.user.id) {
      if (req.user?.uid && !req.user.id) {
        req.user.id = req.user.uid; // accept uid alias
        console.log("ℹ️ Using req.user.uid as id:", req.user.id);
      }
      console.log("⚠️ req.user.id missing, attempting fallback lookup by email...");
      if (req.user?.email) {
        const fallbackUser = await User.findOne({ email: req.user.email });
        if (fallbackUser) {
          req.user.id = fallbackUser._id; // set for downstream
          console.log("✅ Fallback user resolved:", { id: fallbackUser._id, email: fallbackUser.email });
        }
      }
    }
  if (!req.user?.id) {
      console.log("❌ User ID could not be resolved even after fallback", { reqUser: req.user });
      return res.status(401).json({ 
        error: "User authentication failed",
        details: "No user ID found in request after fallback"
      });
    }

    // Find the user in database by id set by verifyToken
  const user = await User.findById(req.user.id);
    if (!user) {
      console.log("User not found in database for ID:", req.user.id);
      return res.status(404).json({ 
        error: "User not found in database",
        id: req.user.id
      });
    }
    console.log("User found:", { id: user._id, name: user.name, role: user.role });

    // Find the loan
    const loan = await Loan.findById(loanId).populate('borrowerId').populate('lenderId');
    if (!loan) {
      console.log("Loan not found for ID:", loanId);
      return res.status(404).json({ 
        error: "Loan not found",
        loanId: loanId
      });
    }
    console.log("Loan found:", { 
      id: loan._id, 
      borrowerId: loan.borrowerId?._id, 
      lenderId: loan.lenderId?._id 
    });

  // Determine user role based on loan relationship
    let userRole = "borrower";
    if (loan.lenderId && loan.lenderId._id.toString() === user._id.toString()) {
      userRole = "lender";
    } else if (loan.borrowerId && loan.borrowerId._id.toString() === user._id.toString()) {
      userRole = "borrower";
    } else {
      console.log("User is not associated with this loan");
      return res.status(403).json({ 
        error: "You are not associated with this loan",
        userId: user._id,
        loanBorrowerId: loan.borrowerId?._id,
        loanLenderId: loan.lenderId?._id
      });
    }
    
    console.log("User role determined:", userRole);

    // Optional: enforce lender report window after funding
    try {
      const windowHours = Number(process.env.LENDER_DISPUTE_WINDOW_HOURS || 48);
      if (userRole === 'lender' && loan.fundedAt && !isNaN(new Date(loan.fundedAt))) {
        const msSinceFund = Date.now() - new Date(loan.fundedAt).getTime();
        const allowedMs = windowHours * 60 * 60 * 1000;
        if (msSinceFund > allowedMs) {
          return res.status(400).json({
            error: `Reporting window closed. Disputes by lenders are allowed within ${windowHours} hours of funding.`
          });
        }
      }
    } catch (twErr) {
      console.warn('Time-window check skipped due to error:', twErr?.message);
    }

    // Create dispute data
    const disputeData = {
      loanId: loanId,
      raisedBy: req.user.id?.toString(), // store app user id as string
      role: userRole,
      category: category,
      subject: subject,
      message: message,
      priority: priority || "medium",
  expectedResolution: expectedResolution || "",
  evidence: Array.isArray(evidence) ? evidence.slice(0, 5) : []
    };

    console.log("Creating dispute with data:", disputeData);

    // Validate dispute data before creating
  if (!disputeData.raisedBy) {
      console.log("ERROR: raisedBy is still undefined");
      return res.status(500).json({ 
        error: "Internal error: raisedBy field is undefined",
        debugInfo: {
          reqUser: req.user,
      reqUserId: req.user?.id,
          disputeData: disputeData
        }
      });
    }

    // Create the dispute
    const dispute = new Dispute(disputeData);

    console.log("Dispute object created, attempting to save...");
    const savedDispute = await dispute.save();
    console.log("Dispute saved successfully with ID:", savedDispute._id);

    // Populate the saved dispute for response
    const populatedDispute = await Dispute.findById(savedDispute._id)
      .populate('loanId')
      .lean();

    // Notify counterparty about opened dispute
    try {
      const targetUser = userRole === 'lender' ? loan.borrowerId?._id : loan.lenderId?._id;
      if (targetUser) {
        await Notification.create({
          userId: targetUser,
          type: 'dispute_opened',
          title: 'Dispute reported',
          message: `${userRole === 'lender' ? 'Lender' : 'Borrower'} reported a dispute on loan "${loan.purpose}"${subject ? `: ${subject}` : ''}.`
        });
      }
    } catch (notifyOpenErr) {
      console.error('Failed to notify counterparty about dispute opening:', notifyOpenErr);
    }

    res.status(201).json({
      success: true,
      message: 'Dispute created successfully',
      dispute: populatedDispute
    });

  } catch (error) {
    console.error("=== DISPUTE CREATION ERROR ===");
    console.error("Error message:", error.message);
    console.error("Error name:", error.name);
    console.error("Error stack:", error.stack);
    
    // Check for validation errors specifically
    if (error.name === 'ValidationError') {
      console.error("Validation errors:", error.errors);
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({ 
        error: "Validation failed",
        validationErrors: validationErrors,
        details: error.message
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Failed to create dispute",
      details: error.message,
      errorName: error.name
    });
  }
});

// Get all disputes (admin only)
router.get("/", verifyToken, async (req, res) => {
  try {
    // Populate loan and its parties
    const disputesRaw = await Dispute.find()
      .populate({
        path: 'loanId',
        populate: [
          { path: 'borrowerId', select: 'name email role' },
          { path: 'lenderId', select: 'name email role' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean();

    // Collect unique raisedBy ids (stored as strings) and convert to ObjectIds safely
    const raisedByIds = Array.from(new Set(
      disputesRaw
        .map(d => d.raisedBy)
        .filter(Boolean)
    ));

    const raisedByObjectIds = raisedByIds
      .map(idStr => {
        try {
          return new mongoose.Types.ObjectId(idStr);
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean);

    // Fetch user docs for raisedBy
    const users = await User.find({ _id: { $in: raisedByObjectIds } })
      .select('name email role')
      .lean();
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // Enrich disputes with raisedByUser and counterpartyUser
    const disputes = disputesRaw.map(d => {
      const raisedByUser = d.raisedBy ? userMap.get(d.raisedBy.toString()) || null : null;
      const borrowerUser = d.loanId?.borrowerId || null;
      const lenderUser = d.loanId?.lenderId || null;
      const counterpartyUser = d.role === 'borrower' ? lenderUser : d.role === 'lender' ? borrowerUser : null;
      return {
        ...d,
        raisedByUser,
        counterpartyUser
      };
    });

    res.json({
      success: true,
      disputes
    });
  } catch (error) {
    console.error("Error fetching disputes:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch disputes" 
    });
  }
});

// Get disputes for a specific user
router.get("/my-disputes", verifyToken, async (req, res) => {
  try {
    if (!req.user?.id) {
      if (req.user?.uid && !req.user.id) {
        req.user.id = req.user.uid;
        console.log("ℹ️ /my-disputes using uid as id:", req.user.id);
      }
      console.log("⚠️ /my-disputes: req.user.id missing, attempting fallback by email");
      if (req.user?.email) {
        const fallbackUser = await User.findOne({ email: req.user.email });
        if (fallbackUser) {
          req.user.id = fallbackUser._id;
          console.log("✅ Fallback user resolved for /my-disputes:", { id: fallbackUser._id });
        }
      }
      if (!req.user?.id) {
        return res.status(401).json({ 
          error: "User authentication failed" 
        });
      }
    }

  const disputes = await Dispute.find({ raisedBy: req.user.id?.toString() })
      .populate('loanId')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      disputes: disputes
    });
  } catch (error) {
    console.error("Error fetching user disputes:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch user disputes" 
    });
  }
});

// Update dispute status (admin only)
router.patch("/:disputeId/status", verifyToken, async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { status, adminResponse } = req.body;

    if (!req.user?.id) {
      if (req.user?.uid && !req.user.id) {
        req.user.id = req.user.uid;
        console.log("ℹ️ /:disputeId/status using uid as id:", req.user.id);
      }
      console.log("⚠️ /:disputeId/status: req.user.id missing, attempting fallback by email");
      if (req.user?.email) {
        const fallbackUser = await User.findOne({ email: req.user.email });
        if (fallbackUser) {
          req.user.id = fallbackUser._id;
          console.log("✅ Fallback user resolved for status update:", { id: fallbackUser._id });
        }
      }
      if (!req.user?.id) {
        return res.status(401).json({ 
          error: "User authentication failed" 
        });
      }
    }

    const updateData = { 
      status,
      adminId: req.user.id?.toString()
    };

    if (adminResponse) {
      updateData.adminResponse = adminResponse;
    }

    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    }

    const dispute = await Dispute.findByIdAndUpdate(
      disputeId,
      updateData,
      { new: true }
    ).populate('loanId');

    if (!dispute) {
      return res.status(404).json({ 
        error: "Dispute not found" 
      });
    }

    // Send a notification to the user who raised the dispute
    try {
      const targetUserId = dispute.raisedBy; // string of Mongo ObjectId
      if (targetUserId) {
        const notifDoc = await Notification.create({
          userId: targetUserId,
          type: status === 'resolved' ? 'dispute_resolved' : 'admin',
          title: `Dispute ${status}`,
          message: status === 'resolved'
            ? `Your dispute "${dispute.subject || 'regarding your loan'}" has been resolved${dispute.adminResponse ? `: ${dispute.adminResponse}` : '.'}`
            : `Your dispute status was updated to "${status}"${dispute.adminResponse ? ` with response: ${dispute.adminResponse}` : ''}.`
        });
        // Optional: log created notification id
        if (notifDoc?._id) {
          console.log('Notification created for dispute update:', notifDoc._id.toString());
        }
      }
    } catch (notifyErr) {
      console.error('Failed to create notification for dispute update:', notifyErr);
      // Do not fail the main request on notification errors
    }

    res.json({
      success: true,
      message: 'Dispute updated successfully',
      dispute: dispute
    });
  } catch (error) {
    console.error("Error updating dispute:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to update dispute" 
    });
  }
});

export default router;