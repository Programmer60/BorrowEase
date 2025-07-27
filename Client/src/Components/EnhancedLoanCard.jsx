import React, { useState, useEffect } from 'react';
import { Brain, Target, TrendingUp, AlertTriangle, CheckCircle, XCircle, Star, Activity } from 'lucide-react';
import API from '../api/api';
import KYCBadge from './KYCBadge';

const EnhancedLoanCard = ({ loan, onFund, showAIFeatures = true, userRole = 'lender' }) => {
  const [aiAssessment, setAiAssessment] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [borrowerKYC, setBorrowerKYC] = useState(null);

  useEffect(() => {
    if (showAIFeatures && userRole === 'lender' && loan.borrowerId) {
      fetchAIAssessment();
    }
    // Fetch borrower KYC status for lenders
    if (userRole === 'lender' && loan.borrowerId) {
      fetchBorrowerKYC();
    }
  }, [loan.borrowerId, showAIFeatures, userRole]);

  const fetchBorrowerKYC = async () => {
    try {
      const response = await API.get(`/users/kyc-status/${loan.borrowerId}`);
      setBorrowerKYC(response.data);
    } catch (error) {
      console.log('KYC status not available for borrower:', error);
      // Set default if not available
      setBorrowerKYC({ kycStatus: 'not_submitted' });
    }
  };

  const fetchAIAssessment = async () => {
    try {
      setLoadingAI(true);
      const response = await API.post('/ai/assess-borrower', {
        borrowerId: loan.borrowerId,
        loanAmount: loan.amount,
        loanPurpose: loan.purpose,
        repaymentPeriod: 30 // Default or calculate from loan data
      });
      setAiAssessment(response.data);
    } catch (error) {
      console.error('Error fetching AI assessment:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getDecisionColor = (decision) => {
    switch (decision) {
      case 'approve': return 'text-green-600 bg-green-50 border-green-200';
      case 'reject': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getScoreIcon = (score) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4" />;
    if (score >= 60) return <Target className="w-4 h-4" />;
    if (score >= 40) return <AlertTriangle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
      {/* Loan Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{loan.purpose}</h3>
          <p className="text-2xl font-bold text-blue-600">₹{loan.amount?.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            loan.funded ? 'bg-green-100 text-green-800' : 
            loan.status === 'approved' ? 'bg-blue-100 text-blue-800' : 
            'bg-yellow-100 text-yellow-800'
          }`}>
            {loan.funded ? 'Funded' : loan.status === 'approved' ? 'Approved' : 'Pending'}
          </span>
        </div>
      </div>

      {/* Borrower Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Borrower:</span>
          <span className="font-medium">{loan.name}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">College:</span>
          <span className="font-medium">{loan.collegeEmail}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Repayment:</span>
          <span className="font-medium">{new Date(loan.repaymentDate).toLocaleDateString()}</span>
        </div>
        {/* KYC Status for Lenders */}
        {userRole === 'lender' && borrowerKYC && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">KYC Status:</span>
            <KYCBadge kycStatus={borrowerKYC.kycStatus} size="xs" />
          </div>
        )}
      </div>

      {/* AI Assessment Section */}
      {showAIFeatures && userRole === 'lender' && (
        <div className="border-t border-gray-100 pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center">
              <Brain className="w-4 h-4 mr-2 text-blue-600" />
              AI Risk Assessment
            </h4>
            {loadingAI && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            )}
          </div>

          {aiAssessment ? (
            <div className="space-y-3">
              {/* Risk Score */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Risk Score:</span>
                <div className={`flex items-center px-2 py-1 rounded-full border text-sm font-medium ${
                  getScoreColor(aiAssessment.assessment?.loanSpecificScore || 0)
                }`}>
                  {getScoreIcon(aiAssessment.assessment?.loanSpecificScore || 0)}
                  <span className="ml-1">{aiAssessment.assessment?.loanSpecificScore || 0}/100</span>
                </div>
              </div>

              {/* AI Decision */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">AI Recommendation:</span>
                <div className={`flex items-center px-2 py-1 rounded-full border text-sm font-medium ${
                  getDecisionColor(aiAssessment.assessment?.finalDecision)
                }`}>
                  {aiAssessment.assessment?.finalDecision === 'approve' ? (
                    <CheckCircle className="w-4 h-4 mr-1" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-1" />
                  )}
                  <span className="capitalize">{aiAssessment.assessment?.finalDecision}</span>
                </div>
              </div>

              {/* Confidence & Details */}
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>
                  <span>Confidence: </span>
                  <span className="font-medium">{aiAssessment.assessment?.confidence}%</span>
                </div>
                {aiAssessment.assessment?.suggestedRate && (
                  <div>
                    <span>Suggested Rate: </span>
                    <span className="font-medium">{aiAssessment.assessment.suggestedRate}%</span>
                  </div>
                )}
              </div>

              {/* Key Risk Factors */}
              {aiAssessment.riskFactors?.borrowerFactors && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-600 mb-2">Key Factors:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span>Payment History:</span>
                      <span className="font-medium">{aiAssessment.riskFactors.borrowerFactors.paymentHistory || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trust Score:</span>
                      <span className="font-medium">{aiAssessment.riskFactors.borrowerFactors.trustScore || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Recommendation */}
              {aiAssessment.recommendations && aiAssessment.recommendations.length > 0 && (
                <div className={`p-2 rounded text-xs ${
                  aiAssessment.recommendations[0].priority === 'high' ? 'bg-red-50 text-red-700' :
                  aiAssessment.recommendations[0].priority === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  <strong>{aiAssessment.recommendations[0].title}:</strong>
                  <br />
                  <span>{aiAssessment.recommendations[0].description}</span>
                </div>
              )}
            </div>
          ) : !loadingAI && (
            <div className="text-center py-2">
              <button
                onClick={fetchAIAssessment}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center mx-auto"
              >
                <Brain className="w-4 h-4 mr-1" />
                Get AI Assessment
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        {userRole === 'lender' && !loan.funded && loan.status === 'approved' && (
          <button
            onClick={() => onFund(loan._id, loan.amount)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              aiAssessment?.assessment?.finalDecision === 'approve'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : aiAssessment?.assessment?.finalDecision === 'reject'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {aiAssessment?.assessment?.finalDecision === 'approve' ? '✓ Fund (AI Approved)' :
             aiAssessment?.assessment?.finalDecision === 'reject' ? '⚠ Fund (AI Rejected)' :
             'Fund Loan'}
          </button>
        )}
        
        {loan.funded && (
          <span className="text-green-600 font-medium flex items-center">
            <CheckCircle className="w-4 h-4 mr-1" />
            Successfully Funded
          </span>
        )}

        {/* Performance Indicator */}
        {showAIFeatures && aiAssessment && (
          <div className="flex items-center text-xs text-gray-500">
            <Activity className="w-3 h-3 mr-1" />
            AI Analysis Complete
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedLoanCard;
