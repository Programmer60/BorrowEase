import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  User, 
  Calendar, 
  MessageSquare,
  FileText,
  TrendingUp,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';
import API from '../api/api';

const AdminLoanModeration = () => {
  const [loans, setLoans] = useState([]);
  const [filteredLoans, setFilteredLoans] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'all', 'pending', 'approved', 'rejected'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    console.log('🚀 AdminLoanModeration component mounted, loading initial data...');
    loadLoans();
    loadStats();
  }, []);

  useEffect(() => {
    console.log('🔄 Filtering loans. Total loans:', loans.length, 'Filter:', filter, 'Search:', searchTerm);
    filterLoans();
  }, [loans, filter, searchTerm]);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const loadLoans = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Loading loans...');
      const response = await API.get('/loans/admin/all');
      console.log('✅ Loans loaded successfully:', response.data.length, 'loans');
      setLoans(response.data);
    } catch (error) {
      console.error('❌ Error loading loans:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      showToast(`Failed to load loans: ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      console.log('🔄 Loading stats...');
      const response = await API.get('/loans/admin/stats');
      console.log('✅ Stats loaded successfully:', response.data);
      setStats(response.data);
    } catch (error) {
      console.error('❌ Error loading stats:', error);
      console.error('Stats error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    }
  };

  const filterLoans = () => {
    let filtered = [...loans];

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(loan => loan.status === filter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(loan => 
        loan.name?.toLowerCase().includes(search) ||
        loan.collegeEmail?.toLowerCase().includes(search) ||
        loan.purpose?.toLowerCase().includes(search) ||
        loan.amount?.toString().includes(search)
      );
    }

    setFilteredLoans(filtered);
  };

  const handleAction = (loan, action) => {
    setSelectedLoan(loan);
    setActionType(action);
    setShowReasonModal(true);
    setReason('');
  };

  const confirmAction = async () => {
    if (!selectedLoan || !actionType) return;

    try {
      const endpoint = `/loans/admin/${actionType}/${selectedLoan._id}`;
      const payload = reason.trim() ? { reason } : {};
      
      const response = await API.patch(endpoint, payload);
      
      if (response.data.success) {
        showToast(response.data.message, 'success');
        await loadLoans();
        await loadStats();
      }
      
      setShowReasonModal(false);
      setSelectedLoan(null);
      setActionType('');
      setReason('');
    } catch (error) {
      console.error(`Error ${actionType}ing loan:`, error);
      showToast(`Failed to ${actionType} loan`, 'error');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle }
    };

    const badge = badges[status] || badges.pending;
    const IconComponent = badge.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-700">Loading loan applications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Loan Moderation Dashboard</h1>
              <p className="text-gray-600 mt-1">Review and manage loan applications</p>
            </div>
            <button
              onClick={() => { loadLoans(); loadStats(); }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Applications</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalLoans || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Review</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.pendingLoans || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Approved</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.approvedLoans || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Approval Rate</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.approvalRate || 0}%</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Filter Tabs */}
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'approved', label: 'Approved' },
                  { key: 'rejected', label: 'Rejected' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      filter === tab.key
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, purpose, or amount..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loans List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {filteredLoans.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No loan applications</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'pending' ? 'No pending loans to review.' : 'No loans match your current filter.'}
              </p>
            </div>
          ) : (
            <ul role="list" className="divide-y divide-gray-200">
              {filteredLoans.map((loan) => (
                <li key={loan._id} className="px-6 py-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {loan.name}
                          </h3>
                          <div className="ml-3">
                            {getStatusBadge(loan.status)}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          Applied: {formatDate(loan.createdAt)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          <span className="font-medium">{formatCurrency(loan.amount)}</span>
                        </div>
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          <span>{loan.collegeEmail}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>Repay by: {new Date(loan.repaymentDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center">
                          <MessageSquare className="w-4 h-4 mr-1" />
                          <span>{loan.purpose}</span>
                        </div>
                      </div>

                      {/* Additional loan details */}
                      <div className="mt-3 text-sm text-gray-500">
                        <span>Phone: {loan.phoneNumber}</span>
                        {loan.funded && (
                          <span className="ml-4 text-green-600">
                            ✓ Funded by {loan.lenderName || 'Anonymous'}
                          </span>
                        )}
                        {loan.repaid && (
                          <span className="ml-4 text-blue-600">
                            ✓ Repaid
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {loan.status === 'pending' && (
                      <div className="flex space-x-2 ml-6">
                        <button
                          onClick={() => handleAction(loan, 'approve')}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(loan, 'reject')}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Reason Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative p-8 bg-white w-full max-w-md m-auto rounded-lg shadow-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {actionType === 'approve' ? 'Approve' : 'Reject'} Loan Application
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                {actionType === 'approve' 
                  ? 'You are about to approve this loan application. Add a reason (optional):'
                  : 'You are about to reject this loan application. Please provide a reason:'
                }
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={actionType === 'approve' 
                  ? 'e.g., Application meets all criteria...'
                  : 'e.g., Insufficient documentation, credit concerns...'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowReasonModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  actionType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                }`}
              >
                Confirm {actionType === 'approve' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLoanModeration;
