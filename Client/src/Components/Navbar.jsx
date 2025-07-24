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
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import API from "../api/api";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
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
      label: "Admin Panel",
      path: "/admin/users",
      icon: <Settings className="w-4 h-4" />,
      show: user && userRole === "admin",
      className: "text-red-600 hover:text-red-700 font-semibold",
    },
  ];

  return (
    <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
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
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-100 ${
                    link.className || "text-gray-700 hover:text-indigo-600"
                  }`}
                >
                  {link.icon}
                  <span className="ml-2">{link.label}</span>
                </button>
              ))}
          </nav>

          {/* Profile & Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
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
                      <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                      <p className="text-xs text-gray-500">{userRole}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded shadow-lg border py-1 z-50">
                      <div className="px-4 py-2 border-b">
                        <p className="text-sm font-medium">{user.displayName}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        {userRole === "admin" && (
                          <p className="text-xs text-red-600 font-semibold">Admin User</p>
                        )}
                      </div>
                      <button
                        onClick={() => navigate("/profile")}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        Profile Settings
                      </button>
                      {userRole === "admin" && (
                        <button
                          onClick={() => navigate("/admin/users")}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-semibold flex items-center"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Admin Panel
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/login">
                <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg shadow hover:bg-indigo-700 transition">
                  Login
                </button>
              </Link>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-gray-500"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow">
          {navLinks
            .filter((link) => link.show && link.label !== "Admin Panel")
            .map((link) => (
              <button
                key={link.path}
                onClick={() => {
                  navigate(link.path);
                  setIsMenuOpen(false);
                }}
                className="block w-full px-4 py-3 text-left text-sm hover:bg-gray-50"
              >
                {link.icon}
                <span className="ml-2">{link.label}</span>
              </button>
            ))}
          {/* Admin Panel only in profile dropdown for admin users */}
          <div className="border-t px-4 py-2">
            {user ? (
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-700"
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
