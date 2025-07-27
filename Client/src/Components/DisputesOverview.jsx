import React, { useState, useEffect } from 'react';
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
import API from '../api/api';

const DisputesOverview = ({ embedded = false }) => {
  const [disputes, setDisputes] = useState([]);
  const [filteredDisputes, setFilteredDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [selectedDispute, setSelectedDispute] = useState(null);
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
    checkUserAccess();
  }, []);

  useEffect(() => {
    filterDisputes();
  }, [disputes, filters]);

  const checkUserAccess = async () => {
    try {
      const res = await API.get("/users/me");
      setUserRole(res.data.role);
      loadDisputes();
    } catch (error) {
      console.error("Error checking user role:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDisputes = async () => {
    try {
      const response = await API.get('/disputes');
      setDisputes(response.data);
    } catch (error) {
      console.error('Error loading disputes:', error);
    }
  };

  const filterDisputes = () => {
    let filtered = [...disputes];

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
      filtered = filtered.filter(dispute =>
        dispute.subject.toLowerCase().includes(searchLower) ||
        dispute.message.toLowerCase().includes(searchLower) ||
        dispute.raisedBy?.name.toLowerCase().includes(searchLower)
      );
    }

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
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleResolveDispute = async () => {
    try {
      const response = await API.patch(`/disputes/${selectedDispute._id}/resolve`, resolveData);
      
      // Update the disputes list
      setDisputes(disputes.map(dispute => 
        dispute._id === selectedDispute._id ? response.data : dispute
      ));
      
      setShowResolveModal(false);
      setSelectedDispute(null);
      setResolveData({ status: 'resolved', adminResponse: '' });
    } catch (error) {
      console.error('Error resolving dispute:', error);
      alert('Failed to resolve dispute');
    }
  };

  const DisputeCard = ({ dispute }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${getPriorityColor(dispute.priority)}`}>
            <Flag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{dispute.subject}</h3>
            <p className="text-sm text-gray-600">
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

      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
        <div className="flex items-center">
          <User className="w-4 h-4 mr-1" />
          {dispute.raisedBy?.name} ({dispute.role})
        </div>
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-1" />
          {new Date(dispute.createdAt).toLocaleDateString()}
        </div>
        {dispute.loanId && (
          <div className="flex items-center">
            <DollarSign className="w-4 h-4 mr-1" />
            ₹{dispute.loanId.amount?.toLocaleString()}
          </div>
        )}
      </div>

      <p className="text-gray-700 text-sm mb-4 line-clamp-2">
        {dispute.message}
      </p>

      {dispute.adminResponse && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Admin Response:</strong> {dispute.adminResponse}
          </p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <button
          onClick={() => setSelectedDispute(dispute)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "min-h-screen bg-gray-50"}>
      <div className={embedded ? "" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"}>
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <AlertTriangle className="w-8 h-8 text-orange-500 mr-3" />
                {userRole === 'admin' ? 'Dispute Management' : 'Dispute Overview'}
              </h1>
              <p className="text-gray-600 mt-1">
                {userRole === 'admin' ? 'Manage and resolve user disputes' : 'View and track disputes'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{disputes.length}</div>
              <div className="text-sm text-gray-600">Total Disputes</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search disputes..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No disputes found</h3>
            <p className="text-gray-600">No disputes match your current filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredDisputes.map((dispute) => (
              <DisputeCard key={dispute._id} dispute={dispute} />
            ))}
          </div>
        )}

        {/* Resolve Modal */}
        {showResolveModal && selectedDispute && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Resolve Dispute</h2>
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">{selectedDispute.subject}</h3>
                  <p className="text-gray-700 text-sm">{selectedDispute.message}</p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resolution Status
                  </label>
                  <select
                    value={resolveData.status}
                    onChange={(e) => setResolveData({...resolveData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                    <option value="in-progress">In Progress</option>
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Response *
                  </label>
                  <textarea
                    value={resolveData.adminResponse}
                    onChange={(e) => setResolveData({...resolveData, adminResponse: e.target.value})}
                    placeholder="Provide your response to the user..."
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    maxLength={1000}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {resolveData.adminResponse.length}/1000 characters
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowResolveModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
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

export default DisputesOverview;
