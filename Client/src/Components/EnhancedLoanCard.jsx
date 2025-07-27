import React, { useState, useEffect } from 'react';
import { Brain, Target, TrendingUp, AlertTriangle, CheckCircle, XCircle, Star, Activity } from 'lucide-react';
import API from '../api/api';
import KYCBadge from './KYCBadge';

const EnhancedLoanCard = ({ loan, onFund, showAIFeatures = true, userRole = 'lender' }) => {
  const [aiAssessment, setAiAssessment] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [borrowerKYC, setBorrowerKYC] = useState(null);

  useEffect(() => {
    const borrowerIdValue = typeof loan.borrowerId === 'object' 
      ? loan.borrowerId._id 
      : loan.borrowerId;
      
    // AI Assessment temporarily disabled
    /*
    if (showAIFeatures && userRole === 'lender' && borrowerIdValue) {
      fetchAIAssessment();
    }
    */
    
    // Fetch borrower KYC status for lenders
    if (userRole === 'lender' && borrowerIdValue) {
      fetchBorrowerKYC();
    }
  }, [loan.borrowerId, showAIFeatures, userRole]);

  const fetchBorrowerKYC = async () => {
    try {
      // Debug the borrowerId structure
      console.log('🔍 Debug borrowerId:', {
        raw: loan.borrowerId,
        type: typeof loan.borrowerId,
        isObject: typeof loan.borrowerId === 'object',
        hasId: loan.borrowerId?._id,
        keys: typeof loan.borrowerId === 'object' ? Object.keys(loan.borrowerId || {}) : 'not object'
      });
      
      // Handle both populated and non-populated borrowerId
      let borrowerIdValue;
      if (typeof loan.borrowerId === 'object' && loan.borrowerId !== null) {
        // If it's an object, try to get the _id property
        borrowerIdValue = loan.borrowerId._id || loan.borrowerId.id;
      } else {
        // If it's a string, use it directly
        borrowerIdValue = loan.borrowerId;
      }
        
      console.log('🎯 Final borrowerIdValue:', borrowerIdValue);
      
      if (!borrowerIdValue) {
        console.warn('No borrower ID available for KYC status');
        setBorrowerKYC({ kycStatus: 'not_submitted' });
        return;
      }
      
      const response = await API.get(`/users/kyc-status/${borrowerIdValue}`);
      setBorrowerKYC(response.data);
    } catch (error) {
      console.log('KYC status not available for borrower:', error);
      // Set default if not available
      setBorrowerKYC({ kycStatus: 'not_submitted' });
    }
  }

  const fetchAIAssessment = async () => {
    try {
      setLoadingAI(true);
      
      // Debug the borrowerId structure
      console.log('🔍 AI Assessment - Debug borrowerId:', {
        raw: loan.borrowerId,
        type: typeof loan.borrowerId,
        isObject: typeof loan.borrowerId === 'object',
        hasId: loan.borrowerId?._id,
        keys: typeof loan.borrowerId === 'object' ? Object.keys(loan.borrowerId || {}) : 'not object'
      });
      
      // Handle both populated and non-populated borrowerId
      let borrowerIdValue;
      if (typeof loan.borrowerId === 'object' && loan.borrowerId !== null) {
        // If it's an object, try to get the _id property
        borrowerIdValue = loan.borrowerId._id || loan.borrowerId.id;
      } else {
        // If it's a string, use it directly
        borrowerIdValue = loan.borrowerId;
      }
        
      console.log('🎯 AI Assessment - Final borrowerIdValue:', borrowerIdValue);
      
      if (!borrowerIdValue) {
        console.warn('No borrower ID available for AI assessment');
        return;
      }
      
      const response = await API.post('/ai/assess-borrower', {
        borrowerId: borrowerIdValue,
        loanAmount: loan.amount,
        loanPurpose: loan.purpose,
        repaymentPeriod: loan.tenureMonths * 30 || 30 // Convert months to days, default 30
      });
      setAiAssessment(response.data);
    } catch (error) {
      console.error('Error fetching AI assessment:', error);
      console.error('Loan data:', {
        loanId: loan._id,
        borrowerId: loan.borrowerId,
        borrowerIdType: typeof loan.borrowerId
      });
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

      {/* AI Assessment Section - TEMPORARILY DISABLED */}
      {/* 
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
              // ... AI assessment details ...
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
      */}
      

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
