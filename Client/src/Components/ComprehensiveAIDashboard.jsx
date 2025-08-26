import React, { useState, useEffect } from 'react';
import {
  Brain,
  Zap,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Gauge,
  Star,
  Eye,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Users,
  DollarSign
} from 'lucide-react';
import Navbar from './Navbar';
import API from '../api/api';
import AIFraudDetectionDashboard from './AIFraudDetectionDashboard';
import { auth } from '../firebase';
import { useTheme } from '../contexts/ThemeContext';

const ComprehensiveAIDashboard = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [activeTab, setActiveTab] = useState('fraud-detection'); // Default to fraud detection (available to all)
  const [riskData, setRiskData] = useState(null);
  const [platformAnalytics, setPlatformAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('comprehensive');
  const [userRole, setUserRole] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const res = await API.get('/users/me');
          console.log('👤 User role fetched in AI Dashboard:', res.data.role);
          setUserRole(res.data.role);
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      } else {
        setUser(null);
        setUserRole('');
      }
    });

    loadDashboardData();
    
    return () => unsubscribe();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Only fetch risk assessment data if user is admin
      const promises = [];
      
      if (userRole === 'admin') {
        promises.push(API.get(`/ai/risk-assessment?model=${selectedModel}`).catch(() => ({ data: null })));
      } else {
        promises.push(Promise.resolve({ data: null }));
      }
      
      promises.push(API.get('/ai/platform-analytics').catch(() => ({ data: null })));

      const [riskResponse, analyticsResponse] = await Promise.all(promises);

      setRiskData(riskResponse.data);
      setPlatformAnalytics(analyticsResponse.data);
    } catch (error) {
      console.error('Error loading AI dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 80) return isDark ? 'text-green-400 bg-green-900/20 border-green-700' : 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return isDark ? 'text-blue-400 bg-blue-900/20 border-blue-700' : 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return isDark ? 'text-yellow-400 bg-yellow-900/20 border-yellow-700' : 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return isDark ? 'text-red-400 bg-red-900/20 border-red-700' : 'text-red-600 bg-red-50 border-red-200';
  };

  const getRiskIcon = (score) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4" />;
    if (score >= 60) return <Target className="w-4 h-4" />;
    if (score >= 40) return <AlertTriangle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  const getDecisionColor = (decision) => {
    switch (decision) {
      case 'approve': return isDark ? 'text-green-400 bg-green-900/20 border-green-700' : 'text-green-600 bg-green-50 border-green-200';
      case 'reject': return isDark ? 'text-red-400 bg-red-900/20 border-red-700' : 'text-red-600 bg-red-50 border-red-200';
      default: return isDark ? 'text-yellow-400 bg-yellow-900/20 border-yellow-700' : 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'very_low': return isDark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200';
      case 'low': return isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200';
      case 'medium': return isDark ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200';
      case 'high': return isDark ? 'bg-orange-900/20 border-orange-700' : 'bg-orange-50 border-orange-200';
      case 'very_high': return isDark ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200';
      default: return isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200';
    }
  };

  const getRiskLevelBadge = (riskLevel) => {
    switch (riskLevel) {
      case 'very_low': return isDark ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-800';
      case 'low': return isDark ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-800';
      case 'medium': return isDark ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-800';
      case 'high': return isDark ? 'bg-orange-900/20 text-orange-400' : 'bg-orange-100 text-orange-800';
      case 'very_high': return isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-800';
      default: return isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-800';
    }
  };

  const aiModels = [
    {
      id: 'comprehensive',
      name: 'Comprehensive AI',
      description: 'Deep learning model analyzing 200+ factors',
      accuracy: 94,
      speed: 'Fast',
      icon: Brain,
    },
    {
      id: 'rapid',
      name: 'Rapid Assessment',
      description: 'Quick evaluation for instant decisions',
      accuracy: 87,
      speed: 'Instant',
      icon: Zap,
    },
    {
      id: 'conservative',
      name: 'Conservative Model',
      description: 'Lower risk tolerance, higher accuracy',
      accuracy: 96,
      speed: 'Moderate',
      icon: Shield,
    },
  ];

  const FactorCard = ({ title, score, impact, trend, description, icon: Icon }) => (
    <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm p-6 border hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className={`p-2 ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'} rounded-lg mr-3`}>
            <Icon className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
        </div>
        <div className={`flex items-center px-3 py-1 rounded-full border ${getRiskColor(score)}`}>
          {getRiskIcon(score)}
          <span className="ml-1 font-medium">{score}/100</span>
        </div>
      </div>
      
      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-3`}>{description}</p>
      
      <div className={`flex items-center justify-between text-sm`}>
        <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Impact: {impact}</span>
        <span className={`flex items-center ${
          trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          <TrendingUp className={`w-4 h-4 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
          {Math.abs(trend)}%
        </span>
      </div>
    </div>
  );

  const ModelCard = ({ model, isSelected, onSelect }) => (
    <div
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected 
          ? `border-blue-500 ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}` 
          : `${isDark ? 'border-gray-600 hover:border-gray-500 bg-gray-800' : 'border-gray-200 hover:border-gray-300 bg-white'}`
      }`}
      onClick={() => onSelect(model.id)}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{model.name}</h3>
        <model.icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : isDark ? 'text-gray-500' : 'text-gray-400'}`} />
      </div>
      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>{model.description}</p>
      <div className={`flex items-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
        <span>Accuracy: {model.accuracy}%</span>
        <span className="mx-2">•</span>
        <span>Speed: {model.speed}</span>
      </div>
    </div>
  );

  const CircularProgress = ({ score, size = 120 }) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;

    return (
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f1f5f9"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444'}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{score}</div>
            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Risk Score</div>
          </div>
        </div>
      </div>
    );
  };

  const allTabs = [
    { id: 'risk-assessment', label: 'Risk Assessment', icon: Gauge, adminOnly: true },
    { id: 'fraud-detection', label: 'Fraud Detection', icon: Shield, adminOnly: false },
    { id: 'ai-models', label: 'AI Models', icon: Brain, adminOnly: false },
  ];

  // Filter tabs based on user role
  const tabs = allTabs.filter(tab => !tab.adminOnly || userRole === 'admin');

  // Update active tab if current tab is not available for user role
  useEffect(() => {
    if (userRole && tabs.length > 0) {
      const isActiveTabAvailable = tabs.some(tab => tab.id === activeTab);
      if (!isActiveTabAvailable) {
        setActiveTab(tabs[0].id); // Set to first available tab
      }
    }
  }, [userRole, tabs, activeTab]);

  // Reload data when user role changes
  useEffect(() => {
    if (userRole) {
      loadDashboardData();
    }
  }, [userRole]);

  if (loading && !riskData) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className={`animate-spin rounded-full h-16 w-16 border-b-2 ${isDark ? 'border-blue-400' : 'border-blue-600'} mx-auto mb-4`}></div>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading AI Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-xl shadow-sm p-6 mb-6 border`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center`}>
                <Brain className={`w-8 h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'} mr-3`} />
                AI-Powered Risk Analytics
              </h1>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                Advanced machine learning insights for lending decisions
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadDashboardData}
                disabled={loading}
                className={`flex items-center px-4 py-2 ${isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg disabled:opacity-50`}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-sm mb-6`}>
          <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : `border-transparent ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Risk Assessment Tab - Admin Only */}
            {activeTab === 'risk-assessment' && userRole === 'admin' && riskData && (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={`${isDark ? 'bg-gradient-to-br from-blue-900/20 to-indigo-900/30' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} rounded-xl p-6`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Overall Risk Score</h3>
                      <Gauge className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex items-center justify-center">
                      <CircularProgress score={riskData.overallScore} />
                    </div>
                    <div className="text-center mt-4">
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Model: {riskData.modelUsed}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Accuracy: {riskData.modelAccuracy}%</p>
                    </div>
                  </div>

                  <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-xl border p-6`}>
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>Decision Recommendation</h3>
                    <div className={`inline-flex items-center px-4 py-2 rounded-full border ${getDecisionColor(riskData.decision?.decision)}`}>
                      {riskData.decision?.decision === 'approve' ? (
                        <CheckCircle className="w-5 h-5 mr-2" />
                      ) : (
                        <XCircle className="w-5 h-5 mr-2" />
                      )}
                      <span className="font-medium capitalize">{riskData.decision?.decision}</span>
                    </div>
                    <div className={`mt-4 space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      <p>Confidence: {riskData.decision?.confidence}%</p>
                      {riskData.decision?.suggestedRate && (
                        <p>Suggested Rate: {riskData.decision.suggestedRate}%</p>
                      )}
                      {riskData.decision?.maxAmount && (
                        <p>Max Amount: ₹{riskData.decision.maxAmount.toLocaleString()}</p>
                      )}
                    </div>
                  </div>

                  <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-xl border p-6`}>
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>Platform Stats</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Assessments</span>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{riskData.platformStats?.totalAssessments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Approval Rate</span>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{riskData.platformStats?.approvalRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Repayment Rate</span>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{riskData.platformStats?.repaymentRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Avg Processing</span>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{riskData.platformStats?.avgProcessingTime}s</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Industry-Standard Risk Factors */}
                <div>
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>Industry-Standard Risk Factor Analysis</h3>
                  
                  {/* Risk Components Overview */}
                  {riskData.riskComponents && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                      <div className={`${isDark ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'} border rounded-xl p-4`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>Creditworthiness</span>
                          <span className={`text-xs ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{((riskData.riskComponents.creditworthiness / 35) * 100).toFixed(0)}%</span>
                        </div>
                        <div className={`text-2xl font-bold ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>{riskData.riskComponents.creditworthiness}/35</div>
                        <div className={`w-full ${isDark ? 'bg-purple-800' : 'bg-purple-200'} rounded-full h-2 mt-2`}>
                          <div 
                            className={`${isDark ? 'bg-purple-500' : 'bg-purple-600'} h-2 rounded-full`} 
                            style={{width: `${(riskData.riskComponents.creditworthiness / 35) * 100}%`}}
                          ></div>
                        </div>
                      </div>
                      
                      <div className={`${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-xl p-4`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Behavioral Risk</span>
                          <span className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{((riskData.riskComponents.behavioralRisk / 25) * 100).toFixed(0)}%</span>
                        </div>
                        <div className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>{riskData.riskComponents.behavioralRisk}/25</div>
                        <div className={`w-full ${isDark ? 'bg-blue-800' : 'bg-blue-200'} rounded-full h-2 mt-2`}>
                          <div 
                            className={`${isDark ? 'bg-blue-500' : 'bg-blue-600'} h-2 rounded-full`} 
                            style={{width: `${(riskData.riskComponents.behavioralRisk / 25) * 100}%`}}
                          ></div>
                        </div>
                      </div>
                      
                      <div className={`${isDark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'} border rounded-xl p-4`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>Financial Stability</span>
                          <span className={`text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>{((riskData.riskComponents.financialStability / 20) * 100).toFixed(0)}%</span>
                        </div>
                        <div className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>{riskData.riskComponents.financialStability}/20</div>
                        <div className={`w-full ${isDark ? 'bg-green-800' : 'bg-green-200'} rounded-full h-2 mt-2`}>
                          <div 
                            className={`${isDark ? 'bg-green-500' : 'bg-green-600'} h-2 rounded-full`} 
                            style={{width: `${(riskData.riskComponents.financialStability / 20) * 100}%`}}
                          ></div>
                        </div>
                      </div>
                      
                      <div className={`${isDark ? 'bg-orange-900/20 border-orange-700' : 'bg-orange-50 border-orange-200'} border rounded-xl p-4`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>Identity Verification</span>
                          <span className={`text-xs ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{((riskData.riskComponents.identityVerification / 10) * 100).toFixed(0)}%</span>
                        </div>
                        <div className={`text-2xl font-bold ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>{riskData.riskComponents.identityVerification}/10</div>
                        <div className={`w-full ${isDark ? 'bg-orange-800' : 'bg-orange-200'} rounded-full h-2 mt-2`}>
                          <div 
                            className={`${isDark ? 'bg-orange-500' : 'bg-orange-600'} h-2 rounded-full`} 
                            style={{width: `${(riskData.riskComponents.identityVerification / 10) * 100}%`}}
                          ></div>
                        </div>
                      </div>
                      
                      <div className={`${isDark ? 'bg-indigo-900/20 border-indigo-700' : 'bg-indigo-50 border-indigo-200'} border rounded-xl p-4`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>Platform History</span>
                          <span className={`text-xs ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{((riskData.riskComponents.platformHistory / 10) * 100).toFixed(0)}%</span>
                        </div>
                        <div className={`text-2xl font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>{riskData.riskComponents.platformHistory}/10</div>
                        <div className={`w-full ${isDark ? 'bg-indigo-800' : 'bg-indigo-200'} rounded-full h-2 mt-2`}>
                          <div 
                            className={`${isDark ? 'bg-indigo-500' : 'bg-indigo-600'} h-2 rounded-full`} 
                            style={{width: `${(riskData.riskComponents.platformHistory / 10) * 100}%`}}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detailed Risk Factors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {riskData.riskFactors && riskData.riskFactors.map((factor, index) => (
                      <div key={index} className={`border rounded-xl p-4 ${getRiskLevelColor(factor.risk_level)}`}>
                        <div className="flex items-start justify-between mb-2">
                          <h4 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{factor.factor}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${getRiskLevelBadge(factor.risk_level)}`}>
                            {factor.risk_level?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center mb-2">
                          <span className={`text-lg font-bold mr-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {factor.impact > 0 ? '+' : ''}{factor.impact}
                          </span>
                          {factor.impact > 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
                          )}
                        </div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{factor.description}</p>
                        <span className={`text-xs ${isDark ? 'text-gray-500 bg-gray-700' : 'text-gray-500 bg-gray-100'} px-2 py-1 rounded`}>
                          {factor.category}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Warning Flags */}
                  {riskData.warningFlags && riskData.warningFlags.length > 0 && (
                    <div className="mt-6">
                      <h4 className={`text-lg font-semibold ${isDark ? 'text-red-400' : 'text-red-700'} mb-3 flex items-center`}>
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        Warning Flags ({riskData.warningFlags.length})
                      </h4>
                      <div className="space-y-2">
                        {riskData.warningFlags.map((warning, index) => (
                          <div key={index} className={`${isDark ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'} border rounded-lg p-3`}>
                            <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-800'}`}>{warning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                {riskData.recommendations && riskData.recommendations.length > 0 && (
                  <div>
                    <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>AI Recommendations</h3>
                    <div className="space-y-4">
                      {riskData.recommendations.map((rec, index) => (
                        <div key={index} className={`p-4 rounded-lg border-l-4 ${
                          rec.priority === 'high' ? (isDark ? 'bg-red-900/20 border-red-500' : 'bg-red-50 border-red-400') :
                          rec.priority === 'medium' ? (isDark ? 'bg-yellow-900/20 border-yellow-500' : 'bg-yellow-50 border-yellow-400') :
                          (isDark ? 'bg-blue-900/20 border-blue-500' : 'bg-blue-50 border-blue-400')
                        }`}>
                          <div className="flex items-center justify-between">
                            <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{rec.title}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              rec.priority === 'high' ? (isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-800') :
                              rec.priority === 'medium' ? (isDark ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-800') :
                              (isDark ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-800')
                            }`}>
                              {rec.priority} priority
                            </span>
                          </div>
                          <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} text-sm mt-1`}>{rec.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Access Denied for Risk Assessment for Non-Admin Users */}
            {activeTab === 'risk-assessment' && userRole !== 'admin' && (
              <div className="text-center py-12">
                <Shield className={`w-16 h-16 ${isDark ? 'text-gray-600' : 'text-gray-400'} mx-auto mb-4`} />
                <h3 className={`text-xl font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Access Restricted</h3>
                <p className={`${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Risk Assessment features are only available to administrators.</p>
              </div>
            )}

            {/* Fraud Detection Tab */}
            {activeTab === 'fraud-detection' && (
              <AIFraudDetectionDashboard />
            )}

            {/* AI Models Tab */}
            {activeTab === 'ai-models' && (
              <div className="space-y-6">
                <div>
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>Available AI Models</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {aiModels.map((model) => (
                      <ModelCard
                        key={model.id}
                        model={model}
                        isSelected={selectedModel === model.id}
                        onSelect={(modelId) => {
                          setSelectedModel(modelId);
                          loadDashboardData();
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6`}>
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>Model Performance Comparison</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`border-b ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                          <th className={`text-left py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Model</th>
                          <th className={`text-left py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Accuracy</th>
                          <th className={`text-left py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Speed</th>
                          <th className={`text-left py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Use Case</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiModels.map((model) => (
                          <tr key={model.id} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <td className={`py-2 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{model.name}</td>
                            <td className={`py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{model.accuracy}%</td>
                            <td className={`py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{model.speed}</td>
                            <td className={`py-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{model.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveAIDashboard;
