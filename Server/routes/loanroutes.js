import express from "express";
import Loan from "../models/loanModel.js";
import Notification from "../models/notificationModel.js";
import { verifyToken } from "../firebase.js";
import InterestCalculator from "../utils/enhancedInterestCalculator.js";

const router = express.Router();
const interestCalculator = new InterestCalculator();

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
    const { phoneNumber, amount, purpose, repaymentDate, tenureMonths, interestRate } = req.body;

    // Extract user info from Firebase Auth Token
    const { name, email, id } = req.user;
    
    // Use email prefix as fallback name if name is undefined
    const userName = name || email?.split('@')[0] || 'Unknown User';

    // Validate loan parameters
    const validation = interestCalculator.validateLoan(amount, tenureMonths);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: "Invalid loan parameters", 
        details: validation.errors 
      });
    }

    // Calculate interest and loan details
    const calculation = interestCalculator.calculateInterest(amount, tenureMonths, interestRate);

    const newLoan = new Loan({
      name: userName,
      collegeEmail: email,
      phoneNumber,
      amount,
      purpose,
      repaymentDate,
      borrowerId: id,
      status: "pending",
      // Enhanced interest fields
      interestRate: calculation.details.rate || null,
      tenureMonths,
      totalRepayable: calculation.totalRepayable,
      emi: calculation.emi,
      interestAmount: calculation.interest,
      calculationMethod: calculation.calculationMethod,
      tier: calculation.tier,
      breakdown: calculation.breakdown
    });

    await newLoan.save();
    
    // Return loan with calculation details for frontend preview
    res.status(201).json({
      loan: newLoan,
      calculation,
      explanation: interestCalculator.getExplanation(calculation)
    });
  } catch (error) {
    console.error('❌ Error creating loan:', error);
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Default 20 loans per page
    const skip = (page - 1) * limit;

    // Get total count for pagination info
    const totalLoans = await Loan.countDocuments({ collegeEmail: email });
    
    // Get paginated loans with proper sorting (newest first)
    const loans = await Loan.find({ collegeEmail: email })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      loans,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalLoans / limit),
        totalLoans,
        hasNext: page < Math.ceil(totalLoans / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lender: Get all loans funded by this lender
router.get("/funded", verifyToken, async (req, res) => {
  try {
    const { id } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Default 20 loans per page
    const skip = (page - 1) * limit;
    const q = (req.query.q || '').toString().trim();

    const filter = { lenderId: id };
    if (q) {
      // Escape regex special chars, then case-insensitive search across key fields
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(esc, 'i');
      filter.$or = [
        { purpose: regex },
        { name: regex },
        { collegeEmail: regex },
      ];
    }

    // Get total count for pagination info
    const totalLoans = await Loan.countDocuments(filter);
    
    // Get paginated loans with proper sorting (newest first)
    const loans = await Loan.find(filter)
      .sort({ fundedAt: -1, submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      loans,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalLoans / limit),
        totalLoans,
        hasNext: page < Math.ceil(totalLoans / limit),
        hasPrev: page > 1
      }
    });
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

// Lender funds a loan to verifyToken
router.patch("/:id/fund", verifyToken, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    loan.funded = true;
    loan.lenderName = req.user.name || "Anonymous";
    loan.lenderId = req.user.id;
    await loan.save();

  // Ensure response carries a usable lenderName for UI display
  const loanObj = loan.toObject({ getters: true, virtuals: false });
  loanObj.lenderName = loan.lenderName || loan.lenderId?.name || loan.lenderId?.email || '';
  res.json(loanObj);
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

// Get pending loan applications with borrower details (for assessment)
router.get("/pending-applications", verifyToken, async (req, res) => {
  try {
    console.log('🔍 Fetching pending loan applications for assessment');
    
    const applications = await Loan.find({ status: "pending" })
      .select('_id name collegeEmail amount purpose repaymentDate submittedAt')
      .sort({ submittedAt: -1 });
    
    console.log(`📊 Found ${applications.length} total pending applications`);
    
    // Get unique borrowers from pending applications
    const uniqueBorrowers = new Map();
    
    // Also get user data to check roles
    const User = await import("../models/userModel.js").then(module => module.default);
    
    for (const app of applications) {
      const key = app.collegeEmail; // Use email as unique identifier
      console.log(`🔍 Processing application from: ${app.name} (${app.collegeEmail})`);
      
      if (!uniqueBorrowers.has(key)) {
        // Check if this user is an admin (exclude admins from borrower assessment)
        const user = await User.findOne({ email: app.collegeEmail });
        console.log(`👤 User found: ${user?.name} with role: ${user?.role}`);
        
        if (user && user.role === 'admin') {
          console.log(`⚠️ Excluding admin user from assessment: ${app.name} (${app.collegeEmail})`);
          continue; // Skip admin users
        }
        
        console.log(`✅ Including borrower: ${app.name} (${app.collegeEmail})`);
        uniqueBorrowers.set(key, {
          _id: user?._id || null, // Use the actual user ID, not the application ID
          name: app.name,
          email: app.collegeEmail,
          loanAmount: app.amount,
          purpose: app.purpose,
          submittedAt: app.submittedAt,
          applicationId: app._id // Keep application ID for reference
        });
      } else {
        console.log(`🔄 Skipping duplicate borrower: ${app.name} (${app.collegeEmail})`);
      }
    }
    
    // Convert Map to Array
    const borrowers = Array.from(uniqueBorrowers.values());
    
    console.log(`✅ Found ${applications.length} pending applications from ${borrowers.length} unique non-admin borrowers`);
    console.log('📋 Final borrower list:');
    borrowers.forEach((borrower, index) => {
      console.log(`  ${index + 1}. ${borrower.name} (${borrower.email}) - ID: ${borrower._id}`);
    });
    
    res.json(borrowers);
  } catch (error) {
    console.error('❌ Error fetching pending applications:', error);
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

// Admin: Moderate a loan (flag/unflag/suspend)
router.patch("/admin/:id/moderate", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const { action, reason } = req.body;
    const loanId = req.params.id;

    // Validate action
    if (!['flag', 'unflag', 'suspend'].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Must be 'flag', 'unflag', or 'suspend'" });
    }

    // Find the loan
    const loan = await Loan.findById(loanId).populate('borrowerId', 'name email');
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    // Update loan based on action
    let updateData = {};
    let notificationMessage = '';
    let notificationType = '';

    switch (action) {
      case 'flag':
        updateData = { flagged: true, flagReason: reason };
        notificationMessage = `Your loan request for ₹${loan.amount} has been flagged for review. ${reason ? `Reason: ${reason}` : ''}`;
        notificationType = 'loan_flagged';
        break;
      case 'unflag':
        updateData = { flagged: false, $unset: { flagReason: 1 } };
        notificationMessage = `Your loan request for ₹${loan.amount} has been unflagged and is now under normal review.`;
        notificationType = 'loan_unflagged';
        break;
      case 'suspend':
        updateData = { suspended: true, suspendReason: reason, status: 'suspended' };
        notificationMessage = `Your loan request for ₹${loan.amount} has been suspended. ${reason ? `Reason: ${reason}` : ''}`;
        notificationType = 'loan_suspended';
        break;
    }

    // Update the loan
    const updatedLoan = await Loan.findByIdAndUpdate(
      loanId,
      updateData,
      { new: true }
    ).populate('borrowerId', 'name email');

    // Create notification for borrower
    if (updatedLoan.borrowerId) {
      await Notification.create({
        userId: updatedLoan.borrowerId._id,
        type: notificationType,
        message: notificationMessage,
        isRead: false
      });
    }

    res.json({
      success: true,
      message: `Loan ${action}ed successfully`,
      loan: updatedLoan
    });
  } catch (error) {
    console.error('Error moderating loan:', error);
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

// Enhanced Interest Calculation Routes

// Preview interest calculation before loan submission
router.post("/preview-interest", verifyToken, async (req, res) => {
  try {
    console.log('📊 Preview interest request:', req.body);
    const { amount, tenureMonths, interestRate } = req.body;

    // Validate required fields
    if (!amount || !tenureMonths) {
      console.log('❌ Missing required fields:', { amount, tenureMonths });
      return res.status(400).json({ 
        error: "Missing required fields", 
        details: ["Amount and tenure are required"] 
      });
    }

    // Parse and validate numeric values
    const parsedAmount = parseFloat(amount);
    const parsedTenure = parseFloat(tenureMonths);
    const parsedRate = interestRate ? parseFloat(interestRate) : null;

    if (isNaN(parsedAmount) || isNaN(parsedTenure)) {
      console.log('❌ Invalid numeric values:', { parsedAmount, parsedTenure });
      return res.status(400).json({ 
        error: "Invalid numeric values", 
        details: ["Amount and tenure must be valid numbers"] 
      });
    }

    console.log('✅ Parsed values:', { parsedAmount, parsedTenure, parsedRate });

    // Validate loan parameters
    const validation = interestCalculator.validateLoan(parsedAmount, parsedTenure);
    console.log('📋 Validation result:', validation);
    
    if (!validation.isValid) {
      console.log('❌ Validation failed:', validation.errors);
      return res.status(400).json({ 
        error: "Invalid loan parameters", 
        details: validation.errors 
      });
    }

    // Calculate interest details
    console.log('⚙️ Calculating interest...');
    const calculation = interestCalculator.calculateInterest(parsedAmount, parsedTenure, parsedRate);
    const explanation = interestCalculator.getExplanation(calculation);
    console.log('✅ Calculation complete:', { calculation, explanation });

    res.json({
      calculation,
      explanation,
      validation,
      availableTenures: interestCalculator.getAvailableTenures(parsedAmount)
    });
  } catch (error) {
    console.error('❌ Error in preview-interest:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available tenure options for a specific amount
router.get("/tenure-options/:amount", verifyToken, async (req, res) => {
  try {
    const amount = parseFloat(req.params.amount);
    
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const tenures = interestCalculator.getAvailableTenures(amount);
    const tier = interestCalculator.getTierForAmount(amount);

    res.json({
      tenures,
      tier,
      minimumAmount: 100,
      maximumAmount: 100000
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get investment recommendations for lenders
router.get("/investment-recommendations/:amount", verifyToken, async (req, res) => {
  try {
    const investmentAmount = parseFloat(req.params.amount);
    
    if (isNaN(investmentAmount) || investmentAmount <= 0) {
      return res.status(400).json({ error: "Invalid investment amount" });
    }

    const recommendations = interestCalculator.getRecommendationsForLenders(investmentAmount);

    res.json({
      investmentAmount,
      recommendations,
      totalStrategies: recommendations.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get interest tiers and configuration
router.get("/interest-tiers", verifyToken, async (req, res) => {
  try {
    const tiers = interestCalculator.tiers.map(tier => ({
      minAmount: tier.minAmount,
      maxAmount: tier.maxAmount === Infinity ? 'No limit' : tier.maxAmount,
      type: tier.type,
      flatFee: tier.flatFee,
      annualRate: tier.annualRate,
      effectiveRate: tier.effectiveRate,
      maxTenure: tier.maxTenure
    }));

    res.json({
      tiers,
      minimumInterest: interestCalculator.minimumInterest,
      description: "BorrowEase interest calculation tiers"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single loan by ID (for chat access verification) - MUST BE LAST
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('borrowerId', 'name email _id')
      .populate('lenderId', 'name email _id');
    
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    // Check if user is authorized to view this loan
    const userId = req.user.id.toString();
    const borrowerId = loan.borrowerId._id.toString();
    const lenderId = loan.lenderId?._id?.toString();
    
    console.log('Authorization check:', {
      userId,
      borrowerId,
      lenderId,
      userRole: req.user.role
    });

    // Allow access if user is borrower, lender, or admin
    const isAuthorized = userId === borrowerId || 
                        (lenderId && userId === lenderId) || 
                        req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({ 
        error: "Unauthorized to view this loan",
        details: "You can only access loans where you are the borrower or lender"
      });
    }

    res.json(loan);
  } catch (error) {
    console.error("Error fetching loan:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
// This is a basic route setup for the loan feature.
// Token verification is done using Firebase Auth.
// Token helps ensure that only authenticated users can create or fund loans.
// Axios vs Token: Axios is used for making HTTP requests, while the token is used for authentication.
// The token is sent in the request headers to verify the user's identity.