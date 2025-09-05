import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Flag,
  Eye,
  Settings,
  BarChart3,
  PieChart,
  Activity,
  CreditCard,
  UserCheck,
  Ban,
  RefreshCw
} from 'lucide-react';
import Navbar from './Navbar';
import API from '../api/api';
import { useTheme } from '../contexts/ThemeContext';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [stats, setStats] = useState({
    users: { total: 0, borrowers: 0, lenders: 0, admins: 0 },
    loans: { total: 0, pending: 0, funded: 0, repaid: 0, flagged: 0, totalAmount: 0 },
    kyc: { total: 0, pending: 0, verified: 0, rejected: 0 },
    payments: { total: 0, successful: 0, failed: 0, totalAmount: 0 },
    credit: { averageScore: 0, excellent: 0, good: 0, fair: 0, poor: 0 }
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [alerts, setAlerts] = useState([]);

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
      loadDashboardData();
    } catch (error) {
      console.error("Error checking admin role:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [usersRes, loansRes, creditRes] = await Promise.all([
        API.get('/users/all').catch(() => ({ data: [] })),
        API.get('/loans').catch(() => ({ data: [] })),
        API.get('/credit/admin/stats').catch(() => ({ data: { averageScore: 0, scoreDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 } } }))
      ]);

      // Calculate user stats
      const users = usersRes.data;
      const userStats = {
        total: users.length,
        borrowers: users.filter(u => u.role === 'borrower').length,
        lenders: users.filter(u => u.role === 'lender').length,
        admins: users.filter(u => u.role === 'admin').length
      };

      // Calculate loan stats
      const loans = loansRes.data;
      const loanStats = {
        total: loans.length,
        pending: loans.filter(l => !l.funded && !l.repaid).length,
        funded: loans.filter(l => l.funded && !l.repaid).length,
        repaid: loans.filter(l => l.repaid).length,
        flagged: loans.filter(l => l.flagged).length,
        totalAmount: loans.reduce((sum, l) => sum + l.amount, 0)
      };

      // Calculate KYC stats (mock data for now)
      const kycStats = {
        total: Math.floor(users.length * 0.7),
        pending: Math.floor(users.length * 0.2),
        verified: Math.floor(users.length * 0.4),
        rejected: Math.floor(users.length * 0.1)
      };

      // Calculate payment stats (mock data for now)
      const paymentStats = {
        total: loanStats.funded + loanStats.repaid,
        successful: loanStats.funded + loanStats.repaid,
        failed: Math.floor((loanStats.funded + loanStats.repaid) * 0.1),
        totalAmount: loanStats.totalAmount * 1.2 // Including interest
      };

      // Extract credit score stats
      const creditStats = {
        averageScore: creditRes.data.averageScore || 0,
        excellent: creditRes.data.scoreDistribution?.excellent || 0,
        good: creditRes.data.scoreDistribution?.good || 0,
        fair: creditRes.data.scoreDistribution?.fair || 0,
        poor: creditRes.data.scoreDistribution?.poor || 0
      };

      setStats({
        users: userStats,
        loans: loanStats,
        kyc: kycStats,
        payments: paymentStats,
        credit: creditStats
      });

      // Generate recent activity
      const activity = [
        { id: 1, type: 'loan', message: 'New loan request for ₹25,000', time: '2 minutes ago', status: 'pending' },
        { id: 2, type: 'kyc', message: 'KYC verification completed', time: '5 minutes ago', status: 'success' },
        { id: 3, type: 'payment', message: 'Payment of ₹15,000 processed', time: '10 minutes ago', status: 'success' },
        { id: 4, type: 'user', message: 'New user registration', time: '15 minutes ago', status: 'info' },
        { id: 5, type: 'loan', message: 'Loan flagged for review', time: '20 minutes ago', status: 'warning' }
      ];
      setRecentActivity(activity);

      // Generate alerts
      const alertsList = [
        { id: 1, type: 'warning', message: `${loanStats.flagged} loans require attention`, action: 'View Loans' },
        { id: 2, type: 'info', message: `${kycStats.pending} KYC submissions pending`, action: 'Review KYC' },
        { id: 3, type: 'success', message: 'System backup completed successfully', action: 'View Logs' }
      ];
      setAlerts(alertsList);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'loan': return DollarSign;
      case 'kyc': return Shield;
      case 'payment': return CreditCard;
      case 'user': return Users;
      default: return Activity;
    }
  };

  const getActivityColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'pending': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Admin Dashboard</h1>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Monitor and manage BorrowEase platform</p>
              </div>
            </div>
            <button
              onClick={loadDashboardData}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-8">
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>System Alerts</h2>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                  alert.type === 'warning' 
                    ? isDark ? 'bg-yellow-900/20 border-yellow-400' : 'bg-yellow-50 border-yellow-400'
                    : alert.type === 'success' 
                    ? isDark ? 'bg-green-900/20 border-green-400' : 'bg-green-50 border-green-400'
                    : isDark ? 'bg-blue-900/20 border-blue-400' : 'bg-blue-50 border-blue-400'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <AlertTriangle className={`w-5 h-5 mr-2 ${
                        alert.type === 'warning' ? 'text-yellow-600' :
                        alert.type === 'success' ? 'text-green-600' :
                        'text-blue-600'
                      }`} />
                      <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{alert.message}</span>
                    </div>
                    <button className={`text-sm font-medium ${
                      alert.type === 'warning' 
                        ? isDark ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-700 hover:text-yellow-800'
                        : alert.type === 'success' 
                        ? isDark ? 'text-green-400 hover:text-green-300' : 'text-green-700 hover:text-green-800'
                        : isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-700 hover:text-blue-800'
                    }`}>
                      {alert.action}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          {/* User Stats */}
          <div className={`${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-sm p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Users</h3>
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total</span>
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.users.total}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Borrowers</span>
                <span className="text-blue-600 font-medium">{stats.users.borrowers}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Lenders</span>
                <span className="text-green-600 font-medium">{stats.users.lenders}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Admins</span>
                <span className="text-purple-600 font-medium">{stats.users.admins}</span>
              </div>
            </div>
            <button 
              onClick={() => navigate('/admin/users')}
              className={`w-full mt-4 py-2 text-sm rounded-lg hover:bg-opacity-80 ${
                isDark 
                  ? 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/30' 
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Manage Users
            </button>
          </div>

          {/* Loan Stats */}
          <div className={`${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-sm p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Loans</h3>
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total</span>
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.loans.total}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pending</span>
                <span className="text-yellow-600 font-medium">{stats.loans.pending}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Funded</span>
                <span className="text-blue-600 font-medium">{stats.loans.funded}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Repaid</span>
                <span className="text-green-600 font-medium">{stats.loans.repaid}</span>
              </div>
              {stats.loans.flagged > 0 && (
                <div className="flex justify-between">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Flagged</span>
                  <span className="text-red-600 font-medium">{stats.loans.flagged}</span>
                </div>
              )}
            </div>
            <button 
              onClick={() => navigate('/admin/loans')}
              className={`w-full mt-4 py-2 text-sm rounded-lg hover:bg-opacity-80 ${
                isDark 
                  ? 'bg-green-900/20 text-green-400 hover:bg-green-900/30' 
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              Moderate Loans
            </button>
          </div>

          {/* KYC Stats */}
          <div className={`${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-sm p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>KYC</h3>
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total</span>
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.kyc.total}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pending</span>
                <span className="text-yellow-600 font-medium">{stats.kyc.pending}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Verified</span>
                <span className="text-green-600 font-medium">{stats.kyc.verified}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Rejected</span>
                <span className="text-red-600 font-medium">{stats.kyc.rejected}</span>
              </div>
            </div>
            <button 
              onClick={() => navigate('/admin/kyc')}
              className={`w-full mt-4 py-2 text-sm rounded-lg hover:bg-opacity-80 ${
                isDark 
                  ? 'bg-purple-900/20 text-purple-400 hover:bg-purple-900/30' 
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              Review KYC
            </button>
          </div>

          {/* Financial Stats */}
          <div className={`${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-sm p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Financials</h3>
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loan Volume</span>
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>₹{stats.loans.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Payments</span>
                <span className="text-green-600 font-medium">{stats.payments.successful}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Failed</span>
                <span className="text-red-600 font-medium">{stats.payments.failed}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Success Rate</span>
                <span className="text-blue-600 font-medium">
                  {stats.payments.total > 0 ? Math.round((stats.payments.successful / stats.payments.total) * 100) : 0}%
                </span>
              </div>
            </div>
            <button className={`w-full mt-4 py-2 text-sm rounded-lg hover:bg-opacity-80 ${
              isDark 
                ? 'bg-indigo-900/20 text-indigo-400 hover:bg-indigo-900/30' 
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}>
              View Reports
            </button>
          </div>

          {/* Credit Score Stats */}
          <div className={`${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-sm p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Credit Scores</h3>
              <CreditCard className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Average</span>
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.credit.averageScore}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Excellent</span>
                <span className="text-green-600 font-medium">{stats.credit.excellent}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Good</span>
                <span className="text-blue-600 font-medium">{stats.credit.good}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Fair</span>
                <span className="text-yellow-600 font-medium">{stats.credit.fair}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Poor</span>
                <span className="text-red-600 font-medium">{stats.credit.poor}</span>
              </div>
            </div>
            <button 
              onClick={() => navigate('/credit-score')}
              className={`w-full mt-4 py-2 text-sm rounded-lg hover:bg-opacity-80 ${
                isDark 
                  ? 'bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/30' 
                  : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
              }`}
            >
              View Credit Analytics
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <button
            onClick={() => navigate('/admin/disputes')}
            className={`${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow text-left`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Manage Disputes</h3>
              <AlertTriangle className="w-6 h-6 text-orange-500" />
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Review and resolve user disputes and issues
            </p>
          </button>
          <div className={`${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-sm p-6`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/admin/users')}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg ${
                  isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <Users className="w-5 h-5 text-blue-600 mr-3" />
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Manage Users</span>
              </button>
              <button 
                onClick={() => navigate('/admin/loans')}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg ${
                  isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <DollarSign className="w-5 h-5 text-green-600 mr-3" />
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Review Loans</span>
              </button>
              <button 
                onClick={() => navigate('/admin/kyc')}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg ${
                  isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <Shield className="w-5 h-5 text-purple-600 mr-3" />
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Verify KYC</span>
              </button>
            </div>
          </div>

          <div className={`${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-sm p-6`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>System Health</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Database</span>
                <span className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Payment Gateway</span>
                <span className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>File Storage</span>
                <span className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Normal
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Background Jobs</span>
                <span className="flex items-center text-yellow-600">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  Processing
                </span>
              </div>
            </div>
          </div>

          <div className={`${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-sm p-6`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Platform Settings</h3>
            <div className="space-y-3">
              <button className={`w-full flex items-center px-4 py-3 text-left rounded-lg ${
                isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
              }`}>
                <Settings className={`w-5 h-5 mr-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>System Configuration</span>
              </button>
              <button className={`w-full flex items-center px-4 py-3 text-left rounded-lg ${
                isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
              }`}>
                <BarChart3 className={`w-5 h-5 mr-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Analytics</span>
              </button>
              <button className={`w-full flex items-center px-4 py-3 text-left rounded-lg ${
                isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
              }`}>
                <Activity className={`w-5 h-5 mr-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Audit Logs</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className={`${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-sm p-6`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent Activity</h3>
            <button className={`text-sm hover:text-blue-800 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600'}`}>View All</button>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => {
              const IconComponent = getActivityIcon(activity.type);
              return (
                <div key={activity.id} className={`flex items-center justify-between p-3 rounded-lg ${
                  isDark ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center">
                    <IconComponent className={`w-5 h-5 mr-3 ${getActivityColor(activity.status)}`} />
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{activity.message}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{activity.time}</p>
                    </div>
                  </div>
                  <button className={`text-sm hover:text-blue-800 ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600'}`}>
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
