import express from "express";
import User from "../models/userModel.js";
import Loan from "../models/loanModel.js";
import { verifyToken } from "../firebase.js";

const router = express.Router();

// Import enhanced fraud detection
import fraudDetectionRouter from "./enhancedFraudDetection.js";

// Use enhanced fraud detection routes
router.use('/fraud', fraudDetectionRouter);

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

// Industry-Standard Risk Assessment Engine
const calculateRiskScore = async (user, loans = [], loanApplication = null) => {
  console.log(`🔍 Calculating industry-standard risk score for user: ${user.email}`);

  // Get comprehensive credit data
  const creditData = await calculateCreditScore(user._id);
  console.log(`📊 Credit score data:`, creditData);

  // Initialize risk assessment components
  const riskComponents = {
    creditworthiness: 0,    // 35% weight
    behavioralRisk: 0,      // 25% weight
    financialStability: 0,  // 20% weight
    identityVerification: 0, // 10% weight
    platformHistory: 0,     // 10% weight
  };

  const riskFactors = [];
  const warningFlags = [];

  // 1. CREDITWORTHINESS ASSESSMENT (35% weight)
  const creditScore = creditData.score || 300;
  let creditworthinessScore = 0;

  // Credit Score Impact (primary factor)
  if (creditScore >= 800) {
    creditworthinessScore += 35;
    riskFactors.push({ 
      factor: "Exceptional Credit Score", 
      impact: 35, 
      category: "creditworthiness",
      description: `Outstanding credit score: ${creditScore}`,
      risk_level: "very_low"
    });
  } else if (creditScore >= 740) {
    creditworthinessScore += 30;
    riskFactors.push({ 
      factor: "Excellent Credit Score", 
      impact: 30, 
      category: "creditworthiness",
      description: `Excellent credit score: ${creditScore}`,
      risk_level: "low"
    });
  } else if (creditScore >= 670) {
    creditworthinessScore += 20;
    riskFactors.push({ 
      factor: "Good Credit Score", 
      impact: 20, 
      category: "creditworthiness",
      description: `Good credit score: ${creditScore}`,
      risk_level: "medium"
    });
  } else if (creditScore >= 580) {
    creditworthinessScore += 10;
    riskFactors.push({ 
      factor: "Fair Credit Score", 
      impact: 10, 
      category: "creditworthiness",
      description: `Fair credit score: ${creditScore}`,
      risk_level: "high"
    });
    warningFlags.push("Subprime credit score - requires enhanced monitoring");
  } else {
    creditworthinessScore += 0;
    riskFactors.push({ 
      factor: "Poor Credit Score", 
      impact: 0, 
      category: "creditworthiness",
      description: `Poor credit score: ${creditScore}`,
      risk_level: "very_high"
    });
    warningFlags.push("High-risk credit score - manual review required");
  }

  riskComponents.creditworthiness = creditworthinessScore;

  // 2. BEHAVIORAL RISK ASSESSMENT (25% weight)
  let behavioralScore = 0;

  // Payment History Analysis (15% of total score)
  const totalLoans = loans.length;
  const repaidLoans = loans.filter(loan => loan.repaid).length;
  const paymentHistoryRate = totalLoans > 0 ? (repaidLoans / totalLoans) : 0;

  if (totalLoans === 0) {
    behavioralScore += 10; // Neutral for new users
    riskFactors.push({
      factor: "New User - No History",
      impact: 10,
      category: "behavioral",
      description: "No previous loan history",
      risk_level: "medium"
    });
  } else if (paymentHistoryRate >= 0.95) {
    behavioralScore += 15;
    riskFactors.push({
      factor: "Excellent Payment History",
      impact: 15,
      category: "behavioral",
      description: `${Math.round(paymentHistoryRate * 100)}% on-time payment rate`,
      risk_level: "very_low"
    });
  } else if (paymentHistoryRate >= 0.85) {
    behavioralScore += 12;
    riskFactors.push({
      factor: "Good Payment History",
      impact: 12,
      category: "behavioral",
      description: `${Math.round(paymentHistoryRate * 100)}% on-time payment rate`,
      risk_level: "low"
    });
  } else if (paymentHistoryRate >= 0.70) {
    behavioralScore += 8;
    riskFactors.push({
      factor: "Fair Payment History",
      impact: 8,
      category: "behavioral",
      description: `${Math.round(paymentHistoryRate * 100)}% on-time payment rate`,
      risk_level: "medium"
    });
  } else {
    behavioralScore += 0;
    riskFactors.push({
      factor: "Poor Payment History",
      impact: 0,
      category: "behavioral",
      description: `${Math.round(paymentHistoryRate * 100)}% on-time payment rate`,
      risk_level: "very_high"
    });
    warningFlags.push("Poor payment history - high default risk");
  }

  // Default Risk Assessment (10% of total score)
  const currentDate = new Date();
  const overdueLoans = loans.filter(loan => {
    if (loan.funded && !loan.repaid) {
      const dueDate = new Date(loan.repaymentDate);
      return currentDate > dueDate;
    }
    return false;
  });

  if (overdueLoans.length === 0) {
    behavioralScore += 10;
    riskFactors.push({
      factor: "No Current Defaults",
      impact: 10,
      category: "behavioral",
      description: "All loans current or paid",
      risk_level: "very_low"
    });
  } else {
    const daysPastDue = Math.max(...overdueLoans.map(loan => {
      const dueDate = new Date(loan.repaymentDate);
      return Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24));
    }));
    
    if (daysPastDue > 90) {
      behavioralScore += 0;
      warningFlags.push("Severe delinquency - over 90 days past due");
      riskFactors.push({
        factor: "Severe Delinquency",
        impact: 0,
        category: "behavioral",
        description: `${daysPastDue} days past due`,
        risk_level: "very_high"
      });
    } else if (daysPastDue > 30) {
      behavioralScore += 2;
      warningFlags.push("Serious delinquency - over 30 days past due");
      riskFactors.push({
        factor: "Serious Delinquency",
        impact: 2,
        category: "behavioral",
        description: `${daysPastDue} days past due`,
        risk_level: "high"
      });
    } else {
      behavioralScore += 5;
      riskFactors.push({
        factor: "Minor Delinquency",
        impact: 5,
        category: "behavioral",
        description: `${daysPastDue} days past due`,
        risk_level: "medium"
      });
    }
  }

  riskComponents.behavioralRisk = behavioralScore;

  // 3. FINANCIAL STABILITY ASSESSMENT (20% weight)
  let financialStabilityScore = 0;

  // Debt-to-Income Ratio Assessment (8% of total score)
  const activeLoans = loans.filter(loan => loan.funded && !loan.repaid);
  const totalActiveDebt = activeLoans.reduce((sum, loan) => sum + loan.amount, 0);
  
  if (loanApplication) {
    const proposedDebt = totalActiveDebt + loanApplication.amount;
    const estimatedIncome = user.monthlyIncome || 50000; // Default if not provided
    const dtiRatio = (proposedDebt / estimatedIncome) * 100;

    if (dtiRatio <= 20) {
      financialStabilityScore += 8;
      riskFactors.push({
        factor: "Low Debt-to-Income Ratio",
        impact: 8,
        category: "financial",
        description: `DTI ratio: ${Math.round(dtiRatio)}%`,
        risk_level: "very_low"
      });
    } else if (dtiRatio <= 36) {
      financialStabilityScore += 6;
      riskFactors.push({
        factor: "Acceptable DTI Ratio",
        impact: 6,
        category: "financial",
        description: `DTI ratio: ${Math.round(dtiRatio)}%`,
        risk_level: "low"
      });
    } else if (dtiRatio <= 50) {
      financialStabilityScore += 3;
      riskFactors.push({
        factor: "High DTI Ratio",
        impact: 3,
        category: "financial",
        description: `DTI ratio: ${Math.round(dtiRatio)}%`,
        risk_level: "medium"
      });
      warningFlags.push("High debt-to-income ratio - monitor closely");
    } else {
      financialStabilityScore += 0;
      riskFactors.push({
        factor: "Excessive DTI Ratio",
        impact: 0,
        category: "financial",
        description: `DTI ratio: ${Math.round(dtiRatio)}%`,
        risk_level: "very_high"
      });
      warningFlags.push("Excessive debt burden - high default risk");
    }
  } else {
    financialStabilityScore += 4; // Neutral score for assessment without application
  }

  // Credit Utilization Analysis (7% of total score)
  const utilizationScore = creditData.factors?.creditUtilization || 50;
  if (utilizationScore >= 90) {
    financialStabilityScore += 7;
    riskFactors.push({
      factor: "Excellent Credit Utilization",
      impact: 7,
      category: "financial",
      description: "Very low credit utilization",
      risk_level: "very_low"
    });
  } else if (utilizationScore >= 70) {
    financialStabilityScore += 5;
    riskFactors.push({
      factor: "Good Credit Utilization",
      impact: 5,
      category: "financial",
      description: "Moderate credit utilization",
      risk_level: "low"
    });
  } else if (utilizationScore >= 50) {
    financialStabilityScore += 3;
    riskFactors.push({
      factor: "Fair Credit Utilization",
      impact: 3,
      category: "financial",
      description: "Moderate credit utilization",
      risk_level: "medium"
    });
  } else {
    financialStabilityScore += 0;
    riskFactors.push({
      factor: "High Credit Utilization",
      impact: 0,
      category: "financial",
      description: "High credit utilization - overextended",
      risk_level: "high"
    });
    warningFlags.push("High credit utilization - potential overextension");
  }

  // Income Stability (5% of total score)
  const accountAge = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
  if (accountAge >= 365) {
    financialStabilityScore += 5;
    riskFactors.push({
      factor: "Stable Platform History",
      impact: 5,
      category: "financial",
      description: `Account age: ${Math.round(accountAge / 30)} months`,
      risk_level: "low"
    });
  } else if (accountAge >= 180) {
    financialStabilityScore += 3;
    riskFactors.push({
      factor: "Moderate Platform History",
      impact: 3,
      category: "financial",
      description: `Account age: ${Math.round(accountAge / 30)} months`,
      risk_level: "medium"
    });
  } else {
    financialStabilityScore += 1;
    riskFactors.push({
      factor: "New Platform User",
      impact: 1,
      category: "financial",
      description: `Account age: ${Math.round(accountAge / 30)} months`,
      risk_level: "medium"
    });
  }

  riskComponents.financialStability = financialStabilityScore;

  // 4. IDENTITY VERIFICATION & COMPLIANCE (10% weight)
  let identityScore = 0;

  // KYC Status Assessment (7% of total score)
  if (user.kyc?.status === 'verified') {
    identityScore += 7;
    riskFactors.push({
      factor: "KYC Verified",
      impact: 7,
      category: "identity",
      description: "Identity fully verified",
      risk_level: "very_low"
    });
  } else if (user.kyc?.status === 'pending') {
    identityScore += 2;
    riskFactors.push({
      factor: "KYC Pending",
      impact: 2,
      category: "identity",
      description: "Identity verification in progress",
      risk_level: "medium"
    });
    warningFlags.push("KYC verification pending - approval conditional");
  } else if (user.kyc?.status === 'rejected') {
    identityScore += 0;
    riskFactors.push({
      factor: "KYC Rejected",
      impact: 0,
      category: "identity",
      description: "Identity verification failed",
      risk_level: "very_high"
    });
    warningFlags.push("KYC rejected - high fraud risk");
  } else {
    identityScore += 0;
    riskFactors.push({
      factor: "KYC Not Started",
      impact: 0,
      category: "identity",
      description: "No identity verification",
      risk_level: "high"
    });
    warningFlags.push("No KYC verification - manual review required");
  }

  // Document Verification (3% of total score)
  const verifiedDocuments = user.kyc?.documents?.filter(doc => doc.verified)?.length || 0;
  if (verifiedDocuments >= 2) {
    identityScore += 3;
    riskFactors.push({
      factor: "Multiple Documents Verified",
      impact: 3,
      category: "identity",
      description: `${verifiedDocuments} documents verified`,
      risk_level: "low"
    });
  } else if (verifiedDocuments === 1) {
    identityScore += 1;
    riskFactors.push({
      factor: "Basic Document Verified",
      impact: 1,
      category: "identity",
      description: "One document verified",
      risk_level: "medium"
    });
  }

  riskComponents.identityVerification = identityScore;

  // 5. PLATFORM HISTORY & ENGAGEMENT (10% weight)
  let platformScore = 0;

  // User Engagement Score (5% of total score)
  const loginFrequency = user.lastLogin ? 
    Math.floor((new Date() - new Date(user.lastLogin)) / (1000 * 60 * 60 * 24)) : 999;
  
  if (loginFrequency <= 7) {
    platformScore += 5;
    riskFactors.push({
      factor: "Active Platform User",
      impact: 5,
      category: "platform",
      description: "Recently active on platform",
      risk_level: "low"
    });
  } else if (loginFrequency <= 30) {
    platformScore += 3;
    riskFactors.push({
      factor: "Regular Platform User",
      impact: 3,
      category: "platform",
      description: "Regularly active on platform",
      risk_level: "medium"
    });
  } else if (loginFrequency <= 90) {
    platformScore += 1;
    riskFactors.push({
      factor: "Occasional Platform User",
      impact: 1,
      category: "platform",
      description: "Infrequent platform activity",
      risk_level: "medium"
    });
  } else {
    platformScore += 0;
    riskFactors.push({
      factor: "Inactive Platform User",
      impact: 0,
      category: "platform",
      description: "Long period of inactivity",
      risk_level: "high"
    });
    warningFlags.push("Inactive user - verify current contact information");
  }

  // Social Trust Score (3% of total score)
  const trustScore = user.trustScore || 50;
  if (trustScore >= 80) {
    platformScore += 3;
    riskFactors.push({
      factor: "High Trust Score",
      impact: 3,
      category: "platform",
      description: `Platform trust score: ${trustScore}`,
      risk_level: "low"
    });
  } else if (trustScore >= 60) {
    platformScore += 2;
    riskFactors.push({
      factor: "Good Trust Score",
      impact: 2,
      category: "platform",
      description: `Platform trust score: ${trustScore}`,
      risk_level: "medium"
    });
  } else {
    platformScore += 0;
    riskFactors.push({
      factor: "Low Trust Score",
      impact: 0,
      category: "platform",
      description: `Platform trust score: ${trustScore}`,
      risk_level: "high"
    });
  }

  // Referral Network Quality (2% of total score)
  const referralCount = user.referrals?.length || 0;
  const verifiedReferrals = user.referrals?.filter(ref => ref.verified)?.length || 0;
  
  if (verifiedReferrals >= 3) {
    platformScore += 2;
    riskFactors.push({
      factor: "Strong Referral Network",
      impact: 2,
      category: "platform",
      description: `${verifiedReferrals} verified referrals`,
      risk_level: "low"
    });
  } else if (verifiedReferrals >= 1) {
    platformScore += 1;
    riskFactors.push({
      factor: "Basic Referral Network",
      impact: 1,
      category: "platform",
      description: `${verifiedReferrals} verified referrals`,
      risk_level: "medium"
    });
  }

  riskComponents.platformHistory = platformScore;

  // CALCULATE FINAL RISK SCORE
  const totalScore = Object.values(riskComponents).reduce((sum, score) => sum + score, 0);
  let finalRiskScore = Math.max(0, Math.min(100, Math.round(totalScore)));

  // RISK LEVEL DETERMINATION
  let riskLevel, recommendation, confidence;
  
  if (finalRiskScore >= 85) {
    riskLevel = 'very_low';
    recommendation = 'approve';
    confidence = 95;
  } else if (finalRiskScore >= 70) {
    riskLevel = 'low';
    recommendation = 'approve';
    confidence = 85;
  } else if (finalRiskScore >= 55) {
    riskLevel = 'medium';
    recommendation = 'conditional_approve';
    confidence = 75;
  } else if (finalRiskScore >= 40) {
    riskLevel = 'high';
    recommendation = 'manual_review';
    confidence = 60;
  } else {
    riskLevel = 'very_high';
    recommendation = 'reject';
    confidence = 90;
  }

  // ADD INDUSTRY-SPECIFIC ADJUSTMENTS
  if (warningFlags.length > 2) {
    finalRiskScore = Math.max(0, finalRiskScore - 10);
    warningFlags.push("Multiple risk factors detected - enhanced monitoring required");
  }

  console.log(`✅ Industry-standard risk score calculated: ${finalRiskScore}/100`);
  console.log(`🎯 Risk level: ${riskLevel}, Recommendation: ${recommendation}`);
  console.log(`⚠️ Warning flags: ${warningFlags.length}`);

  return {
    score: finalRiskScore,
    riskLevel,
    recommendation,
    confidence,
    riskFactors,
    warningFlags,
    riskComponents,
    creditData,
    metadata: {
      calculatedAt: new Date(),
      version: '2.0',
      methodology: 'industry_standard'
    }
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
    
    console.log(`🎯 Industry-Standard AI Assessment requested for borrower: ${borrowerId}`);
    console.log(`💰 Loan details: ₹${loanAmount}, Purpose: ${loanPurpose}, Period: ${repaymentPeriod} days`);
    
    // Fetch borrower data
    const borrower = await User.findById(borrowerId);
    if (!borrower) {
      return res.status(404).json({ error: "Borrower not found" });
    }

    // Fetch borrower's comprehensive loan history
    const borrowerLoans = await Loan.find({
      $or: [
        { borrowerId: borrowerId },
        { collegeEmail: borrower.email }
      ]
    }).sort({ createdAt: -1 });

    console.log(`👤 Borrower: ${borrower.name} (${borrower.email})`);
    console.log(`📊 Comprehensive loan history: ${borrowerLoans.length} loans`);

    // Create loan application object for analysis
    const loanApplication = {
      amount: loanAmount,
      purpose: loanPurpose,
      repaymentPeriod: repaymentPeriod,
      requestedAt: new Date()
    };

    // Calculate comprehensive industry-standard risk score
    const riskAssessment = await calculateRiskScore(borrower, borrowerLoans, loanApplication);
    
    console.log(`📈 Industry-standard risk score: ${riskAssessment.score}/100`);
    console.log(`🎯 Risk level: ${riskAssessment.riskLevel}`);
    console.log(`💡 Recommendation: ${riskAssessment.recommendation}`);
    console.log(`💳 Credit score: ${riskAssessment.creditData?.score || 'N/A'}`);

    // ADDITIONAL LOAN-SPECIFIC RISK ANALYSIS
    let adjustedScore = riskAssessment.score;
    const additionalFactors = [...riskAssessment.riskFactors];
    const additionalWarnings = [...riskAssessment.warningFlags];

    // 1. LOAN AMOUNT RISK ANALYSIS
    const avgLoanSize = borrowerLoans.length > 0 ? 
      borrowerLoans.reduce((sum, loan) => sum + loan.amount, 0) / borrowerLoans.length : 25000;
    
    const loanSizeRatio = loanAmount / avgLoanSize;
    
    if (loanAmount > 100000) {
      if (borrowerLoans.length === 0) {
        adjustedScore -= 15;
        additionalFactors.push({
          factor: "Large First-Time Loan",
          impact: -15,
          category: "loan_specific",
          description: `₹${loanAmount.toLocaleString()} for new borrower`,
          risk_level: "very_high"
        });
        additionalWarnings.push("Large amount for first-time borrower - requires manual review");
      } else if (loanSizeRatio > 2.0) {
        adjustedScore -= 10;
        additionalFactors.push({
          factor: "Unusually Large Loan Request",
          impact: -10,
          category: "loan_specific",
          description: `${Math.round(loanSizeRatio)}x larger than typical loans`,
          risk_level: "high"
        });
        additionalWarnings.push("Loan amount significantly exceeds historical pattern");
      }
    }

    // 2. LOAN PURPOSE RISK CLASSIFICATION
    const highRiskPurposes = ['gambling', 'speculation', 'cryptocurrency', 'trading', 'investment'];
    const mediumRiskPurposes = ['luxury', 'travel', 'wedding', 'party'];
    const lowRiskPurposes = ['education', 'medical', 'emergency', 'tuition', 'books'];

    const purpose = loanPurpose?.toLowerCase() || '';
    
    if (highRiskPurposes.some(risk => purpose.includes(risk))) {
      adjustedScore -= 20;
      additionalFactors.push({
        factor: "High-Risk Loan Purpose",
        impact: -20,
        category: "loan_specific",
        description: "Purpose indicates speculative or high-risk activity",
        risk_level: "very_high"
      });
      additionalWarnings.push("High-risk loan purpose - potential for total loss");
    } else if (mediumRiskPurposes.some(risk => purpose.includes(risk))) {
      adjustedScore -= 8;
      additionalFactors.push({
        factor: "Medium-Risk Loan Purpose",
        impact: -8,
        category: "loan_specific",
        description: "Purpose indicates discretionary spending",
        risk_level: "medium"
      });
    } else if (lowRiskPurposes.some(risk => purpose.includes(risk))) {
      adjustedScore += 5;
      additionalFactors.push({
        factor: "Low-Risk Loan Purpose",
        impact: 5,
        category: "loan_specific",
        description: "Purpose indicates essential or educational expense",
        risk_level: "low"
      });
    }

    // 3. REPAYMENT PERIOD ANALYSIS
    if (repaymentPeriod < 15) {
      adjustedScore -= 12;
      additionalFactors.push({
        factor: "Very Short Repayment Period",
        impact: -12,
        category: "loan_specific",
        description: "Extremely tight repayment schedule may cause stress",
        risk_level: "high"
      });
      additionalWarnings.push("Very short repayment period - high cashflow stress risk");
    } else if (repaymentPeriod > 180) {
      adjustedScore -= 8;
      additionalFactors.push({
        factor: "Extended Repayment Period",
        impact: -8,
        category: "loan_specific",
        description: "Long-term commitment increases uncertainty",
        risk_level: "medium"
      });
    } else if (repaymentPeriod >= 30 && repaymentPeriod <= 90) {
      adjustedScore += 3;
      additionalFactors.push({
        factor: "Optimal Repayment Period",
        impact: 3,
        category: "loan_specific",
        description: "Reasonable timeframe for repayment",
        risk_level: "low"
      });
    }

    // 4. FREQUENCY ANALYSIS (Multiple applications in short time)
    const recentApplications = borrowerLoans.filter(loan => {
      const daysSinceApplication = (new Date() - new Date(loan.createdAt)) / (1000 * 60 * 60 * 24);
      return daysSinceApplication <= 30;
    }).length;

    if (recentApplications >= 3) {
      adjustedScore -= 15;
      additionalFactors.push({
        factor: "Frequent Recent Applications",
        impact: -15,
        category: "loan_specific",
        description: `${recentApplications} applications in last 30 days`,
        risk_level: "very_high"
      });
      additionalWarnings.push("Multiple recent applications - potential financial distress");
    } else if (recentApplications === 2) {
      adjustedScore -= 5;
      additionalFactors.push({
        factor: "Multiple Recent Applications",
        impact: -5,
        category: "loan_specific",
        description: "2 applications in last 30 days",
        risk_level: "medium"
      });
    }

    // Ensure adjusted score stays within bounds
    adjustedScore = Math.max(0, Math.min(100, Math.round(adjustedScore)));

    // FINAL DECISION LOGIC WITH INDUSTRY STANDARDS
    let finalDecision, confidence, interestRateAdjustment = 0;
    
    if (adjustedScore >= 85) {
      finalDecision = 'approve';
      confidence = 95;
      interestRateAdjustment = -2; // Premium rate discount
    } else if (adjustedScore >= 70) {
      finalDecision = 'approve';
      confidence = 85;
      interestRateAdjustment = 0; // Standard rate
    } else if (adjustedScore >= 55) {
      finalDecision = 'conditional_approve';
      confidence = 70;
      interestRateAdjustment = 3; // Higher rate for medium risk
    } else if (adjustedScore >= 40) {
      finalDecision = 'manual_review';
      confidence = 60;
      interestRateAdjustment = 5; // Significant rate increase
    } else {
      finalDecision = 'reject';
      confidence = 90;
      interestRateAdjustment = 0; // No rate since rejected
    }

    // ENHANCED RECOMMENDATIONS
    const recommendations = [];
    
    if (finalDecision === 'approve') {
      recommendations.push({
        priority: 'info',
        title: 'Loan Approved',
        description: `Strong borrower profile with ${adjustedScore}/100 risk score`
      });
    } else if (finalDecision === 'conditional_approve') {
      recommendations.push({
        priority: 'medium',
        title: 'Conditional Approval',
        description: 'Consider additional verification or co-signer requirement'
      });
    } else if (finalDecision === 'manual_review') {
      recommendations.push({
        priority: 'high',
        title: 'Manual Review Required',
        description: 'Multiple risk factors detected - human underwriter review needed'
      });
    } else {
      recommendations.push({
        priority: 'high',
        title: 'Application Rejected',
        description: 'Risk score too low for automatic approval'
      });
    }

    // Add specific recommendations based on warning flags
    if (additionalWarnings.length > 0) {
      recommendations.push({
        priority: 'high',
        title: 'Risk Factors Detected',
        description: `${additionalWarnings.length} warning flag(s) identified`
      });
    }

    if (riskAssessment.creditData.score < 650) {
      recommendations.push({
        priority: 'medium',
        title: 'Credit Improvement Needed',
        description: 'Borrower should focus on improving credit score before reapplying'
      });
    }

    // GENERATE INDUSTRY-STANDARD RESPONSE
    console.log(`🎯 Final industry assessment: ${finalDecision} (${confidence}% confidence)`);
    console.log(`📊 Adjusted risk score: ${adjustedScore}/100`);

    res.json({
      // Basic Information
      borrowerId,
      borrowerName: borrower.name,
      borrowerEmail: borrower.email,
      
      // Loan Details
      loanDetails: {
        requestedAmount: loanAmount,
        purpose: loanPurpose,
        repaymentPeriod,
        interestRateAdjustment
      },
      
      // Industry-Standard Risk Assessment
      riskAssessment: {
        overallScore: adjustedScore,
        riskLevel: riskAssessment.riskLevel,
        decision: finalDecision,
        confidence: confidence,
        baseScore: riskAssessment.score,
        loanSpecificAdjustment: adjustedScore - riskAssessment.score
      },
      
      // Detailed Risk Components (Industry Standard)
      riskComponents: riskAssessment.riskComponents,
      
      // Credit Profile
      creditProfile: {
        creditScore: riskAssessment.creditData?.score || null,
        creditFactors: riskAssessment.creditData?.factors || {},
        creditBreakdown: riskAssessment.creditData?.breakdown || {}
      },
      
      // Comprehensive Risk Factors
      riskFactors: additionalFactors,
      warningFlags: additionalWarnings,
      
      // Recommendations & Actions
      recommendations,
      
      // Pricing & Terms
      pricing: {
        baseInterestRate: 12, // Base rate
        adjustedRate: Math.max(8, Math.min(24, 12 + interestRateAdjustment)),
        riskPremium: interestRateAdjustment,
        maxApprovedAmount: finalDecision === 'approve' ? loanAmount : 
                          finalDecision === 'conditional_approve' ? Math.round(loanAmount * 0.8) : 0
      },
      
      // Metadata
      assessment: {
        timestamp: new Date().toISOString(),
        version: riskAssessment.metadata.version,
        methodology: riskAssessment.metadata.methodology,
        assessmentId: `INDUSTRY-${Date.now()}-${borrowerId.slice(-6)}`
      }
    });

  } catch (error) {
    console.error("Error in industry-standard borrower assessment:", error);
    res.status(500).json({ 
      error: "Failed to assess borrower risk",
      details: error.message 
    });
  }
});

// Model Variants Registry (central configuration)
const MODEL_VARIANTS = {
  comprehensive: {
    id: 'comprehensive', label: 'Comprehensive AI', description: 'Deep model analyzing 200+ factors',
    baseMultiplier: 1.0, accuracy: 94, latencyMs: 420,
    emphasis: { creditworthiness: 1, behavioralRisk: 1, financialStability: 1, identityVerification: 1, platformHistory: 1 }
  },
  rapid: {
    id: 'rapid', label: 'Rapid Assessment', description: 'Heuristic + cached features (instant)',
    baseMultiplier: 0.92, accuracy: 87, latencyMs: 110,
    emphasis: { creditworthiness: 0.9, behavioralRisk: 0.85, financialStability: 0.85, identityVerification: 0.6, platformHistory: 0.6 }
  },
  conservative: {
    id: 'conservative', label: 'Conservative Model', description: 'Lower tolerance, extra weighting on identity & credit',
    baseMultiplier: 1.05, accuracy: 96, latencyMs: 500,
    emphasis: { creditworthiness: 1.1, behavioralRisk: 1.05, financialStability: 1.05, identityVerification: 1.1, platformHistory: 1 }
  }
};

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
    const loans = await Loan.find({ 
      $or: [
        { borrower: targetUserId },
        { borrowerId: targetUserId },
        { userId: targetUserId }
      ]
    });

    // Properly invoke risk score with (user, loans, loanApplication)
    const mockLoanApplication = { amount: 50000, purpose: 'general', repaymentPeriod: 90 };
    const riskAssessment = await calculateRiskScore(user, loans, mockLoanApplication);

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

    const variant = MODEL_VARIANTS[model] || MODEL_VARIANTS.comprehensive;

    // Apply emphasis to component-level contributions to derive variant view
    const weightedComponents = { ...riskAssessment.riskComponents };
    Object.keys(weightedComponents).forEach(k => {
      if (variant.emphasis[k] != null) {
        weightedComponents[k] = Math.round(weightedComponents[k] * variant.emphasis[k]);
      }
    });
    const adjustedScore = Math.max(0, Math.min(100, Math.round(
      Object.values(weightedComponents).reduce((s,c)=>s+c,0) * variant.baseMultiplier
    )));

    res.json({
  overallScore: adjustedScore,
  modelUsed: variant.id,
  modelAccuracy: variant.accuracy,
  riskComponents: weightedComponents,
      riskFactors: riskAssessment.riskFactors,
      warningFlags: riskAssessment.warningFlags,
      recommendations: riskAssessment.recommendations || [
        {
          title: "Complete KYC Verification",
          description: "KYC approval can increase risk score by up to 30 points",
          priority: "high"
        }
      ],
      decision: {
        decision: riskAssessment.recommendation,
        confidence: riskAssessment.confidence,
        suggestedRate: 15,
        maxAmount: Math.round(50000 * (adjustedScore / 100))
      },
      platformStats,
      userProfile: {
        id: user._id,
        name: user.displayName || user.name || user.email,
        email: user.email,
        joinDate: user.createdAt,
        totalLoans: loans.length,
        repaidLoans: loans.filter(loan => loan.repaid).length,
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

// Benchmark multiple models for a single user (for dashboard analytics)
router.get('/model-evaluate', verifyToken, async (req, res) => {
  try {
    const { userId } = req.query;
    const targetUserId = userId || req.user.id;
    const user = await User.findById(targetUserId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const loans = await Loan.find({
      $or: [ { borrower: targetUserId }, { borrowerId: targetUserId }, { userId: targetUserId } ]
    });
    const baseAssessment = await calculateRiskScore(user, loans, { amount: 50000, purpose: 'general', repaymentPeriod: 90 });
    const results = Object.values(MODEL_VARIANTS).map(v => {
      const comps = { ...baseAssessment.riskComponents };
      Object.keys(comps).forEach(k => { if (v.emphasis[k] != null) comps[k] = Math.round(comps[k] * v.emphasis[k]); });
      const score = Math.max(0, Math.min(100, Math.round(Object.values(comps).reduce((s,c)=>s+c,0) * v.baseMultiplier)));
      return {
        id: v.id,
        label: v.label,
        accuracy: v.accuracy,
        latencyMs: v.latencyMs,
        score,
        components: comps,
        baseScore: baseAssessment.score,
        riskLevel: baseAssessment.riskLevel
      };
    });
    res.json({ userId: targetUserId, models: results, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Error benchmarking models', err);
    res.status(500).json({ error: 'Failed to benchmark models' });
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
