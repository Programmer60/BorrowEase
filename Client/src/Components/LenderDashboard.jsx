import React, { useEffect, useState } from "react";
import { User, Phone, Calendar, DollarSign, Target, CheckCircle, Clock, Search, TrendingUp, Users } from "lucide-react";
import Navbar from "./Navbar";
import API from "../api/api";
import { getLoanRequests, fundLoan } from "../api/loanApi"; // Import loan API 
import { markNotificationAsRead } from '../api/notificationApi';

export default function LenderDashboard() {
  const [loanRequests, setLoanRequests] = useState([]);
  const [filteredLoans, setFilteredLoans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [isLoading, setIsLoading] = useState(false);
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

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
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
        </div>

        {/* Loan Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredLoans.map((loan) => (
            <div key={loan._id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {loan.purpose}
                    </h3>
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-xl font-bold text-green-600">
                        ₹{loan.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${loan.funded
                        ? loan.repaid
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                        : 'bg-orange-100 text-orange-800'
                      }`}>
                      {loan.funded
                        ? loan.repaid
                          ? 'Repaid ✅'
                          : 'Funded'
                        : 'Unfunded'
                      }
                    </span>
                  </div>
                </div>

                {/* Student Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="font-medium text-gray-900">{loan.name}</span>
                      <span className="text-gray-600 ml-2">({loan.year})</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="h-4 w-4 bg-purple-100 rounded flex items-center justify-center">
                      <span className="text-purple-600 text-xs font-bold">@</span>
                    </div>
                    <span className="text-gray-600">{loan.collegeEmail}</span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">{loan.phoneNumber}</span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">
                      Repay by: {new Date(loan.repaymentDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* College and Performance */}
                <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">College</p>
                    <p className="font-medium text-gray-900">{loan.college}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">CGPA</p>
                    <p className="font-medium text-gray-900">{loan.cgpa}/10</p>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-4 border-t">
                  {loan.funded ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Funded by {loan.lenderName || "Unknown"}
                      </span>
                      <span className={`text-sm font-medium ${loan.repaid ? 'text-green-600' : 'text-blue-600'
                        }`}>
                        {loan.repaid ? 'Repaid ✅' : 'Pending Repayment'}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleFund(loan._id, loan.amount)}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Target className="h-4 w-4" />
                          <span>Fund this Loan</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
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
    </div>
  );
}


