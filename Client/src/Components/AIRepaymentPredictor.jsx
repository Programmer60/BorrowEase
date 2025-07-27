import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, AlertTriangle, CheckCircle, DollarSign, Clock, Target, Brain } from 'lucide-react';
import API from '../api/api';

const AIRepaymentPredictor = ({ loanId, borrowerId, onPredictionUpdate }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historicalData, setHistoricalData] = useState([]);

  useEffect(() => {
    if (loanId && borrowerId) {
      fetchRepaymentPrediction();
    }
  }, [loanId, borrowerId]);

  const fetchRepaymentPrediction = async () => {
    try {
      setLoading(true);
      const response = await API.post('/ai/predict-repayment', {
        loanId,
        borrowerId,
        includeFactors: true
      });
      setPrediction(response.data);
      if (onPredictionUpdate) {
        onPredictionUpdate(response.data);
      }
    } catch (error) {
      console.error('Error fetching repayment prediction:', error);
      // Mock data for demo
      const mockPrediction = {
        probability: 87,
        confidence: 92,
        riskLevel: 'low',
        expectedDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
        factors: {
          positive: [
            { factor: 'Excellent payment history', weight: 35, score: 95 },
            { factor: 'Stable income source', weight: 25, score: 88 },
            { factor: 'Low debt-to-income ratio', weight: 20, score: 92 },
            { factor: 'Strong credit score', weight: 15, score: 85 }
          ],
          negative: [
            { factor: 'Recent credit inquiry', weight: 5, score: 65 }
          ]
        },
        recommendations: [
          {
            type: 'reminder',
            title: 'Send Early Reminder',
            description: 'Schedule reminder 5 days before due date',
            priority: 'medium'
          },
          {
            type: 'incentive',
            title: 'Early Payment Discount',
            description: 'Offer 1% discount for payment 7+ days early',
            priority: 'low'
          }
        ],
        timeline: {
          optimistic: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(),
          realistic: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
          pessimistic: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString()
        }
      };
      setPrediction(mockPrediction);
    } finally {
      setLoading(false);
    }
  };

  const getProbabilityColor = (probability) => {
    if (probability >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (probability >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (probability >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
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

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mr-3"></div>
          <span className="text-gray-600">Analyzing repayment probability...</span>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Prediction Available</h3>
          <p className="text-gray-600">Unable to generate repayment prediction for this loan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-blue-600 p-2 rounded-lg mr-3">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Repayment Prediction</h3>
              <p className="text-sm text-gray-600">Machine learning-powered repayment analysis</p>
            </div>
          </div>
          <button
            onClick={fetchRepaymentPrediction}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Main Prediction Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl">
            <div className={`inline-flex items-center px-4 py-2 rounded-full border text-lg font-bold mb-2 ${
              getProbabilityColor(prediction.probability)
            }`}>
              <Target className="w-5 h-5 mr-2" />
              {prediction.probability}%
            </div>
            <p className="text-sm text-gray-600">Repayment Probability</p>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
            <div className="text-2xl font-bold text-purple-600 mb-2">{prediction.confidence}%</div>
            <p className="text-sm text-gray-600">AI Confidence</p>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              getRiskColor(prediction.riskLevel)
            }`}>
              <AlertTriangle className="w-4 h-4 mr-1" />
              {prediction.riskLevel.toUpperCase()} RISK
            </div>
            <p className="text-sm text-gray-600 mt-2">Risk Assessment</p>
          </div>
        </div>

        {/* Timeline Predictions */}
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Predicted Timeline
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-green-200 rounded-lg bg-green-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-800">Optimistic</span>
                <span className="text-sm text-green-600">Best case</span>
              </div>
              <p className="text-lg font-bold text-green-900 mt-1">
                {new Date(prediction.timeline.optimistic).toLocaleDateString()}
              </p>
            </div>

            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">Realistic</span>
                <span className="text-sm text-blue-600">Most likely</span>
              </div>
              <p className="text-lg font-bold text-blue-900 mt-1">
                {new Date(prediction.timeline.realistic).toLocaleDateString()}
              </p>
            </div>

            <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-800">Pessimistic</span>
                <span className="text-sm text-yellow-600">Worst case</span>
              </div>
              <p className="text-lg font-bold text-yellow-900 mt-1">
                {new Date(prediction.timeline.pessimistic).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Influencing Factors */}
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Key Influencing Factors</h4>
          
          {/* Positive Factors */}
          <div className="mb-4">
            <h5 className="text-sm font-medium text-green-700 mb-3 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Positive Factors
            </h5>
            <div className="space-y-2">
              {prediction.factors.positive.map((factor, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex-1">
                    <span className="text-sm text-gray-900">{factor.factor}</span>
                    <div className="w-full bg-green-200 rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-green-600 h-1.5 rounded-full"
                        style={{ width: `${factor.score}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <span className="text-sm font-medium text-green-700">{factor.weight}%</span>
                    <p className="text-xs text-green-600">weight</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Negative Factors */}
          {prediction.factors.negative.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-red-700 mb-3 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Risk Factors
              </h5>
              <div className="space-y-2">
                {prediction.factors.negative.map((factor, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex-1">
                      <span className="text-sm text-gray-900">{factor.factor}</span>
                      <div className="w-full bg-red-200 rounded-full h-1.5 mt-1">
                        <div 
                          className="bg-red-600 h-1.5 rounded-full"
                          style={{ width: `${100 - factor.score}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <span className="text-sm font-medium text-red-700">{factor.weight}%</span>
                      <p className="text-xs text-red-600">weight</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Recommendations */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            AI Recommendations
          </h4>
          <div className="space-y-3">
            {prediction.recommendations.map((rec, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border ${
                  rec.priority === 'high' ? 'bg-red-50 border-red-200' :
                  rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className={`font-medium ${
                      rec.priority === 'high' ? 'text-red-900' :
                      rec.priority === 'medium' ? 'text-yellow-900' :
                      'text-blue-900'
                    }`}>
                      {rec.title}
                    </h5>
                    <p className={`text-sm mt-1 ${
                      rec.priority === 'high' ? 'text-red-700' :
                      rec.priority === 'medium' ? 'text-yellow-700' :
                      'text-blue-700'
                    }`}>
                      {rec.description}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {rec.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIRepaymentPredictor;
