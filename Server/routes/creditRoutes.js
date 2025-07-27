import express from "express";
import Loan from "../models/loanModel.js";
import User from "../models/userModel.js";
import { verifyToken } from "../firebase.js";

const router = express.Router();

// Calculate credit score for a user
const calculateCreditScore = async (userId) => {
  try {
    // Get user data
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    // Get user's loan history
    const loans = await Loan.find({
      $or: [
        { borrowerId: userId },
        { collegeEmail: user.email }
      ]
    });

    // Base score
    let score = 300;
    
    // Payment History (35% of score - up to 192 points)
    const totalLoans = loans.length;
    const repaidLoans = loans.filter(loan => loan.repaid).length;
    const paymentHistoryScore = totalLoans > 0 ? (repaidLoans / totalLoans) * 192 : 0;
    score += paymentHistoryScore;

    // Credit Utilization (30% of score - up to 165 points)
    const totalBorrowed = loans.reduce((sum, loan) => sum + loan.amount, 0);
    const avgLoanSize = totalBorrowed / (totalLoans || 1);
    const utilizationScore = Math.min(165, Math.max(0, 165 - (avgLoanSize / 10000) * 20));
    score += utilizationScore;

    // Credit History Length (15% of score - up to 82 points)
    const oldestLoan = loans.reduce((oldest, loan) => {
      return !oldest || new Date(loan.createdAt) < new Date(oldest.createdAt) ? loan : oldest;
    }, null);
    
    const historyMonths = oldestLoan ? 
      Math.floor((Date.now() - new Date(oldestLoan.createdAt)) / (1000 * 60 * 60 * 24 * 30)) : 0;
    const historyScore = Math.min(82, historyMonths * 3);
    score += historyScore;

    // Loan Diversity (10% of score - up to 55 points)
    const loanPurposes = new Set(loans.map(loan => loan.purpose));
    const diversityScore = Math.min(55, loanPurposes.size * 15);
    score += diversityScore;

    // KYC and Trust Factors (10% of score - up to 55 points)
    let trustScore = 0;
    if (user.kycStatus === 'verified') trustScore += 30;
    if (user.trustScore > 70) trustScore += 25;
    score += Math.min(55, trustScore);

    // Cap the score at 850
    score = Math.min(850, Math.round(score));

    // Calculate factors
    const factors = {
      paymentHistory: Math.round(paymentHistoryScore),
      creditUtilization: Math.round((100 - (avgLoanSize / 10000) * 20)),
      creditHistory: historyMonths,
      loanDiversity: loanPurposes.size,
      socialScore: user.trustScore || 50,
      kycVerified: user.kycStatus === 'verified'
    };

    // Recent activity
    const recentLoans = loans
      .filter(loan => new Date(loan.createdAt) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    const recentActivity = recentLoans.map(loan => ({
      type: loan.repaid ? 'payment' : 'loan',
      description: loan.repaid ? 
        `Repaid loan of ₹${loan.amount.toLocaleString()}` : 
        `Took loan of ₹${loan.amount.toLocaleString()}`,
      date: new Date(loan.repaid ? loan.updatedAt : loan.createdAt).toLocaleDateString(),
      impact: loan.repaid ? 
        Math.round(loan.amount / 1000) : 
        -Math.round(loan.amount / 2000)
    }));

    return {
      score,
      factors,
      totalLoans,
      repaidLoans,
      totalAmount: totalBorrowed,
      recentActivity,
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    console.error("Error calculating credit score:", error);
    throw error;
  }
};

// Get user's credit score
router.get("/score", verifyToken, async (req, res) => {
  try {
    console.log('🎯 Credit score endpoint hit');
    console.log('👤 User from token:', req.user);
    console.log('🔑 User ID:', req.user?.id);
    console.log('📧 User email:', req.user?.email);
    
    if (!req.user || !req.user.id) {
      console.log('❌ No user ID found in token');
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const userId = req.user.id;
    console.log('📊 Calculating credit score for user:', userId);
    
    const creditData = await calculateCreditScore(userId);
    console.log('✅ Credit score calculated:', creditData);
    
    res.json(creditData);
  } catch (error) {
    console.error("❌ Error fetching credit score:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({ error: "Failed to calculate credit score" });
  }
});

// Update user's trust score (for lenders to rate borrowers)
router.post("/rate", verifyToken, async (req, res) => {
  try {
    const { borrowerId, rating, loanId } = req.body;
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    // Verify the loan exists and the rater is the lender
    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    if (loan.lenderId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Only the lender can rate the borrower" });
    }

    if (!loan.repaid) {
      return res.status(400).json({ error: "Can only rate after loan is repaid" });
    }

    // Update borrower's trust score
    const borrower = await User.findById(borrowerId);
    if (!borrower) {
      return res.status(404).json({ error: "Borrower not found" });
    }

    // Calculate new trust score (weighted average)
    const currentScore = borrower.trustScore || 50;
    const loansCompleted = borrower.loansRepaid || 0;
    const newScore = ((currentScore * loansCompleted) + (rating * 20)) / (loansCompleted + 1);
    
    await User.findByIdAndUpdate(borrowerId, {
      trustScore: Math.round(newScore),
      $inc: { loansRepaid: 1 }
    });

    res.json({ 
      success: true, 
      message: "Rating submitted successfully",
      newTrustScore: Math.round(newScore)
    });

  } catch (error) {
    console.error("Error submitting rating:", error);
    res.status(500).json({ error: "Failed to submit rating" });
  }
});

// Get credit score history (admin only)
router.get("/history/:userId", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    const { userId } = req.params;
    const creditData = await calculateCreditScore(userId);
    
    // Get detailed loan history
    const user = await User.findById(userId);
    const loans = await Loan.find({
      $or: [
        { borrowerId: userId },
        { collegeEmail: user.email }
      ]
    }).sort({ createdAt: -1 });

    res.json({
      ...creditData,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        kycStatus: user.kycStatus
      },
      loanHistory: loans
    });

  } catch (error) {
    console.error("Error fetching credit history:", error);
    res.status(500).json({ error: "Failed to fetch credit history" });
  }
});

// Get credit score statistics (admin only)
router.get("/admin/stats", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    // Get all users and calculate score distribution
    const users = await User.find({ role: { $in: ['borrower', 'lender'] } });
    const scorePromises = users.map(user => calculateCreditScore(user._id));
    const scores = await Promise.all(scorePromises);

    const scoreDistribution = {
      excellent: scores.filter(s => s.score >= 750).length,
      good: scores.filter(s => s.score >= 650 && s.score < 750).length,
      fair: scores.filter(s => s.score >= 550 && s.score < 650).length,
      poor: scores.filter(s => s.score < 550).length
    };

    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

    res.json({
      totalUsers: users.length,
      averageScore: Math.round(avgScore),
      scoreDistribution,
      topScorers: scores
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((s, index) => ({
          rank: index + 1,
          userId: users[scores.indexOf(s)]._id,
          userName: users[scores.indexOf(s)].name,
          score: s.score
        }))
    });

  } catch (error) {
    console.error("Error fetching credit statistics:", error);
    res.status(500).json({ error: "Failed to fetch credit statistics" });
  }
});

// Get credit score by borrower ID (for lenders to view)
router.get("/score/:borrowerId", verifyToken, async (req, res) => {
  try {
    const { borrowerId } = req.params;
    
    // Verify the user is a lender or admin
    if (req.user.role !== "lender" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Lenders and admins only." });
    }

    const creditData = await calculateCreditScore(borrowerId);
    res.json(creditData);

  } catch (error) {
    console.error("Error fetching borrower credit score:", error);
    res.status(500).json({ error: "Failed to fetch credit score" });
  }
});

export default router;
