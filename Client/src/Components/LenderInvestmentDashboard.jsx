import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  PieChart, 
  BarChart3, 
  Shield, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  Calculator,
  Zap
} from 'lucide-react';
import API from '../api/api';

const LenderInvestmentDashboard = () => {
  const [selectedAmount, setSelectedAmount] = useState(10000);
  const [recommendations, setRecommendations] = useState(null);
  const [interestTiers, setInterestTiers] = useState([]);
  const [marketInsights, setMarketInsights] = useState({
    averageReturn: 24.5,
    totalLoansIssued: 15432,
    defaultRate: 2.3,
    popularAmounts: [1000, 2500, 5000, 10000, 25000]
  });
  const [investmentScenarios, setInvestmentScenarios] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInterestTiers();
    fetchInvestmentRecommendations();
    generateInvestmentScenarios();
  }, [selectedAmount]);

  const fetchInterestTiers = async () => {
    try {
      const response = await API.get('/loans/interest-tiers');
      setInterestTiers(response.data.tiers);
    } catch (error) {
      console.error('Error fetching interest tiers:', error);
    }
  };

  const fetchInvestmentRecommendations = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/loans/investment-recommendations/${selectedAmount}`);
      setRecommendations(response.data);
    } catch (error) {
      console.error('Error fetching investment recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInvestmentScenarios = () => {
    const scenarios = [
      {
        id: 1,
        name: "Conservative Portfolio",
        description: "Low-risk loans with guaranteed returns",
        allocation: [
          { range: "₹100-₹1,000", percentage: 40, expectedReturn: 15 },
          { range: "₹1,000-₹3,000", percentage: 60, expectedReturn: 18 }
        ],
        totalReturn: 16.8,
        riskLevel: "Low",
        minInvestment: 5000
      },
      {
        id: 2,
        name: "Balanced Portfolio",
        description: "Mix of small and medium loans for optimal returns",
        allocation: [
          { range: "₹100-₹1,000", percentage: 20, expectedReturn: 15 },
          { range: "₹1,000-₹3,000", percentage: 50, expectedReturn: 18 },
          { range: "₹3,000+", percentage: 30, expectedReturn: 24 }
        ],
        totalReturn: 20.4,
        riskLevel: "Medium",
        minInvestment: 10000
      },
      {
        id: 3,
        name: "Growth Portfolio",
        description: "Focus on larger loans for maximum returns",
        allocation: [
          { range: "₹1,000-₹3,000", percentage: 30, expectedReturn: 18 },
          { range: "₹3,000+", percentage: 70, expectedReturn: 24 }
        ],
        totalReturn: 22.2,
        riskLevel: "High",
        minInvestment: 25000
      }
    ];

    setInvestmentScenarios(scenarios.filter(s => selectedAmount >= s.minInvestment));
  };

  const calculatePotentialReturns = (amount, annualRate, months = 12) => {
    const monthlyRate = annualRate / 100 / 12;
    const totalReturn = amount * (1 + monthlyRate) ** months;
    return {
      principal: amount,
      returns: totalReturn - amount,
      total: totalReturn,
      monthlyReturn: (totalReturn - amount) / months
    };
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center">
          <TrendingUp className="w-8 h-8 mr-3 text-green-600" />
          Lender Investment Dashboard
        </h1>
        <p className="text-gray-600 mt-2">Maximize your returns with intelligent loan investment strategies</p>
      </div>

      {/* Investment Amount Selector */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
          Investment Amount
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Investment Amount: ₹{selectedAmount.toLocaleString()}
            </label>
            <input
              type="range"
              min="5000"
              max="500000"
              step="1000"
              value={selectedAmount}
              onChange={(e) => setSelectedAmount(parseInt(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>₹5,000</span>
              <span>₹5,00,000</span>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex flex-wrap gap-2">
            {[10000, 25000, 50000, 100000, 250000].map(amount => (
              <button
                key={amount}
                onClick={() => setSelectedAmount(amount)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedAmount === amount
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ₹{amount.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Market Insights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Return</p>
              <p className="text-2xl font-bold text-green-600">{marketInsights.averageReturn}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Loans Issued</p>
              <p className="text-2xl font-bold text-blue-600">{marketInsights.totalLoansIssued.toLocaleString()}</p>
            </div>
            <Target className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Default Rate</p>
              <p className="text-2xl font-bold text-red-600">{marketInsights.defaultRate}%</p>
            </div>
            <Shield className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Your Investment</p>
              <p className="text-2xl font-bold text-purple-600">₹{selectedAmount.toLocaleString()}</p>
            </div>
            <Calculator className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Investment Scenarios */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <PieChart className="w-5 h-5 mr-2 text-purple-600" />
          Recommended Investment Portfolios
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {investmentScenarios.map(scenario => {
            const projectedReturns = calculatePotentialReturns(selectedAmount, scenario.totalReturn);
            
            return (
              <div key={scenario.id} className="border border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{scenario.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(scenario.riskLevel)}`}>
                    {scenario.riskLevel} Risk
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4">{scenario.description}</p>
                
                {/* Expected Returns */}
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Expected Annual Return</p>
                    <p className="text-2xl font-bold text-green-600">{scenario.totalReturn}%</p>
                    <p className="text-sm text-gray-600 mt-1">
                      ₹{projectedReturns.returns.toLocaleString()} returns on ₹{selectedAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {/* Allocation Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Portfolio Allocation</h4>
                  {scenario.allocation.map((alloc, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{alloc.range}</span>
                          <span className="font-medium">{alloc.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${alloc.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="ml-4 text-sm text-green-600 font-medium">
                        {alloc.expectedReturn}%
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Monthly Projections */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Monthly Returns:</span>
                    <span className="font-semibold text-green-600">₹{projectedReturns.monthlyReturn.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Total After 1 Year:</span>
                    <span className="font-semibold text-gray-900">₹{projectedReturns.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Smart Recommendations */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            <span className="ml-2 text-gray-600">Loading recommendations...</span>
          </div>
        </div>
      ) : recommendations && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-600" />
            Smart Investment Recommendations
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.recommendations.map((rec, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{rec.strategy}</h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(rec.riskLevel)}`}>
                    {rec.riskLevel}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{rec.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Expected Return:</span>
                    <span className="font-semibold text-green-600">{rec.expectedReturn}%</span>
                  </div>
                  
                  {rec.minimumAmount && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Minimum Amount:</span>
                      <span className="font-semibold text-gray-900">₹{rec.minimumAmount.toLocaleString()}</span>
                    </div>
                  )}
                  
                  {rec.diversificationTip && (
                    <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                      <Info className="w-3 h-3 inline mr-1" />
                      {rec.diversificationTip}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {recommendations.marketAnalysis && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-900 mb-2 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Market Analysis
              </h4>
              <p className="text-sm text-yellow-800">{recommendations.marketAnalysis}</p>
            </div>
          )}
        </div>
      )}

      {/* Interest Rate Structure */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
          Current Interest Rate Structure
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {interestTiers.map((tier, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{tier.name}</h4>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  Amount Range: ₹{tier.minAmount.toLocaleString()} - {tier.maxAmount === 'No limit' ? 'Above' : `₹${tier.maxAmount.toLocaleString()}`}
                </div>
                
                {tier.type === 'flat' ? (
                  <div className="bg-blue-50 rounded p-3">
                    <p className="text-sm font-medium text-blue-900">Flat Fee Structure</p>
                    <p className="text-lg font-bold text-blue-600">₹{tier.flatFee} per loan</p>
                    <p className="text-xs text-blue-700 mt-1">{tier.description}</p>
                  </div>
                ) : (
                  <div className="bg-purple-50 rounded p-3">
                    <p className="text-sm font-medium text-purple-900">Percentage Structure</p>
                    <p className="text-lg font-bold text-purple-600">{tier.annualRate}% p.a.</p>
                    <p className="text-xs text-purple-700 mt-1">{tier.description}</p>
                  </div>
                )}
                
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Average loan duration: 1-6 months
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Investment Tips */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Info className="w-5 h-5 mr-2" />
          Investment Tips for Success
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Diversify Your Portfolio</h4>
                <p className="text-sm opacity-90">Spread investments across different loan amounts and risk levels</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Start with Conservative Approach</h4>
                <p className="text-sm opacity-90">Begin with smaller amounts to understand the platform</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Monitor Your Returns</h4>
                <p className="text-sm opacity-90">Track performance and adjust strategy accordingly</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Reinvest Returns</h4>
                <p className="text-sm opacity-90">Compound your earnings by reinvesting profits</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LenderInvestmentDashboard;
