import { useState, useEffect, useRef } from "react";
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
  const [authReady, setAuthReady] = useState(false);
  const navigate = useNavigate();
  const profileRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Close profile dropdown on outside click or Escape
  useEffect(() => {
    if (!isProfileOpen) return;
    const onDocClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [isProfileOpen]);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isMenuOpen]);

  // Fetch notifications whenever a user is present
  useEffect(() => {
    if (!user) return;
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
  }, [user]);

  // Keep Navbar in sync with Firebase auth across redirects/tab switches
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      console.log('🔄 Navbar auth state change:', fbUser ? `${fbUser.email} (verified: ${fbUser.emailVerified})` : 'No user');
      try {
        if (fbUser) {
          // Critical Security Check: Email Verification for password providers
          if (!fbUser.emailVerified && fbUser.providerData[0]?.providerId === 'password') {
            console.log('🚫 Navbar: Email not verified for:', fbUser.email, '- showing public navigation');
            // Don't set user or userRole - this will hide all authenticated features
            setUser(null);
            setUserRole("");
            setAuthReady(true);
            return;
          }

          console.log('✅ Navbar: User authenticated and verified, loading user data...');
          // Ensure API has a fresh token
          const token = await fbUser.getIdToken();
          API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          // Load current user from API
          const res = await API.get("/users/me");
          setUser({
            displayName: res.data.name,
            email: res.data.email,
            photoURL: res.data.profilePicture || fbUser.photoURL || null,
            kyc: res.data.kyc || null,
            kycStatus: res.data.kycStatus || 'not_submitted',
            emailVerified: fbUser.emailVerified
          });
          setUserRole(res.data.role);
          console.log('✅ Navbar: User data loaded, role:', res.data.role, 'photoURL:', res.data.profilePicture);
        } else {
          console.log('❌ Navbar: No authenticated user - showing public navigation');
          setUser(null);
          setUserRole("");
        }
      } catch (e) {
        console.error('❌ Navbar auth sync error:', e);
        // If API call fails (e.g., due to email verification requirement), clear user state
        if (e?.response?.status === 403 && e?.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
          console.log('🚫 API blocked due to email verification requirement - showing public navigation');
          setUser(null);
          setUserRole("");
        }
      } finally {
        setAuthReady(true);
        console.log('🏁 Navbar auth ready. User:', !!fbUser, 'Role:', userRole);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
    setUserRole("");
    navigate("/");
  };

  const navLinks = [
    {
      label: "Dashboard",
      path: "/borrower",
      icon: <User className="w-4 h-4" />,
      show: user && userRole === "borrower",
    },
    {
      label: "Dashboard",
      path: "/lender",
      icon: <TrendingUp className="w-4 h-4" />,
      show: user && userRole === "lender",
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

  // Public navigation links - only show when user is NOT authenticated and auth is ready
  const publicNavLinks = [
    {
      label: "About",
      path: "/about",
      show: authReady && !user, // Only show when no authenticated user
    },
    {
      label: "How it Works",
      path: "/how-it-works",
      show: authReady && !user, // Only show when no authenticated user
    },
    {
      label: "Contact",
      path: "/contact",
      show: authReady && !user, // Only show when no authenticated user
    },
  ];

  return (
    <header style={{ paddingTop: 'env(safe-area-inset-top)' }} className={`shadow-lg sticky top-0 z-50 theme-transition ${
      isDark 
        ? 'bg-gray-900 border-b border-gray-700' 
        : 'bg-white border-b border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer group transition-transform transform hover:scale-105"
            onClick={() => navigate("/")}
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-2 mr-3 shadow-lg group-hover:shadow-xl transition-shadow">
              <Wallet className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              BorrowEase
            </h1>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {/* Auth Loading State */}
            {!authReady && (
              <div className={`px-4 py-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Loading...
              </div>
            )}

            {/* Role-Based Navigation Links */}
            {authReady && navLinks
              .filter((link) => link.show && link.label !== "Admin Panel")
              .map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`relative flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer transform hover:scale-105 ${
                    isDark 
                      ? 'hover:bg-gray-800 active:scale-95' 
                      : 'hover:bg-gray-100 active:scale-95'
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
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full shadow-lg animate-pulse">
                      {link.badge > 99 ? '99+' : link.badge}
                    </span>
                  )}
                </button>
              ))}
            
            {/* Conditional Navigation: Public OR Authenticated, never both */}
            {authReady && !user && (
              <>
                {/* Public Navigation Links - Only for guests */}
                {publicNavLinks
                  .filter((link) => link.show)
                  .map((link) => (
                    <Link
                      key={link.label}
                      to={link.path}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer transform hover:scale-105 active:scale-95 ${
                        isDark 
                          ? 'text-gray-300 hover:text-indigo-400 hover:bg-gray-800' 
                          : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-100'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
              </>
            )}
          </nav>

          {/* Profile & Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {authReady && user ? (
              <>
                {/* Theme Toggle */}
                <ThemeToggle variant="simple" />

                <NotificationBell/>

                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className={`flex items-center space-x-3 cursor-pointer transition-all transform hover:scale-105 active:scale-95 px-2 py-1 rounded-lg ${
                      isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                    }`}
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover shadow-lg ring-2 ring-indigo-400 ring-opacity-50"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-indigo-400 ring-opacity-50">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="text-left">
                      <p className={`text-sm font-semibold ${
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      }`}>{user.displayName}</p>
                      <p className={`text-xs capitalize ${
                        isDark ? 'text-indigo-400' : 'text-indigo-600'
                      }`}>{userRole}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${
                      isProfileOpen ? 'transform rotate-180' : ''
                    } ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
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
                        className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors flex items-center space-x-2 ${
                          isDark 
                            ? 'hover:bg-gray-700 text-gray-300' 
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <Settings className="w-4 h-4" />
                        <span>Profile Settings</span>
                      </button>
                      {userRole === "borrower" && (
                        <button
                          onClick={() => navigate("/kyc")}
                          className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 cursor-pointer transition-colors ${
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
                        className={`w-full text-left px-4 py-2 text-sm cursor-pointer transition-colors flex items-center space-x-2 border-t ${
                          isDark 
                            ? 'text-red-400 hover:bg-red-900/20 border-gray-700' 
                            : 'text-red-600 hover:bg-red-50 border-gray-200'
                        }`}
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : authReady ? (
              <div className="flex items-center space-x-3">
                {/* Theme Toggle for non-authenticated users */}
                <ThemeToggle variant="simple" />
                <Link to="/login">
                  <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg shadow hover:bg-indigo-700 transition">
                    Login
                  </button>
                </Link>
              </div>
            ) : (
              // While auth is initializing, keep the area stable to avoid flicker
              <div style={{ width: 160, height: 32 }} />
            )}
          </div>

          {/* Mobile Header Actions */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile Theme Toggle */}
            <ThemeToggle variant="simple" />
            {/* Mobile Notifications Bell (only when logged in) */}
            {authReady && user && (
              <div className="mr-1">
                <NotificationBell />
              </div>
            )}
            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-lg cursor-pointer transition-all transform hover:scale-110 active:scale-95 ${
                isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'
              }`}
              aria-label="Toggle navigation menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu: overlay + slide-out panel with animations */}
      <div className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${
        isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Overlay */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
        
        {/* Slide-out panel */}
        <div
          ref={mobileMenuRef}
          className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] shadow-2xl transform transition-transform duration-300 ease-out ${
            isMenuOpen ? 'translate-x-0' : 'translate-x-full'
          } ${
            isDark 
              ? 'bg-gray-900' 
              : 'bg-white'
          }`}
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
          role="dialog"
          aria-label="Mobile navigation"
        >
          {/* Close button at top-right */}
          <div className={`flex items-center justify-between px-4 py-4 border-b ${
            isDark ? 'border-gray-800' : 'border-gray-100'
          }`}>
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-2 mr-2">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                BorrowEase
              </span>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className={`p-2 rounded-lg transition-all hover:rotate-90 ${
                isDark 
                  ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Menu content with smooth scroll */}
          <div className="overflow-y-auto h-[calc(100%-12rem)] pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
            {/* Navigation links */}
            <div className="py-2">
              {navLinks
                .filter((link) => link.show && link.label !== "Admin Panel")
                .map((link, index) => (
                  <button
                    key={link.path}
                    onClick={() => {
                      navigate(link.path);
                      setIsMenuOpen(false);
                    }}
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                    className={`relative w-full px-5 py-3.5 text-left text-sm flex items-center gap-3 cursor-pointer transition-all duration-200 animate-slideIn ${
                      isDark 
                        ? 'hover:bg-gray-800 active:bg-gray-700 text-gray-200 hover:text-white' 
                        : 'hover:bg-gray-50 active:bg-gray-100 text-gray-700 hover:text-gray-900'
                    } ${
                      link.className && 'font-semibold'
                    }`}
                  >
                    <div className={`flex-shrink-0 ${
                      link.className 
                        ? 'text-red-500' 
                        : isDark ? 'text-indigo-400' : 'text-indigo-600'
                    }`}>
                      {link.icon}
                    </div>
                    <span className="flex-1 font-medium">{link.label}</span>
                    {link.badge && (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                        {link.badge > 99 ? '99+' : link.badge}
                      </span>
                    )}
                    {link.label === "KYC Verification" && user?.kycStatus === 'verified' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {link.label === "KYC Verification" && user?.kycStatus === 'pending' && (
                      <Clock className="w-4 h-4 text-yellow-500" />
                    )}
                  </button>
                ))}

              {/* Public Navigation Links - Only for guests */}
              {authReady && !user && publicNavLinks
                .filter((link) => link.show)
                .map((link, index) => (
                  <Link
                    key={link.label}
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                    className={`block w-full px-5 py-3.5 text-left text-sm font-medium cursor-pointer transition-all duration-200 animate-slideIn ${
                      isDark 
                        ? 'text-gray-200 hover:bg-gray-800 hover:text-white' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}

              {/* KYC Verification for Borrowers */}
              {authReady && user && userRole === "borrower" && (
                <button
                  onClick={() => {
                    navigate('/kyc');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full px-5 py-3.5 text-left text-sm flex items-center gap-3 font-medium cursor-pointer transition-all duration-200 ${
                    user.kycStatus === 'verified' 
                      ? (isDark ? 'text-green-400 hover:bg-gray-800' : 'text-green-600 hover:bg-green-50')
                      : user.kycStatus === 'pending' 
                      ? (isDark ? 'text-yellow-400 hover:bg-gray-800' : 'text-yellow-600 hover:bg-yellow-50')
                      : user.kycStatus === 'rejected' 
                      ? (isDark ? 'text-red-400 hover:bg-gray-800' : 'text-red-600 hover:bg-red-50')
                      : (isDark ? 'text-blue-400 hover:bg-gray-800' : 'text-blue-600 hover:bg-blue-50')
                  }`}
                >
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">KYC Verification</span>
                  {user.kycStatus === 'verified' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {user.kycStatus === 'pending' && <Clock className="w-4 h-4 text-yellow-500" />}
                </button>
              )}

              {/* Admin Section */}
              {authReady && user && userRole === "admin" && (
                <>
                  <div className={`my-2 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`} />
                  <div className={`px-5 py-2 text-xs font-semibold tracking-wider ${
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    ADMIN PANEL
                  </div>
                  {[
                    { path: '/admin', icon: Shield, label: 'Admin Dashboard' },
                    { path: '/admin/loans', icon: CreditCard, label: 'Loan Moderation' },
                    { path: '/admin/kyc', icon: User, label: 'KYC Management' },
                    { path: '/admin/users', icon: Settings, label: 'User Management' },
                  ].map((link, index) => (
                    <button
                      key={link.path}
                      onClick={() => {
                        navigate(link.path);
                        setIsMenuOpen(false);
                      }}
                      style={{
                        animationDelay: `${index * 50}ms`
                      }}
                      className={`w-full px-5 py-3.5 text-left text-sm flex items-center gap-3 font-medium cursor-pointer transition-all duration-200 animate-slideIn ${
                        isDark 
                          ? 'text-red-400 hover:bg-red-900/20' 
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <link.icon className="w-4 h-4 flex-shrink-0" />
                      <span>{link.label}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Bottom Section - Profile & Logout */}
          <div className={`absolute bottom-0 left-0 right-0 border-t ${
            isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white'
          }`}>
            {user ? (
                <div className="p-4 space-y-2">
                  {/* User info */}
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${
                    isDark ? 'bg-gray-800' : 'bg-gray-50'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isDark ? 'bg-indigo-900' : 'bg-indigo-100'
                    }`}>
                      <User className={`w-5 h-5 ${
                        isDark ? 'text-indigo-400' : 'text-indigo-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${
                        isDark ? 'text-gray-100' : 'text-gray-900'
                      }`}>
                        {user.name || 'User'}
                      </p>
                      <p className={`text-xs truncate ${
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {user.email}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setIsMenuOpen(false);
                      }}
                      className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-all flex items-center justify-center gap-2 ${
                        isDark 
                          ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-all flex items-center justify-center gap-2 ${
                        isDark 
                          ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' 
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
            ) : (
              <div className="p-4">
                <Link to="/login" className="block" onClick={() => setIsMenuOpen(false)}>
                  <button className={`w-full px-4 py-3 text-center text-sm font-semibold rounded-lg cursor-pointer transition-all transform active:scale-95 shadow-lg hover:shadow-xl ${
                    isDark 
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white' 
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'
                  }`}>
                    Sign In / Register
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}