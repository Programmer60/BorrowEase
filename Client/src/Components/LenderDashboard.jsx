import React, { useEffect, useState } from "react";
import { CheckCircle, Clock, Search, TrendingUp, Users, BarChart3, Calculator, AlertTriangle,Brain } from "lucide-react";
import Navbar from "./Navbar";
import API from "../api/api";
import { getLoanRequests, fundLoan } from "../api/loanApi"; // Import loan API 
import { markNotificationAsRead } from '../api/notificationApi';
import EnhancedLoanCard from './EnhancedLoanCard';
import AILoanRecommendationEngine from './AILoanRecommendationEngine';
import LenderInvestmentDashboard from './LenderInvestmentDashboard';
import DisputesOverview from './DisputesOverview';
import { ensureScrollUnlocked } from "../utils/scrollLockGuard";
import { auth } from "../firebase";
import { useTheme } from "../contexts/ThemeContext";

export default function LenderDashboard() {
  const { isDark } = useTheme();
  const [loanRequests, setLoanRequests] = useState([]);
  const [filteredLoans, setFilteredLoans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('browse'); // browse, recommendations, investment, disputes
  const [redirecting, setRedirecting] = useState(false); // show overlay while creating order and redirecting
  const [paymentBanner, setPaymentBanner] = useState(null); // { type, message }
  const token = sessionStorage.getItem('token');
  const API_BASE = API?.defaults?.baseURL || '';
    // Derive backend origin from configured API base
    const BACKEND_ORIGIN = (() => { try { return new URL(API_BASE).origin; } catch { return window.location.origin; } })();

  // Filter and search functionality
  useEffect(() => {
    // If redirected back after payment, show a friendly banner and clean the URL
    try {
      const url = new URL(window.location.href);
      const params = url.searchParams;
      const status = params.get('payment');
      const reason = params.get('reason');
      if (status === 'success') {
        setPaymentBanner({ type: 'success', message: 'Payment successful. Thank you!' });
        try { localStorage.removeItem('last_order_id'); } catch {}
      } else if (status === 'failed') {
        const msg = reason ? decodeURIComponent(reason) : 'Payment failed or was cancelled.';
        setPaymentBanner({ type: 'error', message: `Payment failed: ${msg}` });
      }
      if (status) {
        params.delete('payment');
        params.delete('reason');
        params.delete('order');
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}

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

    // If user came back without callback (closed checkout), attempt to resolve status
    try {
      const lastOrderId = localStorage.getItem('last_order_id');
      if (lastOrderId) {
        API.get(`/payment/status/${lastOrderId}`).then(({ data }) => {
          console.log('ℹ️ Resolved pending order status:', data);
          if (data.status === 'paid') {
            alert('Payment completed successfully.');
            try { localStorage.removeItem('last_order_id'); } catch {}
          }
        }).catch(() => {});
      }
    } catch {}

    return () => {
      // Safety: ensure body scroll isn't locked when navigating away
      ensureScrollUnlocked();
    }
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
  setRedirecting(true);
    try {
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        alert('Invalid amount');
        return;
      }

      // Always use redirect-based flow to avoid modal issues in emulated/preview contexts
  console.log('➡️ Creating order at', `${BACKEND_ORIGIN}/api/payment/create-order`);
      // Proactively ensure a fresh token is attached (avoid rare race where interceptor runs before auth restores after redirect)
      const user = auth.currentUser;
      if (!user) {
        alert('Session not restored yet. Please sign in again.');
        return;
      }
      const freshToken = await user.getIdToken(true);
      const orderRes = await API.post(
        '/payment/create-order',
        { amount: amt, loanId, isRepayment: false },
        { headers: { Authorization: `Bearer ${freshToken}` } }
      ).catch(async (e) => {
        // Retry once after a short wait for transient CORS/network glitches
        const msg = e?.message || e?.toString();
        console.warn('First attempt failed, retrying create-order:', msg);
        await new Promise(r => setTimeout(r, 300));
        const retryToken = await user.getIdToken(true);
        return API.post('/payment/create-order', { amount: amt, loanId, isRepayment: false }, { headers: { Authorization: `Bearer ${retryToken}` } });
      });
      console.log('✅ create-order response:', orderRes?.data);
      const { id } = orderRes.data || {};
      if (!id) {
        console.error('create-order returned no order id:', orderRes?.data);
        alert('Payment initialization failed (no order id).');
        return;
      }

      // Redirect to backend-hosted checkout page (avoid SPA intercept on :5173)
  const checkoutUrl = `${BACKEND_ORIGIN}/api/payment/checkout/${id}`;
      console.log('↪️ Redirecting to checkout:', checkoutUrl);
      // Persist last order id in case the user closes the checkout page
      try { localStorage.setItem('last_order_id', id); } catch {}
      window.location.href = checkoutUrl;
      return;
      
      // --- Modal path retained for future enablement ---
  // const options = { ... , callback_url: `${BACKEND_ORIGIN}/api/payment/callback` };
    } catch (error) {
      const status = error?.response?.status;
      const details = error?.response?.data || error?.message || error;
      console.error('Error funding loan:', details);
      if (status === 0 || !status) {
        alert('Could not reach server at 5000. Check that the backend is running and CORS allows 5173.');
      } else if (status === 401) {
        alert('Please sign in again. Auth token missing/expired.');
      } else {
        alert('Payment initialization failed. See console for details.');
      }
    } finally {
  setIsLoading(false);
  setRedirecting(false);
      ensureScrollUnlocked();
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
    <div className={`min-h-screen pb-safe ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Payment status banner */}
      {paymentBanner && (
        <div className={`px-4 sm:px-6 py-3 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
          paymentBanner.type === 'success' 
            ? (isDark 
                ? 'bg-green-900 border-b border-green-700 text-gray-200' 
                : 'bg-green-50 border-b border-green-200 text-gray-800'
              )
            : (isDark 
                ? 'bg-red-900 border-b border-red-700 text-gray-200' 
                : 'bg-red-50 border-b border-red-200 text-gray-800'
              )
        }`}
             role="status">
          <span className="flex-1">{paymentBanner.message}</span>
          <button 
            className={`flex-shrink-0 px-3 py-1 rounded ${
              isDark 
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
            }`} 
            onClick={() => setPaymentBanner(null)}
          >
            Dismiss
          </button>
        </div>
      )}
      {/* Tiny overlay to indicate progress when opening payment */}
      {redirecting && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[2000]">
          <div className={`rounded-lg shadow p-4 flex items-center gap-3 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
            <span className={`text-sm ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>Opening secure payment…</span>
          </div>
        </div>
      )}
      {/* Header */}
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className={`rounded-xl shadow-sm p-4 sm:p-6 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className={`text-xs sm:text-sm font-medium ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Total Loans</p>
                <p className={`text-xl sm:text-2xl font-bold truncate ${
                  isDark ? 'text-gray-100' : 'text-gray-900'
                }`}>{stats.totalLoans}</p>
              </div>
              <div className={`flex-shrink-0 p-2 sm:p-3 rounded-full ${
                isDark ? 'bg-blue-900' : 'bg-blue-100'
              }`}>
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className={`rounded-xl shadow-sm p-4 sm:p-6 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className={`text-xs sm:text-sm font-medium ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Unfunded</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600 truncate">{stats.unfundedLoans}</p>
              </div>
              <div className={`flex-shrink-0 p-2 sm:p-3 rounded-full ${
                isDark ? 'bg-orange-900' : 'bg-orange-100'
              }`}>
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className={`rounded-xl shadow-sm p-4 sm:p-6 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className={`text-xs sm:text-sm font-medium ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Funded</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600 truncate">{stats.fundedLoans}</p>
              </div>
              <div className={`flex-shrink-0 p-2 sm:p-3 rounded-full ${
                isDark ? 'bg-green-900' : 'bg-green-100'
              }`}>
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className={`rounded-xl shadow-sm p-4 sm:p-6 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className={`text-xs sm:text-sm font-medium ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Total Amount</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600 truncate">₹{stats.totalAmount.toLocaleString()}</p>
              </div>
              <div className={`flex-shrink-0 p-2 sm:p-3 rounded-full ${
                isDark ? 'bg-purple-900' : 'bg-purple-100'
              }`}>
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`rounded-xl shadow-sm mb-6 sm:mb-8 overflow-hidden ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className={`border-b ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <nav className="flex overflow-x-auto scrollbar-hide px-4 sm:px-6 -mb-px">
              <button
                onClick={() => setActiveTab('browse')}
                className={`flex-shrink-0 py-3 sm:py-4 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === 'browse'
                    ? 'border-blue-500 text-blue-600'
                    : (isDark 
                        ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      )
                }`}
              >
                <Search className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 inline" />
                <span className="hidden sm:inline">Browse All Loans</span>
                <span className="sm:hidden">Browse</span>
              </button>
              {/* <button
                onClick={() => setActiveTab('recommendations')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'recommendations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Brain className="w-4 h-4 mr-2 inline" />
                AI Recommendations
              </button> */}
              <button
                onClick={() => setActiveTab('investment')}
                className={`flex-shrink-0 py-3 sm:py-4 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === 'investment'
                    ? 'border-blue-500 text-blue-600'
                    : (isDark 
                        ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      )
                }`}
              >
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 inline" />
                <span className="hidden sm:inline">Investment Tools</span>
                <span className="sm:hidden">Invest</span>
              </button>
              <button
                onClick={() => setActiveTab('disputes')}
                className={`flex-shrink-0 py-3 sm:py-4 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === 'disputes'
                    ? 'border-blue-500 text-blue-600'
                    : (isDark 
                        ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      )
                }`}
              >
                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 inline" />
                <span className="hidden sm:inline">Dispute Overview</span>
                <span className="sm:hidden">Disputes</span>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'browse' && (
            <div className="p-4 sm:p-6">
              {/* Filters and Search */}
              <div className="flex flex-col gap-3 sm:gap-4 mb-6">
                <div className="w-full">
                  <div className="relative">
                    <Search className={`absolute left-3 top-2.5 sm:top-3 h-4 w-4 ${
                      isDark ? 'text-gray-500' : 'text-gray-400'
                    }`} />
                    <input
                      type="text"
                      placeholder="Search by name, purpose..."
                      className={`w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        isDark 
                          ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-400' 
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-4">
                  <select
                    className={`px-3 sm:px-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      isDark 
                        ? 'border-gray-600 bg-gray-700 text-gray-100' 
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="unfunded">Unfunded</option>
                    <option value="funded">Funded</option>
                  </select>

                  <select
                    className={`px-3 sm:px-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      isDark 
                        ? 'border-gray-600 bg-gray-700 text-gray-100' 
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="amount-high">High to Low</option>
                    <option value="amount-low">Low to High</option>
                  </select>
                </div>
              </div>

              {/* Loan Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
              {filteredLoans.length === 0 && !isLoading && (
                <div className="text-center py-12 px-4">
                  <div className={`rounded-full p-4 w-16 h-16 mx-auto mb-4 ${
                    isDark ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <Search className={`h-8 w-8 ${
                      isDark ? 'text-gray-500' : 'text-gray-400'
                    }`} />
                  </div>
                  <h3 className={`text-base sm:text-lg font-medium mb-2 ${
                    isDark ? 'text-gray-200' : 'text-gray-900'
                  }`}>
                    No loans found
                  </h3>
                  <p className={`text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
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


