import { useEffect, useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Search, 
  Filter, 
  Trash2, 
  Shield, 
  UserCheck, 
  UserX,
  ArrowUpDown,
  Eye,
  Activity,
  FileText,
  CreditCard
} from "lucide-react";
import Navbar from "./Navbar";
import { useTheme } from "../contexts/ThemeContext";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [activeTab, setActiveTab] = useState("users"); // 'users' or 'loans'
  const [stats, setStats] = useState({
    totalUsers: 0,
    borrowers: 0,
    lenders: 0,
    admins: 0
  });
  const navigate = useNavigate();
  const { isDark } = useTheme();

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const res = await API.get("/users/me");
      if (res.data.role !== "admin") {
        alert("Access denied. Admins only.");
        navigate("/");
        return;
      }
      setIsAuthorized(true);
      loadUsers();
    } catch (error) {
      console.error("Error checking admin role:", error.message);
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await API.get("/users/all");
      setUsers(res.data);
      updateStats(res.data);
      filterAndSortUsers(res.data, searchTerm, roleFilter, sortOrder);
    } catch (error) {
      console.error("Error loading users:", error.message);
      alert("Error loading users. Please try again.");
    }
  };

  const updateStats = (userList) => {
    const stats = {
      totalUsers: userList.length,
      borrowers: userList.filter(u => u.role === 'borrower').length,
      lenders: userList.filter(u => u.role === 'lender').length,
      admins: userList.filter(u => u.role === 'admin').length
    };
    setStats(stats);
  };

  const filterAndSortUsers = (userList, search, role, sort) => {
    let filtered = [...userList];

    // Apply search filter
    if (search) {
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply role filter
    if (role !== "all") {
      filtered = filtered.filter(user => user.role === role);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sort) {
        case "newest":
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case "oldest":
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "email":
          return (a.email || "").localeCompare(b.email || "");
        default:
          return 0;
      }
    });

    setFilteredUsers(filtered);
  };

  // Handle search input
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    filterAndSortUsers(users, value, roleFilter, sortOrder);
  };

  // Handle role filter
  const handleRoleFilterChange = (e) => {
    const value = e.target.value;
    setRoleFilter(value);
    filterAndSortUsers(users, searchTerm, value, sortOrder);
  };

  // Handle sort change
  const handleSortChange = (e) => {
    const value = e.target.value;
    setSortOrder(value);
    filterAndSortUsers(users, searchTerm, roleFilter, value);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await API.patch(`/users/${userId}/role`, { role: newRole });
      alert("Role updated successfully!");
      loadUsers();
    } catch (error) {
      console.error("Error updating role:", error.message);
      alert("Error updating role. Please try again.");
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      try {
        await API.delete(`/users/${userId}`);
        alert("User deleted successfully!");
        loadUsers();
      } catch (error) {
        console.error("Error deleting user:", error.message);
        alert("Error deleting user. Please try again.");
      }
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4 text-red-600" />;
      case 'lender':
        return <UserCheck className="w-4 h-4 text-blue-600" />;
      case 'borrower':
        return <UserX className="w-4 h-4 text-green-600" />;
      default:
        return <Users className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'lender':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'borrower':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark
          ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800'
          : 'bg-gradient-to-br from-blue-50 to-indigo-100'
      }`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
            isDark ? 'border-indigo-400' : 'border-indigo-600'
          }`}></div>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Loading admin panel...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthorized) return null;

  return (
    <div className={`min-h-screen transition-colors ${
      isDark
        ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800'
        : 'bg-gradient-to-br from-blue-50 to-indigo-100'
    }`}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Shield className={`w-8 h-8 mr-3 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <h1 className={`text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Admin Dashboard</h1>
          </div>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Manage users, roles, and loan applications</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("users")}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'users'
                    ? (isDark ? 'border-indigo-400 text-indigo-300' : 'border-indigo-500 text-indigo-600')
                    : (isDark ? 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
                }`}
              >
                <Users className="w-5 h-5 inline-block mr-2" />
                User Management
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "users" ? (
          <>
            {/* User Management Content */}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className={`rounded-xl shadow-lg p-6 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center">
              <Users className={`w-8 h-8 mr-3 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Users</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{stats.totalUsers}</p>
              </div>
            </div>
          </div>
          <div className={`rounded-xl shadow-lg p-6 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center">
              <UserX className={`w-8 h-8 mr-3 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Borrowers</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{stats.borrowers}</p>
              </div>
            </div>
          </div>
          <div className={`rounded-xl shadow-lg p-6 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center">
              <UserCheck className={`w-8 h-8 mr-3 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Lenders</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{stats.lenders}</p>
              </div>
            </div>
          </div>
          <div className={`rounded-xl shadow-lg p-6 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center">
              <Shield className={`w-8 h-8 mr-3 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Admins</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{stats.admins}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className={`rounded-xl shadow-lg p-6 mb-8 border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={handleSearchChange}
                className={`pl-10 pr-4 py-2 w-full rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 border ${
                  isDark ? 'bg-gray-800 border-gray-600 placeholder-gray-500 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                }`}
              />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <Filter className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <select
                value={roleFilter}
                onChange={handleRoleFilterChange}
                className={`pl-10 pr-4 py-2 w-full rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none border ${
                  isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                }`}
              >
                <option value="all">All Roles</option>
                <option value="borrower">Borrowers</option>
                <option value="lender">Lenders</option>
                <option value="admin">Admins</option>
              </select>
            </div>

            {/* Sort */}
            <div className="relative">
              <ArrowUpDown className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <select
                value={sortOrder}
                onChange={handleSortChange}
                className={`pl-10 pr-4 py-2 w-full rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none border ${
                  isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 bg-white text-gray-900'
                }`}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Sort by Name</option>
                <option value="email">Sort by Email</option>
              </select>
            </div>
          </div>

          <div className={`mt-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Showing {filteredUsers.length} of {users.length} users</div>
        </div>

        {/* Users Table */}
        <div className={`rounded-xl shadow-lg overflow-hidden border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                    User
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                    Role
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                    Joined
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`${isDark ? 'bg-gray-900 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                {filteredUsers.map((user) => (
                  <tr key={user._id} className={`transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isDark ? 'bg-indigo-950 border border-indigo-800' : 'bg-indigo-100'} }`}>
                            <span className={`font-medium text-sm ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                              {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{user.name || 'Unknown'}</div>
                          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getRoleIcon(user.role)}
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(user.role)} ${isDark ? 'bg-opacity-10' : ''}`}>
                          {user.role}
                        </span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {/* Role Change Dropdown */}
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        className={`px-3 py-1 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${isDark ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                      >
                        <option value="borrower">Borrower</option>
                        <option value="lender">Lender</option>
                        <option value="admin">Admin</option>
                      </select>
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteUser(user._id, user.name)}
                        className={`inline-flex items-center px-3 py-1 border rounded-md transition-colors ${
                          isDark
                            ? 'border-red-800 text-red-300 bg-red-950/40 hover:bg-red-900/50'
                            : 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                        }`}
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={isDark ? 'text-gray-500' : 'text-gray-500'}>No users found matching your criteria</p>
            </div>
          )}
        </div>
          </>
        ) : (
          /* Loan Moderation Content */
          <AdminLoanModeration />
        )}
      </div>
    </div>
  );
}