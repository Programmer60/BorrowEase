import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye, Brain, Activity, TrendingUp } from 'lucide-react';
import API from '../api/api';

const AIFraudDetectionDashboard = () => {
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [riskScores, setRiskScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalChecked: 0,
    flaggedFraud: 0,
    preventedLoss: 0,
    accuracyRate: 95.8
  });

  useEffect(() => {
    fetchFraudData();
  }, []);

  const fetchFraudData = async () => {
    try {
      setLoading(true);
      // In a real implementation, these would be actual API calls
      const fraudResponse = await API.get('/ai/fraud-detection');
      const riskResponse = await API.get('/ai/risk-scores');
      
      setFraudAlerts(fraudResponse.data.alerts || []);
      setRiskScores(riskResponse.data.scores || []);
      setStats(fraudResponse.data.stats || stats);
    } catch (error) {
      console.error('Error fetching fraud data:', error);
      // Fallback to mock data
      setFraudAlerts(generateMockFraudAlerts());
      setRiskScores(generateMockRiskScores());
    } finally {
      setLoading(false);
    }
  };

  const generateMockFraudAlerts = () => [
    {
      id: 'fraud_1',
      borrowerName: 'Raj Kumar',
      loanAmount: 25000,
      riskLevel: 'high',
      riskScore: 85,
      fraudType: 'Identity Fraud',
      confidence: 92,
      detectedAt: new Date().toISOString(),
      reasons: [
        'Multiple applications from same IP',
        'Inconsistent personal information',
        'Fake document signatures detected',
        'Unusual application timing pattern'
      ],
      actions: ['Block application', 'Flag user account', 'Notify admin'],
      status: 'pending_review'
    },
    {
      id: 'fraud_2',
      borrowerName: 'Sneha Patel',
      loanAmount: 15000,
      riskLevel: 'medium',
      riskScore: 68,
      fraudType: 'Income Manipulation',
      confidence: 78,
      detectedAt: new Date(Date.now() - 3600000).toISOString(),
      reasons: [
        'Income documents show irregularities',
        'Bank statements pattern mismatch',
        'Employment verification failed'
      ],
      actions: ['Request additional verification', 'Manual review'],
      status: 'under_review'
    }
  ];

  const generateMockRiskScores = () => [
    { borrowerId: 'user_1', name: 'Arjun Sharma', riskScore: 15, trend: 'stable', lastCheck: '2 hours ago' },
    { borrowerId: 'user_2', name: 'Priya Gupta', riskScore: 22, trend: 'improving', lastCheck: '5 hours ago' },
    { borrowerId: 'user_3', name: 'Vikram Singh', riskScore: 45, trend: 'declining', lastCheck: '1 day ago' },
  ];

  const getRiskColor = (score) => {
    if (score >= 70) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_review': return 'bg-red-100 text-red-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleResolveAlert = async (alertId, action) => {
    try {
      await API.post(`/ai/fraud-alerts/${alertId}/resolve`, { action });
      // Update the alert status locally
      setFraudAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, status: 'resolved' }
            : alert
        )
      );
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border border-red-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-red-600 p-3 rounded-xl mr-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI Fraud Detection Center</h2>
              <p className="text-gray-600">Real-time fraud monitoring and prevention</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">System Status</div>
            <div className="flex items-center text-green-600 font-semibold">
              <Activity className="w-4 h-4 mr-1" />
              Active & Monitoring
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Applications Checked</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalChecked}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Eye className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fraud Flagged</p>
              <p className="text-2xl font-bold text-red-600">{stats.flaggedFraud}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Loss Prevented</p>
              <p className="text-2xl font-bold text-green-600">₹{stats.preventedLoss.toLocaleString()}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">AI Accuracy</p>
              <p className="text-2xl font-bold text-purple-600">{stats.accuracyRate}%</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Fraud Alerts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
              Active Fraud Alerts
            </h3>
            <button
              onClick={fetchFraudData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Refresh Alerts
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent mr-3"></div>
              <span className="text-gray-600">Scanning for fraud...</span>
            </div>
          ) : fraudAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Fraud Alerts</h3>
              <p className="text-gray-600">All applications are currently clean.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {fraudAlerts.map((alert) => (
                <div key={alert.id} className="border border-red-200 rounded-xl p-6 bg-red-50">
                  {/* Alert Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{alert.borrowerName}</h4>
                        <span className={`ml-3 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(alert.status)}`}>
                          {alert.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-600">Loan Amount: ₹{alert.loanAmount.toLocaleString()}</p>
                      <p className="text-red-600 font-medium">Fraud Type: {alert.fraudType}</p>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium ${
                        getRiskColor(alert.riskScore)
                      }`}>
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Risk: {alert.riskScore}/100
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Confidence: {alert.confidence}%</p>
                    </div>
                  </div>

                  {/* Fraud Reasons */}
                  <div className="mb-4">
                    <h5 className="text-sm font-semibold text-gray-900 mb-2">Detected Issues:</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {alert.reasons.map((reason, idx) => (
                        <div key={idx} className="flex items-center text-sm text-red-700">
                          <XCircle className="w-3 h-3 mr-2 flex-shrink-0" />
                          {reason}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommended Actions */}
                  <div className="mb-4">
                    <h5 className="text-sm font-semibold text-gray-900 mb-2">Recommended Actions:</h5>
                    <div className="flex flex-wrap gap-2">
                      {alert.actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleResolveAlert(alert.id, action)}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Alert Timeline */}
                  <div className="text-xs text-gray-600">
                    Detected: {new Date(alert.detectedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Risk Monitoring */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            Real-time Risk Monitoring
          </h3>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {riskScores.map((user) => (
              <div key={user.borrowerId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-semibold text-sm">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-600">Last check: {user.lastCheck}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getRiskColor(user.riskScore)}`}>
                    Risk: {user.riskScore}%
                  </div>
                  <div className={`text-sm font-medium ${
                    user.trend === 'improving' ? 'text-green-600' :
                    user.trend === 'declining' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {user.trend === 'improving' ? '↗' : user.trend === 'declining' ? '↘' : '→'} {user.trend}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIFraudDetectionDashboard;
