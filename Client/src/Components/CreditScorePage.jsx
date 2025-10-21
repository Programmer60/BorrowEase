import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, History, Target, AlertCircle } from 'lucide-react';
import Navbar from './Navbar';
import CreditScore from './CreditScore';
import API from '../api/api';
import { useTheme } from '../contexts/ThemeContext';

const CreditScorePage = () => {
  const { isDark } = useTheme();
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
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
            isDark ? 'border-purple-400' : 'border-purple-600'
          }`}></div>
          <p className={`mt-4 text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Loading your credit score...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${
              isDark ? 'text-red-400' : 'text-red-500'
            }`} />
            <h3 className={`text-lg font-medium mb-2 ${
              isDark ? 'text-gray-100' : 'text-gray-900'
            }`}>
              Error Loading Credit Score
            </h3>
            <p className={`mb-4 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {error}
            </p>
            <button 
              onClick={fetchCreditScore}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isDark 
                  ? 'bg-purple-600 text-white hover:bg-purple-700' 
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Award className={`h-8 w-8 mr-2 ${
              isDark ? 'text-purple-400' : 'text-purple-600'
            }`} />
            <h1 className={`text-3xl font-bold ${
              isDark ? 'text-gray-100' : 'text-gray-900'
            }`}>
              Your Credit Score
            </h1>
          </div>
          <p className={`max-w-2xl mx-auto ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
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
            <div className={`rounded-xl shadow-sm p-6 ${
              isDark ? 'bg-gray-800' : 'bg-white'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 flex items-center ${
                isDark ? 'text-gray-100' : 'text-gray-900'
              }`}>
                <TrendingUp className={`h-5 w-5 mr-2 ${
                  isDark ? 'text-blue-400' : 'text-blue-600'
                }`} />
                Score Insights
              </h3>
              <div className="space-y-3">
                {getScoreInsights(creditData).map((insight, index) => (
                  <div key={index} className={`p-3 rounded-lg border-l-4 ${
                    insight.type === 'positive' ? (isDark ? 'bg-green-900/30 border-green-400' : 'bg-green-50 border-green-400') :
                    insight.type === 'good' ? (isDark ? 'bg-blue-900/30 border-blue-400' : 'bg-blue-50 border-blue-400') :
                    insight.type === 'warning' ? (isDark ? 'bg-yellow-900/30 border-yellow-400' : 'bg-yellow-50 border-yellow-400') :
                    insight.type === 'danger' ? (isDark ? 'bg-red-900/30 border-red-400' : 'bg-red-50 border-red-400') :
                    (isDark ? 'bg-gray-700 border-gray-400' : 'bg-gray-50 border-gray-400')
                  }`}>
                    <div className="flex items-start">
                      <span className="text-lg mr-2">{insight.icon}</span>
                      <p className={`text-sm ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {insight.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`rounded-xl shadow-sm p-6 text-center ${
                isDark ? 'bg-gray-800' : 'bg-white'
              }`}>
                <History className={`h-8 w-8 mx-auto mb-2 ${
                  isDark ? 'text-purple-400' : 'text-purple-600'
                }`} />
                <div className={`text-2xl font-bold ${
                  isDark ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {creditData.loansRepaid}
                </div>
                <div className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Loans Repaid
                </div>
              </div>
              <div className={`rounded-xl shadow-sm p-6 text-center ${
                isDark ? 'bg-gray-800' : 'bg-white'
              }`}>
                <Target className={`h-8 w-8 mx-auto mb-2 ${
                  isDark ? 'text-green-400' : 'text-green-600'
                }`} />
                <div className={`text-2xl font-bold ${
                  isDark ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {creditData.repaymentRate}%
                </div>
                <div className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Success Rate
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tips for Improvement */}
        <div className="mt-12">
          <h3 className={`text-2xl font-bold mb-6 text-center ${
            isDark ? 'text-gray-100' : 'text-gray-900'
          }`}>
            Tips to Improve Your Credit Score
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getTips().map((tip, index) => (
              <div key={index} className={`rounded-xl shadow-sm p-6 text-center hover:shadow-md transition-shadow ${
                isDark ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white'
              }`}>
                <div className="text-3xl mb-4">{tip.icon}</div>
                <h4 className={`font-semibold mb-2 ${
                  isDark ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {tip.title}
                </h4>
                <p className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {tip.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Score Range Guide */}
        <div className={`mt-12 rounded-xl shadow-sm p-6 ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h3 className={`text-xl font-semibold mb-6 text-center ${
            isDark ? 'text-gray-100' : 'text-gray-900'
          }`}>
            Credit Score Range Guide
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`text-center p-4 rounded-lg border-2 ${
              isDark 
                ? 'bg-green-900/30 border-green-600/50' 
                : 'bg-green-50 border-green-200'
            }`}>
              <div className="text-2xl mb-2">⭐</div>
              <div className={`font-semibold ${
                isDark ? 'text-green-300' : 'text-green-800'
              }`}>
                80-100
              </div>
              <div className={`text-sm ${
                isDark ? 'text-green-400' : 'text-green-600'
              }`}>
                Excellent
              </div>
            </div>
            <div className={`text-center p-4 rounded-lg border-2 ${
              isDark 
                ? 'bg-blue-900/30 border-blue-600/50' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="text-2xl mb-2">✅</div>
              <div className={`font-semibold ${
                isDark ? 'text-blue-300' : 'text-blue-800'
              }`}>
                60-79
              </div>
              <div className={`text-sm ${
                isDark ? 'text-blue-400' : 'text-blue-600'
              }`}>
                Good
              </div>
            </div>
            <div className={`text-center p-4 rounded-lg border-2 ${
              isDark 
                ? 'bg-yellow-900/30 border-yellow-600/50' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="text-2xl mb-2">⚠️</div>
              <div className={`font-semibold ${
                isDark ? 'text-yellow-300' : 'text-yellow-800'
              }`}>
                40-59
              </div>
              <div className={`text-sm ${
                isDark ? 'text-yellow-400' : 'text-yellow-600'
              }`}>
                Average
              </div>
            </div>
            <div className={`text-center p-4 rounded-lg border-2 ${
              isDark 
                ? 'bg-red-900/30 border-red-600/50' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="text-2xl mb-2">❌</div>
              <div className={`font-semibold ${
                isDark ? 'text-red-300' : 'text-red-800'
              }`}>
                0-39
              </div>
              <div className={`text-sm ${
                isDark ? 'text-red-400' : 'text-red-600'
              }`}>
                Risky
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditScorePage;
