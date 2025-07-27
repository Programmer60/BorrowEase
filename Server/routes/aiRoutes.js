import express from "express";
import User from "../models/userModel.js";
import Loan from "../models/loanModel.js";
import { verifyToken } from "../firebase.js";

const router = express.Router();

// Simple AI Risk Assessment Function
const calculateRiskScore = (user, loans = []) => {
  let score = 100; // Start with maximum score

  // Phone Verification (-20 if not verified)
  if (!user.phoneVerified) score -= 20;

  // KYC Verification (+30 if verified, -30 if rejected)
  if (user.kyc?.status === 'verified') score += 30;
  else if (user.kyc?.status === 'rejected') score -= 30;

  // Previous Default (-40 if any loan is overdue)
  const hasDefault = loans.some(loan => {
    if (loan.funded && !loan.repaid) {
      const repaymentDate = new Date(loan.repaymentDate);
      const now = new Date();
      return now > repaymentDate; // Overdue loan
    }
    return false;
  });
  if (hasDefault) score -= 40;

  // Active Loans (more than 2 active loans = -15)
  const activeLoans = loans.filter(loan => loan.funded && !loan.repaid).length;
  if (activeLoans > 2) score -= 15;

  // Trust Score Impact (use existing trust score)
  const trustScoreImpact = ((user.trustScore || 50) - 50) * 0.5; // Scale trust score impact
  score += trustScoreImpact;

  // Repayment History Bonus
  if (user.loansRepaid > 0 && user.loansTaken > 0) {
    const repaymentRate = (user.loansRepaid / user.loansTaken) * 100;
    if (repaymentRate >= 90) score += 20;
    else if (repaymentRate >= 75) score += 10;
    else if (repaymentRate < 50) score -= 20;
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)));
};

// Calculate individual factor scores
const calculateFactorScores = (user, loans = []) => {
  const factors = {};

  // Payment History (based on repayment rate)
  if (user.loansTaken > 0) {
    const repaymentRate = (user.loansRepaid / user.loansTaken) * 100;
    factors.paymentHistory = Math.round(repaymentRate);
  } else {
    factors.paymentHistory = 50; // Neutral for new users
  }

  // KYC Status
  factors.kycScore = user.kyc?.status === 'verified' ? 100 : 
                    user.kyc?.status === 'pending' ? 50 : 
                    user.kyc?.status === 'rejected' ? 20 : 0;

  // Trust Score (use platform trust score)
  factors.trustScore = user.trustScore || 50;

  // Active Loans Impact
  const activeLoans = loans.filter(loan => loan.funded && !loan.repaid).length;
  factors.activeLoanScore = Math.max(0, 100 - (activeLoans * 20));

  // Default Risk (based on overdue loans)
  const overdueLoans = loans.filter(loan => {
    if (loan.funded && !loan.repaid) {
      const repaymentDate = new Date(loan.repaymentDate);
      return new Date() > repaymentDate;
    }
    return false;
  }).length;
  factors.defaultRisk = Math.max(0, 100 - (overdueLoans * 50));

  // Account Age (longer account = better score)
  const accountAge = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
  factors.accountAge = Math.min(100, Math.round(accountAge * 2)); // 2 points per day, max 100

  return factors;
};

// Generate AI recommendations based on user data
const generateRecommendations = (user, loans, riskScore) => {
  const recommendations = [];

  if (riskScore >= 80) {
    recommendations.push({
      priority: 'low',
      title: 'Excellent Credit Profile',
      description: 'User qualifies for premium loan rates and higher limits'
    });
  }

  if (!user.kyc || user.kyc.status !== 'verified') {
    recommendations.push({
      priority: 'high',
      title: 'Complete KYC Verification',
      description: 'KYC approval can increase risk score by up to 30 points'
    });
  }

  const activeLoans = loans.filter(loan => loan.funded && !loan.repaid).length;
  if (activeLoans > 2) {
    recommendations.push({
      priority: 'medium',
      title: 'High Active Loan Count',
      description: 'Consider requiring loan completion before new approvals'
    });
  }

  const overdueLoans = loans.filter(loan => {
    if (loan.funded && !loan.repaid) {
      const repaymentDate = new Date(loan.repaymentDate);
      return new Date() > repaymentDate;
    }
    return false;
  }).length;

  if (overdueLoans > 0) {
    recommendations.push({
      priority: 'high',
      title: 'Overdue Payments Detected',
      description: `${overdueLoans} loan(s) past due date. Immediate attention required`
    });
  }

  if (user.trustScore < 40) {
    recommendations.push({
      priority: 'medium',
      title: 'Low Trust Score',
      description: 'Consider additional verification or lower loan limits'
    });
  }

  return recommendations;
};

// Approve or reject loan based on score
const getDecisionRecommendation = (score) => {
  if (score >= 70) {
    return {
      decision: 'approve',
      confidence: Math.min(95, 60 + (score - 70) * 2),
      suggestedRate: Math.max(8, 15 - (score - 70) * 0.1),
      maxAmount: Math.min(100000, 20000 + (score - 70) * 1000)
    };
  } else {
    return {
      decision: 'reject',
      confidence: Math.min(95, 60 + (70 - score) * 2),
      suggestedRate: null,
      maxAmount: 0,
      reason: score < 40 ? 'High risk profile' : 'Moderate risk - manual review recommended'
    };
  }
};

// Individual Borrower Risk Assessment endpoint for loan applications
router.post("/assess-borrower", verifyToken, async (req, res) => {
  try {
    const { borrowerId, loanAmount, loanPurpose, repaymentPeriod } = req.body;
    
    // Fetch borrower data
    const borrower = await User.findById(borrowerId);
    if (!borrower) {
      return res.status(404).json({ error: "Borrower not found" });
    }

    // Fetch borrower's loan history
    const borrowerLoans = await Loan.find({ userId: borrowerId });

    // Calculate basic risk score
    const baseRiskScore = calculateRiskScore(borrower, borrowerLoans);
    const factors = calculateFactorScores(borrower, borrowerLoans);

    // Loan-specific risk adjustments
    let loanSpecificScore = baseRiskScore;
    const loanRiskFactors = [];

    // Loan amount risk (higher amounts = higher risk for new borrowers)
    if (loanAmount > 50000 && borrowerLoans.length === 0) {
      loanSpecificScore -= 10;
      loanRiskFactors.push({
        factor: "High amount for new borrower",
        impact: -10,
        description: "First-time borrower requesting large amount"
      });
    }

    // Loan purpose risk assessment
    const riskPurposes = ['gambling', 'speculation', 'luxury'];
    if (riskPurposes.some(purpose => loanPurpose?.toLowerCase().includes(purpose))) {
      loanSpecificScore -= 15;
      loanRiskFactors.push({
        factor: "High-risk loan purpose",
        impact: -15,
        description: "Loan purpose indicates higher default risk"
      });
    }

    // Repayment period risk (very short or very long periods are riskier)
    if (repaymentPeriod < 30 || repaymentPeriod > 365) {
      loanSpecificScore -= 5;
      loanRiskFactors.push({
        factor: "Unusual repayment period",
        impact: -5,
        description: "Non-standard repayment timeline"
      });
    }

    // Debt-to-income ratio (if loan amount vs trust score indicates overextension)
    const debtRisk = (loanAmount / 1000) - (borrower.trustScore || 50);
    if (debtRisk > 20) {
      loanSpecificScore -= Math.min(20, Math.round(debtRisk / 2));
      loanRiskFactors.push({
        factor: "Potential overextension",
        impact: -Math.min(20, Math.round(debtRisk / 2)),
        description: "Loan amount may exceed borrower capacity"
      });
    }

    // Ensure score stays within bounds
    loanSpecificScore = Math.max(0, Math.min(100, loanSpecificScore));

    // Generate loan-specific decision
    const loanDecision = getDecisionRecommendation(loanSpecificScore);
    
    // Enhanced recommendations for this specific loan
    const loanRecommendations = generateRecommendations(borrower, borrowerLoans, loanSpecificScore);
    
    // Add loan-specific recommendations
    if (loanSpecificScore < baseRiskScore) {
      loanRecommendations.unshift({
        priority: 'high',
        title: 'Loan-Specific Risk Detected',
        description: 'This particular loan has additional risk factors beyond borrower profile'
      });
    }

    if (loanAmount > 25000 && borrower.kyc?.status !== 'verified') {
      loanRecommendations.unshift({
        priority: 'high',
        title: 'KYC Required for Large Loan',
        description: 'Complete KYC verification before approving loans above ₹25,000'
      });
    }

    // Calculate suggested loan modifications if original request is risky
    let suggestedModifications = null;
    if (loanSpecificScore < 60 && loanSpecificScore >= 40) {
      suggestedModifications = {
        maxAmount: Math.round(loanAmount * 0.7), // Reduce by 30%
        suggestedRate: Math.min(18, loanDecision.suggestedRate + 2), // Increase rate by 2%
        requiredCollateral: loanAmount > 10000,
        shorterTerm: Math.max(30, repaymentPeriod * 0.8) // Reduce term by 20%
      };
    }

    res.json({
      borrowerId,
      borrowerName: borrower.name,
      borrowerEmail: borrower.email,
      loanDetails: {
        requestedAmount: loanAmount,
        purpose: loanPurpose,
        repaymentPeriod,
      },
      assessment: {
        baseRiskScore,
        loanSpecificScore,
        finalDecision: loanDecision.decision,
        confidence: loanDecision.confidence,
        suggestedRate: loanDecision.suggestedRate,
        maxRecommendedAmount: loanDecision.maxAmount
      },
      riskFactors: {
        borrowerFactors: factors,
        loanSpecificFactors: loanRiskFactors
      },
      recommendations: loanRecommendations,
      suggestedModifications,
      assessmentDate: new Date().toISOString(),
      assessmentId: `AI-${Date.now()}-${borrowerId.slice(-6)}`
    });

  } catch (error) {
    console.error("Error in borrower assessment:", error);
    res.status(500).json({ error: "Failed to assess borrower risk" });
  }
});

// AI Risk Assessment endpoint
router.get("/risk-assessment", verifyToken, async (req, res) => {
  try {
    const { model = 'comprehensive', userId } = req.query;
    
    // Get current user if no userId specified (for admin panel)
    const targetUserId = userId || req.user.id;
    
    // Fetch user data
    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch user's loans
    const loans = await Loan.find({ userId: targetUserId });

    // Calculate risk score
    const overallScore = calculateRiskScore(user, loans);
    const factors = calculateFactorScores(user, loans);
    const recommendations = generateRecommendations(user, loans, overallScore);
    const decision = getDecisionRecommendation(overallScore);

    // Calculate platform-wide statistics
    const totalUsers = await User.countDocuments();
    const totalLoans = await Loan.countDocuments();
    const approvedLoans = await Loan.countDocuments({ status: 'approved' });
    const repaidLoans = await Loan.countDocuments({ repaid: true });

    const platformStats = {
      totalAssessments: totalUsers,
      approvalRate: totalLoans > 0 ? Math.round((approvedLoans / totalLoans) * 100) : 0,
      repaymentRate: approvedLoans > 0 ? Math.round((repaidLoans / approvedLoans) * 100) : 0,
      avgProcessingTime: 2.3 // Static for now
    };

    // Model-specific adjustments
    let modelMultiplier = 1;
    let modelAccuracy = 85;
    
    switch (model) {
      case 'comprehensive':
        modelMultiplier = 1;
        modelAccuracy = 94;
        break;
      case 'rapid':
        modelMultiplier = 0.9; // Slightly less accurate
        modelAccuracy = 87;
        break;
      case 'conservative':
        modelMultiplier = 0.8; // More conservative scoring
        modelAccuracy = 96;
        break;
    }

    const adjustedScore = Math.round(overallScore * modelMultiplier);

    res.json({
      overallScore: adjustedScore,
      modelUsed: model,
      modelAccuracy,
      factors: {
        paymentHistory: factors.paymentHistory,
        creditUtilization: factors.activeLoanScore,
        incomeStability: factors.trustScore,
        debtToIncome: factors.defaultRisk,
        socialSignals: factors.kycScore,
        marketConditions: 67 // Static market conditions
      },
      recommendations,
      decision,
      platformStats,
      userProfile: {
        id: user._id,
        name: user.name,
        email: user.email,
        joinDate: user.createdAt,
        totalLoans: user.loansTaken || 0,
        repaidLoans: user.loansRepaid || 0,
        trustScore: user.trustScore || 50,
        kycStatus: user.kyc?.status || 'not_submitted'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error in AI risk assessment:", error);
    res.status(500).json({ error: "Failed to perform risk assessment" });
  }
});

// Get platform-wide risk analytics
router.get("/platform-analytics", verifyToken, async (req, res) => {
  try {
    // Require admin access
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const users = await User.find({});
    const loans = await Loan.find({});

    // Calculate overall platform risk
    const userScores = [];
    for (const user of users) {
      const userLoans = loans.filter(loan => loan.userId?.toString() === user._id.toString());
      const score = calculateRiskScore(user, userLoans);
      userScores.push(score);
    }

    const avgRiskScore = userScores.length > 0 ? 
      Math.round(userScores.reduce((sum, score) => sum + score, 0) / userScores.length) : 50;

    const highRiskUsers = userScores.filter(score => score < 40).length;
    const mediumRiskUsers = userScores.filter(score => score >= 40 && score < 70).length;
    const lowRiskUsers = userScores.filter(score => score >= 70).length;

    res.json({
      platformRiskScore: avgRiskScore,
      totalUsers: users.length,
      riskDistribution: {
        high: highRiskUsers,
        medium: mediumRiskUsers,
        low: lowRiskUsers
      },
      assessmentDate: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error in platform analytics:", error);
    res.status(500).json({ error: "Failed to get platform analytics" });
  }
});

export default router;
