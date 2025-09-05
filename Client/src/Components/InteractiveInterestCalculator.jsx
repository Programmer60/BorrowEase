import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  BarChart3,
  Info,
  Target,
  PieChart,
  AlertCircle
} from 'lucide-react';
import API from '../api/api';
import { useTheme } from '../contexts/ThemeContext';

const InteractiveInterestCalculator = () => {
  const { isDark } = useTheme();
  const [calculatorData, setCalculatorData] = useState({
    amount: 1000,
    tenureMonths: 0.5, // Start with 15 days for small loans
    customRate: ''
  });

  const [calculations, setCalculations] = useState([]);
  const [currentCalculation, setCurrentCalculation] = useState(null);
  const [interestTiers, setInterestTiers] = useState([]);
  const [tenureOptions, setTenureOptions] = useState([
    { value: 0.5, label: '15 Days', days: 15 },
    { value: 1, label: '1 Month', days: 30 },
    { value: 2, label: '2 Months', days: 60 },
    { value: 3, label: '3 Months', days: 90 },
    { value: 6, label: '6 Months', days: 180 },
    { value: 12, label: '12 Months', days: 365 }
  ]);
  const [investmentRecommendations, setInvestmentRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchInterestTiers();
  }, []);

  useEffect(() => {
    validateInputs();
    if (calculatorData.amount >= 100 && !errors.amount && !errors.customRate) {
      fetchTenureOptions();
      fetchInvestmentRecommendations();
      calculateInterest();
    } else {
      setCurrentCalculation(null);
    }
  }, [calculatorData.amount, calculatorData.tenureMonths, calculatorData.customRate]);

  const validateInputs = () => {
    const newErrors = {};

    // Validate amount
    if (calculatorData.amount < 100) {
      newErrors.amount = 'Minimum loan amount is ₹100';
    } else if (calculatorData.amount > 100000) {  // Changed from 10,00,000 to 1,00,000
      newErrors.amount = 'Maximum loan amount is ₹1,00,000';
    }

    // Validate custom rate
    if (calculatorData.customRate !== '') {
      const rate = parseFloat(calculatorData.customRate);
      if (isNaN(rate) || rate < 0) {
        newErrors.customRate = 'Interest rate must be a positive number';
      } else if (rate > 100) {
        newErrors.customRate = 'Interest rate cannot exceed 100%';
      }
    }

    setErrors(newErrors);
  };

  const fetchInterestTiers = async () => {
    try {
      const response = await API.get('/loans/interest-tiers');
      setInterestTiers(response.data.tiers || []);
    } catch (error) {
      console.error('Error fetching interest tiers:', error);
      // Set default tiers if API fails
      setInterestTiers([
        {
          name: "Micro Loans",
          minAmount: 100,
          maxAmount: 5000,
          type: "flat",
          flatFee: 50,
          description: "Small loans with flat processing fee"
        },
        {
          name: "Standard Loans", 
          minAmount: 5001,
          maxAmount: 50000,
          type: "percentage",
          annualRate: 12,
          description: "Regular loans with competitive interest rates"
        },
        {
          name: "Premium Loans",
          minAmount: 50001,
          maxAmount: "No limit",
          type: "percentage", 
          annualRate: 10,
          description: "Large loans with preferential rates"
        }
      ]);
    }
  };

  const fetchTenureOptions = async () => {
    try {
      const response = await API.get(`/loans/tenure-options/${calculatorData.amount}`);
      setTenureOptions(response.data.tenures);
    } catch (error) {
      console.error('Error fetching tenure options:', error);
    }
  };

  const fetchInvestmentRecommendations = async () => {
    try {
      const response = await API.get(`/loans/investment-recommendations/${calculatorData.amount}`);
      setInvestmentRecommendations(response.data);
    } catch (error) {
      console.error('Error fetching investment recommendations:', error);
    }
  };

  const calculateInterest = async () => {
    if (calculatorData.amount < 100 || errors.amount || errors.customRate) return;
    
    try {
      setLoading(true);
      
      // Try API first
      try {
        const response = await API.post('/loans/preview-interest', {
          amount: calculatorData.amount,
          tenureMonths: calculatorData.tenureMonths,
          interestRate: calculatorData.customRate ? parseFloat(calculatorData.customRate) : null
        });
        setCurrentCalculation(response.data);
        setErrors({}); // Clear any previous errors
        return;
      } catch (apiError) {
        // Handle validation errors (400) differently from other errors
        if (apiError.response?.status === 400) {
          const errorData = apiError.response.data;
          if (errorData.details && Array.isArray(errorData.details)) {
            // Set validation errors from API
            setErrors({ 
              amount: errorData.details.includes('Maximum loan amount is ₹1,00,000') ? 'Maximum loan amount is ₹1,00,000' : '',
              tenure: errorData.details.find(err => err.includes('tenure')) || '',
              general: errorData.details.join(', ')
            });
            setCurrentCalculation(null);
            return;
          } else if (errorData.error) {
            setErrors({ 
              general: errorData.error 
            });
            setCurrentCalculation(null);
            return;
          }
        }
        
        console.warn('API calculation failed, using local calculation:', apiError);
      }

      // Fallback to local calculation
      const tier = getTierInfo(calculatorData.amount);
      let calculation;
      
      if (!tier) {
        setCurrentCalculation(null);
        return;
      }

      const principal = calculatorData.amount;
      const tenureMonths = calculatorData.tenureMonths;
      const customRate = calculatorData.customRate ? parseFloat(calculatorData.customRate) : null;

      if (tier.type === 'flat' && !customRate) {
        // Flat fee calculation
        const interest = tier.flatFee;
        const totalRepayable = principal + interest;
        
        calculation = {
          principal,
          interest,
          totalRepayable,
          interestRate: ((interest / principal) * 100).toFixed(2),
          tenureMonths,
          calculationMethod: 'flat_fee',
          emi: tenureMonths > 1 ? Math.ceil(totalRepayable / tenureMonths) : totalRepayable,
          breakdown: {
            effectiveRate: ((interest / principal) * (12 / tenureMonths) * 100),
            dailyRate: ((interest / principal) * (365 / (tenureMonths * 30)) * 100)
          }
        };
      } else {
        // Percentage-based calculation
        const annualRate = customRate || tier.annualRate;
        const monthlyRate = annualRate / 12 / 100;
        
        let interest, totalRepayable, emi;
        
        if (tenureMonths <= 3) {
          // Simple interest for short-term loans
          interest = Math.round((principal * annualRate * tenureMonths) / (12 * 100));
          totalRepayable = principal + interest;
          emi = tenureMonths > 1 ? Math.ceil(totalRepayable / tenureMonths) : totalRepayable;
        } else {
          // EMI calculation using compound interest formula
          emi = Math.ceil(principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) / (Math.pow(1 + monthlyRate, tenureMonths) - 1));
          totalRepayable = emi * tenureMonths;
          interest = totalRepayable - principal;
        }
        
        calculation = {
          principal,
          interest,
          totalRepayable,
          emi,
          interestRate: annualRate,
          tenureMonths,
          calculationMethod: 'percentage',
          breakdown: {
            effectiveRate: ((interest / principal) * (12 / tenureMonths) * 100),
            monthlyRate: (monthlyRate * 100),
            dailyRate: (annualRate / 365)
          }
        };
      }

      const explanation = tier.type === 'flat' 
        ? `This loan uses a flat fee structure. You pay a fixed fee of ₹${tier.flatFee} regardless of tenure.`
        : `This loan uses ${tenureMonths <= 3 ? 'simple interest' : 'compound interest (EMI)'} calculation at ${calculation.interestRate}% annual rate.`;

      setCurrentCalculation({
        calculation,
        explanation,
        tier: tier.name
      });

    } catch (error) {
      console.error('Error calculating interest:', error);
      setCurrentCalculation(null);
    } finally {
      setLoading(false);
    }
  };

  const addToComparison = () => {
    if (currentCalculation && calculations.length < 3) {
      const newCalculation = {
        ...currentCalculation,
        id: Date.now(),
        inputAmount: calculatorData.amount,
        inputTenure: calculatorData.tenureMonths,
        inputCustomRate: calculatorData.customRate
      };
      setCalculations(prev => [...prev, newCalculation]);
    }
  };

  const removeFromComparison = (id) => {
    setCalculations(prev => prev.filter(calc => calc.id !== id));
  };

  const clearComparisons = () => {
    setCalculations([]);
  };

  const getTierInfo = (amount) => {
    return interestTiers.find(tier => 
      amount >= tier.minAmount && (tier.maxAmount === 'No limit' || amount <= tier.maxAmount)
    );
  };

  const currentTier = getTierInfo(calculatorData.amount);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className={`text-3xl font-bold flex items-center justify-center ${
          isDark ? 'text-gray-100' : 'text-gray-900'
        }`}>
          <Calculator className="w-8 h-8 mr-3 text-blue-600" />
          Interest Calculator
        </h1>
        <p className={`mt-2 ${
          isDark ? 'text-gray-300' : 'text-gray-600'
        }`}>Explore different loan scenarios and understand our transparent pricing structure</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Calculator Input Panel */}
        <div className="xl:col-span-1">
          <div className={`rounded-xl shadow-lg p-6 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h2 className={`text-xl font-semibold mb-6 flex items-center ${
              isDark ? 'text-gray-100' : 'text-gray-900'
            }`}>
              <Target className="w-5 h-5 mr-2 text-blue-600" />
              Calculate Interest
            </h2>

            <div className="space-y-6">
              {/* Amount Slider */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Loan Amount: ₹{calculatorData.amount.toLocaleString()}
                </label>
                <input
                  type="range"
                  min="100"
                  max="100000"
                  step="1000"
                  value={calculatorData.amount}
                  onChange={(e) => setCalculatorData(prev => ({ ...prev, amount: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className={`flex justify-between text-xs mt-1 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <span>₹100</span>
                  <span>₹1,00,000</span>
                </div>
                {errors.amount && (
                  <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
                )}
              </div>

              {/* Tenure Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Tenure
                </label>
                <select
                  value={calculatorData.tenureMonths}
                  onChange={(e) => setCalculatorData(prev => ({ ...prev, tenureMonths: parseInt(e.target.value) }))}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark 
                      ? 'border-gray-600 bg-gray-700 text-gray-100' 
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                >
                  {tenureOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.days} days)
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Rate Input */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Custom Interest Rate (Optional)
                </label>
                <input
                  type="number"
                  placeholder="Enter custom rate %"
                  min="0"
                  max="100"
                  step="0.1"
                  value={calculatorData.customRate}
                  onChange={(e) => setCalculatorData(prev => ({ ...prev, customRate: e.target.value }))}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.customRate ? 'border-red-500' : isDark 
                      ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400' 
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                  }`}
                />
                {errors.customRate ? (
                  <p className="text-red-500 text-xs mt-1">{errors.customRate}</p>
                ) : (
                  <p className={`text-xs mt-1 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>Leave empty to use standard rates (0-100%)</p>
                )}
              </div>

              {/* Current Tier Info */}
              {currentTier && (
                <div className={`rounded-lg p-4 border ${
                  isDark 
                    ? 'bg-blue-900/30 border-blue-700' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <h4 className={`font-medium mb-2 flex items-center ${
                    isDark ? 'text-blue-300' : 'text-blue-900'
                  }`}>
                    <Info className="w-4 h-4 mr-1" />
                    Pricing Tier: {currentTier.name}
                  </h4>
                  <p className={`text-sm ${
                    isDark ? 'text-blue-400' : 'text-blue-700'
                  }`}>
                    {currentTier.type === 'flat' 
                      ? `Flat fee of ₹${currentTier.flatFee} for amounts ₹${currentTier.minAmount}-₹${currentTier.maxAmount}`
                      : `${currentTier.annualRate}% annual interest for amounts above ₹${currentTier.minAmount}`
                    }
                  </p>
                </div>
              )}

              {/* Add to Comparison Button */}
              <button
                onClick={addToComparison}
                disabled={!currentCalculation || calculations.length >= 3 || Object.keys(errors).length > 0}
                className={`w-full py-2 px-4 rounded-lg transition-colors ${
                  !currentCalculation || calculations.length >= 3 || Object.keys(errors).length > 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {Object.keys(errors).length > 0 
                  ? 'Fix errors to compare'
                  : `Add to Comparison (${calculations.length}/3)`
                }
              </button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="xl:col-span-2">
          <div className={`rounded-xl shadow-lg p-6 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h2 className={`text-xl font-semibold mb-6 flex items-center ${
              isDark ? 'text-gray-100' : 'text-gray-900'
            }`}>
              <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
              Calculation Results
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                <span className="ml-2 text-gray-600">Calculating...</span>
              </div>
            ) : errors.general ? (
              <div className={`rounded-xl p-6 border ${
                isDark 
                  ? 'bg-red-900/30 border-red-700' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <h3 className={`font-medium ${isDark ? 'text-red-400' : 'text-red-800'}`}>
                    Validation Error
                  </h3>
                </div>
                <p className={`mt-2 text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                  {errors.general}
                </p>
              </div>
            ) : currentCalculation ? (
              <div className="space-y-6">
                {/* Main Result */}
                <div className={`rounded-xl p-6 border ${
                  isDark 
                    ? 'bg-gradient-to-br from-green-900/30 to-blue-900/30 border-green-700' 
                    : 'bg-gradient-to-br from-green-50 to-blue-50 border-green-200'
                }`}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div>
                      <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Principal Amount</p>
                      <p className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>₹{currentCalculation.calculation.principal.toLocaleString()}</p>
                    </div>
                    <div>
                      <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Interest Amount</p>
                      <p className="text-2xl font-bold text-purple-600">₹{currentCalculation.calculation.interest.toLocaleString()}</p>
                    </div>
                    <div>
                      <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Repayable</p>
                      <p className="text-2xl font-bold text-green-600">₹{currentCalculation.calculation.totalRepayable.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Payment Details</h4>
                    <div className="space-y-2">
                      {currentCalculation.calculation.tenureMonths > 3 ? (
                        <div className="flex justify-between">
                          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Monthly EMI:</span>
                          <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>₹{currentCalculation.calculation.emi.toLocaleString()}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Total Payment:</span>
                          <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>₹{currentCalculation.calculation.totalRepayable.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Tenure:</span>
                        <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                          {currentCalculation.calculation.tenureMonths} month{currentCalculation.calculation.tenureMonths > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Interest Type:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          currentCalculation.calculation.calculationMethod === 'flat_fee'
                            ? isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'
                            : currentCalculation.calculation.tenureMonths <= 3
                            ? isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                            : isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {currentCalculation.calculation.calculationMethod === 'flat_fee' 
                            ? 'Flat Fee' 
                            : currentCalculation.calculation.tenureMonths <= 3 
                            ? 'Simple Interest' 
                            : 'EMI (Compound)'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {currentCalculation.calculation.breakdown && (
                    <div className="space-y-3">
                      <h4 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Interest Breakdown</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Applied Rate:</span>
                          <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{currentCalculation.calculation.interestRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Effective Rate:</span>
                          <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{currentCalculation.calculation.breakdown.effectiveRate.toFixed(2)}%</span>
                        </div>
                        {currentCalculation.calculation.breakdown.dailyRate && (
                          <div className="flex justify-between">
                            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Daily Rate:</span>
                            <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{currentCalculation.calculation.breakdown.dailyRate.toFixed(4)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Explanation */}
                <div className={`rounded-lg p-4 border ${
                  isDark 
                    ? 'bg-yellow-900/20 border-yellow-700' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <p className={`text-sm ${
                    isDark ? 'text-yellow-300' : 'text-yellow-800'
                  }`}>{currentCalculation.explanation}</p>
                </div>
              </div>
            ) : (
              <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Calculator className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <p>
                  {Object.keys(errors).length > 0 
                    ? 'Please fix the input errors above' 
                    : calculatorData.amount < 100 
                    ? 'Enter a loan amount of at least ₹100 to see calculations'
                    : 'Calculating...'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Investment Recommendations */}
      {investmentRecommendations && (
        <div className={`rounded-xl shadow-lg p-6 ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h2 className={`text-xl font-semibold mb-6 flex items-center ${
            isDark ? 'text-gray-100' : 'text-gray-900'
          }`}>
            <PieChart className="w-5 h-5 mr-2 text-purple-600" />
            Investment Recommendations (For Lenders)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {investmentRecommendations.recommendations.map((rec, index) => (
              <div key={index} className={`border rounded-lg p-4 ${
                isDark ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <h4 className={`font-medium mb-2 ${
                  isDark ? 'text-gray-100' : 'text-gray-900'
                }`}>{rec.strategy}</h4>
                <p className={`text-sm mb-3 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>{rec.description}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Expected Return:</span>
                    <span className="font-semibold text-green-600">{rec.expectedReturn}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Risk Level:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      rec.riskLevel === 'Low' ? 'bg-green-100 text-green-800' :
                      rec.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {rec.riskLevel}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {calculations.length > 0 && (
        <div className={`rounded-xl shadow-lg p-6 ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-semibold flex items-center ${
              isDark ? 'text-gray-100' : 'text-gray-900'
            }`}>
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              Loan Comparison
            </h2>
            <button
              onClick={clearComparisons}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Clear All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>Amount</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>Tenure</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>Interest</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>Total</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>EMI/Payment</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>Method</th>
                  <th className={`px-4 py-3 text-left text-sm font-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isDark ? 'divide-gray-700' : 'divide-gray-200'
              }`}>
                {calculations.map((calc) => (
                  <tr key={calc.id} className={isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                    <td className={`px-4 py-3 text-sm font-medium ${
                      isDark ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      ₹{calc.inputAmount.toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {calc.inputTenure} months
                    </td>
                    <td className="px-4 py-3 text-sm text-purple-600 font-medium">
                      ₹{calc.calculation.interest.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600 font-medium">
                      ₹{calc.calculation.totalRepayable.toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 text-sm ${
                      isDark ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      ₹{calc.calculation.tenureMonths > 3 ? calc.calculation.emi.toLocaleString() : calc.calculation.totalRepayable.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        calc.calculation.calculationMethod === 'flat_fee'
                          ? isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'
                          : calc.calculation.tenureMonths <= 3
                          ? isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800' 
                          : isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {calc.calculation.calculationMethod === 'flat_fee' 
                          ? 'Flat Fee' 
                          : calc.calculation.tenureMonths <= 3 
                          ? 'Simple' 
                          : 'EMI'
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeFromComparison(calc.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interest Tiers Information */}
      <div className={`rounded-xl shadow-lg p-6 ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        <h2 className={`text-xl font-semibold mb-6 flex items-center ${
          isDark ? 'text-gray-100' : 'text-gray-900'
        }`}>
          <Info className="w-5 h-5 mr-2 text-blue-600" />
          Interest Rate Structure
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {interestTiers.map((tier, index) => (
            <div key={index} className={`border rounded-lg p-4 ${
              isDark ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h4 className={`font-medium mb-2 ${
                isDark ? 'text-gray-100' : 'text-gray-900'
              }`}>{tier.name}</h4>
              <p className={`text-sm mb-3 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                ₹{tier.minAmount.toLocaleString()} - {tier.maxAmount === 'No limit' ? 'Above' : `₹${tier.maxAmount.toLocaleString()}`}
              </p>
              <div className="space-y-2">
                {tier.type === 'flat' ? (
                  <div className={`rounded p-2 ${
                    isDark ? 'bg-blue-900/30' : 'bg-blue-50'
                  }`}>
                    <p className={`text-sm font-medium ${
                      isDark ? 'text-blue-300' : 'text-blue-900'
                    }`}>Flat Fee: ₹{tier.flatFee}</p>
                    <p className={`text-xs ${
                      isDark ? 'text-blue-400' : 'text-blue-700'
                    }`}>{tier.description}</p>
                  </div>
                ) : (
                  <div className={`rounded p-2 ${
                    isDark ? 'bg-purple-900/30' : 'bg-purple-50'
                  }`}>
                    <p className={`text-sm font-medium ${
                      isDark ? 'text-purple-300' : 'text-purple-900'
                    }`}>Rate: {tier.annualRate}% p.a.</p>
                    <p className={`text-xs ${
                      isDark ? 'text-purple-400' : 'text-purple-700'
                    }`}>{tier.description}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InteractiveInterestCalculator;
