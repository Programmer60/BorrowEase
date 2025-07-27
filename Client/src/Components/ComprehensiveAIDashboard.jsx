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

const ComprehensiveAIDashboard = () => {
  const [activeTab, setActiveTab] = useState('risk-assessment');
  const [riskData, setRiskData] = useState(null);
  const [platformAnalytics, setPlatformAnalytics] = useState(null);
  const [borrowerAssessment, setBorrowerAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('comprehensive');
  const [assessmentForm, setAssessmentForm] = useState({
    borrowerId: '',
    loanAmount: '',
    loanPurpose: '',
    repaymentPeriod: ''
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [riskResponse, analyticsResponse] = await Promise.all([
        API.get(`/ai/risk-assessment?model=${selectedModel}`).catch(() => ({ data: null })),
        API.get('/ai/platform-analytics').catch(() => ({ data: null }))
      ]);

      setRiskData(riskResponse.data);
      setPlatformAnalytics(analyticsResponse.data);
    } catch (error) {
      console.error('Error loading AI dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBorrowerAssessment = async () => {
    try {
      setLoading(true);
      const response = await API.post('/ai/assess-borrower', assessmentForm);
      setBorrowerAssessment(response.data);
      setActiveTab('borrower-assessment');
    } catch (error) {
      console.error('Error assessing borrower:', error);
      alert('Failed to assess borrower. Please check the borrower ID.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getRiskIcon = (score) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4" />;
    if (score >= 60) return <Target className="w-4 h-4" />;
    if (score >= 40) return <AlertTriangle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  const getDecisionColor = (decision) => {
    switch (decision) {
      case 'approve': return 'text-green-600 bg-green-50 border-green-200';
      case 'reject': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
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
    <div className="bg-white rounded-xl shadow-sm p-6 border hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className="p-2 bg-blue-50 rounded-lg mr-3">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className={`flex items-center px-3 py-1 rounded-full border ${getRiskColor(score)}`}>
          {getRiskIcon(score)}
          <span className="ml-1 font-medium">{score}/100</span>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Impact: {impact}</span>
        <span className={`flex items-center ${
          trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
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
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onSelect(model.id)}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{model.name}</h3>
        <model.icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
      </div>
      <p className="text-sm text-gray-600 mb-2">{model.description}</p>
      <div className="flex items-center text-xs text-gray-500">
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
            <div className="text-2xl font-bold text-gray-900">{score}</div>
            <div className="text-xs text-gray-500">Risk Score</div>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'risk-assessment', label: 'Risk Assessment', icon: Gauge },
    { id: 'borrower-assessment', label: 'Borrower Analysis', icon: Users },
    { id: 'platform-analytics', label: 'Platform Analytics', icon: BarChart3 },
    { id: 'fraud-detection', label: 'Fraud Detection', icon: Shield },
    { id: 'ai-models', label: 'AI Models', icon: Brain },
  ];

  if (loading && !riskData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading AI Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Brain className="w-8 h-8 text-blue-600 mr-3" />
                AI-Powered Risk Analytics
              </h1>
              <p className="text-gray-600 mt-1">
                Advanced machine learning insights for lending decisions
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadDashboardData}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Risk Assessment Tab */}
            {activeTab === 'risk-assessment' && riskData && (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Overall Risk Score</h3>
                      <Gauge className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex items-center justify-center">
                      <CircularProgress score={riskData.overallScore} />
                    </div>
                    <div className="text-center mt-4">
                      <p className="text-sm text-gray-600">Model: {riskData.modelUsed}</p>
                      <p className="text-xs text-gray-500">Accuracy: {riskData.modelAccuracy}%</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Decision Recommendation</h3>
                    <div className={`inline-flex items-center px-4 py-2 rounded-full border ${getDecisionColor(riskData.decision?.decision)}`}>
                      {riskData.decision?.decision === 'approve' ? (
                        <CheckCircle className="w-5 h-5 mr-2" />
                      ) : (
                        <XCircle className="w-5 h-5 mr-2" />
                      )}
                      <span className="font-medium capitalize">{riskData.decision?.decision}</span>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      <p>Confidence: {riskData.decision?.confidence}%</p>
                      {riskData.decision?.suggestedRate && (
                        <p>Suggested Rate: {riskData.decision.suggestedRate}%</p>
                      )}
                      {riskData.decision?.maxAmount && (
                        <p>Max Amount: ₹{riskData.decision.maxAmount.toLocaleString()}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Stats</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Assessments</span>
                        <span className="font-medium">{riskData.platformStats?.totalAssessments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Approval Rate</span>
                        <span className="font-medium">{riskData.platformStats?.approvalRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Repayment Rate</span>
                        <span className="font-medium">{riskData.platformStats?.repaymentRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Processing</span>
                        <span className="font-medium">{riskData.platformStats?.avgProcessingTime}s</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Factors */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Risk Factor Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FactorCard
                      title="Payment History"
                      score={riskData.factors?.paymentHistory || 0}
                      impact="High"
                      trend={5}
                      description="Track record of on-time payments and defaults"
                      icon={Star}
                    />
                    <FactorCard
                      title="Credit Utilization"
                      score={riskData.factors?.creditUtilization || 0}
                      impact="High"
                      trend={-2}
                      description="Current debt relative to available credit"
                      icon={BarChart3}
                    />
                    <FactorCard
                      title="Income Stability"
                      score={riskData.factors?.incomeStability || 0}
                      impact="Medium"
                      trend={3}
                      description="Consistency and reliability of income sources"
                      icon={TrendingUp}
                    />
                    <FactorCard
                      title="Debt to Income"
                      score={riskData.factors?.debtToIncome || 0}
                      impact="High"
                      trend={-1}
                      description="Total debt obligations vs monthly income"
                      icon={PieChart}
                    />
                    <FactorCard
                      title="Social Signals"
                      score={riskData.factors?.socialSignals || 0}
                      impact="Low"
                      trend={2}
                      description="KYC verification and profile completeness"
                      icon={Users}
                    />
                    <FactorCard
                      title="Market Conditions"
                      score={riskData.factors?.marketConditions || 0}
                      impact="Medium"
                      trend={1}
                      description="Current economic and market environment"
                      icon={Activity}
                    />
                  </div>
                </div>

                {/* Recommendations */}
                {riskData.recommendations && riskData.recommendations.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">AI Recommendations</h3>
                    <div className="space-y-4">
                      {riskData.recommendations.map((rec, index) => (
                        <div key={index} className={`p-4 rounded-lg border-l-4 ${
                          rec.priority === 'high' ? 'bg-red-50 border-red-400' :
                          rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                          'bg-blue-50 border-blue-400'
                        }`}>
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                              rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {rec.priority} priority
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm mt-1">{rec.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Borrower Assessment Tab */}
            {activeTab === 'borrower-assessment' && (
              <div className="space-y-6">
                {/* Assessment Form */}
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Individual Borrower Assessment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Borrower ID</label>
                      <input
                        type="text"
                        value={assessmentForm.borrowerId}
                        onChange={(e) => setAssessmentForm({...assessmentForm, borrowerId: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter borrower ID"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Loan Amount</label>
                      <input
                        type="number"
                        value={assessmentForm.loanAmount}
                        onChange={(e) => setAssessmentForm({...assessmentForm, loanAmount: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="₹ 0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Loan Purpose</label>
                      <input
                        type="text"
                        value={assessmentForm.loanPurpose}
                        onChange={(e) => setAssessmentForm({...assessmentForm, loanPurpose: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Business expansion"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Repayment Period (days)</label>
                      <input
                        type="number"
                        value={assessmentForm.repaymentPeriod}
                        onChange={(e) => setAssessmentForm({...assessmentForm, repaymentPeriod: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="30"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleBorrowerAssessment}
                    disabled={loading || !assessmentForm.borrowerId}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Assess Borrower
                  </button>
                </div>

                {/* Assessment Results */}
                {borrowerAssessment && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Assessment Results</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                          <CircularProgress score={borrowerAssessment.assessment?.baseRiskScore || 0} size={100} />
                          <p className="text-sm text-gray-600 mt-2">Base Risk Score</p>
                        </div>
                        <div className="text-center">
                          <CircularProgress score={borrowerAssessment.assessment?.loanSpecificScore || 0} size={100} />
                          <p className="text-sm text-gray-600 mt-2">Loan-Specific Score</p>
                        </div>
                        <div className="text-center">
                          <div className={`inline-flex items-center px-4 py-2 rounded-full border text-lg font-semibold ${
                            getDecisionColor(borrowerAssessment.assessment?.finalDecision)
                          }`}>
                            {borrowerAssessment.assessment?.finalDecision === 'approve' ? (
                              <CheckCircle className="w-6 h-6 mr-2" />
                            ) : (
                              <XCircle className="w-6 h-6 mr-2" />
                            )}
                            {borrowerAssessment.assessment?.finalDecision?.toUpperCase()}
                          </div>
                          <p className="text-sm text-gray-600 mt-2">
                            Confidence: {borrowerAssessment.assessment?.confidence}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Analysis */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white rounded-xl border p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Borrower Profile</h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Name:</span>
                            <span className="font-medium">{borrowerAssessment.borrowerName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span className="font-medium">{borrowerAssessment.borrowerEmail}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Requested Amount:</span>
                            <span className="font-medium">₹{borrowerAssessment.loanDetails?.requestedAmount?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Purpose:</span>
                            <span className="font-medium">{borrowerAssessment.loanDetails?.purpose}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Repayment Period:</span>
                            <span className="font-medium">{borrowerAssessment.loanDetails?.repaymentPeriod} days</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Loan Recommendation</h4>
                        <div className="space-y-3 text-sm">
                          {borrowerAssessment.assessment?.suggestedRate && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Suggested Interest Rate:</span>
                              <span className="font-medium">{borrowerAssessment.assessment.suggestedRate}% p.a.</span>
                            </div>
                          )}
                          {borrowerAssessment.assessment?.maxRecommendedAmount && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Max Recommended Amount:</span>
                              <span className="font-medium">₹{borrowerAssessment.assessment.maxRecommendedAmount.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    {borrowerAssessment.recommendations && (
                      <div className="bg-white rounded-xl border p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">AI Recommendations</h4>
                        <div className="space-y-3">
                          {borrowerAssessment.recommendations.map((rec, index) => (
                            <div key={index} className={`p-3 rounded-lg border-l-4 ${
                              rec.priority === 'high' ? 'bg-red-50 border-red-400' :
                              rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                              'bg-blue-50 border-blue-400'
                            }`}>
                              <h5 className="font-medium text-gray-900">{rec.title}</h5>
                              <p className="text-gray-700 text-sm">{rec.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Platform Analytics Tab */}
            {activeTab === 'platform-analytics' && platformAnalytics && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl border p-6 text-center">
                    <div className="text-3xl font-bold text-blue-600">{platformAnalytics.platformRiskScore}</div>
                    <div className="text-gray-600 text-sm">Platform Risk Score</div>
                  </div>
                  <div className="bg-white rounded-xl border p-6 text-center">
                    <div className="text-3xl font-bold text-green-600">{platformAnalytics.totalUsers}</div>
                    <div className="text-gray-600 text-sm">Total Users</div>
                  </div>
                  <div className="bg-white rounded-xl border p-6 text-center">
                    <div className="text-3xl font-bold text-red-600">{platformAnalytics.riskDistribution?.high}</div>
                    <div className="text-gray-600 text-sm">High Risk Users</div>
                  </div>
                  <div className="bg-white rounded-xl border p-6 text-center">
                    <div className="text-3xl font-bold text-green-600">{platformAnalytics.riskDistribution?.low}</div>
                    <div className="text-gray-600 text-sm">Low Risk Users</div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Risk Distribution</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{platformAnalytics.riskDistribution?.high}</div>
                      <div className="text-sm text-red-600">High Risk</div>
                      <div className="text-xs text-gray-500">Score &lt; 40</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{platformAnalytics.riskDistribution?.medium}</div>
                      <div className="text-sm text-yellow-600">Medium Risk</div>
                      <div className="text-xs text-gray-500">Score 40-70</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{platformAnalytics.riskDistribution?.low}</div>
                      <div className="text-sm text-green-600">Low Risk</div>
                      <div className="text-xs text-gray-500">Score &gt; 70</div>
                    </div>
                  </div>
                </div>
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
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Available AI Models</h3>
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

                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Performance Comparison</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Model</th>
                          <th className="text-left py-2">Accuracy</th>
                          <th className="text-left py-2">Speed</th>
                          <th className="text-left py-2">Use Case</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiModels.map((model) => (
                          <tr key={model.id} className="border-b">
                            <td className="py-2 font-medium">{model.name}</td>
                            <td className="py-2">{model.accuracy}%</td>
                            <td className="py-2">{model.speed}</td>
                            <td className="py-2 text-gray-600">{model.description}</td>
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
