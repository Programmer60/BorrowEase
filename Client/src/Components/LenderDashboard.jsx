import React, { useEffect, useState } from "react";
import { User, Phone, Calendar, DollarSign, Target, CheckCircle, Clock, Search, TrendingUp, Users, Star, Brain, BarChart3, Calculator, AlertTriangle } from "lucide-react";
import Navbar from "./Navbar";
import API from "../api/api";
import { getLoanRequests, fundLoan } from "../api/loanApi"; // Import loan API 
import { markNotificationAsRead } from '../api/notificationApi';
import EnhancedLoanCard from './EnhancedLoanCard';
import AILoanRecommendationEngine from './AILoanRecommendationEngine';
import LenderInvestmentDashboard from './LenderInvestmentDashboard';
import DisputesOverview from './DisputesOverview';

// Credit Score Display Component
const CreditScoreDisplay = ({ borrowerId }) => {
  const [creditScore, setCreditScore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreditScore = async () => {
      try {
        const response = await API.get(`/credit/score/${borrowerId}`);
        setCreditScore(response.data);
      } catch (error) {
        console.log('Credit score not available for this user');
      } finally {
        setLoading(false);
      }
    };

    fetchCreditScore();
  }, [borrowerId]);

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Star className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!creditScore) {
    return (
      <div className="flex items-center space-x-2">
        <Star className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">No credit history</span>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 750) return 'text-green-600';
    if (score >= 650) return 'text-blue-600';
    if (score >= 550) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score) => {
    if (score >= 750) return 'Excellent';
    if (score >= 650) return 'Good';
    if (score >= 550) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="flex items-center space-x-2">
      <Star className={`h-4 w-4 ${getScoreColor(creditScore.score)}`} />
      <span className={`text-sm font-medium ${getScoreColor(creditScore.score)}`}>
        {creditScore.score} ({getScoreLabel(creditScore.score)})
      </span>
    </div>
  );
};

export default function LenderDashboard() {
  const [loanRequests, setLoanRequests] = useState([]);
  const [filteredLoans, setFilteredLoans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('browse'); // browse, recommendations, investment, disputes
  const token = localStorage.getItem('token');

  // Filter and search functionality
  useEffect(() => {
    // Fetch loans only once on mount
    const fetchLoans = async () => {
      setIsLoading(true);
      try {
        const data = await getLoanRequests(); // Use the function from loanApi.js
        setLoanRequests(data);
      } catch (error) {
        console.error("Error fetching loans:", error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLoans();
  }, []);

  useEffect(() => {
    // Filtering, searching, and sorting
    let filtered = [...loanRequests];
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(loan =>
        loan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.collegeEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by status - only show approved loans with additional funding filter
    if (filterStatus === 'unfunded') {
      filtered = filtered.filter(loan => loan.status === "approved" && !loan.funded);
    } else if (filterStatus === 'funded') {
      filtered = filtered.filter(loan => loan.status === "approved" && loan.funded);
    }
    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'amount-high':
          return b.amount - a.amount;
        case 'amount-low':
          return a.amount - b.amount;
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
    setFilteredLoans(filtered);
  }, [loanRequests, searchTerm, filterStatus, sortBy]);

  const handleFund = async (loanId, amount) => {
  setIsLoading(true);
  try {
    // 1. Create Razorpay order via backend
    const orderRes = await API.post('/payment/create-order', { amount });
    const { amount: amount2, id, currency } = orderRes.data;

    // 2. Open Razorpay checkout
    const options = {
      key: 'rzp_test_pBgIF99r7ZIsb7', 
      amount: amount2,
      currency: currency,
      order_id: id,
      name: 'BorrowEase',
      description: 'Fund Loan',
      handler: async function (response) {
        try {
          // 3. Verify payment on backend with CORRECT headers
          const verifyRes = await API.post('/payment/verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            loanId,
            isRepayment: false
          }, {
            // --- THIS IS THE FIX ---
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (verifyRes.data.status === "success") {
            // 4. Refresh loans
            const freshLoans = await getLoanRequests();
            setLoanRequests(freshLoans);
            alert('Payment successful! Loan has been funded.');
          } else {
            alert('Payment verification failed!');
          }
        } catch (error) {
          console.error('Error verifying payment:', error.message);
          alert('Payment verification failed!');
        }
      },
      prefill: {},
      theme: { color: '#7c3aed' }
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (error) {
    console.error('Error funding loan:', error.message);
    alert('Payment failed!');
  } finally {
    setIsLoading(false);
  }
};

  // Calculate statistics - only for approved loans
  const approvedLoans = loanRequests.filter(loan => loan.status === "approved");
  const stats = {
    totalLoans: approvedLoans.length,
    unfundedLoans: approvedLoans.filter(loan => !loan.funded).length,
    fundedLoans: approvedLoans.filter(loan => loan.funded).length,
    totalAmount: approvedLoans.reduce((sum, loan) => sum + loan.amount, 0)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Loans</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalLoans}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unfunded</p>
                <p className="text-2xl font-bold text-orange-600">{stats.unfundedLoans}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Funded</p>
                <p className="text-2xl font-bold text-green-600">{stats.fundedLoans}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-purple-600">₹{stats.totalAmount.toLocaleString()}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('browse')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'browse'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Search className="w-4 h-4 mr-2 inline" />
                Browse All Loans
              </button>
              <button
                onClick={() => setActiveTab('recommendations')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'recommendations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Brain className="w-4 h-4 mr-2 inline" />
                AI Recommendations
              </button>
              <button
                onClick={() => setActiveTab('investment')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'investment'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="w-4 h-4 mr-2 inline" />
                Investment Tools
              </button>
              <button
                onClick={() => setActiveTab('disputes')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'disputes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <AlertTriangle className="w-4 h-4 mr-2 inline" />
                Dispute Overview
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'browse' && (
            <div className="p-6">
              {/* Filters and Search */}
              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, purpose, or college..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <select
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Loans</option>
                    <option value="unfunded">Unfunded</option>
                    <option value="funded">Funded</option>
                  </select>

                  <select
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="amount-high">Amount: High to Low</option>
                    <option value="amount-low">Amount: Low to High</option>
                  </select>
                </div>
              </div>

              {/* Loan Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredLoans.map((loan) => (
                  <EnhancedLoanCard
                    key={loan._id}
                    loan={loan}
                    onFund={handleFund}
                    showAIFeatures={true}
                    userRole="lender"
                  />
                ))}
              </div>

              {/* Empty State */}
              {filteredLoans.length === 0 && (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No loans found</h3>
                  <p className="text-gray-600">
                    Try adjusting your search terms or filters.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="p-6">
              <AILoanRecommendationEngine 
                onSelectLoan={(recommendation) => {
                  // Find the actual loan and switch to browse tab to show it
                  const actualLoan = loanRequests.find(loan => 
                    loan.name === recommendation.borrowerName || 
                    loan.amount === recommendation.amount
                  );
                  if (actualLoan) {
                    setActiveTab('browse');
                    setSearchTerm(recommendation.borrowerName);
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'investment' && (
            <div className="p-6">
              <LenderInvestmentDashboard />
            </div>
          )}

          {activeTab === 'disputes' && (
            <div className="p-0">
              <DisputesOverview embedded={true} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


