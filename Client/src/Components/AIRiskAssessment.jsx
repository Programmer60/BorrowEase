import React, { useState, useEffect } from 'react';
import {
  Brain,
  TrendingUp,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart,
  Target,
  Zap,
  Lock,
  Users,
  Award,
  Clock,
} from 'lucide-react';
import Navbar from './Navbar';
import API from '../api/api';

const AIRiskAssessment = () => {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('comprehensive');

  useEffect(() => {
    fetchRiskAssessment();
  }, [selectedModel]);

  const fetchRiskAssessment = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/ai/risk-assessment?model=${selectedModel}`);
      setRiskData(response.data);
    } catch (error) {
      console.error('Error fetching risk assessment:', error);
      // Fallback to mock data if API fails
      setRiskData({
        overallScore: 85,
        factors: {
          paymentHistory: 92,
          creditUtilization: 78,
          incomeStability: 85,
          debtToIncome: 71,
          socialSignals: 82,
          marketConditions: 67
        },
        recommendations: [
          {
            priority: 'low',
            title: 'Good Credit Profile',
            description: 'Current risk levels are acceptable'
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getRiskIcon = (score) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5" />;
    if (score >= 60) return <Shield className="w-5 h-5" />;
    if (score >= 40) return <AlertTriangle className="w-5 h-5" />;
    return <XCircle className="w-5 h-5" />;
  };

  const FactorCard = ({ title, score, impact, trend, description }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className={`flex items-center px-3 py-1 rounded-full ${getRiskColor(score)}`}>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Brain className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
            <p className="text-gray-600">AI is analyzing risk patterns...</p>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Brain className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Risk Assessment</h1>
              <p className="text-gray-600">Advanced machine learning for credit risk evaluation</p>
            </div>
          </div>
        </div>

        {/* AI Model Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select AI Model</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiModels.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                isSelected={selectedModel === model.id}
                onSelect={setSelectedModel}
              />
            ))}
          </div>
        </div>

        {/* Overall Risk Score */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Platform Risk Score</h2>
              <p className="text-blue-100">AI-powered comprehensive assessment</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">{riskData?.overallScore || 85}</div>
              <div className="text-blue-100">out of 100</div>
              <div className="flex items-center justify-center mt-2">
                <TrendingUp className="w-5 h-5 mr-1" />
                <span>+3.2% this month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Factors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <FactorCard
            title="Payment History"
            score={riskData?.factors?.paymentHistory || 92}
            impact="High"
            trend={2.1}
            description="Borrower's track record of on-time payments and loan repayments"
          />
          <FactorCard
            title="Credit Utilization"
            score={riskData?.factors?.creditUtilization || 78}
            impact="Medium"
            trend={-1.5}
            description="Ratio of current debt to available credit limits"
          />
          <FactorCard
            title="Income Stability"
            score={riskData?.factors?.incomeStability || 85}
            impact="High"
            trend={0.8}
            description="Consistency and reliability of income sources"
          />
          <FactorCard
            title="Debt-to-Income"
            score={riskData?.factors?.debtToIncome || 71}
            impact="High"
            trend={-0.3}
            description="Total monthly debt payments divided by gross monthly income"
          />
          <FactorCard
            title="Social Signals"
            score={riskData?.factors?.socialSignals || 82}
            impact="Low"
            trend={4.2}
            description="Digital footprint and social network reliability indicators"
          />
          <FactorCard
            title="Market Conditions"
            score={riskData?.factors?.marketConditions || 67}
            impact="Medium"
            trend={-2.1}
            description="Current economic climate and industry-specific factors"
          />
        </div>

        {/* AI Insights and Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center mb-4">
              <Target className="w-6 h-6 text-purple-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">AI Recommendations</h3>
            </div>
            <div className="space-y-4">
              {riskData?.recommendations?.map((rec, index) => (
                <div key={index} className="flex items-start">
                  <div className={`w-2 h-2 rounded-full mt-2 mr-3 ${
                    rec.priority === 'high' ? 'bg-red-500' :
                    rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{rec.title}</p>
                    <p className="text-sm text-gray-600">{rec.description}</p>
                  </div>
                </div>
              )) || (
                <div className="text-center py-4">
                  <p className="text-gray-500">Loading recommendations...</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center mb-4">
              <BarChart3 className="w-6 h-6 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Predictive Analytics</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Default Probability</span>
                <span className="text-lg font-bold text-red-600">
                  {riskData?.decision ? `${(100 - riskData.overallScore).toFixed(1)}%` : '2.3%'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Risk Score</span>
                <span className={`text-lg font-bold ${
                  (riskData?.overallScore || 85) >= 70 ? 'text-green-600' : 
                  (riskData?.overallScore || 85) >= 40 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {riskData?.overallScore || 85}/100
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Recommended Decision</span>
                <span className={`text-lg font-bold ${
                  riskData?.decision?.decision === 'approve' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {riskData?.decision?.decision || 'Approve'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Suggested Rate</span>
                <span className="text-lg font-bold text-blue-600">
                  {riskData?.decision?.suggestedRate ? `${riskData.decision.suggestedRate.toFixed(1)}%` : '8.5%'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <Clock className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">
              {riskData?.platformStats?.avgProcessingTime || 2.3}s
            </div>
            <div className="text-sm text-gray-600">Average Assessment Time</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <Award className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">
              {aiModels.find(m => m.id === selectedModel)?.accuracy || 94}%
            </div>
            <div className="text-sm text-gray-600">Model Accuracy</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <Users className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">
              {riskData?.platformStats?.totalAssessments || '15.7K'}
            </div>
            <div className="text-sm text-gray-600">Total Assessments</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <Lock className="w-8 h-8 text-orange-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">
              {riskData?.platformStats?.repaymentRate || 99}%
            </div>
            <div className="text-sm text-gray-600">Platform Repayment Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIRiskAssessment;
