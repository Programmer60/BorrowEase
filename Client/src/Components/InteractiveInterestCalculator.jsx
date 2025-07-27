import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  BarChart3,
  Info,
  Target,
  PieChart
} from 'lucide-react';
import API from '../api/api';

const InteractiveInterestCalculator = () => {
  const [calculatorData, setCalculatorData] = useState({
    amount: 1000,
    tenureMonths: 1,
    customRate: ''
  });

  const [calculations, setCalculations] = useState([]);
  const [currentCalculation, setCurrentCalculation] = useState(null);
  const [interestTiers, setInterestTiers] = useState([]);
  const [tenureOptions, setTenureOptions] = useState([]);
  const [investmentRecommendations, setInvestmentRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInterestTiers();
  }, []);

  useEffect(() => {
    if (calculatorData.amount >= 100) {
      fetchTenureOptions();
      fetchInvestmentRecommendations();
      calculateInterest();
    }
  }, [calculatorData.amount, calculatorData.tenureMonths, calculatorData.customRate]);

  const fetchInterestTiers = async () => {
    try {
      const response = await API.get('/loans/interest-tiers');
      setInterestTiers(response.data.tiers);
    } catch (error) {
      console.error('Error fetching interest tiers:', error);
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
    if (calculatorData.amount < 100) return;
    
    try {
      setLoading(true);
      const response = await API.post('/loans/preview-interest', {
        amount: calculatorData.amount,
        tenureMonths: calculatorData.tenureMonths,
        interestRate: calculatorData.customRate ? parseFloat(calculatorData.customRate) : null
      });
      setCurrentCalculation(response.data);
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
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center">
          <Calculator className="w-8 h-8 mr-3 text-blue-600" />
          Interest Calculator
        </h1>
        <p className="text-gray-600 mt-2">Explore different loan scenarios and understand our transparent pricing structure</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Calculator Input Panel */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Target className="w-5 h-5 mr-2 text-blue-600" />
              Calculate Interest
            </h2>

            <div className="space-y-6">
              {/* Amount Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loan Amount: ₹{calculatorData.amount.toLocaleString()}
                </label>
                <input
                  type="range"
                  min="100"
                  max="100000"
                  step="100"
                  value={calculatorData.amount}
                  onChange={(e) => setCalculatorData(prev => ({ ...prev, amount: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>₹100</span>
                  <span>₹1,00,000</span>
                </div>
              </div>

              {/* Tenure Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tenure
                </label>
                <select
                  value={calculatorData.tenureMonths}
                  onChange={(e) => setCalculatorData(prev => ({ ...prev, tenureMonths: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Interest Rate (Optional)
                </label>
                <input
                  type="number"
                  placeholder="Enter custom rate %"
                  value={calculatorData.customRate}
                  onChange={(e) => setCalculatorData(prev => ({ ...prev, customRate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use standard rates</p>
              </div>

              {/* Current Tier Info */}
              {currentTier && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                    <Info className="w-4 h-4 mr-1" />
                    Pricing Tier: {currentTier.name}
                  </h4>
                  <p className="text-sm text-blue-700">
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
                disabled={!currentCalculation || calculations.length >= 3}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add to Comparison ({calculations.length}/3)
              </button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
              Calculation Results
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                <span className="ml-2 text-gray-600">Calculating...</span>
              </div>
            ) : currentCalculation ? (
              <div className="space-y-6">
                {/* Main Result */}
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div>
                      <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Principal Amount</p>
                      <p className="text-2xl font-bold text-gray-900">₹{currentCalculation.calculation.principal.toLocaleString()}</p>
                    </div>
                    <div>
                      <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Interest Amount</p>
                      <p className="text-2xl font-bold text-purple-600">₹{currentCalculation.calculation.interest.toLocaleString()}</p>
                    </div>
                    <div>
                      <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Total Repayable</p>
                      <p className="text-2xl font-bold text-green-600">₹{currentCalculation.calculation.totalRepayable.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Payment Details</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly EMI:</span>
                        <span className="font-semibold">₹{currentCalculation.calculation.emi.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tenure:</span>
                        <span className="font-semibold">{currentCalculation.calculation.tenureMonths} months</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Method:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          currentCalculation.calculation.calculationMethod === 'flat_fee'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {currentCalculation.calculation.calculationMethod === 'flat_fee' ? 'Flat Fee' : 'Percentage'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {currentCalculation.calculation.breakdown && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Interest Breakdown</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Applied Rate:</span>
                          <span className="font-semibold">{currentCalculation.calculation.interestRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Effective Rate:</span>
                          <span className="font-semibold">{currentCalculation.calculation.breakdown.effectiveRate.toFixed(2)}%</span>
                        </div>
                        {currentCalculation.calculation.breakdown.dailyRate && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Daily Rate:</span>
                            <span className="font-semibold">{currentCalculation.calculation.breakdown.dailyRate.toFixed(4)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Explanation */}
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <p className="text-sm text-yellow-800">{currentCalculation.explanation}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Calculator className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>Adjust the loan amount to see calculations</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Investment Recommendations */}
      {investmentRecommendations && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <PieChart className="w-5 h-5 mr-2 text-purple-600" />
            Investment Recommendations (For Lenders)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {investmentRecommendations.recommendations.map((rec, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">{rec.strategy}</h4>
                <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
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
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
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
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Tenure</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Interest</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">EMI</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Method</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {calculations.map((calc) => (
                  <tr key={calc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ₹{calc.inputAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {calc.inputTenure} months
                    </td>
                    <td className="px-4 py-3 text-sm text-purple-600 font-medium">
                      ₹{calc.calculation.interest.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600 font-medium">
                      ₹{calc.calculation.totalRepayable.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ₹{calc.calculation.emi.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        calc.calculation.calculationMethod === 'flat_fee'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {calc.calculation.calculationMethod === 'flat_fee' ? 'Flat Fee' : 'Percentage'}
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
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Info className="w-5 h-5 mr-2 text-blue-600" />
          Interest Rate Structure
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {interestTiers.map((tier, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">{tier.name}</h4>
              <p className="text-sm text-gray-600 mb-3">
                ₹{tier.minAmount.toLocaleString()} - {tier.maxAmount === 'No limit' ? 'Above' : `₹${tier.maxAmount.toLocaleString()}`}
              </p>
              <div className="space-y-2">
                {tier.type === 'flat' ? (
                  <div className="bg-blue-50 rounded p-2">
                    <p className="text-sm font-medium text-blue-900">Flat Fee: ₹{tier.flatFee}</p>
                    <p className="text-xs text-blue-700">{tier.description}</p>
                  </div>
                ) : (
                  <div className="bg-purple-50 rounded p-2">
                    <p className="text-sm font-medium text-purple-900">Rate: {tier.annualRate}% p.a.</p>
                    <p className="text-xs text-purple-700">{tier.description}</p>
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
