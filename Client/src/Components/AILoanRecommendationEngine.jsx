import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, Target, Star, CheckCircle, XCircle, AlertTriangle, Filter, RefreshCw } from 'lucide-react';
import API from '../api/api';

const AILoanRecommendationEngine = ({ onSelectLoan }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    riskTolerance: 'medium', // low, medium, high
    preferredAmount: { min: 1000, max: 50000 },
    maxLoanDuration: 30, // days
    minimumCreditScore: 600,
    priorityFactors: ['creditScore', 'paymentHistory', 'loanAmount']
  });
  const [filters, setFilters] = useState({
    minConfidence: 70,
    maxRisk: 30,
    onlyAIApproved: false
  });

  useEffect(() => {
    fetchRecommendations();
  }, [preferences, filters]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await API.post('/ai/recommend-loans', {
        preferences,
        filters,
        lenderProfile: {
          totalFunded: 0, // This would come from lender's profile
          successRate: 95,
          averageReturn: 12
        }
      });
      setRecommendations(response.data.recommendations || []);
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
      // Fallback to mock data for demo
      setRecommendations(generateMockRecommendations());
    } finally {
      setLoading(false);
    }
  };

  const generateMockRecommendations = () => [
    {
      loanId: 'loan_1',
      borrowerName: 'Arjun Sharma',
      amount: 15000,
      purpose: 'Course Registration Fee',
      aiScore: 85,
      riskLevel: 'low',
      confidence: 92,
      expectedReturn: 14.5,
      recommendation: 'Highly recommended based on excellent credit history',
      keyFactors: {
        creditScore: 780,
        paymentHistory: 'Excellent',
        debtToIncome: 15,
        collegeReputation: 'High'
      },
      aiReasons: [
        'Strong academic performance (CGPA: 8.7/10)',
        'No previous loan defaults',
        'Stable family income verified',
        'Excellent peer lending reputation'
      ],
      timeline: {
        approval: '2 hours',
        funding: 'Immediate',
        repayment: '30 days'
      }
    },
    {
      loanId: 'loan_2',
      borrowerName: 'Priya Patel',
      amount: 8000,
      purpose: 'Exam Fee',
      aiScore: 72,
      riskLevel: 'medium',
      confidence: 78,
      expectedReturn: 12.8,
      recommendation: 'Good investment with moderate risk',
      keyFactors: {
        creditScore: 720,
        paymentHistory: 'Good',
        debtToIncome: 25,
        collegeReputation: 'High'
      },
      aiReasons: [
        'Consistent payment behavior',
        'Active in campus activities',
        'Part-time income source',
        'Strong academic track record'
      ],
      timeline: {
        approval: '4 hours',
        funding: '1 day',
        repayment: '21 days'
      }
    }
  ];

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-blue-600 p-2 rounded-lg mr-3">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Loan Recommendations</h3>
              <p className="text-sm text-gray-600">Intelligent loan matching based on your preferences</p>
            </div>
          </div>
          <button
            onClick={fetchRecommendations}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Preferences Panel */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
          <Filter className="w-4 h-4 mr-2" />
          Investment Preferences
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Risk Tolerance</label>
            <select
              value={preferences.riskTolerance}
              onChange={(e) => setPreferences({...preferences, riskTolerance: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Conservative (Low Risk)</option>
              <option value="medium">Balanced (Medium Risk)</option>
              <option value="high">Aggressive (High Risk)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Min Confidence</label>
            <input
              type="range"
              min="50"
              max="95"
              value={filters.minConfidence}
              onChange={(e) => setFilters({...filters, minConfidence: parseInt(e.target.value)})}
              className="w-full"
            />
            <span className="text-sm text-gray-600">{filters.minConfidence}%</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount Range</label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={preferences.preferredAmount.min}
                onChange={(e) => setPreferences({
                  ...preferences, 
                  preferredAmount: {...preferences.preferredAmount, min: parseInt(e.target.value)}
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <input
                type="number"
                placeholder="Max"
                value={preferences.preferredAmount.max}
                onChange={(e) => setPreferences({
                  ...preferences, 
                  preferredAmount: {...preferences.preferredAmount, max: parseInt(e.target.value)}
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mr-3"></div>
            <span className="text-gray-600">Analyzing loans with AI...</span>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations Found</h3>
            <p className="text-gray-600">Adjust your preferences to see more loan opportunities.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {recommendations.map((rec, index) => (
              <div key={rec.loanId} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                {/* Recommendation Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">{rec.borrowerName}</h4>
                      <div className="ml-3 flex items-center">
                        <span className="text-sm text-gray-600">#{index + 1} Best Match</span>
                      </div>
                    </div>
                    <p className="text-gray-600">{rec.purpose}</p>
                    <p className="text-2xl font-bold text-blue-600">₹{rec.amount.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium ${
                      getScoreColor(rec.aiScore)
                    }`}>
                      <Star className="w-3 h-3 mr-1" />
                      {rec.aiScore}/100
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Confidence</p>
                    <p className="text-lg font-semibold text-blue-600">{rec.confidence}%</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Risk Level</p>
                    <p className={`text-lg font-semibold capitalize ${getRiskColor(rec.riskLevel).split(' ')[0]}`}>
                      {rec.riskLevel}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Expected Return</p>
                    <p className="text-lg font-semibold text-green-600">{rec.expectedReturn}%</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Credit Score</p>
                    <p className="text-lg font-semibold text-purple-600">{rec.keyFactors.creditScore}</p>
                  </div>
                </div>

                {/* AI Analysis */}
                <div className="mb-4">
                  <h5 className="text-sm font-semibold text-gray-900 mb-2">AI Analysis</h5>
                  <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">{rec.recommendation}</p>
                </div>

                {/* Key Reasons */}
                <div className="mb-4">
                  <h5 className="text-sm font-semibold text-gray-900 mb-2">Why This Loan?</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {rec.aiReasons.map((reason, idx) => (
                      <div key={idx} className="flex items-center text-sm text-gray-700">
                        <CheckCircle className="w-3 h-3 text-green-600 mr-2 flex-shrink-0" />
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                <div className="mb-4">
                  <h5 className="text-sm font-semibold text-gray-900 mb-2">Expected Timeline</h5>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Approval: {rec.timeline.approval}</span>
                    <span>•</span>
                    <span>Funding: {rec.timeline.funding}</span>
                    <span>•</span>
                    <span>Repayment: {rec.timeline.repayment}</span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Recommended with {rec.confidence}% confidence
                  </div>
                  <button
                    onClick={() => onSelectLoan && onSelectLoan(rec)}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      rec.riskLevel === 'low' 
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : rec.riskLevel === 'medium'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    }`}
                  >
                    <Target className="w-4 h-4 mr-2 inline" />
                    {rec.riskLevel === 'low' ? 'Invest Now' : rec.riskLevel === 'medium' ? 'Consider Investment' : 'High Risk - Review'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AILoanRecommendationEngine;
