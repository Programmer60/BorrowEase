import React, { useState, useEffect } from 'react';
import {
  Brain,
  User,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calculator,
  Clock,
  Shield,
  TrendingUp,
  Target
} from 'lucide-react';
import Navbar from './Navbar';
import API from '../api/api';
import { auth } from '../firebase';
import { useTheme } from '../contexts/ThemeContext';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-sm max-w-md">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 text-center mb-4">
              Please refresh the page and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const BorrowerAssessment = () => {
  const { isDark } = useTheme();
  const [borrowerData, setBorrowerData] = useState({
    borrowerId: '',
    loanAmount: '',
    loanPurpose: '',
    repaymentPeriod: 90
  });
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableBorrowers, setAvailableBorrowers] = useState([]);

  useEffect(() => {
    console.log('🚀 BorrowerAssessment component mounted, fetching borrowers...');
    fetchAvailableBorrowers();
  }, []);

  useEffect(() => {
    console.log('📊 Available borrowers state updated:', availableBorrowers);
    console.log('📈 Number of borrowers:', availableBorrowers?.length || 0);
    console.log('🔍 Is array?', Array.isArray(availableBorrowers));
    console.log('🔍 Type of availableBorrowers:', typeof availableBorrowers);
    if (availableBorrowers && availableBorrowers.length > 0) {
      console.log('👥 First borrower details:', availableBorrowers[0]);
      console.log('🏷️ First borrower ID field:', availableBorrowers[0]?._id || availableBorrowers[0]?.id);
    }
  }, [availableBorrowers]);

  const fetchAvailableBorrowers = async () => {
    try {
      console.log('🔍 Fetching borrowers for assessment...');
      
      // Directly fetch all borrowers instead of pending applications
      // This ensures we get proper user objects with correct IDs
      const response = await API.get('/users/all-borrowers');
      console.log('✅ Fetched all borrowers:', response.data);
      
      // Ensure we have a valid array
      const borrowers = Array.isArray(response.data) ? response.data : [];
      setAvailableBorrowers(borrowers);
      
      if (borrowers.length === 0) {
        console.log('ℹ️ No borrowers found');
      } else {
        console.log(`📊 Found ${borrowers.length} borrowers available for assessment`);
      }
    } catch (error) {
      console.error('❌ Error fetching borrowers:', error);
      
      // Set empty array on error to prevent undefined issues
      setAvailableBorrowers([]);
      
      // Check if it's an authentication error
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert('Authentication error. Please make sure you are logged in as a lender.');
        return;
      } else if (error.response?.status === 404) {
        alert('Borrower data endpoint not found. Please check if the server is running.');
      } else {
        alert('Failed to load borrowers. Please check your connection and try again.');
      }
    }
  };

  const handleAssessment = async () => {
    if (!borrowerData.borrowerId || !borrowerData.loanAmount) {
      alert('Please select a borrower and enter loan amount');
      return;
    }

    setLoading(true);
    try {
      console.log('🚀 Starting borrower assessment...');
      console.log('📊 Assessment data:', borrowerData);
      
      // Check authentication status
      const user = auth.currentUser;
      console.log('👤 Current user:', user ? user.email : 'Not authenticated');
      
      if (!user) {
        alert('Please login to assess borrowers');
        setLoading(false);
        return;
      }

      const response = await API.post('/ai/assess-borrower', borrowerData);
      console.log('✅ Assessment response:', response.data);
      setAssessment(response.data);
    } catch (error) {
      console.error('❌ Error assessing borrower:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error data:', error.response?.data);
      
      if (error.response?.status === 401) {
        alert('Authentication failed. Please login again.');
      } else if (error.response?.status === 404) {
        alert('Assessment service not found. Please contact support.');
      } else if (error.response?.status === 403) {
        alert('You do not have permission to assess borrowers.');
      } else {
        alert(`Failed to assess borrower: ${error.response?.data?.error || error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 70) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (score >= 30) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getRiskIcon = (score) => {
    if (score >= 70) return <CheckCircle className="w-5 h-5" />;
    if (score >= 50) return <AlertTriangle className="w-5 h-5" />;
    return <XCircle className="w-5 h-5" />;
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Navbar />
      
      <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isDark ? 'bg-gray-900' : ''}`}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Brain className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Individual Borrower Assessment</h1>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>AI-powered risk evaluation for specific loan applications</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Form */}
          <div className="lg:col-span-1">
            <div className={`rounded-xl shadow-sm p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Loan Application Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Select Borrower
                  </label>
                  <select
                    value={borrowerData.borrowerId}
                    onChange={(e) => setBorrowerData({...borrowerData, borrowerId: e.target.value})}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Choose a borrower...</option>
                    {!availableBorrowers || availableBorrowers.length === 0 ? (
                      <option disabled>Loading borrowers...</option>
                    ) : (
                      availableBorrowers.map((borrower, index) => {
                        if (!borrower) {
                          console.warn(`🚨 Null borrower at index ${index}`);
                          return null;
                        }
                        
                        console.log(`🔧 Mapping borrower ${index + 1}:`, borrower);
                        
                        // Handle user objects with _id or id
                        const borrowerId = borrower._id || borrower.id;
                        const borrowerName = borrower.name || 'Unknown Name';
                        const borrowerEmail = borrower.email || 'No Email';
                        
                        if (!borrowerId) {
                          console.warn(`🚨 No valid ID found for borrower:`, borrower);
                          return null;
                        }
                        
                        console.log(`🔧 Extracted - ID: ${borrowerId}, Name: ${borrowerName}, Email: ${borrowerEmail}`);
                        
                        return (
                          <option key={borrowerId} value={borrowerId}>
                            {borrowerName} ({borrowerEmail})
                          </option>
                        );
                      }).filter(Boolean)
                    )}
                  </select>
                  {(!availableBorrowers || availableBorrowers.length === 0) && (
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      No borrowers found. Make sure some users are registered as borrowers.
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Loan Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={borrowerData.loanAmount}
                    onChange={(e) => setBorrowerData({...borrowerData, loanAmount: e.target.value})}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Enter loan amount"
                    min="1000"
                    max="1000000"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Loan Purpose
                  </label>
                  <select
                    value={borrowerData.loanPurpose}
                    onChange={(e) => setBorrowerData({...borrowerData, loanPurpose: e.target.value})}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Select purpose...</option>
                    <option value="business">Business Expansion</option>
                    <option value="education">Education</option>
                    <option value="medical">Medical Emergency</option>
                    <option value="home">Home Improvement</option>
                    <option value="personal">Personal Use</option>
                    <option value="debt-consolidation">Debt Consolidation</option>
                    <option value="vehicle">Vehicle Purchase</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Repayment Period (days)
                  </label>
                  <input
                    type="number"
                    value={borrowerData.repaymentPeriod}
                    onChange={(e) => setBorrowerData({...borrowerData, repaymentPeriod: parseInt(e.target.value)})}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    min="7"
                    max="365"
                  />
                </div>

                <button
                  onClick={handleAssessment}
                  disabled={loading || !borrowerData.borrowerId || !borrowerData.loanAmount}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4 mr-2" />
                      Assess Risk
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Assessment Results */}
          <div className="lg:col-span-2">
            {loading && (
              <div className={`rounded-xl shadow-sm p-8 text-center ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <Brain className="w-12 h-12 text-purple-600 animate-pulse mx-auto mb-4" />
                <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>AI is analyzing...</h3>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Evaluating borrower profile and loan specifics</p>
              </div>
            )}

            {assessment && assessment.assessment && (
              <div className="space-y-6">
                {/* Overall Assessment */}
                <div className={`rounded-xl shadow-sm p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Assessment Results</h3>
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{assessment.assessmentId || 'N/A'}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className={`p-4 rounded-lg border ${getRiskColor(assessment.assessment?.loanSpecificScore || 0)}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {getRiskIcon(assessment.assessment?.loanSpecificScore || 0)}
                          <span className="ml-2 font-semibold">Final Risk Score</span>
                        </div>
                        <span className="text-xl font-bold">{assessment.assessment?.loanSpecificScore || 0}/100</span>
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg border ${
                      assessment.assessment?.finalDecision === 'approve' 
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-red-100 text-red-800 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {assessment.assessment?.finalDecision === 'approve' ? 
                            <CheckCircle className="w-5 h-5" /> : 
                            <XCircle className="w-5 h-5" />
                          }
                          <span className="ml-2 font-semibold">Decision</span>
                        </div>
                        <span className="text-lg font-bold uppercase">
                          {assessment.assessment?.finalDecision || 'PENDING'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`text-center p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Suggested Rate</div>
                      <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {assessment.assessment?.suggestedRate?.toFixed(1) || '0.0'}%
                      </div>
                    </div>
                    <div className={`text-center p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Confidence</div>
                      <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {assessment.assessment?.confidence || 0}%
                      </div>
                    </div>
                    <div className={`text-center p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Max Amount</div>
                      <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        ₹{assessment.assessment?.maxRecommendedAmount?.toLocaleString() || '0'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Factors */}
                <div className={`rounded-xl shadow-sm p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                  <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Risk Factor Analysis</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className={`font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Borrower Profile Score</h4>
                      <div className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {assessment.assessment?.baseRiskScore || 0}/100
                      </div>
                      {assessment.riskFactors?.borrowerFactors && (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Trust Score Impact:</span>
                            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{assessment.riskFactors.borrowerFactors.trustScore || 0}/100</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>KYC Status:</span>
                            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{assessment.riskFactors.borrowerFactors.kycScore || 0}/100</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Payment History:</span>
                            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{assessment.riskFactors.borrowerFactors.paymentHistory || 0}/100</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className={`font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Loan-Specific Adjustments</h4>
                      {assessment.riskFactors?.loanSpecificFactors && assessment.riskFactors.loanSpecificFactors.length > 0 ? (
                        <div className="space-y-2">
                          {assessment.riskFactors.loanSpecificFactors.map((factor, index) => (
                            <div key={index} className={`p-2 rounded border-l-4 border-orange-400 ${
                              isDark ? 'bg-orange-900/30' : 'bg-orange-50'
                            }`}>
                              <div className="flex justify-between items-start">
                                <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{factor.factor || 'Unknown Factor'}</span>
                                <span className="text-sm font-bold text-red-600">{factor.impact || '0'}</span>
                              </div>
                              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{factor.description || 'No description available'}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-green-600 text-sm">No additional risk factors detected for this loan</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enhanced Credit Profile Section */}
                {assessment.creditProfile && assessment.creditProfile.creditScore && (
                  <div className={`rounded-xl shadow-sm p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <h3 className={`text-lg font-semibold mb-4 flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Credit Profile Analysis
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Credit Score Display */}
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {assessment.creditProfile.creditScore}
                        </div>
                        <div className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Credit Score (300-850)</div>
                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          assessment.creditProfile.creditScore >= 750 ? 'bg-green-100 text-green-800' :
                          assessment.creditProfile.creditScore >= 650 ? 'bg-blue-100 text-blue-800' :
                          assessment.creditProfile.creditScore >= 550 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {assessment.creditProfile.creditScore >= 750 ? 'Excellent' :
                           assessment.creditProfile.creditScore >= 650 ? 'Good' :
                           assessment.creditProfile.creditScore >= 550 ? 'Fair' : 'Poor'}
                        </div>
                      </div>

                      {/* Credit Factors */}
                      <div className="space-y-3">
                        <h4 className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Credit Factors</h4>
                        {assessment.creditProfile.creditFactors && (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Payment History:</span>
                              <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{assessment.creditProfile.creditFactors.paymentHistory || 0}/192</span>
                            </div>
                            <div className="flex justify-between">
                              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Credit Utilization:</span>
                              <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{assessment.creditProfile.creditFactors.creditUtilization || 50}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Credit History:</span>
                              <span className="font-medium">{assessment.creditProfile.creditFactors.creditHistory || 0} months</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Loan Diversity:</span>
                              <span className="font-medium">{assessment.creditProfile.creditFactors.loanDiversity || 0} types</span>
                            </div>
                            <div className="flex justify-between">
                              <span>KYC Status:</span>
                              <span className={`font-medium ${assessment.creditProfile.creditFactors.kycVerified ? 'text-green-600' : 'text-red-600'}`}>
                                {assessment.creditProfile.creditFactors.kycVerified ? 'Verified' : 'Not Verified'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Credit Score Breakdown */}
                    {assessment.creditProfile.creditBreakdown && (
                      <div className={`mt-6 pt-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <h4 className={`font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Score Breakdown</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                          <div className={`text-center p-2 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded`}>
                            <div className="font-medium">{assessment.creditProfile.creditBreakdown.paymentHistory || 0}</div>
                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Payment History</div>
                          </div>
                          <div className={`text-center p-2 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded`}>
                            <div className="font-medium">{assessment.creditProfile.creditBreakdown.creditUtilization || 0}</div>
                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Credit Utilization</div>
                          </div>
                          <div className={`text-center p-2 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded`}>
                            <div className="font-medium">{assessment.creditProfile.creditBreakdown.creditHistoryLength || 0}</div>
                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Credit History</div>
                          </div>
                          <div className={`text-center p-2 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded`}>
                            <div className="font-medium">{assessment.creditProfile.creditBreakdown.loanDiversity || 0}</div>
                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loan Diversity</div>
                          </div>
                          <div className={`text-center p-2 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded`}>
                            <div className="font-medium">{assessment.creditProfile.creditBreakdown.trustFactors || 0}</div>
                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Trust Factors</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Detailed Risk Analysis */}
                {assessment.riskFactors.detailedAnalysis && assessment.riskFactors.detailedAnalysis.length > 0 && (
                  <div className={`rounded-xl shadow-sm p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <h3 className={`text-lg font-semibold mb-4 flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <Shield className="w-5 h-5 mr-2" />
                      Detailed Risk Analysis
                    </h3>
                    <div className="space-y-3">
                      {assessment.riskFactors.detailedAnalysis.map((factor, index) => (
                        <div key={index} className={`flex items-start p-3 rounded-lg border ${
                          isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                        }`}>
                          <div className={`w-3 h-3 rounded-full mt-1 mr-3 ${
                            factor.impact > 0 ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{factor.factor}</span>
                              <span className={`text-sm font-bold ${factor.impact > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {factor.impact > 0 ? '+' : ''}{factor.impact}
                              </span>
                            </div>
                            <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{factor.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {assessment.recommendations && Array.isArray(assessment.recommendations) && (
                  <div className={`rounded-xl shadow-sm p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Recommendations</h3>
                    <div className="space-y-3">
                      {assessment.recommendations.map((rec, index) => (
                        <div key={index} className={`flex items-start p-3 rounded-lg border-l-4 border-gray-300 ${
                          isDark ? 'bg-gray-700' : 'bg-gray-50'
                        }`}>
                          <div className={`w-2 h-2 rounded-full mt-2 mr-3 ${
                            rec.priority === 'high' ? 'bg-red-500' :
                            rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}></div>
                          <div>
                            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{rec.title || 'No Title'}</p>
                            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{rec.description || 'No Description'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Modifications */}
                {assessment.suggestedModifications && (
                  <div className={`rounded-xl border p-6 ${isDark ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200'}`}>
                    <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-yellow-200' : 'text-yellow-800'}`}>Suggested Loan Modifications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className={`text-sm ${isDark ? 'text-yellow-200' : 'text-yellow-700'}`}>Recommended Max Amount:</span>
                        <p className={`text-lg font-bold ${isDark ? 'text-yellow-200' : 'text-yellow-800'}`}>
                          ₹{assessment.suggestedModifications.maxAmount?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className={`text-sm ${isDark ? 'text-yellow-200' : 'text-yellow-700'}`}>Adjusted Interest Rate:</span>
                        <p className={`text-lg font-bold ${isDark ? 'text-yellow-200' : 'text-yellow-800'}`}>
                          {assessment.suggestedModifications.suggestedRate}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!assessment && !loading && (
              <div className={`rounded-xl shadow-sm p-8 text-center ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>Ready for Assessment</h3>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Fill in the loan details and click "Assess Risk" to get AI-powered evaluation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function BorrowerAssessmentWrapper() {
  return (
    <ErrorBoundary>
      <BorrowerAssessment />
    </ErrorBoundary>
  );
}
