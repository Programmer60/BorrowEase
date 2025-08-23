import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import {
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  Target,
  Star,
  Shield,
  Users,
  BarChart3,
  Info,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import Navbar from './Navbar';
import API from '../api/api';
import { useTheme } from '../contexts/ThemeContext';

const CreditScore = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [creditData, setCreditData] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCreditScore();
  }, []);

  const loadCreditScore = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🎯 Starting credit score load...');
      console.log('🔐 Current user:', auth.currentUser?.email);
      console.log('🔐 Auth state:', !!auth.currentUser);
      
      // Get user info and credit score
      console.log('📞 Making API calls for user info and credit score...');
      const [userRes, creditRes] = await Promise.all([
        API.get('/users/me'),
        API.get('/credit/score')
      ]);
      
      console.log('👤 User response:', userRes.data);
      console.log('📊 Credit response:', creditRes.data);
      
      setUserRole(userRes.data.role);
      setCreditData(creditRes.data);
      
      console.log('✅ Credit score loaded successfully');
    } catch (error) {
      console.error('❌ Error loading credit score:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      
      if (error.response?.status === 401) {
        console.log('🚫 Unauthorized access - token issue');
        setError('Authentication failed. Please login again.');
      } else {
        setError(error.response?.data?.error || 'Failed to load credit score');
      }
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 750) return 'text-green-600';
    if (score >= 650) return 'text-yellow-600';
    if (score >= 550) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 750) return 'bg-green-100';
    if (score >= 650) return 'bg-yellow-100';
    if (score >= 550) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getScoreRating = (score) => {
    if (score >= 750) return 'Excellent';
    if (score >= 650) return 'Good';
    if (score >= 550) return 'Fair';
    return 'Poor';
  };

  const getScoreIcon = (score) => {
    if (score >= 750) return <Award className="w-8 h-8 text-green-600" />;
    if (score >= 650) return <CheckCircle className="w-8 h-8 text-yellow-600" />;
    if (score >= 550) return <Clock className="w-8 h-8 text-orange-600" />;
    return <AlertTriangle className="w-8 h-8 text-red-600" />;
  };

  const CircularProgress = ({ score, size = 200 }) => {
    const radius = (size - 20) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (score / 850) * circumference;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={score >= 750 ? '#10b981' : score >= 650 ? '#f59e0b' : score >= 550 ? '#f97316' : '#ef4444'}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${getScoreColor(score)}`}>
            {score}
          </span>
          <span className="text-sm text-gray-500">out of 850</span>
          <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
            {getScoreRating(score)}
          </span>
        </div>
      </div>
    );
  };

  const ScoreFactor = ({ icon, title, value, impact, description }) => (
    <div className={`rounded-lg p-4 border hover:shadow-md transition-shadow ${
      isDark 
        ? 'bg-gray-700 border-gray-600' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          {icon}
          <h4 className={`font-semibold ml-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h4>
        </div>
        <span className={`text-sm font-medium px-2 py-1 rounded ${
          impact === 'positive' ? 'bg-green-100 text-green-800' :
          impact === 'negative' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {impact === 'positive' ? '+' : impact === 'negative' ? '-' : ''}
          {Math.abs(value)}
        </span>
      </div>
      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{description}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading your credit score...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Credit Score</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={loadCreditScore}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
        : 'bg-gradient-to-br from-blue-50 to-indigo-100'
    }`}>
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Credit Score Dashboard</h1>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Monitor your creditworthiness and financial health</p>
        </div>

        {/* Main Credit Score Card */}
        <div className={`rounded-xl shadow-lg p-8 mb-8 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Credit Score Circle */}
            <div className="flex flex-col items-center">
              <CircularProgress score={creditData?.score || 300} />
              <div className="mt-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  {getScoreIcon(creditData?.score || 300)}
                  <span className={`ml-2 text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {getScoreRating(creditData?.score || 300)} Credit Score
                  </span>
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Last updated: {creditData?.lastUpdated ? new Date(creditData.lastUpdated).toLocaleDateString() : 'Today'}
                </p>
              </div>
            </div>

            {/* Score Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Score Breakdown</h3>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  {showDetails ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                  {showDetails ? 'Hide' : 'Show'} Details
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{creditData?.totalLoans || 0}</div>
                  <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Total Loans</div>
                </div>
                <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="text-2xl font-bold text-green-600">{creditData?.repaidLoans || 0}</div>
                  <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loans Repaid</div>
                </div>
                <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="text-2xl font-bold text-blue-600">
                    {creditData?.totalLoans > 0 ? Math.round((creditData?.repaidLoans / creditData?.totalLoans) * 100) : 0}%
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Repayment Rate</div>
                </div>
                <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="text-2xl font-bold text-purple-600">
                    ₹{(creditData?.totalAmount || 0).toLocaleString()}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Total Borrowed</div>
                </div>
              </div>

              {/* Score Range */}
              <div className="mt-6">
                <h4 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Credit Score Range</h4>
                <div className="relative">
                  <div className={`flex justify-between text-xs mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span>300</span>
                    <span>500</span>
                    <span>650</span>
                    <span>750</span>
                    <span>850</span>
                  </div>
                  <div className="h-3 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-full relative">
                    <div 
                      className={`absolute top-0 w-3 h-3 ${isDark ? 'bg-gray-900 border-gray-300' : 'bg-white border-gray-800'} border-2 rounded-full transform -translate-x-1/2`}
                      style={{ left: `${((creditData?.score || 300) - 300) / 550 * 100}%` }}
                    ></div>
                  </div>
                  <div className={`flex justify-between text-xs mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span>Poor</span>
                    <span>Fair</span>
                    <span>Good</span>
                    <span>Excellent</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Score Factors */}
        {showDetails && (
          <div className={`rounded-xl shadow-lg p-6 mb-8 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Factors Affecting Your Score</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ScoreFactor
                icon={<Clock className="w-5 h-5 text-green-600" />}
                title="Payment History"
                value={creditData?.paymentHistory || 0}
                impact="positive"
                description="Your track record of making loan payments on time"
              />
              <ScoreFactor
                icon={<DollarSign className="w-5 h-5 text-blue-600" />}
                title="Credit Utilization"
                value={creditData?.creditUtilization || 0}
                impact={creditData?.creditUtilization > 30 ? "negative" : "positive"}
                description="Percentage of available credit you're currently using"
              />
              <ScoreFactor
                icon={<Calendar className="w-5 h-5 text-purple-600" />}
                title="Credit History Length"
                value={creditData?.creditHistory || 0}
                impact="positive"
                description="How long you've been using credit services"
              />
              <ScoreFactor
                icon={<BarChart3 className="w-5 h-5 text-orange-600" />}
                title="Loan Diversity"
                value={creditData?.loanDiversity || 0}
                impact="positive"
                description="Variety of loan types you've successfully managed"
              />
              <ScoreFactor
                icon={<Users className="w-5 h-5 text-indigo-600" />}
                title="Social Score"
                value={creditData?.socialScore || 0}
                impact="positive"
                description="Peer reviews and community trust rating"
              />
              <ScoreFactor
                icon={<Shield className="w-5 h-5 text-cyan-600" />}
                title="KYC Verification"
                value={creditData?.kycVerified ? 50 : -50}
                impact={creditData?.kycVerified ? "positive" : "negative"}
                description="Identity verification status"
              />
            </div>
          </div>
        )}

        {/* Improvement Tips */}
          <div className={`rounded-xl shadow-lg p-6 mb-8 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Ways to Improve Your Score</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Make Timely Payments</h4>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Always repay your loans on or before the due date</p>
            </div>
                </div>
                <div className="flex items-start">
            <Target className="w-5 h-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Maintain Low Credit Utilization</h4>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Keep your outstanding loans below 30% of your income</p>
            </div>
                </div>
                <div className="flex items-start">
            <Award className="w-5 h-5 text-purple-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Build Credit History</h4>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Take smaller loans and repay them consistently</p>
            </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
            <Star className="w-5 h-5 text-yellow-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Complete KYC Verification</h4>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Verify your identity to boost your trust score</p>
            </div>
                </div>
                <div className="flex items-start">
            <Users className="w-5 h-5 text-indigo-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Build Community Trust</h4>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Maintain good relationships with lenders</p>
            </div>
                </div>
                <div className="flex items-start">
            <Info className="w-5 h-5 text-cyan-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Monitor Regularly</h4>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Check your score monthly to track progress</p>
            </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
        <div className={`rounded-xl shadow-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent Credit Activity</h3>
          <div className="space-y-4">
            {creditData?.recentActivity?.length > 0 ? (
              creditData.recentActivity.map((activity, index) => (
                <div key={index} className={`flex items-center justify-between p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'payment' ? (isDark ? 'bg-green-900' : 'bg-green-100') :
                      activity.type === 'loan' ? (isDark ? 'bg-blue-900' : 'bg-blue-100') :
                      (isDark ? 'bg-yellow-900' : 'bg-yellow-100')
                    }`}>
                      {activity.type === 'payment' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                       activity.type === 'loan' ? <DollarSign className="w-4 h-4 text-blue-600" /> :
                       <Clock className="w-4 h-4 text-yellow-600" />}
                    </div>
                    <div className="ml-3">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{activity.description}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{activity.date}</p>
                    </div>
                  </div>
                  <span className={`font-medium ${
                    activity.impact > 0 ? 'text-green-600' : 
                    activity.impact < 0 ? 'text-red-600' : 
                    (isDark ? 'text-gray-300' : 'text-gray-600')
                  }`}>
                    {activity.impact > 0 ? '+' : ''}{activity.impact}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className={isDark ? "text-gray-300" : "text-gray-600"}>No recent credit activity</p>
                <p className={isDark ? "text-sm text-gray-400" : "text-sm text-gray-500"}>Take a loan and make payments to build your credit history</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditScore;
