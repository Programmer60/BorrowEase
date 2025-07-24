import express from "express";
import Loan from "../models/loanModel.js";
import Notification from "../models/notificationModel.js";
import { verifyToken } from "../firebase.js";

const router = express.Router();

// router.post("/",verifyToken, async (req, res) => {
//   try {
//     const { name, collegeEmail, phoneNumber, amount, purpose, repaymentDate } = req.body;

//     // Simple check to only allow college emails (e.g., nituk.ac.in)
//     // if (!collegeEmail.endsWith(".ac.in")) {
//     //   return res.status(400).json({ error: "College email must end with .ac.in" });
//     // }

//     const newLoan = new Loan({ name, collegeEmail, phoneNumber, amount, purpose, repaymentDate });
//     await newLoan.save();

//     res.status(201).json(newLoan);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

router.post("/", verifyToken, async (req, res) => {
  try {
    const { phoneNumber, amount, purpose, repaymentDate } = req.body;

    // Extract user info from Firebase Auth Token
    const { name, email, id } = req.user;

    const newLoan = new Loan({
      name,
      collegeEmail: email,
      phoneNumber,
      amount,
      purpose,
      repaymentDate,
      borrowerId: id,
      status: "pending", // Default status
    });

    await newLoan.save();
    res.status(201).json(newLoan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get all loans (for lenders - only show approved loans)
router.get("/", verifyToken, async (req, res) => {
  try {
    // Only show approved loans to regular users (lenders)
    const loans = await Loan.find({ status: "approved" }).populate('borrowerId', 'name email');
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all loans for a specific user
router.get("/user", verifyToken, async (req, res) => {
  try {
    const { email } = req.user;
    const loans = await Loan.find({ collegeEmail: email });
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all loans for a specific user (borrower)
router.get("/loan", verifyToken, async (req, res) => {
  try {
    const { email } = req.user;
    const loans = await Loan.find({ collegeEmail: email });
    if (loans.length === 0) {
      return res.status(404).json({ error: "No loans found for this user" });
    }
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Borrower: Get my loans
router.get("/my-loans", verifyToken, async (req, res) => {
  try {
    const { email } = req.user;
    const loans = await Loan.find({ collegeEmail: email });
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lender: Get all loans funded by this lender
router.get("/funded", verifyToken, async (req, res) => {
  try {
    const { id } = req.user;
    const loans = await Loan.find({ lenderId: id });
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lender funds a loan to verifyToken
router.patch("/:id/fund", verifyToken, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    loan.funded = true;
    loan.lenderName = req.user.name || "Anonymous";
    loan.lenderId = req.user.id;
    await loan.save();

    res.json(loan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Borrower marks loan as repaid
router.patch("/:id/repay", verifyToken, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    // Only borrower can mark their loan as repaid
    if (loan.borrowerId && loan.borrowerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "You are not allowed to update this loan" });
    } else if (!loan.borrowerId && loan.collegeEmail !== req.user.email) {
      // Fallback for old loans without borrowerId
      return res.status(403).json({ error: "You are not allowed to update this loan" });
    }

    loan.repaid = true;
    await loan.save();

    res.json(loan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single loan by ID (for chat access verification) - MOVED TO END
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('borrowerId', 'name email _id')
      .populate('lenderId', 'name email _id');
    
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    // Check if user is authorized to view this loan
    const userId = req.user.id;
    const borrowerIdStr = loan.borrowerId ? loan.borrowerId._id.toString() : null;
    const lenderIdStr = loan.lenderId ? loan.lenderId._id.toString() : null;
    const userIdStr = userId.toString();
    
    console.log("🔐 Loan authorization check:");
    console.log("- User ID (string):", userIdStr);
    console.log("- Borrower ID (string):", borrowerIdStr);
    console.log("- Lender ID (string):", lenderIdStr);
    
    if (borrowerIdStr !== userIdStr && lenderIdStr !== userIdStr) {
      console.log("❌ User not authorized to view this loan");
      return res.status(403).json({ error: "Unauthorized to view this loan" });
    }

    console.log("✅ User authorized to view loan");

    res.json(loan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all loans (including pending, approved, rejected)
router.get("/admin/all", verifyToken, async (req, res) => {
  try {
    console.log('🔍 Admin all loans request from user:', req.user?.email, 'Role:', req.user?.role);
    
    if (req.user.role !== "admin") {
      console.log('❌ Access denied - user is not admin');
      return res.status(403).json({ error: "Access denied. Admin only." });
    }
    
    console.log('✅ Admin access granted, fetching loans...');
    const loans = await Loan.find()
      .populate('borrowerId', 'name email')
      .populate('lenderId', 'name email')
      .sort({ createdAt: -1 });
    
    console.log(`📋 Found ${loans.length} loans`);
    res.json(loans);
  } catch (error) {
    console.error('❌ Error in admin/all endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get pending loans only
router.get("/admin/pending", verifyToken, async (req, res) => {
  try {
    console.log('🔍 Admin pending loans request from user:', req.user?.email, 'Role:', req.user?.role);
    
    if (req.user.role !== "admin") {
      console.log('❌ Access denied - user is not admin');
      return res.status(403).json({ error: "Access denied. Admin only." });
    }
    
    console.log('✅ Admin access granted, fetching pending loans...');
    const loans = await Loan.find({ status: "pending" })
      .populate('borrowerId', 'name email')
      .sort({ createdAt: -1 });
    
    console.log(`📋 Found ${loans.length} pending loans`);
    res.json(loans);
  } catch (error) {
    console.error('❌ Error in admin/pending endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Approve a loan
router.patch("/admin/approve/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const { reason } = req.body;
    const loan = await Loan.findByIdAndUpdate(
      req.params.id, 
      { status: "approved" }, 
      { new: true }
    ).populate('borrowerId', 'name email');
    
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    // Create notification for borrower
    if (loan.borrowerId) {
      await Notification.create({
        userId: loan.borrowerId._id,
        type: "loan_approved",
        message: `Great news! Your loan request for ₹${loan.amount} has been approved by admin. ${reason ? `Reason: ${reason}` : ''}`,
        isRead: false
      });
    }

    res.json({
      success: true,
      message: "Loan approved successfully",
      loan
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Reject a loan
router.patch("/admin/reject/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const { reason } = req.body;
    const loan = await Loan.findByIdAndUpdate(
      req.params.id, 
      { status: "rejected" }, 
      { new: true }
    ).populate('borrowerId', 'name email');
    
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    // Create notification for borrower
    if (loan.borrowerId) {
      await Notification.create({
        userId: loan.borrowerId._id,
        type: "loan_rejected",
        message: `Your loan request for ₹${loan.amount} has been rejected. ${reason ? `Reason: ${reason}` : 'Please review your application and try again.'}`,
        isRead: false
      });
    }

    res.json({
      success: true,
      message: "Loan rejected",
      loan
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get loan statistics
router.get("/admin/stats", verifyToken, async (req, res) => {
  try {
    console.log('📊 Admin stats request from user:', req.user?.email, 'Role:', req.user?.role);
    
    if (req.user.role !== "admin") {
      console.log('❌ Access denied - user is not admin');
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    console.log('✅ Admin access granted, calculating stats...');
    const totalLoans = await Loan.countDocuments();
    const pendingLoans = await Loan.countDocuments({ status: "pending" });
    const approvedLoans = await Loan.countDocuments({ status: "approved" });
    const rejectedLoans = await Loan.countDocuments({ status: "rejected" });
    const fundedLoans = await Loan.countDocuments({ funded: true });
    const repaidLoans = await Loan.countDocuments({ repaid: true });
    
    // Calculate total amount metrics
    const totalAmountResult = await Loan.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalAmount = totalAmountResult[0]?.total || 0;

    const approvedAmountResult = await Loan.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const approvedAmount = approvedAmountResult[0]?.total || 0;

    const stats = {
      totalLoans,
      pendingLoans,
      approvedLoans,
      rejectedLoans,
      fundedLoans,
      repaidLoans,
      totalAmount,
      approvedAmount,
      approvalRate: totalLoans > 0 ? ((approvedLoans / totalLoans) * 100).toFixed(1) : 0
    };

    console.log('📊 Stats calculated:', stats);
    res.json(stats);
  } catch (error) {
    console.error('❌ Error in admin/stats endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
// This is a basic route setup for the loan feature.
// Token verification is done using Firebase Auth.
// Token helps ensure that only authenticated users can create or fund loans.
// Axios vs Token: Axios is used for making HTTP requests, while the token is used for authentication.
// The token is sent in the request headers to verify the user's identity.