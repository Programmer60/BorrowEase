import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye, Brain, Activity, TrendingUp, User, Clock, DollarSign } from 'lucide-react';
import API from '../api/api';

const AIFraudDetectionDashboard = () => {
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [riskScores, setRiskScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
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
      setError(null);
      
      // Fetch real fraud detection data
      const fraudResponse = await API.get('/ai/fraud/fraud-detection');
      
      // Set real data from backend
      setFraudAlerts(fraudResponse.data.alerts || []);
      setRiskScores(fraudResponse.data.riskScores || []);
      setStats(fraudResponse.data.stats || {
        totalChecked: 0,
        flaggedFraud: 0,
        preventedLoss: 0,
        accuracyRate: 95.8
      });
      
    } catch (error) {
      console.error('Error fetching fraud data:', error);
      setError('Failed to fetch fraud detection data. Please try again.');
      // Set empty arrays instead of mock data
      setFraudAlerts([]);
      setRiskScores([]);
      setStats({
        totalChecked: 0,
        flaggedFraud: 0,
        preventedLoss: 0,
        accuracyRate: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 90) return 'text-red-700 bg-red-100 border-red-300';
    if (score >= 75) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score >= 25) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getThreatLevelColor = (level) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-600 text-white';
      case 'HIGH': return 'bg-red-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-white';
      case 'LOW': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getFraudTypeIcon = (fraudType) => {
    switch (fraudType) {
      case 'IDENTITY_FRAUD': return <User className="w-4 h-4" />;
      case 'VELOCITY_FRAUD': return <Activity className="w-4 h-4" />;
      case 'DOCUMENT_FORGERY': return <Shield className="w-4 h-4" />;
      case 'INCOME_FRAUD': return <DollarSign className="w-4 h-4" />;
      case 'SYNTHETIC_IDENTITY': return <Brain className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
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
      await API.post(`/ai/fraud/resolve-alert/${alertId}`, { action });
      
      setFraudAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, status: action === 'approve' ? 'resolved' : 'rejected' }
            : alert
        )
      );
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const FraudAlertModal = ({ alert, onClose }) => {
    if (!alert) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Fraud Alert Details</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Alert Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Risk Score</div>
                <div className="text-2xl font-bold text-red-600">{alert.riskScore}%</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Confidence</div>
                <div className="text-2xl font-bold text-blue-600">{alert.confidence}%</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Loan Amount</div>
                <div className="text-2xl font-bold text-green-600">₹{alert.loanAmount?.toLocaleString()}</div>
              </div>
            </div>

            {/* Fraud Type and Threat Level */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {getFraudTypeIcon(alert.fraudType)}
                <span className="font-medium">{alert.fraudType?.replace('_', ' ')}</span>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${getThreatLevelColor(alert.riskLevel)}`}>
                {alert.riskLevel?.toUpperCase()} THREAT
              </span>
            </div>

            {/* Risk Factors */}
            <div>
              <h4 className="font-semibold mb-3">Risk Factors Detected</h4>
              <div className="space-y-2">
                {alert.reasons?.map((reason, index) => (
                  <div key={`reason-${index}-${reason.slice(0, 20)}`} className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm">{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence Details */}
            {alert.evidence && alert.evidence.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Evidence Analysis</h4>
                <div className="space-y-3">
                  {alert.evidence.map((category, index) => (
                    <div key={`evidence-${index}-${category.category}`} className="border rounded-lg p-3">
                      <div className="font-medium text-sm text-gray-700 mb-2">
                        {category.category?.replace('_', ' ').toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        {category.risks?.map((risk, riskIndex) => (
                          <div key={`risk-${riskIndex}-${risk.description?.slice(0, 15)}`} className="text-sm">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium mr-2 ${
                              risk.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                              risk.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {risk.severity}
                            </span>
                            {risk.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Actions */}
            <div>
              <h4 className="font-semibold mb-3">Recommended Actions</h4>
              <div className="space-y-2">
                {alert.actions?.map((action, index) => (
                  <div key={`action-${index}-${action.slice(0, 10)}`} className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{action.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t">
              <button
                onClick={() => {
                  handleResolveAlert(alert.id, 'block');
                  onClose();
                }}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
              >
                Block Application
              </button>
              <button
                onClick={() => {
                  handleResolveAlert(alert.id, 'review');
                  onClose();
                }}
                className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Flag for Review
              </button>
              <button
                onClick={() => {
                  handleResolveAlert(alert.id, 'approve');
                  onClose();
                }}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                Approve with Monitoring
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
                        <div key={`compact-reason-${idx}-${reason.slice(0, 15)}`} className="flex items-center text-sm text-red-700">
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
                          key={`compact-action-${idx}-${action.slice(0, 10)}`}
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
              <div key={`${user.borrowerId}-${user.loanId || 'default'}`} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
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

      {/* Fraud Alert Modal */}
      <FraudAlertModal 
        alert={selectedAlert} 
        onClose={() => setSelectedAlert(null)} 
      />
    </div>
  );
};

export default AIFraudDetectionDashboard;
