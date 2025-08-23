import React, { useState, useEffect } from 'react';
import { Brain, Target, TrendingUp, AlertTriangle, CheckCircle, XCircle, Star, Activity } from 'lucide-react';
import API from '../api/api';
import KYCBadge from './KYCBadge';
import EnhancedDisputeForm from './EnhancedDisputeForm';
import { useTheme } from '../contexts/ThemeContext';

const EnhancedLoanCard = ({ loan, onFund, showAIFeatures = true, userRole = 'lender' }) => {
  const { isDark } = useTheme();
  const [aiAssessment, setAiAssessment] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [borrowerKYC, setBorrowerKYC] = useState(null);
  const [showDisputeForm, setShowDisputeForm] = useState(false);

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

  return (
    <div className={`rounded-xl shadow-sm border p-6 hover:shadow-md transition-all ${
      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      {/* Loan Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className={`text-lg font-semibold ${
            isDark ? 'text-gray-100' : 'text-gray-900'
          }`}>{loan.purpose}</h3>
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
          <span className={isDark ? 'text-gray-200' : 'text-gray-600'}>Borrower:</span>
          <span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{loan.name}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className={isDark ? 'text-gray-200' : 'text-gray-600'}>College:</span>
          <span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{loan.collegeEmail}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className={isDark ? 'text-gray-200' : 'text-gray-600'}>Repayment:</span>
          <span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{new Date(loan.repaymentDate).toLocaleDateString()}</span>
        </div>
        {/* KYC Status for Lenders */}
        {userRole === 'lender' && borrowerKYC && (
          <div className="flex items-center justify-between text-sm">
            <span className={isDark ? 'text-gray-200' : 'text-gray-600'}>KYC Status:</span>
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
      <div className={`flex items-center justify-between mt-6 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
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
          <div className="flex items-center gap-4 md:gap-6">
            <span className={`font-medium hidden sm:flex items-center ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              <CheckCircle className="w-4 h-4 mr-1" />
              Successfully Funded
            </span>
            {/* Lender can report a dispute for funded, not yet repaid loans */}
            {userRole === 'lender' && !loan.repaid && (
              <button
                onClick={() => setShowDisputeForm(true)}
                className={`inline-flex items-center px-3 py-2 rounded-lg font-medium border transition-colors ${
                  isDark 
                    ? 'border-red-600 text-red-400 bg-red-900/30 hover:bg-red-900/50 hover:border-red-500' 
                    : 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-300'
                }`}
                title="Report an issue with this loan"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Report Issue
              </button>
            )}
          </div>
        )}

        {/* Performance Indicator */}
        {showAIFeatures && aiAssessment && (
          <div className={`flex items-center text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <Activity className="w-3 h-3 mr-1" />
            AI Analysis Complete
          </div>
        )}
      </div>

      {/* Dispute Modal */}
      {showDisputeForm && (
        <EnhancedDisputeForm
          loanDetails={loan}
          onClose={() => setShowDisputeForm(false)}
          onSubmitted={() => {
            setShowDisputeForm(false);
            // lightweight success feedback for lenders
            try { window?.alert?.('Dispute submitted successfully.'); } catch {}
          }}
        />
      )}
    </div>
  );
};

export default EnhancedLoanCard;
