import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, History, Target, AlertCircle } from 'lucide-react';
import Navbar from './Navbar';
import CreditScore from './CreditScore';
import API from '../api/api';

const CreditScorePage = () => {
  const [creditData, setCreditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCreditScore();
  }, []);

  const fetchCreditScore = async () => {
    try {
      setLoading(true);
      const response = await API.get('/credit/score');
      setCreditData(response.data);
    } catch (error) {
      console.error('Error fetching credit score:', error);
      setError('Failed to load credit score');
    } finally {
      setLoading(false);
    }
  };

  const getScoreInsights = (data) => {
    const { trustScore, loansRepaid, loansTaken } = data;
    const insights = [];
    
    if (trustScore >= 80) {
      insights.push({
        type: 'positive',
        icon: '🎉',
        message: 'Excellent credit score! You\'re a trusted borrower.'
      });
    } else if (trustScore >= 60) {
      insights.push({
        type: 'good',
        icon: '👍',
        message: 'Good credit score! Keep up the consistent repayments.'
      });
    } else if (trustScore >= 40) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        message: 'Average score. Focus on timely repayments to improve.'
      });
    } else {
      insights.push({
        type: 'danger',
        icon: '⚡',
        message: 'Credit score needs improvement. Consider timely repayments.'
      });
    }

    if (loansTaken === 0) {
      insights.push({
        type: 'info',
        icon: '💡',
        message: 'Take your first loan to start building credit history.'
      });
    } else if (loansRepaid === loansTaken) {
      insights.push({
        type: 'positive',
        icon: '✨',
        message: 'Perfect repayment record! All loans repaid on time.'
      });
    }

    return insights;
  };

  const getTips = () => [
    {
      icon: '⏰',
      title: 'Pay on Time',
      description: 'Always repay loans before or on the due date to boost your score by +5 points.'
    },
    {
      icon: '📅',
      title: 'Build History',
      description: 'Successfully completing loans builds a positive credit history.'
    },
    {
      icon: '📊',
      title: 'Monitor Regularly',
      description: 'Keep track of your credit score and aim for consistent improvement.'
    },
    {
      icon: '🎯',
      title: 'Set Reminders',
      description: 'Use calendar reminders to never miss a repayment deadline.'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Credit Score</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={fetchCreditScore}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Award className="h-8 w-8 text-purple-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-900">Your Credit Score</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Track your creditworthiness and lending reputation. A higher score increases your chances of getting loans funded.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Credit Score Display */}
          <div className="lg:col-span-1">
            <CreditScore user={creditData} size="large" showDetails={true} />
          </div>

          {/* Insights and Analytics */}
          <div className="space-y-6">
            {/* Score Insights */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
                Score Insights
              </h3>
              <div className="space-y-3">
                {getScoreInsights(creditData).map((insight, index) => (
                  <div key={index} className={`p-3 rounded-lg border-l-4 ${
                    insight.type === 'positive' ? 'bg-green-50 border-green-400' :
                    insight.type === 'good' ? 'bg-blue-50 border-blue-400' :
                    insight.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                    insight.type === 'danger' ? 'bg-red-50 border-red-400' :
                    'bg-gray-50 border-gray-400'
                  }`}>
                    <div className="flex items-start">
                      <span className="text-lg mr-2">{insight.icon}</span>
                      <p className="text-sm text-gray-700">{insight.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <History className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{creditData.loansRepaid}</div>
                <div className="text-sm text-gray-600">Loans Repaid</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{creditData.repaymentRate}%</div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tips for Improvement */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Tips to Improve Your Credit Score</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getTips().map((tip, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm p-6 text-center hover:shadow-md transition-shadow">
                <div className="text-3xl mb-4">{tip.icon}</div>
                <h4 className="font-semibold text-gray-900 mb-2">{tip.title}</h4>
                <p className="text-sm text-gray-600">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Score Range Guide */}
        <div className="mt-12 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">Credit Score Range Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="text-2xl mb-2">⭐</div>
              <div className="font-semibold text-green-800">80-100</div>
              <div className="text-sm text-green-600">Excellent</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="text-2xl mb-2">✅</div>
              <div className="font-semibold text-blue-800">60-79</div>
              <div className="text-sm text-blue-600">Good</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
              <div className="text-2xl mb-2">⚠️</div>
              <div className="font-semibold text-yellow-800">40-59</div>
              <div className="text-sm text-yellow-600">Average</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-200">
              <div className="text-2xl mb-2">❌</div>
              <div className="font-semibold text-red-800">0-39</div>
              <div className="text-sm text-red-600">Risky</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditScorePage;
