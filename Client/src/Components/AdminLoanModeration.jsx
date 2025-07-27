import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Eye,
  User,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  Users,
  CreditCard,
  Flag,
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  FileText,
  Shield,
  Settings
} from 'lucide-react';
import Navbar from './Navbar';
import API from '../api/api';

const AdminLoanModeration = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [processing, setProcessing] = useState(false);
  const [moderationModal, setModerationModal] = useState({ open: false, loan: null, action: '' });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const res = await API.get("/users/me");
      if (res.data.role !== "admin") {
        alert("Access denied. Admins only.");
        navigate("/");
        return;
      }
      setAuthorized(true);
      loadLoans();
    } catch (error) {
      console.error("Error checking admin role:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadLoans = async () => {
    try {
      setLoading(true);
      const response = await API.get('/loans/admin/all');
      setLoans(response.data);
    } catch (error) {
      console.error('Error loading loans:', error);
      // If admin endpoint doesn't exist, fall back to regular loans endpoint
      try {
        const fallbackResponse = await API.get('/loans');
        setLoans(fallbackResponse.data);
      } catch (fallbackError) {
        console.error('Error loading loans (fallback):', fallbackError);
        alert('Error loading loans');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = 
      loan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.collegeEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    switch (filterStatus) {
      case 'pending':
        matchesFilter = loan.status === 'pending';
        break;
      case 'approved':
        matchesFilter = loan.status === 'approved';
        break;
      case 'rejected':
        matchesFilter = loan.status === 'rejected';
        break;
      case 'funded':
        matchesFilter = loan.funded && !loan.repaid;
        break;
      case 'repaid':
        matchesFilter = loan.repaid;
        break;
      default:
        matchesFilter = true;
    }
    
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
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

  const handleApproveLoan = async (loanId, reason = '') => {
    try {
      setProcessing(true);
      const response = await API.patch(`/loans/admin/approve/${loanId}`, {
        reason
      });
      
      if (response.data.success) {
        alert('Loan approved successfully!');
        loadLoans();
        setModerationModal({ open: false, loan: null, action: '' });
        setSelectedLoan(null);
      }
    } catch (error) {
      console.error('Error approving loan:', error);
      alert(error.response?.data?.error || 'Error approving loan');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectLoan = async (loanId, reason = '') => {
    try {
      setProcessing(true);
      const response = await API.patch(`/loans/admin/reject/${loanId}`, {
        reason
      });
      
      if (response.data.success) {
        alert('Loan rejected successfully!');
        loadLoans();
        setModerationModal({ open: false, loan: null, action: '' });
        setSelectedLoan(null);
      }
    } catch (error) {
      console.error('Error rejecting loan:', error);
      alert(error.response?.data?.error || 'Error rejecting loan');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (loan) => {
    if (loan.flagged) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <Flag className="w-3 h-3 mr-1" />
          Flagged
        </span>
      );
    } else if (loan.repaid) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Repaid
        </span>
      );
    } else if (loan.funded) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <CreditCard className="w-3 h-3 mr-1" />
          Funded
        </span>
      );
    } else if (loan.status === 'approved') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </span>
      );
    } else if (loan.status === 'rejected') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </span>
      );
    } else if (loan.status === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <Clock className="w-3 h-3 mr-1" />
          Pending Admin Review
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Clock className="w-3 h-3 mr-1" />
          Unknown
        </span>
      );
    }
  };

  const getRiskLevel = (loan) => {
    // Calculate risk based on amount, purpose, and other factors
    let riskScore = 0;
    
    if (loan.amount > 50000) riskScore += 2;
    else if (loan.amount > 20000) riskScore += 1;
    
    // Add more risk factors as needed
    if (loan.purpose.toLowerCase().includes('urgent')) riskScore += 1;
    if (loan.purpose.toLowerCase().includes('emergency')) riskScore += 1;
    
    if (riskScore >= 3) return { level: 'High', color: 'text-red-600', bg: 'bg-red-100' };
    if (riskScore >= 2) return { level: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { level: 'Low', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const ModerationModal = () => (
    moderationModal.open && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4">
            {moderationModal.action === 'approve' ? 'Approve Loan' : 
             moderationModal.action === 'reject' ? 'Reject Loan' : 
             'Process Loan'}
          </h3>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Loan: {moderationModal.loan?.purpose}</p>
            <p className="text-sm text-gray-600">Amount: ₹{moderationModal.loan?.amount.toLocaleString()}</p>
            <p className="text-sm text-gray-600">Borrower: {moderationModal.loan?.name}</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason {moderationModal.action === 'reject' ? '*' : '(Optional)'}
            </label>
            <textarea
              id="moderation-reason"
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder={moderationModal.action === 'approve' 
                ? "Optional reason for approval..." 
                : "Please provide a reason for rejection..."}
              required={moderationModal.action === 'reject'}
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setModerationModal({ open: false, loan: null, action: '' })}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              disabled={processing}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const reason = document.getElementById('moderation-reason').value;
                
                if (moderationModal.action === 'reject' && !reason.trim()) {
                  alert('Please provide a reason for rejection');
                  return;
                }
                
                if (moderationModal.action === 'approve') {
                  handleApproveLoan(moderationModal.loan._id, reason);
                } else if (moderationModal.action === 'reject') {
                  handleRejectLoan(moderationModal.loan._id, reason);
                }
              }}
              className={`px-4 py-2 text-white rounded-lg ${
                moderationModal.action === 'approve' 
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              disabled={processing}
            >
              {processing ? (
                <div className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </div>
              ) : (
                moderationModal.action === 'approve' ? 'Approve' : 'Reject'
              )}
            </button>
          </div>
        </div>
      </div>
    )
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading loans...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  const stats = {
    total: loans.length,
    pending: loans.filter(loan => loan.status === 'pending').length,
    funded: loans.filter(loan => loan.funded && !loan.repaid).length,
    repaid: loans.filter(loan => loan.repaid).length,
    flagged: loans.filter(loan => loan.flagged).length,
    totalAmount: loans.reduce((sum, loan) => sum + loan.amount, 0)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Shield className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Loan Moderation</h1>
              <p className="text-gray-600">Monitor and moderate loan requests and activities</p>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center">
                <FileText className="w-6 h-6 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Loans</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center">
                <Clock className="w-6 h-6 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center">
                <CreditCard className="w-6 h-6 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Funded</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.funded}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center">
                <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Repaid</p>
                  <p className="text-2xl font-bold text-green-600">{stats.repaid}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center">
                <Flag className="w-6 h-6 text-red-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Flagged</p>
                  <p className="text-2xl font-bold text-red-600">{stats.flagged}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center">
                <TrendingUp className="w-6 h-6 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-xl font-bold text-purple-600">₹{stats.totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by borrower name, email, or purpose..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="funded">Funded</option>
                <option value="repaid">Repaid</option>
              </select>
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amount-high">Amount: High to Low</option>
                <option value="amount-low">Amount: Low to High</option>
              </select>
              <button
                onClick={loadLoans}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Loans List */}
        <div className="bg-white rounded-lg shadow-sm">
          {filteredLoans.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No loans found</h3>
              <p className="text-gray-600">No loans match your current filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredLoans.map((loan) => {
                const risk = getRiskLevel(loan);
                return (
                  <div key={loan._id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <User className="w-5 h-5 text-gray-500" />
                          <h3 className="text-lg font-medium text-gray-900">{loan.name}</h3>
                          {getStatusBadge(loan)}
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${risk.bg} ${risk.color}`}>
                            {risk.level} Risk
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-2" />
                            ₹{loan.amount.toLocaleString()}
                            {loan.totalRepayable && loan.totalRepayable > loan.amount && (
                              <span className="ml-1 text-blue-600">
                                (Total: ₹{loan.totalRepayable.toLocaleString()})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center">
                            <FileText className="w-4 h-4 mr-2" />
                            {loan.purpose}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            Due: {new Date(loan.repaymentDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            {new Date(loan.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        
                        {loan.interestAmount && (
                          <div className="text-sm text-green-600 mb-2">
                            Interest: ₹{loan.interestAmount.toLocaleString()}
                            {loan.tenureMonths && (
                              <span className="text-gray-500 ml-2">
                                • {loan.tenureMonths} month{loan.tenureMonths > 1 ? 's' : ''}
                              </span>
                            )}
                            {loan.emi && (
                              <span className="text-gray-500 ml-2">
                                • EMI: ₹{loan.emi.toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}

                        {loan.lenderName && (
                          <div className="text-sm text-blue-600">
                            Funded by: {loan.lenderName}
                          </div>
                        )}
                        
                        {loan.moderationReason && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                            <Flag className="w-4 h-4 inline mr-1" />
                            {loan.moderationReason}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => setSelectedLoan(
                            selectedLoan?._id === loan._id ? null : loan
                          )}
                          className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {selectedLoan?._id === loan._id ? 'Hide' : 'Details'}
                        </button>
                        
                        {loan.status === 'pending' && (
                          <>
                            <button
                              onClick={() => setModerationModal({ 
                                open: true, 
                                loan, 
                                action: 'approve' 
                              })}
                              className="flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </button>
                            
                            <button
                              onClick={() => setModerationModal({ 
                                open: true, 
                                loan, 
                                action: 'reject' 
                              })}
                              className="flex items-center px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {selectedLoan?._id === loan._id && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Borrower Information */}
                          <div>
                            <h4 className="text-lg font-medium text-gray-900 mb-4">Borrower Information</h4>
                            <div className="space-y-3 text-sm">
                              <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-2 text-gray-500" />
                                <span className="text-gray-600">Email:</span>
                                <span className="font-medium ml-2">{loan.collegeEmail}</span>
                              </div>
                              <div className="flex items-center">
                                <Phone className="w-4 h-4 mr-2 text-gray-500" />
                                <span className="text-gray-600">Phone:</span>
                                <span className="font-medium ml-2">{loan.phoneNumber}</span>
                              </div>
                              <div className="flex items-start">
                                <FileText className="w-4 h-4 mr-2 mt-0.5 text-gray-500" />
                                <div>
                                  <span className="text-gray-600">Purpose:</span>
                                  <p className="font-medium">{loan.purpose}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Loan Details */}
                          <div>
                            <h4 className="text-lg font-medium text-gray-900 mb-4">Loan Details</h4>
                            <div className="space-y-3 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Requested Amount:</span>
                                <span className="font-medium">₹{loan.amount.toLocaleString()}</span>
                              </div>
                              {loan.interestAmount && (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Interest:</span>
                                    <span className="font-medium text-green-600">₹{loan.interestAmount.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Total Repayable:</span>
                                    <span className="font-medium text-blue-600">₹{loan.totalRepayable?.toLocaleString()}</span>
                                  </div>
                                  {loan.emi && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Monthly EMI:</span>
                                      <span className="font-medium">₹{loan.emi.toLocaleString()}</span>
                                    </div>
                                  )}
                                  {loan.tenureMonths && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Tenure:</span>
                                      <span className="font-medium">{loan.tenureMonths} month{loan.tenureMonths > 1 ? 's' : ''}</span>
                                    </div>
                                  )}
                                </>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-600">Repayment Date:</span>
                                <span className="font-medium">{new Date(loan.repaymentDate).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Created:</span>
                                <span className="font-medium">{new Date(loan.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Risk Level:</span>
                                <span className={`font-medium ${risk.color}`}>{risk.level}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      <ModerationModal />
    </div>
  );
};

export default AdminLoanModeration;
