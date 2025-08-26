import { useState, useEffect } from "react";
import {
  Wallet,
  User,
  Menu,
  X,
  Settings,
  LogOut,
  CreditCard,
  TrendingUp,
  Shield,
  Bell,
  ChevronDown,
  AlertTriangle,
  Brain,
  CheckCircle,
  Clock,
  Calculator,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import API from "../api/api";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "../contexts/ThemeContext";

export default function Navbar() {
  const { isDark } = useTheme();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await API.get("/notifications");
        setNotifications(res.data);
        setUnreadCount(res.data.filter(n => !n.read).length);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
  }, []);

  useEffect(() => {
  const fetchNotifications = async () => {
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.read).length);
    } catch (err) {
      console.error("Notification fetch error:", err);
    }
  };
  fetchNotifications();
}, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await API.get("/users/me");
        setUser({
          displayName: res.data.name,
          email: res.data.email,
          photoURL: auth.currentUser?.photoURL || null,
          kyc: res.data.kyc || null,
          kycStatus: res.data.kycStatus || 'not_submitted'
        });
        console.log('👤 User role fetched in Navbar:', res.data.role);
        setUserRole(res.data.role);
      } catch (error) {
        console.error("Error fetching user:", error.message);
      }
    };

    if (auth.currentUser) {
      fetchUser();
    }
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
    setUserRole("");
    navigate("/");
  };

  const navLinks = [
    {
      label: "Borrower Dashboard",
      path: "/borrower",
      icon: <User className="w-4 h-4" />,
      show: user && userRole === "borrower",
    },
    {
      label: "Lender Dashboard",
      path: "/lender",
      icon: <TrendingUp className="w-4 h-4" />,
      show: user && userRole === "lender",
    },
    {
      label: "KYC Verification",
      path: "/kyc",
      icon: <Shield className="w-4 h-4" />,
      show: user && userRole === "borrower",
      className: user?.kycStatus === 'verified' ? "text-green-600 hover:text-green-700 font-semibold" : 
                 user?.kycStatus === 'pending' ? "text-yellow-600 hover:text-yellow-700 font-semibold" :
                 user?.kycStatus === 'rejected' ? "text-red-600 hover:text-red-700 font-semibold" :
                 "text-blue-600 hover:text-blue-700 font-semibold",
    },
    {
      label: "My Loans",
      path: "/borrower-history",
      icon: <CreditCard className="w-4 h-4" />,
      show: user && userRole === "borrower",
    },
    {
      label: "Funded Loans",
      path: "/lender-history",
      icon: <Shield className="w-4 h-4" />,
      show: user && userRole === "lender",
    },
    {
      label: "Borrower Assessment",
      path: "/borrower-assessment",
      icon: <Calculator className="w-4 h-4" />,
      show: user && userRole === "lender",
      className: "text-purple-600 hover:text-purple-700 font-semibold",
    },
    {
      label: "Credit Score",
      path: "/credit-score",
      icon: <TrendingUp className="w-4 h-4" />,
      show: user && userRole === "borrower",
    },
    {
      label: "AI Dashboard",
      path: "/ai-dashboard",
      icon: <Brain className="w-4 h-4" />,
      show: user && (userRole === "lender" || userRole === "admin"),
      className: "text-blue-600 hover:text-blue-700 font-semibold",
    },
    {
      label: "Admin Dashboard",
      path: "/admin",
      icon: <Shield className="w-4 h-4" />,
      show: user && userRole === "admin",
      className: "text-red-600 hover:text-red-700 font-semibold",
    },
    {
      label: "Disputes",
      path: "/admin/disputes",
      icon: <AlertTriangle className="w-4 h-4" />,
      show: user && userRole === "admin",
      className: "text-orange-600 hover:text-orange-700 font-semibold",
    },
  ];

  // Public navigation links that show only for non-authenticated users
  const publicNavLinks = [
    {
      label: "About",
      path: "/about",
      show: !user, // Only show when user is not logged in
    },
    {
      label: "How it Works",
      path: "/how-it-works",
      show: !user, // Only show when user is not logged in
    },
    {
      label: "Contact",
      path: "/contact",
      show: !user, // Only show when user is not logged in
    },
  ];

  return (
    <header className={`shadow-lg sticky top-0 z-50 theme-transition ${
      isDark 
        ? 'bg-gray-900 border-b border-gray-700' 
        : 'bg-white border-b border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer group"
            onClick={() => navigate("/")}
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-2 mr-3">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              BorrowEase
            </h1>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks
              .filter((link) => link.show && link.label !== "Admin Panel")
              .map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`relative flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isDark 
                      ? 'hover:bg-gray-800' 
                      : 'hover:bg-gray-100'
                  } ${
                    link.className || (isDark 
                      ? "text-gray-300 hover:text-indigo-400" 
                      : "text-gray-700 hover:text-indigo-600"
                    )
                  }`}
                >
                  {link.icon}
                  <span className="ml-2">{link.label}</span>
                  {link.badge && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                      {link.badge > 99 ? '99+' : link.badge}
                    </span>
                  )}
                </button>
              ))}
            
            {/* Public Navigation Links */}
            {publicNavLinks
              .filter((link) => link.show)
              .map((link) => (
                <Link
                  key={link.label}
                  to={link.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isDark 
                      ? 'text-gray-300 hover:text-indigo-400 hover:bg-gray-800' 
                      : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
          </nav>

          {/* Profile & Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {/* Theme Toggle */}
                <ThemeToggle variant="simple" />

                <NotificationBell/>

                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-3"
                  >
                    <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="Profile"
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <User className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-medium ${
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      }`}>{user.displayName}</p>
                      <p className={`text-xs ${
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      }`}>{userRole}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 ${
                      isDark ? 'text-gray-500' : 'text-gray-400'
                    }`} />
                  </button>

                  {isProfileOpen && (
                    <div className={`absolute right-0 mt-2 w-48 rounded shadow-lg py-1 z-50 ${
                      isDark 
                        ? 'bg-gray-800 border border-gray-700' 
                        : 'bg-white border border-gray-200'
                    }`}>
                      <div className={`px-4 py-2 border-b ${
                        isDark ? 'border-gray-700' : 'border-gray-200'
                      }`}>
                        <p className={`text-sm font-medium ${
                          isDark ? 'text-gray-100' : 'text-gray-900'
                        }`}>{user.displayName}</p>
                        <p className={`text-xs ${
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>{user.email}</p>
                        {userRole === "admin" && (
                          <p className={`text-xs font-semibold ${
                            isDark ? 'text-red-400' : 'text-red-600'
                          }`}>Admin User</p>
                        )}
                        {userRole === "borrower" && user.kycStatus && (
                          <div className="mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              user.kycStatus === 'verified' 
                                ? (isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800')
                                : user.kycStatus === 'pending' 
                                ? (isDark ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800')
                                : user.kycStatus === 'rejected' 
                                ? (isDark ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800')
                                : (isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800')
                            }`}>
                              <Shield className="w-3 h-3 mr-1" />
                              KYC {user.kycStatus === 'not_submitted' ? 'Not Submitted' : 
                                   user.kycStatus.charAt(0).toUpperCase() + user.kycStatus.slice(1)}
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => navigate("/profile")}
                        className={`w-full text-left px-4 py-2 text-sm ${
                          isDark 
                            ? 'hover:bg-gray-700 text-gray-300' 
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        Profile Settings
                      </button>
                      {userRole === "borrower" && (
                        <button
                          onClick={() => navigate("/kyc")}
                          className={`w-full text-left px-4 py-2 text-sm flex items-center ${
                            isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                          } ${
                            user.kycStatus === 'verified' 
                              ? (isDark ? 'text-green-400' : 'text-green-600')
                              : user.kycStatus === 'pending' 
                              ? (isDark ? 'text-yellow-400' : 'text-yellow-600')
                              : user.kycStatus === 'rejected' 
                              ? (isDark ? 'text-red-400' : 'text-red-600')
                              : (isDark ? 'text-blue-400' : 'text-blue-600')
                          }`}
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          KYC Verification
                        </button>
                      )}
                      {userRole === "admin" && (
                        <>
                          <button
                            onClick={() => navigate("/admin")}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-semibold flex items-center"
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Admin Dashboard
                          </button>
                          <button
                            onClick={() => navigate("/admin/loans")}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Loan Moderation
                          </button>
                          <button
                            onClick={() => navigate("/admin/kyc")}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                          >
                            <User className="w-4 h-4 mr-2" />
                            KYC Management
                          </button>
                          <button
                            onClick={() => navigate("/admin/users")}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            User Management
                          </button>
                        </>
                      )}
                      <button
                        onClick={handleLogout}
                        className={`w-full text-left px-4 py-2 text-sm ${
                          isDark 
                            ? 'text-red-400 hover:bg-red-900/20' 
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                {/* Theme Toggle for non-authenticated users */}
                <ThemeToggle variant="simple" />
                <Link to="/login">
                  <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg shadow hover:bg-indigo-700 transition">
                    Login
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile Theme Toggle */}
            <ThemeToggle variant="simple" />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className={`md:hidden border-t shadow ${
          isDark 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          {navLinks
            .filter((link) => link.show && link.label !== "Admin Panel")
            .map((link) => (
              <button
                key={link.path}
                onClick={() => {
                  navigate(link.path);
                  setIsMenuOpen(false);
                }}
                className={`relative w-full px-4 py-3 text-left text-sm flex items-center ${
                  isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                } ${
                  link.className || (isDark ? "text-gray-300" : "text-gray-700")
                }`}
              >
                {link.icon}
                <span className="ml-2">{link.label}</span>
                {link.badge && (
                  <span className="ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    {link.badge > 99 ? '99+' : link.badge}
                  </span>
                )}
                {link.label === "KYC Verification" && user?.kycStatus === 'verified' && (
                  <CheckCircle className="w-4 h-4 ml-auto text-green-600" />
                )}
                {link.label === "KYC Verification" && user?.kycStatus === 'pending' && (
                  <Clock className="w-4 h-4 ml-auto text-yellow-600" />
                )}
                {link.label === "KYC Verification" && user?.kycStatus === 'rejected' && (
                  <X className="w-4 h-4 ml-auto text-red-600" />
                )}
              </button>
            ))}
          
          {/* Public Navigation Links in Mobile Menu */}
          {publicNavLinks
            .filter((link) => link.show)
            .map((link) => (
              <Link
                key={link.label}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block w-full px-4 py-3 text-left text-sm ${
                  isDark 
                    ? 'text-gray-300 hover:bg-gray-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          
          {/* Admin Panel only in profile dropdown for admin users */}
          <div className="border-t px-4 py-2">
            {user ? (
              <button
                onClick={handleLogout}
                className={`text-sm ${
                  isDark 
                    ? 'text-red-400 hover:text-red-300' 
                    : 'text-red-600 hover:text-red-700'
                }`}
              >
                Logout
              </button>
            ) : (
              <Link to="/login">
                <button className="w-full text-left text-sm text-indigo-600">
                  Login
                </button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}