import { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, CreditCard, Users, TrendingUp, Shield, CheckCircle, ArrowRight, Star, MessageCircle, Zap, DollarSign, Clock, XCircle, AlertCircle } from 'lucide-react';

// Import your Firebase auth (you'll need to import these from your actual firebase config)
import { auth, provider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "../firebase";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { useTheme } from '../contexts/ThemeContext';
import { formatAuthError, showNotification } from '../utils/authUtils';
import Navbar from './Navbar';

// Toast component for notifications
const Toast = ({ message, type, onClose }) => {
  const { isDark } = useTheme();
  
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    info: <AlertCircle className="w-5 h-5 text-blue-500" />,
  };

  const getColors = (type) => {
    const colorMap = {
      success: isDark 
        ? "bg-green-900 border-green-700" 
        : "bg-green-50 border-green-200",
      error: isDark 
        ? "bg-red-900 border-red-700" 
        : "bg-red-50 border-red-200",
      info: isDark 
        ? "bg-blue-900 border-blue-700" 
        : "bg-blue-50 border-blue-200",
    };
    return colorMap[type];
  };

  return (
    <div
      className={`fixed top-4 right-4 ${getColors(type)} border rounded-lg p-4 shadow-lg z-[100] flex items-center max-w-sm`}
    >
      {icons[type]}
      <span className={`ml-3 text-sm font-medium ${
        isDark ? 'text-gray-100' : 'text-gray-900'
      }`}>{message}</span>
      <button
        onClick={onClose}
        className={`ml-auto ${
          isDark 
            ? 'text-gray-500 hover:text-gray-300' 
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function Login() {
    const { isDark } = useTheme();
    
    // Debug: Log theme changes
    console.log('Login component render - isDark:', isDark);
    
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [role, setRole] = useState("borrower");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loginMethod, setLoginMethod] = useState('google'); // 'google' or 'email'
    const [isSignUp, setIsSignUp] = useState(false); // Toggle between login and signup
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [toast, setToast] = useState(null);
    const navigate = useNavigate();

    // Toast helper function
    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    const closeToast = () => {
        setToast(null);
    };

    // Check if user is already logged in
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                // User is signed in, redirect to appropriate dashboard
                navigate('/'); // or wherever you want to redirect
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    const handleGoogleLogin = async () => {
        if (loading) return;
        setLoading(true);

        try {
            // Your original Firebase Google login logic
            const userCredential = await signInWithPopup(auth, provider);
            const token = await userCredential.user.getIdToken();
            
            // Store token in localStorage for persistence
            localStorage.setItem('token', token);
            
            API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            
            let userRole;
            let isExistingUser = false;
            
            try {
                const res = await API.get("/users/me");
                userRole = res.data.role;
                isExistingUser = true;
                console.log("Existing Google user found with role:", userRole);
            } catch (err) {
                if (err.response?.status === 404) {
                    console.log("New Google user, setting up account...");
                    await API.post("/users/setup", { role });
                    userRole = role;
                    console.log("User role saved:", userRole);
                    showToast(`Welcome! Your ${role} account has been created successfully.`, 'success');
                } else {
                    throw err;
                }
            }
            
            if (isExistingUser) {
                showToast(`Welcome back! Signing you in...`, 'success');
            }
            
            // Navigate based on saved role
            if (userRole === "borrower") navigate("/borrower");
            else if (userRole === "lender") navigate("/lender");
            else if (userRole === "admin") navigate("/admin");
            else {
                showToast("Invalid role detected. Please contact support.", 'error');
                navigate("/");
            }
            
            setIsLoggedIn(true);
            
        } catch (error) {
            console.error("Google login failed:", error);
            const errorMessage = formatAuthError(error);
            showToast(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSignUp = async (e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        
        try {
            // Validate form data
            const { email, password, confirmPassword } = formData;
            if (!email || !password || !confirmPassword) {
                showToast("Please fill in all fields", 'error');
                setLoading(false);
                return;
            }
            
            if (password !== confirmPassword) {
                showToast("Passwords do not match", 'error');
                setLoading(false);
                return;
            }
            
            if (password.length < 6) {
                showToast("Password must be at least 6 characters long", 'error');
                setLoading(false);
                return;
            }
            
            // Firebase email/password sign up
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const token = await userCredential.user.getIdToken();
            
            // Store token in localStorage for persistence
            localStorage.setItem('token', token);
            
            API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            
            // Set up user with selected role
            await API.post("/users/setup", { role });
            console.log("User created and role saved:", role);
            
            showToast(`Welcome! Your ${role} account has been created successfully.`, 'success');
            
            // Navigate based on role
            if (role === "borrower") navigate("/borrower");
            else if (role === "lender") navigate("/lender");
            else if (role === "admin") navigate("/admin");
            else {
                showToast("Invalid role detected. Please contact support.", 'error');
                navigate("/");
            }
            
            setIsLoggedIn(true);
            
        } catch (error) {
            console.error("Email signup failed:", error);
            const errorMessage = formatAuthError(error);
            showToast(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        
        try {
            // Validate form data
            const { email, password } = formData;
            if (!email || !password) {
                showToast("Please fill in all fields", 'error');
                setLoading(false);
                return;
            }
            
            // Firebase email/password sign in
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const token = await userCredential.user.getIdToken();
            
            // Store token in localStorage for persistence
            localStorage.setItem('token', token);
            
            API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            
            let userRole;
            let isExistingUser = false;
            
            try {
                const res = await API.get("/users/me");
                userRole = res.data.role;
                isExistingUser = true;
                console.log("Existing email user found with role:", userRole);
            } catch (err) {
                if (err.response?.status === 404) {
                    console.log("New email user, setting up account...");
                    await API.post("/users/setup", { role });
                    userRole = role;
                    console.log("User role saved:", userRole);
                    showToast(`Welcome! Your ${role} account has been created successfully.`, 'success');
                } else {
                    throw err;
                }
            }
            
            if (isExistingUser) {
                showToast(`Welcome back! Signing you in...`, 'success');
            }
            
            // Navigate based on saved role
            if (userRole === "borrower") navigate("/borrower");
            else if (userRole === "lender") navigate("/lender");
            else if (userRole === "admin") navigate("/admin");
            else {
                showToast("Invalid role detected. Please contact support.", 'error');
                navigate("/");
            }
            
            setIsLoggedIn(true);
            
        } catch (error) {
            console.error("Email login failed:", error);
            const errorMessage = formatAuthError(error);
            showToast(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        auth.signOut(); // Firebase sign out
        localStorage.removeItem('token'); // Clear token from localStorage
        API.defaults.headers.common["Authorization"] = ''; // Clear API headers
        setIsLoggedIn(false);
        navigate("/"); // Navigate to home page
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const features = [
        {
            icon: <TrendingUp className="w-5 h-5" />,
            title: "Lower Interest Rates",
            description: "Get loans at competitive rates"
        },
        {
            icon: <CheckCircle className="w-5 h-5" />,
            title: "Quick Approval",
            description: "Fast processing without delays"
        },
        {
            icon: <Shield className="w-5 h-5" />,
            title: "Secure Platform",
            description: "Your data is protected"
        }
    ];

    const testimonials = [
        {
            name: "Priya Sharma",
            role: "Student",
            text: "Got my loan approved in just 2 days!",
            rating: 5
        },
        {
            name: "Amit Kumar",
            role: "Graduate",
            text: "Much better rates than traditional banks.",
            rating: 5
        }
    ];

    return (
        <div className={`min-h-screen ${
            isDark 
                ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-indigo-950' 
                : 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100'
        } transition-all duration-300`}>
            {/* Toast Notification */}
            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={closeToast} />
            )}
            
            <Navbar />
            
            <div className="flex flex-col lg:flex-row min-h-screen">
                {/* Left Side - Features & Info */}
                <div className="lg:w-1/2 px-6 py-12 lg:px-12 lg:py-20">
                    <div className="max-w-lg mx-auto lg:mx-0">
                        <div className="text-center lg:text-left mb-12">
                            <h1 className={`text-4xl lg:text-5xl font-bold mb-6 transition-colors duration-300 ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                                Welcome to{' '}
                                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                    BorrowEase
                                </span>
                            </h1>
                            <p className={`text-xl mb-8 transition-colors duration-300 ${
                                isDark ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                                Connecting students with trusted lenders for better loans
                            </p>
                            
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className={`text-center p-4 backdrop-blur-sm rounded-2xl border transition-all duration-300 ${
                                    isDark 
                                        ? 'bg-gray-800/60 border-gray-700/30' 
                                        : 'bg-white/60 border-white/20'
                                }`}>
                                    <div className="text-2xl font-bold text-purple-600">10K+</div>
                                    <div className={`text-sm transition-colors duration-300 ${
                                        isDark ? 'text-gray-400' : 'text-gray-600'
                                    }`}>Students</div>
                                </div>
                                <div className={`text-center p-4 backdrop-blur-sm rounded-2xl border transition-all duration-300 ${
                                    isDark 
                                        ? 'bg-gray-800/60 border-gray-700/30' 
                                        : 'bg-white/60 border-white/20'
                                }`}>
                                    <div className="text-2xl font-bold text-blue-600">₹50Cr+</div>
                                    <div className={`text-sm transition-colors duration-300 ${
                                        isDark ? 'text-gray-400' : 'text-gray-600'
                                    }`}>Funded</div>
                                </div>
                                <div className={`text-center p-4 backdrop-blur-sm rounded-2xl border transition-all duration-300 ${
                                    isDark 
                                        ? 'bg-gray-800/60 border-gray-700/30' 
                                        : 'bg-white/60 border-white/20'
                                }`}>
                                    <div className="text-2xl font-bold text-green-600">4.9★</div>
                                    <div className={`text-sm transition-colors duration-300 ${
                                        isDark ? 'text-gray-400' : 'text-gray-600'
                                    }`}>Rating</div>
                                </div>
                            </div>
                        </div>

                        {/* Features */}
                        <div className="space-y-6 mb-12">
                            <h3 className={`text-2xl font-semibold text-center lg:text-left transition-colors duration-300 ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                                Why Choose BorrowEase?
                            </h3>
                            {features.map((feature, index) => (
                                <div key={index} className={`flex items-start space-x-4 p-4 backdrop-blur-sm rounded-2xl border transition-all duration-300 ${
                                    isDark 
                                        ? 'bg-gray-800/60 border-gray-700/30' 
                                        : 'bg-white/60 border-white/20'
                                }`}>
                                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h4 className={`font-semibold transition-colors duration-300 ${
                                            isDark ? 'text-white' : 'text-gray-900'
                                        }`}>{feature.title}</h4>
                                        <p className={`text-sm transition-colors duration-300 ${
                                            isDark ? 'text-gray-400' : 'text-gray-600'
                                        }`}>{feature.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Testimonials */}
                        <div className="hidden lg:block">
                            <h3 className={`text-xl font-semibold mb-4 transition-colors duration-300 ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>What Students Say</h3>
                            <div className="space-y-4">
                                {testimonials.map((testimonial, index) => (
                                    <div key={index} className={`p-4 backdrop-blur-sm rounded-2xl border transition-all duration-300 ${
                                        isDark 
                                            ? 'bg-gray-800/60 border-gray-700/30' 
                                            : 'bg-white/60 border-white/20'
                                    }`}>
                                        <div className="flex items-center space-x-1 mb-2">
                                            {[...Array(testimonial.rating)].map((_, i) => (
                                                <Star key={i} className="w-4 h-4 text-yellow-500 fill-current" />
                                            ))}
                                        </div>
                                        <p className={`text-sm mb-2 transition-colors duration-300 ${
                                            isDark ? 'text-gray-300' : 'text-gray-700'
                                        }`}>"{testimonial.text}"</p>
                                        <div className={`text-xs transition-colors duration-300 ${
                                            isDark ? 'text-gray-400' : 'text-gray-500'
                                        }`}>
                                            {testimonial.name} • {testimonial.role}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="lg:w-1/2 flex items-center justify-center px-6 py-12 lg:px-12">
                    <div className="w-full max-w-md">
                        <div className={`backdrop-blur-md rounded-3xl shadow-2xl p-8 border transition-all duration-300 ${
                            isDark 
                                ? 'bg-gray-900/80 border-gray-700/30' 
                                : 'bg-white/80 border-white/20'
                        }`}>
                            <div className="text-center mb-8">
                                <h2 className={`text-3xl font-bold mb-2 transition-colors duration-300 ${
                                    isDark ? 'text-white' : 'text-gray-900'
                                }`}>
                                    {isSignUp ? "Create Account" : "Welcome Back!"}
                                </h2>
                                <p className={`transition-colors duration-300 ${
                                    isDark ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                    {isSignUp ? "Join BorrowEase today" : "Sign in to your account"}
                                </p>
                            </div>

                            {/* Role Selection */}
                            <div className="mb-6">
                                <label className={`block text-sm font-medium mb-3 transition-colors duration-300 ${
                                    isDark ? 'text-gray-300' : 'text-gray-700'
                                }`}>I am a:</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setRole('borrower')}
                                        className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                                            role === 'borrower' 
                                                ? 'border-purple-500 bg-purple-50 text-purple-700' + (isDark ? ' dark:bg-purple-900/20 dark:text-purple-300' : '')
                                                : (isDark 
                                                    ? 'border-gray-600 hover:border-gray-500 text-gray-300' 
                                                    : 'border-gray-200 hover:border-gray-300 text-gray-700')
                                        }`}
                                    >
                                        <Users className="w-5 h-5 mx-auto mb-1" />
                                        <div className="text-sm font-medium">Borrower</div>
                                    </button>
                                    <button
                                        onClick={() => setRole('lender')}
                                        className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                                            role === 'lender' 
                                                ? 'border-purple-500 bg-purple-50 text-purple-700' + (isDark ? ' dark:bg-purple-900/20 dark:text-purple-300' : '')
                                                : (isDark 
                                                    ? 'border-gray-600 hover:border-gray-500 text-gray-300' 
                                                    : 'border-gray-200 hover:border-gray-300 text-gray-700')
                                        }`}
                                    >
                                        <TrendingUp className="w-5 h-5 mx-auto mb-1" />
                                        <div className="text-sm font-medium">Lender</div>
                                    </button>
                                </div>
                            </div>

                            {/* Login Method Toggle */}
                            <div className="mb-6">
                                <div className={`flex rounded-lg p-1 transition-colors duration-300 ${
                                    isDark ? 'bg-gray-800' : 'bg-gray-100'
                                }`}>
                                    <button
                                        onClick={() => setLoginMethod('google')}
                                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                                            loginMethod === 'google' 
                                                ? (isDark ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                                                : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900')
                                        }`}
                                    >
                                        Quick Login
                                    </button>
                                    <button
                                        onClick={() => setLoginMethod('email')}
                                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                                            loginMethod === 'email' 
                                                ? (isDark ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                                                : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900')
                                        }`}
                                    >
                                        Email Login
                                    </button>
                                </div>
                            </div>

                            {loginMethod === 'google' ? (
                                /* Google Login */
                                <div>
                                    <button
                                        onClick={handleGoogleLogin}
                                        disabled={loading}
                                        className={`w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium transition-all transform hover:scale-105 hover:shadow-lg ${
                                            loading ? "opacity-60 cursor-not-allowed" : ""
                                        }`}
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        ) : (
                                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                            </svg>
                                        )}
                                        {loading ? "Signing in..." : "Continue with Google"}
                                    </button>
                                </div>
                            ) : (
                                /* Email Login/Signup Form */
                                <form onSubmit={isSignUp ? handleEmailSignUp : handleEmailLogin} className="space-y-4">
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                                            isDark ? 'text-gray-300' : 'text-gray-700'
                                        }`}>Email</label>
                                        <div className="relative">
                                            <Mail className={`absolute left-3 top-3 w-5 h-5 ${
                                                isDark ? 'text-gray-500' : 'text-gray-400'
                                            }`} />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 ${
                                                    isDark 
                                                        ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' 
                                                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                                                }`}
                                                placeholder="Enter your email"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                                            isDark ? 'text-gray-300' : 'text-gray-700'
                                        }`}>Password</label>
                                        <div className="relative">
                                            <Lock className={`absolute left-3 top-3 w-5 h-5 ${
                                                isDark ? 'text-gray-500' : 'text-gray-400'
                                            }`} />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={(e) => handleInputChange('password', e.target.value)}
                                                className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 ${
                                                    isDark 
                                                        ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' 
                                                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                                                }`}
                                                placeholder={isSignUp ? "Create a password (min 6 characters)" : "Enter your password"}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className={`absolute right-3 top-3 transition-colors ${
                                                    isDark 
                                                        ? 'text-gray-500 hover:text-gray-300' 
                                                        : 'text-gray-400 hover:text-gray-600'
                                                }`}
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm Password - Only show during signup */}
                                    {isSignUp && (
                                        <div>
                                            <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                                                isDark ? 'text-gray-300' : 'text-gray-700'
                                            }`}>Confirm Password</label>
                                            <div className="relative">
                                                <Lock className={`absolute left-3 top-3 w-5 h-5 ${
                                                    isDark ? 'text-gray-500' : 'text-gray-400'
                                                }`} />
                                                <input
                                                    type="password"
                                                    value={formData.confirmPassword}
                                                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 ${
                                                        isDark 
                                                            ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' 
                                                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                                                    }`}
                                                    placeholder="Confirm your password"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Remember me and Forgot password - Only show during login */}
                                    {!isSignUp && (
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center">
                                                <input type="checkbox" className={`rounded border text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50 ${
                                                    isDark 
                                                        ? 'border-gray-600 bg-gray-800' 
                                                        : 'border-gray-300 bg-gray-100'
                                                }`} />
                                                <span className={`ml-2 text-sm transition-colors duration-300 ${
                                                    isDark ? 'text-gray-400' : 'text-gray-600'
                                                }`}>Remember me</span>
                                            </label>
                                            <a href="#" className="text-sm text-purple-600 hover:text-purple-500 transition-colors duration-300">Forgot password?</a>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium transition-all transform hover:scale-105 hover:shadow-lg ${
                                            loading ? "opacity-60 cursor-not-allowed" : ""
                                        }`}
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        ) : (
                                            <ArrowRight className="w-5 h-5 mr-2" />
                                        )}
                                        {loading 
                                            ? (isSignUp ? "Creating account..." : "Signing in...")
                                            : (isSignUp ? "Create Account" : "Sign In")
                                        }
                                    </button>
                                </form>
                            )}

                            {/* Divider */}
                            <div className="my-6 flex items-center">
                                <div className={`flex-1 border-t ${
                                    isDark ? 'border-gray-600' : 'border-gray-300'
                                }`}></div>
                                <span className={`px-4 text-sm ${
                                    isDark ? 'text-gray-400' : 'text-gray-500'
                                }`}>or</span>
                                <div className={`flex-1 border-t ${
                                    isDark ? 'border-gray-600' : 'border-gray-300'
                                }`}></div>
                            </div>

                            {/* Sign Up/Login Toggle */}
                            <div className="text-center">
                                <p className={`text-sm transition-colors duration-300 ${
                                    isDark ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                    {isSignUp ? "Already have an account?" : "Don't have an account?"}{' '}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSignUp(!isSignUp);
                                            setFormData({ email: '', password: '', confirmPassword: '' });
                                        }}
                                        className="text-purple-600 hover:text-purple-500 font-medium transition-colors duration-300"
                                    >
                                        {isSignUp ? "Sign in here" : "Sign up for free"}
                                    </button>
                                </p>
                            </div>

                            {/* Terms */}
                            <p className={`mt-6 text-xs text-center transition-colors duration-300 ${
                                isDark ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                                By signing in, you agree to our{' '}
                                <a href="/terms" className="text-purple-600 hover:underline">
                                    Terms of Service
                                </a>{' '}
                                and{' '}
                                <a href="/privacy" className="text-purple-600 hover:underline">
                                    Privacy Policy
                                </a>
                                .
                            </p>
                        </div>

                        {/* Trust Indicators */}
                        <div className="mt-8 text-center">
                            <div className={`flex items-center justify-center space-x-6 text-sm transition-colors duration-300 ${
                                isDark ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                                <div className="flex items-center">
                                    <Shield className="w-4 h-4 mr-1" />
                                    <span>SSL Secured</span>
                                </div>
                                <div className="flex items-center">
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    <span>RBI Approved</span>
                                </div>
                                <div className="flex items-center">
                                    <Users className="w-4 h-4 mr-1" />
                                    <span>10K+ Users</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Support Chat Button */}
            <div className="fixed bottom-6 right-6 z-50">
                <button className="w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-110">
                    <MessageCircle className="w-6 h-6" />
                </button>
            </div>

            {/* About Section */}
            {/* <section id="about" className={`py-20 px-4 ${
                isDark 
                    ? 'bg-gray-800' 
                    : 'bg-gray-50'
            }`}>
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className={`text-4xl font-bold mb-6 ${
                            isDark ? 'text-white' : 'text-gray-900'
                        }`}>About BorrowEase</h2>
                        <p className={`text-xl max-w-3xl mx-auto ${
                            isDark ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                            We're revolutionizing education financing by directly connecting students with verified lenders, 
                            offering better rates and faster approvals than traditional banks.
                        </p>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className={`p-8 rounded-2xl ${
                            isDark ? 'bg-gray-900' : 'bg-white'
                        } shadow-lg`}>
                            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            <h3 className={`text-xl font-semibold mb-3 ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>Secure & Trusted</h3>
                            <p className={`${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                All lenders are verified and transactions are secured with bank-level encryption.
                            </p>
                        </div>
                        
                        <div className={`p-8 rounded-2xl ${
                            isDark ? 'bg-gray-900' : 'bg-white'
                        } shadow-lg`}>
                            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                                <Zap className="w-6 h-6 text-white" />
                            </div>
                            <h3 className={`text-xl font-semibold mb-3 ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>Fast Processing</h3>
                            <p className={`${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                Get loan approvals in 24-48 hours with our streamlined AI-powered process.
                            </p>
                        </div>
                        
                        <div className={`p-8 rounded-2xl ${
                            isDark ? 'bg-gray-900' : 'bg-white'
                        } shadow-lg`}>
                            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            <h3 className={`text-xl font-semibold mb-3 ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>Better Rates</h3>
                            <p className={`${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                Competitive interest rates with flexible repayment options tailored for students.
                            </p>
                        </div>
                    </div>
                </div>
            </section> */}

            {/* How it Works Section */}
            {/* <section id="how-it-works" className="py-20 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className={`text-4xl font-bold mb-6 ${
                            isDark ? 'text-white' : 'text-gray-900'
                        }`}>How It Works</h2>
                        <p className={`text-xl max-w-3xl mx-auto ${
                            isDark ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                            Getting a loan through BorrowEase is simple and straightforward
                        </p>
                    </div>
                    
                    <div className="grid md:grid-cols-4 gap-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-white">1</span>
                            </div>
                            <h3 className={`text-lg font-semibold mb-3 ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>Sign Up</h3>
                            <p className={`${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                Create your account and complete KYC verification
                            </p>
                        </div>
                        
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-white">2</span>
                            </div>
                            <h3 className={`text-lg font-semibold mb-3 ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>Apply</h3>
                            <p className={`${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                Submit your loan application with required documents
                            </p>
                        </div>
                        
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-white">3</span>
                            </div>
                            <h3 className={`text-lg font-semibold mb-3 ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>Get Matched</h3>
                            <p className={`${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                Our AI matches you with the best lenders
                            </p>
                        </div>
                        
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-white">4</span>
                            </div>
                            <h3 className={`text-lg font-semibold mb-3 ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>Get Funded</h3>
                            <p className={`${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                Receive funds directly in your bank account
                            </p>
                        </div>
                    </div>
                </div>
            </section> */}

            {/* Contact Section */}
            {/* <section id="contact" className={`py-20 px-4 ${
                isDark 
                    ? 'bg-gray-800' 
                    : 'bg-gray-50'
            }`}>
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className={`text-4xl font-bold mb-6 ${
                            isDark ? 'text-white' : 'text-gray-900'
                        }`}>Contact Us</h2>
                        <p className={`text-xl ${
                            isDark ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                            Have questions? We're here to help you succeed.
                        </p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className={`p-8 rounded-2xl ${
                            isDark ? 'bg-gray-900' : 'bg-white'
                        } shadow-lg`}>
                            <h3 className={`text-xl font-semibold mb-6 ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>Get in Touch</h3>
                            
                            <div className="space-y-4">
                                <div className="flex items-center">
                                    <Mail className={`w-5 h-5 mr-3 ${
                                        isDark ? 'text-purple-400' : 'text-purple-600'
                                    }`} />
                                    <span className={`${
                                        isDark ? 'text-gray-300' : 'text-gray-700'
                                    }`}>support@borrowease.com</span>
                                </div>
                                
                                <div className="flex items-center">
                                    <MessageCircle className={`w-5 h-5 mr-3 ${
                                        isDark ? 'text-purple-400' : 'text-purple-600'
                                    }`} />
                                    <span className={`${
                                        isDark ? 'text-gray-300' : 'text-gray-700'
                                    }`}>Live Chat Available 24/7</span>
                                </div>
                                
                                <div className="flex items-center">
                                    <Clock className={`w-5 h-5 mr-3 ${
                                        isDark ? 'text-purple-400' : 'text-purple-600'
                                    }`} />
                                    <span className={`${
                                        isDark ? 'text-gray-300' : 'text-gray-700'
                                    }`}>Response within 2 hours</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className={`p-8 rounded-2xl ${
                            isDark ? 'bg-gray-900' : 'bg-white'
                        } shadow-lg`}>
                            <h3 className={`text-xl font-semibold mb-6 ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>Quick Message</h3>
                            
                            <form className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Your Name"
                                    className={`w-full p-3 rounded-lg border transition-colors ${
                                        isDark 
                                            ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                    } focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                                />
                                <input
                                    type="email"
                                    placeholder="Your Email"
                                    className={`w-full p-3 rounded-lg border transition-colors ${
                                        isDark 
                                            ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                    } focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                                />
                                <textarea
                                    rows="4"
                                    placeholder="Your Message"
                                    className={`w-full p-3 rounded-lg border transition-colors ${
                                        isDark 
                                            ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                    } focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                                ></textarea>
                                <button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                                >
                                    Send Message
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section> */}
        </div>
    );
}