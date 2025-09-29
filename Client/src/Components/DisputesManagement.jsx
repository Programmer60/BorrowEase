import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  Search,
  Calendar,
  User,
  DollarSign,
  Flag,
  ArrowRight,
  X
} from 'lucide-react';
import Navbar from './Navbar';
import API from '../api/api';
import { useTheme } from '../contexts/ThemeContext';

const DisputesManagement = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [disputes, setDisputes] = useState([]);
  const [filteredDisputes, setFilteredDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveData, setResolveData] = useState({
    status: 'resolved',
    adminResponse: ''
  });
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    priority: 'all',
    search: ''
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    filterDisputes();
  }, [disputes, filters]);

  const checkAdminAccess = async () => {
    try {
      const res = await API.get("/users/me");
      if (res.data.role !== "admin" && res.data.role !== "lender") {
        alert("Access denied. Admins and lenders only.");
        navigate("/");
        return;
      }
      setUserRole(res.data.role);
      setAuthorized(true);
      loadDisputes();
    } catch (error) {
      console.error("Error checking user role:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadDisputes = async () => {
    try {
      const response = await API.get('/disputes');
      // Support both legacy array and new { success, disputes } shapes
      const list = Array.isArray(response.data)
        ? response.data
        : (response.data?.disputes || []);
      setDisputes(list);
    } catch (error) {
      console.error('Error loading disputes:', error);
    }
  };

  const filterDisputes = () => {
    const base = Array.isArray(disputes) ? disputes : [];
  let filtered = [...base];

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(dispute => dispute.status === filters.status);
    }

    // Filter by category
    if (filters.category !== 'all') {
      filtered = filtered.filter(dispute => dispute.category === filters.category);
    }

    // Filter by priority
    if (filters.priority !== 'all') {
      filtered = filtered.filter(dispute => dispute.priority === filters.priority);
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(dispute => {
        const subjectStr = dispute.subject || '';
        const messageStr = dispute.message || '';
        const roleStr = dispute.role || '';
        const loanPurpose = dispute.loanId?.purpose || '';
        const borrowerEmail = dispute.loanId?.collegeEmail || '';
        const raisedByName = dispute.raisedByUser?.name || '';
        const raisedByEmail = dispute.raisedByUser?.email || '';
        const counterpartyName = dispute.counterpartyUser?.name || '';
        const counterpartyEmail = dispute.counterpartyUser?.email || '';
        return [
          subjectStr, messageStr, roleStr, loanPurpose, borrowerEmail,
          raisedByName, raisedByEmail, counterpartyName, counterpartyEmail
        ].some(val => (val || '').toLowerCase().includes(searchLower));
      });
    }

    // Newest first (already sorted by API, but ensure locally if needed)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setFilteredDisputes(filtered);
  };

  const formatCategory = (category) => {
    if (!category || typeof category !== "string") return "Unknown";
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'in-progress': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    if (isDark) {
      switch (status) {
        case 'open': return 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50';
        case 'in-progress': return 'bg-blue-900/30 text-blue-300 border border-blue-700/50';
        case 'resolved': return 'bg-green-900/30 text-green-300 border border-green-700/50';
        case 'rejected': return 'bg-red-900/30 text-red-300 border border-red-700/50';
        default: return 'bg-gray-800 text-gray-300 border border-gray-600';
      }
    } else {
      switch (status) {
        case 'open': return 'bg-yellow-100 text-yellow-800';
        case 'in-progress': return 'bg-blue-100 text-blue-800';
        case 'resolved': return 'bg-green-100 text-green-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
  };

  const getPriorityColor = (priority) => {
    if (isDark) {
      switch (priority) {
        case 'urgent': return 'text-red-300 bg-red-900/40 border border-red-700/40';
        case 'high': return 'text-orange-300 bg-orange-900/40 border border-orange-700/40';
        case 'medium': return 'text-yellow-300 bg-yellow-900/40 border border-yellow-700/40';
        case 'low': return 'text-gray-300 bg-gray-700 border border-gray-600';
        default: return 'text-gray-300 bg-gray-700 border border-gray-600';
      }
    } else {
      switch (priority) {
        case 'urgent': return 'text-red-600 bg-red-50';
        case 'high': return 'text-orange-600 bg-orange-50';
        case 'medium': return 'text-yellow-600 bg-yellow-50';
        case 'low': return 'text-gray-600 bg-gray-50';
        default: return 'text-gray-600 bg-gray-50';
      }
    }
  };

  const handleResolveDispute = async () => {
    try {
      // Updated route per server: PATCH /disputes/:disputeId/status
      const response = await API.patch(`/disputes/${selectedDispute._id}/status`, resolveData);
      
      // Update the disputes list
      const updated = response?.data?.dispute || response?.data || null;
      if (updated) {
        setDisputes(disputes.map(dispute => 
          dispute._id === selectedDispute._id ? updated : dispute
        ));
      }
      
      setShowResolveModal(false);
      setSelectedDispute(null);
      setResolveData({ status: 'resolved', adminResponse: '' });
    } catch (error) {
      console.error('Error resolving dispute:', error);
      alert('Failed to resolve dispute');
    }
  };

  // Reusable class helpers
  const panelBase = isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
  const muted = 'text-gray-500';
  const bodyText = isDark ? 'text-gray-300' : 'text-gray-700';
  const inputBase = isDark
    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500';

  const DisputeCard = ({ dispute }) => (
    <div className={`rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow overflow-hidden ${panelBase}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${getPriorityColor(dispute.priority)}`}>
            <Flag className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`font-semibold ${textPrimary}`}>{dispute.subject}</h3>
            <p className={`text-sm ${textSecondary}`}>
              {formatCategory(dispute.category)} • {dispute.priority} priority
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusIcon(dispute.status)}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
            {dispute.status.charAt(0).toUpperCase() + dispute.status.slice(1)}
          </span>
        </div>
      </div>

      <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mb-4 break-words ${textSecondary}`}>
        <div className="flex items-center min-w-0">
          <User className="w-4 h-4 mr-1 flex-shrink-0" />
          <span className="font-medium flex-shrink-0">
            {dispute.role ? dispute.role.charAt(0).toUpperCase() + dispute.role.slice(1) : 'User'}
          </span>
          {dispute.raisedByUser?.name && (
            <span className={`ml-2 max-w-[160px] truncate ${bodyText}`} title={dispute.raisedByUser.name}>
              • {dispute.raisedByUser.name}
            </span>
          )}
          {dispute.raisedByUser?.email && (
            <span className={`ml-2 max-w-[220px] truncate ${muted}`} title={dispute.raisedByUser.email}>
              ({dispute.raisedByUser.email})
            </span>
          )}
        </div>
        <div className="flex items-center min-w-0">
          <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
          <span>{new Date(dispute.createdAt).toLocaleDateString()}</span>
        </div>
        {dispute.loanId && (
          <div className="flex items-center min-w-0">
            <DollarSign className="w-4 h-4 mr-1 flex-shrink-0" />
            <span>₹{dispute.loanId.amount?.toLocaleString()}</span>
          </div>
        )}
        {dispute.counterpartyUser && (
          <div className="flex items-center min-w-0">
            <User className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className={`flex-shrink-0 ${textSecondary}`}>Counterparty:</span>
            <span className={`ml-1 max-w-[200px] truncate ${bodyText}`}
              title={dispute.counterpartyUser.name || ''}>
              {dispute.counterpartyUser.name || 'Unknown'}
            </span>
            {dispute.counterpartyUser.email && (
              <span className={`ml-2 max-w-[220px] truncate ${muted}`} title={dispute.counterpartyUser.email}>
                ({dispute.counterpartyUser.email})
              </span>
            )}
          </div>
        )}
      </div>

      <p className={`${bodyText} text-sm mb-4 line-clamp-2`}>
        {dispute.message}
      </p>

      {dispute.adminResponse && (
        <div className={`${isDark ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-50 border-blue-200'} border rounded-lg p-3 mb-4`}>
          <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
            <strong>Admin Response:</strong> {dispute.adminResponse}
          </p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <button
          onClick={() => { setSelectedDispute(dispute); setShowDetailsModal(true); }}
          className="text-blue-600 hover:text-blue-800 cursor-pointer text-sm font-medium flex items-center"
        >
          <Eye className="w-4 h-4 mr-1" />
          View Details
        </button>
        
        {dispute.status === 'open' && userRole === 'admin' && (
          <button
            onClick={() => {
              setSelectedDispute(dispute);
              setShowResolveModal(true);
            }}
            className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center"
          >
            Resolve
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className={`rounded-xl shadow-sm p-6 mb-6 ${panelBase}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold flex items-center ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                <AlertTriangle className="w-8 h-8 text-orange-500 mr-3" />
                {userRole === 'admin' ? 'Dispute Management' : 'Dispute Overview'}
              </h1>
              <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {userRole === 'admin' ? 'Manage and resolve user disputes' : 'View and track disputes'}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{disputes.length}</div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Disputes</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={`rounded-xl shadow-sm p-6 mb-6 ${panelBase}`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Search</label>
              <div className="relative">
                <Search className={`absolute left-3 top-3 h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Search disputes..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className={`pl-10 w-full px-3 py-2 border rounded-lg ${inputBase}`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg ${inputBase}`}
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg ${inputBase}`}
              >
                <option value="all">All Categories</option>
                <option value="payment">Payment</option>
                <option value="communication">Communication</option>
                <option value="fraud">Fraud</option>
                <option value="technical">Technical</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg ${inputBase}`}
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Disputes Grid */}
        {filteredDisputes.length === 0 ? (
          <div className={`rounded-xl shadow-sm p-12 text-center ${panelBase}`}>
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className={`text-lg font-medium mb-2 ${textPrimary}`}>No disputes found</h3>
            <p className={`${textSecondary}`}>No disputes match your current filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredDisputes.map((dispute) => (
              <DisputeCard key={dispute._id} dispute={dispute} />
            ))}
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedDispute && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
              <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-700' : ''}`}>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Dispute Details</h2>
                <button
                  onClick={() => { setShowDetailsModal(false); setSelectedDispute(null); }}
                  className={`hover:opacity-80 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`text-lg font-semibold ${textPrimary}`}>{selectedDispute.subject}</h3>
                    <p className={`text-sm mt-1 ${textSecondary}`}>
                      {formatCategory(selectedDispute.category)} • {selectedDispute.priority} priority
                    </p>
                  </div>
                  <span className={`px-2 py-1 h-fit rounded-full text-xs font-medium ${getStatusColor(selectedDispute.status)}`}>
                    {selectedDispute.status.charAt(0).toUpperCase() + selectedDispute.status.slice(1)}
                  </span>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm ${bodyText}`}>
                  <div className="flex items-center"><User className="w-4 h-4 mr-2" />
                    Role: {selectedDispute.role ? selectedDispute.role.charAt(0).toUpperCase() + selectedDispute.role.slice(1) : 'User'}
                  </div>
                  <div className="flex items-center"><Calendar className="w-4 h-4 mr-2" />
                    Created: {new Date(selectedDispute.createdAt).toLocaleString()}
                  </div>
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Raised by: {selectedDispute.raisedByUser?.name || 'Unknown'}
                    {selectedDispute.raisedByUser?.email && (
                      <span className={`ml-2 ${muted}`}>({selectedDispute.raisedByUser.email})</span>
                    )}
                  </div>
                  {selectedDispute.counterpartyUser && (
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Other party: {selectedDispute.counterpartyUser?.name || 'Unknown'}
                      {selectedDispute.counterpartyUser?.email && (
                        <span className={`ml-2 ${muted}`}>({selectedDispute.counterpartyUser.email})</span>
                      )}
                    </div>
                  )}
                  {selectedDispute.loanId && (
                    <>
                      <div className="flex items-center"><DollarSign className="w-4 h-4 mr-2" />
                        Amount: ₹{selectedDispute.loanId.amount?.toLocaleString()}
                      </div>
                      <div>Purpose: {selectedDispute.loanId.purpose}</div>
                    </>
                  )}
                </div>

                <div>
                  <h4 className={`text-sm font-medium mb-1 ${textPrimary}`}>Message</h4>
                  <p className={`${bodyText} text-sm whitespace-pre-wrap`}>{selectedDispute.message}</p>
                </div>

                {selectedDispute.expectedResolution && (
                  <div className={`${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border rounded-lg p-3`}>
                    <h4 className={`text-sm font-medium mb-1 ${textPrimary}`}>Expected Resolution</h4>
                    <p className={`${bodyText} text-sm whitespace-pre-wrap`}>{selectedDispute.expectedResolution}</p>
                  </div>
                )}

                {selectedDispute.adminResponse && (
                  <div className={`${isDark ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-50 border-blue-200'} border rounded-lg p-3`}>
                    <h4 className={`text-sm font-medium mb-1 ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>Admin Response</h4>
                    <p className={`${isDark ? 'text-blue-300' : 'text-blue-900'} text-sm whitespace-pre-wrap`}>{selectedDispute.adminResponse}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    onClick={() => { setShowDetailsModal(false); setSelectedDispute(null); }}
                    className={`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}`}
                  >
                    Close
                  </button>
                  {userRole === 'admin' && (
                    <button
                      onClick={() => { setShowDetailsModal(false); setShowResolveModal(true); }}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resolve Modal */}
        {showResolveModal && selectedDispute && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
              <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-700' : ''}`}>
                <h2 className={`text-xl font-bold ${textPrimary}`}>Resolve Dispute</h2>
                <button
                  onClick={() => setShowResolveModal(false)}
                  className={`hover:opacity-80 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <h3 className={`font-semibold mb-2 ${textPrimary}`}>{selectedDispute.subject}</h3>
                  <p className={`${bodyText} text-sm`}>{selectedDispute.message}</p>
                </div>

                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Resolution Status
                  </label>
                  <select
                    value={resolveData.status}
                    onChange={(e) => setResolveData({...resolveData, status: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg ${inputBase}`}
                  >
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                    <option value="in-progress">In Progress</option>
                  </select>
                </div>

                <div className="mb-6">
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Admin Response *
                  </label>
                  <textarea
                    value={resolveData.adminResponse}
                    onChange={(e) => setResolveData({...resolveData, adminResponse: e.target.value})}
                    placeholder="Provide your response to the user..."
                    rows={5}
                    className={`w-full px-3 py-2 border rounded-lg resize-none ${inputBase}`}
                    maxLength={1000}
                    required
                  />
                  <p className={`text-xs mt-1 ${muted}`}>
                    {resolveData.adminResponse.length}/1000 characters
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowResolveModal(false)}
                    className={`px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResolveDispute}
                    disabled={!resolveData.adminResponse}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Resolution
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisputesManagement;
