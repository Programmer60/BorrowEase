import Loan from "../models/loanModel.js";
import User from "../models/userModel.js";

// Shared credit score calculation used by routes
export const calculateCreditScore = async (userId) => {
  // Replicates existing logic from creditRoutes with minor guards
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const loans = await Loan.find({
    $or: [
      { borrowerId: userId },
      { collegeEmail: user.email }
    ]
  });

  let score = 300;

  const totalLoans = loans.length;
  const repaidLoans = loans.filter(loan => loan.repaid).length;
  const paymentHistoryScore = totalLoans > 0 ? (repaidLoans / totalLoans) * 192 : 0;
  score += paymentHistoryScore;

  const totalBorrowed = loans.reduce((sum, loan) => sum + (loan.amount || 0), 0);
  const avgLoanSize = totalBorrowed / (totalLoans || 1);
  const utilizationScore = Math.min(165, Math.max(0, 165 - (avgLoanSize / 10000) * 20));
  score += utilizationScore;

  const oldestLoan = loans.reduce((oldest, loan) => {
    return !oldest || new Date(loan.createdAt) < new Date(oldest.createdAt) ? loan : oldest;
  }, null);
  const historyMonths = oldestLoan ?
    Math.floor((Date.now() - new Date(oldestLoan.createdAt)) / (1000 * 60 * 60 * 24 * 30)) : 0;
  const historyScore = Math.min(82, historyMonths * 3);
  score += historyScore;

  const loanPurposes = new Set(loans.map(loan => loan.purpose));
  const diversityScore = Math.min(55, loanPurposes.size * 15);
  score += diversityScore;

  let trustScore = 0;
  if (user.kycStatus === 'verified') trustScore += 30;
  if (user.trustScore > 70) trustScore += 25;
  score += Math.min(55, trustScore);

  score = Math.min(850, Math.round(score));

  const factors = {
    paymentHistory: Math.round(paymentHistoryScore),
    creditUtilization: Math.round((100 - (avgLoanSize / 10000) * 20)),
    creditHistory: historyMonths,
    loanDiversity: loanPurposes.size,
    socialScore: user.trustScore || 50,
    kycVerified: user.kycStatus === 'verified'
  };

  const recentLoans = loans
    .filter(loan => new Date(loan.createdAt) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const recentActivity = recentLoans.map(loan => ({
    type: loan.repaid ? 'payment' : 'loan',
    description: loan.repaid ?
      `Repaid loan of ₹${(loan.amount || 0).toLocaleString()}` :
      `Took loan of ₹${(loan.amount || 0).toLocaleString()}`,
    date: new Date(loan.repaid ? loan.updatedAt : loan.createdAt).toLocaleDateString(),
    impact: loan.repaid ?
      Math.round((loan.amount || 0) / 1000) :
      -Math.round((loan.amount || 0) / 2000)
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
};
