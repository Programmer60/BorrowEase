import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Flag,
  Eye,
  Reply,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';
import API from '../api/api';
import { useTheme } from '../contexts/ThemeContext';

const AdminContactManagement = () => {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    riskLevel: '',
    spamScore: '',
    search: '',
    page: 1,
    requiresReview: false,
    autoResponseOnly: false,
    highPriorityOnly: false,
    unassignedOnly: false,
    includeBlocked: false,
    dateFrom: '',
    dateTo: ''
  });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
    spam: 0,
    highPriority: 0,
    needsReview: 0
  });
  const [recalculating, setRecalculating] = useState(false);
  const [highSpamAlerts, setHighSpamAlerts] = useState([]);

  useEffect(() => {
    loadMessages();
  }, [filters]);

  // Check for high spam alerts when messages load
  useEffect(() => {
    const highSpamMessages = messages.filter(msg => 
      msg.spamScore && (msg.spamScore * 100) > 100
    );
    setHighSpamAlerts(highSpamMessages);
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await API.get(`/contact/admin/messages?${params}`);
      if (response.data.success) {
        setMessages(response.data.messages);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMessageStatus = async (messageId, status, adminNote = '') => {
    try {
      await API.patch(`/contact/admin/message/${messageId}/status`, {
        status,
        adminNote
      });
      loadMessages(); // Refresh list
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const respondToMessage = async (messageId) => {
    try {
      await API.post(`/contact/admin/message/${messageId}/respond`, {
        response: responseText,
        sendEmail: true
      });
      setResponseText('');
      setSelectedMessage(null);
      loadMessages(); // Refresh list
    } catch (error) {
      console.error('Error sending response:', error);
    }
  };

  const handleBulkAction = async (action) => {
    try {
      const response = await API.post('/contact/admin/messages/bulk-action', {
        messageIds: selectedMessages,
        action: action
      });
      
      if (response.data.success) {
        setSelectedMessages([]);
        loadMessages(); // Refresh list
        alert(`Bulk ${action} completed for ${response.data.modifiedCount} messages`);
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      alert('Failed to perform bulk action');
    }
  };

  const handleMessageSelect = (messageId) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMessages.length === messages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(messages.map(m => m._id));
    }
  };

  const handleRecalculatePriorities = async () => {
    if (!confirm('🔄 Recalculate priorities for all messages? This may take a few moments for large datasets.')) {
      return;
    }

    try {
      setRecalculating(true);
      console.log('🎯 Starting priority recalculation...');
      
      const response = await API.post('/contact/admin/recalculate-priorities');
      
      if (response.data.success) {
        const { updatedCount, results } = response.data;
        
        // Show detailed success message
        alert(
          `✅ Priority Recalculation Complete!\n\n` +
          `📊 Updated: ${updatedCount} messages\n` +
          `🎯 Critical: ${results?.critical || 0}\n` +
          `🔥 High: ${results?.high || 0}\n` +
          `📋 Medium: ${results?.medium || 0}\n` +
          `📝 Low: ${results?.low || 0}\n` +
          `⬇️ Very Low: ${results?.very_low || 0}\n\n` +
          `Messages have been re-prioritized based on current user profiles and KYC status.`
        );
        
        // Refresh the list
        await loadMessages();
        
        // Show additional alert if high spam detected
        setTimeout(() => {
          const highSpamCount = messages.filter(m => m.spamScore && (m.spamScore * 100) > 100).length;
          if (highSpamCount > 0) {
            alert(`⚠️ SPAM ALERT: ${highSpamCount} messages have spam rates over 100%!\n\nThese messages require immediate attention.`);
          }
        }, 1000);
        
      } else {
        alert('❌ Failed to recalculate priorities. Please try again.');
      }
    } catch (error) {
      console.error('Error recalculating priorities:', error);
      alert(`❌ Error: ${error.response?.data?.message || 'Failed to recalculate priorities'}`);
    } finally {
      setRecalculating(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-800 bg-red-200 border-red-300';
      case 'high': return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'low': return 'text-blue-600 bg-blue-100 border-blue-300';
      case 'very_low': return 'text-gray-600 bg-gray-100 border-gray-300';
      default: return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'critical': return '🚨';
      case 'high': return '⚡';
      case 'medium': return '📋';
      case 'low': return '📝';
      case 'very_low': return '⬇️';
      default: return '📋';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'closed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSpamScoreDisplay = (spamScore) => {
    if (!spamScore) return { text: 'N/A', color: 'text-gray-500', bgColor: '', icon: '' };
    
    const percentage = Math.round(spamScore * 100);
    
    if (percentage >= 1000) {
      return { 
        text: `${percentage}%`, 
        color: 'text-red-900', 
        bgColor: 'bg-red-200 border-2 border-red-400 animate-pulse', 
        icon: '🚨' 
      };
    } else if (percentage >= 200) {
      return { 
        text: `${percentage}%`, 
        color: 'text-red-800', 
        bgColor: 'bg-red-100 border border-red-300', 
        icon: '⚠️' 
      };
    } else if (percentage > 100) {
      return { 
        text: `${percentage}%`, 
        color: 'text-orange-800', 
        bgColor: 'bg-orange-100 border border-orange-300', 
        icon: '🟠' 
      };
    } else if (percentage > 50) {
      return { 
        text: `${percentage}%`, 
        color: 'text-yellow-700', 
        bgColor: 'bg-yellow-50', 
        icon: '🟡' 
      };
    } else {
      return { 
        text: `${percentage}%`, 
        color: 'text-green-700', 
        bgColor: 'bg-green-50', 
        icon: '🟢' 
      };
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            📧 Contact Messages Management
          </h1>
          <div className="flex space-x-3">
            <button
              onClick={handleRecalculatePriorities}
              disabled={recalculating}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-white ${
                recalculating 
                  ? 'bg-purple-400 cursor-not-allowed' 
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {recalculating ? (
                <>🔄 <span>Recalculating...</span></>
              ) : (
                <>🎯 <span>Recalculate Priorities</span></>
              )}
            </button>
            <button
              onClick={loadMessages}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* High Spam Alert Banner */}
        {highSpamAlerts.length > 0 && (
          <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 rounded-r-lg animate-pulse">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🚨</span>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-800">
                  HIGH SPAM ALERT!
                </h3>
                <p className="text-red-700">
                  <strong>{highSpamAlerts.length}</strong> messages have spam rates over 100%! 
                  These require immediate attention.
                </p>
                <div className="mt-2 text-sm text-red-600">
                  Highest spam rate: <strong>{Math.max(...highSpamAlerts.map(m => Math.round(m.spamScore * 100)))}%</strong>
                </div>
              </div>
              <div className="ml-auto flex-shrink-0">
                <button
                  onClick={() => {
                    setFilters(prev => ({ 
                      ...prev, 
                      spamScore: '1',
                      includeBlocked: true
                    }));
                  }}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  View High Spam
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Dashboard */}
        <div className={`grid grid-cols-2 md:grid-cols-6 gap-4 mb-6`}>
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{pagination.totalMessages || messages.length}</p>
              </div>
              <Mail className={`h-8 w-8 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pending</p>
                <p className={`text-2xl font-bold text-yellow-600`}>{messages.filter(m => m.status === 'pending').length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>

          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Resolved</p>
                <p className={`text-2xl font-bold text-green-600`}>{messages.filter(m => m.status === 'resolved').length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>High Risk</p>
                <p className={`text-2xl font-bold text-red-600`}>{messages.filter(m => m.riskLevel === 'high').length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Needs Review</p>
                <p className={`text-2xl font-bold text-orange-600`}>{messages.filter(m => m.requiresReview).length}</p>
              </div>
              <Flag className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Auto-Replied</p>
                <p className={`text-2xl font-bold text-blue-600`}>{messages.filter(m => m.autoResponseSent).length}</p>
              </div>
              <Reply className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>🛡️ Blocked Spam</p>
                <p className={`text-2xl font-bold text-purple-600`}>
                  {filters.includeBlocked ? messages.filter(m => m.status === 'blocked' || m.status === 'quarantined').length : '?'}
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {!filters.includeBlocked && 'Hidden from view'}
                </p>
              </div>
              <div className="text-purple-600 text-2xl">🚫</div>
            </div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            🎯 Smart Filters & AI-Powered Sorting
          </h3>
          
          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setFilters(prev => ({ ...prev, requiresReview: !prev.requiresReview, page: 1 }))}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filters.requiresReview
                  ? 'bg-red-600 text-white'
                  : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🚨 Needs Review
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, highPriorityOnly: !prev.highPriorityOnly, page: 1 }))}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filters.highPriorityOnly
                  ? 'bg-orange-600 text-white'
                  : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ⚡ High Priority
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, unassignedOnly: !prev.unassignedOnly, page: 1 }))}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filters.unassignedOnly
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              👤 Unassigned
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, autoResponseOnly: !prev.autoResponseOnly, page: 1 }))}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filters.autoResponseOnly
                  ? 'bg-green-600 text-white'
                  : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🤖 Auto-Responded
            </button>
            <button
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                includeBlocked: !prev.includeBlocked,
                status: prev.includeBlocked ? '' : 'quarantined',
                page: 1 
              }))}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filters.includeBlocked
                  ? 'bg-red-600 text-white'
                  : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🚫 Show Blocked/Spam
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value, page: 1 }))}
                className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="">All Priority</option>
                <option value="critical">🚨 Critical</option>
                <option value="high">⚡ High</option>
                <option value="medium">📋 Medium</option>
                <option value="low">📝 Low</option>
                <option value="very_low">⬇️ Very Low</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value, page: 1 }))}
                className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="">All Categories</option>
                <option value="general">General</option>
                <option value="technical">Technical</option>
                <option value="account">Account</option>
                <option value="security">Security</option>
                <option value="billing">Billing</option>
                <option value="feedback">Feedback</option>
                <option value="complaint">Complaint</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                  placeholder="Search messages..."
                  className={`w-full pl-10 pr-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className={`rounded-lg shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          {/* Bulk Actions Bar */}
          {selectedMessages.length > 0 && (
            <div className={`p-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-blue-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {selectedMessages.length} message{selectedMessages.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleBulkAction('resolve')}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                    >
                      ✅ Resolve
                    </button>
                    <button
                      onClick={() => handleBulkAction('quarantine')}
                      className="px-3 py-1 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700"
                    >
                      🔒 Quarantine
                    </button>
                    <button
                      onClick={() => handleBulkAction('assign')}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      👤 Assign to Me
                    </button>
                    <button
                      onClick={() => setSelectedMessages([])}
                      className="px-3 py-1 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700"
                    >
                      ❌ Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>No messages found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                      <input
                        type="checkbox"
                        checked={selectedMessages.length === messages.length && messages.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                      Message
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                      Priority
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                      Status
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                      🤖 AI Scores
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                      Date
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {messages.map((message) => (
                    <tr key={message._id} className={`hover:${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedMessages.includes(message._id)}
                          onChange={() => handleMessageSelect(message._id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {message.subject || 'No Subject'}
                            </div>
                            {message.requiresReview && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                ⚠️ Needs Review
                              </span>
                            )}
                            {message.autoResponseSent && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                🤖 Auto-Replied
                              </span>
                            )}
                          </div>
                          <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            From: {message.name} ({message.email})
                          </div>
                          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {message.category} • {message.message ? message.message.substring(0, 100) + '...' : 'No content'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-2">
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(message.priority || 'medium')}`}>
                            {getPriorityIcon(message.priority || 'medium')} {message.priority || 'medium'}
                          </span>
                          {message.priorityScore && (
                            <span className={`text-xs px-2 py-1 rounded ${message.priorityScore > 50 ? 'bg-green-100 text-green-700' : message.priorityScore > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                              Score: {message.priorityScore}
                            </span>
                          )}
                          {message.customerTier && message.customerTier !== 'new' && (
                            <span className={`text-xs px-2 py-1 rounded font-medium ${
                              message.customerTier === 'vip' ? 'bg-purple-100 text-purple-800' :
                              message.customerTier === 'premium' ? 'bg-gold-100 text-gold-800' :
                              message.customerTier === 'verified' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {message.customerTier.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(message.status || 'pending')}`}>
                          {(message.status || 'pending').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {(() => {
                            const spamDisplay = getSpamScoreDisplay(message.spamScore);
                            return (
                              <div className={`text-xs px-2 py-1 rounded-full inline-flex items-center space-x-1 ${spamDisplay.bgColor}`}>
                                <span>{spamDisplay.icon}</span>
                                <span className={`font-medium ${spamDisplay.color}`}>
                                  Spam: {spamDisplay.text}
                                </span>
                              </div>
                            );
                          })()}
                          <div className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            Risk: <span className={`font-medium ${
                              message.riskLevel === 'high' ? 'text-red-600' :
                              message.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {message.riskLevel || 'low'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {new Date(message.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedMessage(message)}
                            className="text-blue-600 hover:text-blue-800"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateMessageStatus(message._id, 'in_progress')}
                            className="text-yellow-600 hover:text-yellow-800"
                            title="Mark In Progress"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateMessageStatus(message._id, 'resolved')}
                            className="text-green-600 hover:text-green-800"
                            title="Mark Resolved"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          {message.riskLevel === 'high' && (
                            <button
                              onClick={() => updateMessageStatus(message._id, 'quarantined')}
                              className="text-red-600 hover:text-red-800"
                              title="Quarantine"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <div className="flex space-x-2">
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.currentPage === 1}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
              >
                Previous
              </button>
              <span className={`px-3 py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                disabled={pagination.currentPage === pagination.totalPages}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Message Detail Modal */}
        {selectedMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {selectedMessage.subject}
                  </h3>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className={`text-gray-400 hover:text-gray-600`}
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>From:</label>
                    <p className={`${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedMessage.name} ({selectedMessage.email})</p>
                  </div>

                  {/* PRIORITY INTELLIGENCE SECTION */}
                  <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-200'}`}>
                    <h4 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      🎯 Priority Intelligence Analysis
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Priority Level:</span>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full border ${getPriorityColor(selectedMessage.priority || 'medium')}`}>
                            {getPriorityIcon(selectedMessage.priority || 'medium')} {(selectedMessage.priority || 'medium').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      {selectedMessage.priorityScore && (
                        <div>
                          <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Priority Score:</span>
                          <div className="mt-1">
                            <span className={`text-lg font-bold ${
                              selectedMessage.priorityScore > 50 ? 'text-green-600' : 
                              selectedMessage.priorityScore > 0 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {selectedMessage.priorityScore}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedMessage.priorityFactors && selectedMessage.priorityFactors.length > 0 && (
                      <div className="mt-4">
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Analysis Factors:</span>
                        <ul className={`mt-2 space-y-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {selectedMessage.priorityFactors.slice(0, 5).map((factor, index) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedMessage.priorityRecommendations && selectedMessage.priorityRecommendations.length > 0 && (
                      <div className="mt-4">
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Admin Recommendations:</span>
                        <ul className={`mt-2 space-y-1 text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                          {selectedMessage.priorityRecommendations.map((recommendation, index) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2">💡</span>
                              <span className="font-medium">{recommendation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedMessage.customerTier && selectedMessage.customerTier !== 'new' && (
                      <div className="mt-4">
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Customer Tier:</span>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-3 py-1 text-sm font-bold rounded-full ${
                            selectedMessage.customerTier === 'vip' ? 'bg-purple-100 text-purple-800' :
                            selectedMessage.customerTier === 'premium' ? 'bg-yellow-100 text-yellow-800' :
                            selectedMessage.customerTier === 'verified' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedMessage.customerTier === 'vip' ? '👑' : 
                             selectedMessage.customerTier === 'premium' ? '⭐' : 
                             selectedMessage.customerTier === 'verified' ? '✅' : '👤'} 
                            {selectedMessage.customerTier.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Message:</label>
                    <p className={`${isDark ? 'text-white' : 'text-gray-900'} whitespace-pre-wrap`}>{selectedMessage.message}</p>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Respond:</label>
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      rows={4}
                      className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      placeholder="Type your response..."
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => respondToMessage(selectedMessage._id)}
                      disabled={!responseText.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Send Response
                    </button>
                    <button
                      onClick={() => updateMessageStatus(selectedMessage._id, 'resolved', 'Issue resolved')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminContactManagement;
