/**
 * Enhanced Interest Calculator for BorrowEase
 * Handles both small and large loans with tiered pricing
 */

class InterestCalculator {
  constructor() {
    // Tiered interest structure
    this.tiers = [
      {
        minAmount: 100,
        maxAmount: 500,
        type: 'flat',
        flatFee: 15,
        effectiveRate: 3, // ~3% for small amounts
        maxTenure: 15 // days
      },
      {
        minAmount: 501,
        maxAmount: 1000,
        type: 'flat',
        flatFee: 40,
        effectiveRate: 4, // ~4% for medium amounts
        maxTenure: 30 // days
      },
      {
        minAmount: 1001,
        maxAmount: 3000,
        type: 'flat',
        flatFee: 60,
        effectiveRate: 2, // ~2% for larger amounts
        maxTenure: 60 // days
      },
      {
        minAmount: 3001,
        maxAmount: Infinity,
        type: 'percentage',
        annualRate: 12, // 12% annual for large loans
        effectiveRate: null,
        maxTenure: 365 // days
      }
    ];

    this.minimumInterest = 20; // Minimum ₹20 interest for any loan
  }

  /**
   * Calculate interest based on loan amount and tenure
   * @param {number} amount - Loan amount
   * @param {number} tenureMonths - Tenure in months
   * @param {number} interestRate - Custom interest rate (optional)
   * @returns {Object} Interest calculation details
   */
  calculateInterest(amount, tenureMonths, interestRate = null) {
    const tier = this.getTierForAmount(amount);
    const tenureDays = tenureMonths * 30; // Convert months to days
    
    let interest = 0;
    let calculationMethod = '';
    let details = {};

    if (tier.type === 'flat') {
      // Use flat fee for small loans
      interest = tier.flatFee;
      calculationMethod = 'flat_fee';
      details = {
        flatFee: tier.flatFee,
        effectiveRate: tier.effectiveRate,
        tier: `₹${tier.minAmount}-₹${tier.maxAmount}`
      };
    } else {
      // Use percentage calculation for larger loans
      const rate = interestRate || tier.annualRate;
      const timeInYears = tenureMonths / 12;
      interest = (amount * rate * timeInYears) / 100;
      calculationMethod = 'percentage';
      details = {
        principal: amount,
        rate: rate,
        timeInYears: timeInYears,
        tier: `₹${tier.minAmount}+`
      };
    }

    // Apply minimum interest rule
    interest = Math.max(interest, this.minimumInterest);

    const totalRepayable = amount + interest;
    const emi = this.calculateEMI(totalRepayable, tenureMonths);

    return {
      principal: amount,
      interest: Math.round(interest),
      totalRepayable: Math.round(totalRepayable),
      emi: Math.round(emi),
      tenureMonths,
      tenureDays,
      calculationMethod,
      tier: tier,
      details,
      breakdown: this.getBreakdown(amount, interest, tenureMonths)
    };
  }

  /**
   * Calculate EMI (Equated Monthly Installment)
   * @param {number} totalAmount - Total amount to be repaid
   * @param {number} tenureMonths - Tenure in months
   * @returns {number} EMI amount
   */
  calculateEMI(totalAmount, tenureMonths) {
    return totalAmount / tenureMonths;
  }

  /**
   * Get the appropriate tier for a loan amount
   * @param {number} amount - Loan amount
   * @returns {Object} Tier configuration
   */
  getTierForAmount(amount) {
    return this.tiers.find(tier => 
      amount >= tier.minAmount && amount <= tier.maxAmount
    ) || this.tiers[this.tiers.length - 1]; // Default to last tier
  }

  /**
   * Get available tenure options for a loan amount
   * @param {number} amount - Loan amount
   * @returns {Array} Available tenure options
   */
  getAvailableTenures(amount) {
    const tier = this.getTierForAmount(amount);
    const maxDays = tier.maxTenure;
    
    const tenures = [];
    
    if (maxDays >= 15) tenures.push({ value: 0.5, label: '15 days', days: 15 });
    if (maxDays >= 30) tenures.push({ value: 1, label: '1 month', days: 30 });
    if (maxDays >= 60) tenures.push({ value: 2, label: '2 months', days: 60 });
    if (maxDays >= 90) tenures.push({ value: 3, label: '3 months', days: 90 });
    if (maxDays >= 180) tenures.push({ value: 6, label: '6 months', days: 180 });
    if (maxDays >= 365) tenures.push({ value: 12, label: '12 months', days: 365 });

    return tenures;
  }

  /**
   * Get detailed breakdown of the loan
   * @param {number} principal - Principal amount
   * @param {number} interest - Interest amount
   * @param {number} tenureMonths - Tenure in months
   * @returns {Object} Detailed breakdown
   */
  getBreakdown(principal, interest, tenureMonths) {
    const totalRepayable = principal + interest;
    const emi = totalRepayable / tenureMonths;
    
    return {
      principal: {
        amount: principal,
        percentage: (principal / totalRepayable) * 100
      },
      interest: {
        amount: interest,
        percentage: (interest / totalRepayable) * 100
      },
      monthlyPayment: emi,
      effectiveRate: (interest / principal) * 100,
      totalCost: totalRepayable
    };
  }

  /**
   * Get a user-friendly explanation of the interest calculation
   * @param {Object} calculation - Result from calculateInterest
   * @returns {string} Human-readable explanation
   */
  getExplanation(calculation) {
    if (calculation.calculationMethod === 'flat_fee') {
      return `For loans between ₹${calculation.tier.minAmount}-₹${calculation.tier.maxAmount}, ` +
             `a flat fee of ₹${calculation.details.flatFee} is applied. ` +
             `Total repayable: ₹${calculation.totalRepayable}`;
    } else {
      return `For loans above ₹3000, ${calculation.details.rate}% annual interest is applied. ` +
             `Interest: ₹${calculation.interest} over ${calculation.tenureMonths} months. ` +
             `Total repayable: ₹${calculation.totalRepayable}`;
    }
  }

  /**
   * Validate loan parameters
   * @param {number} amount - Loan amount
   * @param {number} tenure - Tenure in months
   * @returns {Object} Validation result
   */
  validateLoan(amount, tenure) {
    const errors = [];
    
    if (amount < 100) {
      errors.push('Minimum loan amount is ₹100');
    }
    
    if (amount > 100000) {
      errors.push('Maximum loan amount is ₹1,00,000');
    }
    
    const tier = this.getTierForAmount(amount);
    const maxTenureDays = tier.maxTenure;
    const tenureDays = tenure * 30;
    
    if (tenureDays > maxTenureDays) {
      errors.push(`Maximum tenure for this amount is ${maxTenureDays} days`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get recommended loans for lenders based on returns
   * @param {number} investmentAmount - Lender's investment amount
   * @returns {Array} Recommended loan configurations
   */
  getRecommendationsForLenders(investmentAmount) {
    const recommendations = [];
    
    // Small loan strategy - higher effective returns
    if (investmentAmount >= 500) {
      recommendations.push({
        strategy: 'High Volume Small Loans',
        loanAmount: 500,
        quantity: Math.floor(investmentAmount / 500),
        expectedReturn: 15, // ₹15 per ₹500 loan
        totalReturn: Math.floor(investmentAmount / 500) * 15,
        riskLevel: 'low',
        tenure: '15-30 days'
      });
    }
    
    // Medium loan strategy
    if (investmentAmount >= 1000) {
      recommendations.push({
        strategy: 'Balanced Medium Loans',
        loanAmount: 1000,
        quantity: Math.floor(investmentAmount / 1000),
        expectedReturn: 40, // ₹40 per ₹1000 loan
        totalReturn: Math.floor(investmentAmount / 1000) * 40,
        riskLevel: 'medium',
        tenure: '1-2 months'
      });
    }
    
    // Large loan strategy
    if (investmentAmount >= 5000) {
      const calculation = this.calculateInterest(investmentAmount, 6, 12);
      recommendations.push({
        strategy: 'Single Large Loan',
        loanAmount: investmentAmount,
        quantity: 1,
        expectedReturn: calculation.interest,
        totalReturn: calculation.interest,
        riskLevel: 'medium-high',
        tenure: '3-12 months'
      });
    }
    
    return recommendations.sort((a, b) => 
      (b.totalReturn / investmentAmount) - (a.totalReturn / investmentAmount)
    );
  }
}

export default InterestCalculator;
