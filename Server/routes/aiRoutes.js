import express from "express";
import User from "../models/userModel.js";
import Loan from "../models/loanModel.js";
import { verifyToken } from "../firebase.js";

const router = express.Router();

// Import credit score calculation function
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

    return {
      score,
      factors,
      breakdown: {
        paymentHistory: Math.round(paymentHistoryScore),
        creditUtilization: Math.round(utilizationScore),
        creditHistoryLength: Math.round(historyScore),
        loanDiversity: Math.round(diversityScore),
        trustFactors: Math.min(55, trustScore)
      }
    };

  } catch (error) {
    console.error("Error calculating credit score:", error);
    return { score: 300, factors: {}, breakdown: {} }; // Default safe score
  }
};

// Enhanced AI Risk Assessment Function with Credit Score Integration
// Enhanced AI Risk Assessment Function with Credit Score Integration
const calculateRiskScore = async (user, loans = []) => {
  let score = 100; // Start with maximum score
  const riskFactors = [];

  console.log(`🔍 Calculating enhanced risk score for user: ${user.email}`);

  // Get credit score data
  const creditData = await calculateCreditScore(user._id);
  console.log(`📊 Credit score data:`, creditData);

  // 1. Credit Score Impact (40% weight - most important factor)
  if (creditData.score) {
    const creditScoreImpact = ((creditData.score - 300) / 550) * 40; // Normalize 300-850 to 0-40 points
    score += creditScoreImpact;
    
    if (creditData.score >= 750) {
      riskFactors.push({ factor: "Excellent Credit Score", impact: creditScoreImpact, description: `Credit score: ${creditData.score}` });
    } else if (creditData.score >= 650) {
      riskFactors.push({ factor: "Good Credit Score", impact: creditScoreImpact, description: `Credit score: ${creditData.score}` });
    } else if (creditData.score >= 550) {
      riskFactors.push({ factor: "Fair Credit Score", impact: creditScoreImpact, description: `Credit score: ${creditData.score}` });
    } else {
      riskFactors.push({ factor: "Poor Credit Score", impact: creditScoreImpact, description: `Credit score: ${creditData.score}` });
    }
  }

  // 2. Payment History Analysis (25% weight)
  const paymentHistoryScore = creditData.factors?.paymentHistory || 0;
  const paymentImpact = (paymentHistoryScore / 192) * 25; // Normalize to 25 points max
  score += paymentImpact;
  
  if (paymentHistoryScore >= 150) {
    riskFactors.push({ factor: "Excellent Payment History", impact: paymentImpact, description: "Strong track record of on-time payments" });
  } else if (paymentHistoryScore >= 100) {
    riskFactors.push({ factor: "Good Payment History", impact: paymentImpact, description: "Generally reliable payment behavior" });
  } else if (paymentHistoryScore < 50) {
    riskFactors.push({ factor: "Poor Payment History", impact: paymentImpact, description: "History of late or missed payments" });
  }

  // 3. Credit Utilization (15% weight)
  const utilizationScore = creditData.factors?.creditUtilization || 50;
  const utilizationImpact = (utilizationScore / 100) * 15;
  score += utilizationImpact;
  
  if (utilizationScore > 80) {
    riskFactors.push({ factor: "Low Credit Utilization", impact: utilizationImpact, description: "Conservative borrowing behavior" });
  } else if (utilizationScore < 30) {
    riskFactors.push({ factor: "High Credit Utilization", impact: utilizationImpact, description: "High debt-to-limit ratio" });
  }

  // 4. Credit History Length (10% weight)
  const historyMonths = creditData.factors?.creditHistory || 0;
  const historyImpact = Math.min(10, historyMonths * 0.5); // 0.5 points per month, max 10
  score += historyImpact;
  
  if (historyMonths >= 24) {
    riskFactors.push({ factor: "Established Credit History", impact: historyImpact, description: `${historyMonths} months of credit history` });
  } else if (historyMonths < 6) {
    riskFactors.push({ factor: "Limited Credit History", impact: historyImpact, description: `Only ${historyMonths} months of credit history` });
  }

  // 5. KYC and Verification Status (5% weight)
  if (user.kyc?.status === 'verified') {
    score += 5;
    riskFactors.push({ factor: "KYC Verified", impact: 5, description: "Identity verification completed" });
  } else if (user.kyc?.status === 'rejected') {
    score -= 10;
    riskFactors.push({ factor: "KYC Rejected", impact: -10, description: "Identity verification failed" });
  } else {
    score -= 5;
    riskFactors.push({ factor: "KYC Pending", impact: -5, description: "Identity verification not completed" });
  }

  // 6. Active Loan Management (5% weight)
  const activeLoans = loans.filter(loan => loan.funded && !loan.repaid).length;
  if (activeLoans === 0) {
    score += 5;
    riskFactors.push({ factor: "No Active Debt", impact: 5, description: "Currently debt-free" });
  } else if (activeLoans <= 2) {
    score += 2;
    riskFactors.push({ factor: "Manageable Active Loans", impact: 2, description: `${activeLoans} active loan(s)` });
  } else {
    score -= 5;
    riskFactors.push({ factor: "Multiple Active Loans", impact: -5, description: `${activeLoans} active loans - potential overextension` });
  }

  // 7. Default Risk Assessment
  const hasDefault = loans.some(loan => {
    if (loan.funded && !loan.repaid) {
      const repaymentDate = new Date(loan.repaymentDate);
      const now = new Date();
      return now > repaymentDate;
    }
    return false;
  });
  
  if (hasDefault) {
    score -= 25;
    riskFactors.push({ factor: "Active Default", impact: -25, description: "Currently has overdue loan(s)" });
  }

  // 8. Loan Diversity Bonus
  const loanDiversity = creditData.factors?.loanDiversity || 0;
  if (loanDiversity >= 3) {
    score += 5;
    riskFactors.push({ factor: "Diverse Loan Portfolio", impact: 5, description: `Experience with ${loanDiversity} types of loans` });
  }

  // Ensure score is between 0 and 100
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  
  console.log(`✅ Enhanced risk score calculated: ${finalScore}/100`);
  console.log(`📋 Risk factors:`, riskFactors);

  return {
    score: finalScore,
    riskFactors,
    creditData
  };
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
    
    console.log(`🎯 AI Assessment requested for borrower: ${borrowerId}`);
    console.log(`💰 Loan details: ₹${loanAmount}, Purpose: ${loanPurpose}, Period: ${repaymentPeriod} days`);
    
    // Fetch borrower data
    const borrower = await User.findById(borrowerId);
    if (!borrower) {
      return res.status(404).json({ error: "Borrower not found" });
    }

    // Fetch borrower's loan history
    const borrowerLoans = await Loan.find({ userId: borrowerId });

    console.log(`👤 Borrower: ${borrower.name} (${borrower.email})`);
    console.log(`📊 Loan history: ${borrowerLoans.length} loans`);

    // Calculate enhanced risk score with credit data
    const riskAssessment = await calculateRiskScore(borrower, borrowerLoans);
    const baseRiskScore = riskAssessment.score;
    const factors = calculateFactorScores(borrower, borrowerLoans);

    console.log(`📈 Base risk score: ${baseRiskScore}/100`);
    console.log(`💳 Credit score: ${riskAssessment.creditData?.score || 'N/A'}`);

    // Loan-specific risk adjustments
    let loanSpecificScore = baseRiskScore;
    const loanRiskFactors = [...riskAssessment.riskFactors];

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

    console.log(`🎯 Final assessment: ${loanDecision.decision} (${loanDecision.confidence}% confidence)`);

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
      creditProfile: {
        creditScore: riskAssessment.creditData?.score || null,
        creditFactors: riskAssessment.creditData?.factors || {},
        creditBreakdown: riskAssessment.creditData?.breakdown || {}
      },
      riskFactors: {
        borrowerFactors: factors,
        enhancedRiskFactors: loanRiskFactors,
        detailedAnalysis: riskAssessment.riskFactors
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
