// Enhanced Login component with industrial-level implementation
import { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, CreditCard, Users, TrendingUp, Shield, CheckCircle, ArrowRight, Star, MessageCircle, Zap, DollarSign, Clock } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../Components/NotificationSystem';
import { auth, provider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, getIdToken, sendEmailVerification, sendPasswordResetEmail } from '../firebase';
import API from '../api/api';
import Navbar from './Navbar';

export default function Login() {
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const { showSuccess, showError, showInfo, showWarning } = useNotifications();
    
    // Component state
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [role, setRole] = useState("borrower");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loginMethod, setLoginMethod] = useState('google');
    const [isSignUp, setIsSignUp] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [awaitingVerification, setAwaitingVerification] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [authInitialized, setAuthInitialized] = useState(false);

    // Test API connectivity
    const testAPIConnection = async () => {
        try {
            console.log('🔍 Testing API connection...');
            const response = await fetch(`${API.defaults.baseURL}/users/test-connection`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            console.log('✅ API test response:', response.status);
            if (response.ok) {
                showInfo('Server connection successful');
            } else {
                showError('Server connection failed');
            }
        } catch (error) {
            console.error('❌ API test failed:', error);
            showError('Cannot connect to server. Please check if the server is running.');
        }
    };

    // Initialize authentication
    useEffect(() => {
        const initAuth = async () => {
            try {
                // Set up auth state listener
                const unsubscribe = auth.onAuthStateChanged((user) => {
                    console.log('Auth state changed:', user ? user.email : 'No user');
                    if (user && !isLoggedIn) {
                        // User is signed in, check if they should be redirected
                        handleAuthStateChange(user);
                    } else if (!user && isLoggedIn) {
                        // User signed out
                        setIsLoggedIn(false);
                    }
                });

                setAuthInitialized(true);
                
                return unsubscribe;
            } catch (error) {
                console.error('Failed to initialize authentication:', error);
                showError('Failed to initialize authentication system');
            }
        };

        initAuth();
    }, []);

    // Handle auth state changes
    const handleAuthStateChange = async (user) => {
        if (!user) return;

        try {
            // Set up API with current user token
            const token = await getIdToken(user, true);
            API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            
            const userData = await API.get("/users/me");
            const userRole = userData.data.role;
            
            console.log('User authenticated with role:', userRole);
            setIsLoggedIn(true);
            
            // Navigate based on role
            if (userRole === "borrower") navigate("/borrower");
            else if (userRole === "lender") navigate("/lender"); 
            else if (userRole === "admin") navigate("/admin");
            else navigate("/");
            
        } catch (error) {
            console.error('Error handling auth state change:', error);
            // If user data fetch fails, they might need to complete setup
            if (error.response?.status === 404) {
                showInfo('Please complete your account setup');
            }
        }
    };

    // Enhanced Google login
    const handleGoogleLogin = async () => {
        if (loading || !authInitialized) return;
        setLoading(true);

        try {
            showInfo('Signing in with Google...');
            
            // Configure Google provider
            provider.setCustomParameters({
                prompt: 'select_account',
                hd: null // Allow any domain
            });

            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            console.log('✅ Google sign-in successful:', user.email);

            // Get fresh token
            const token = await getIdToken(user, true);
            
            // Set up API headers
            API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            localStorage.setItem('token', token);

            // Check if user exists or create new user
            let userRole;
            let isExistingUser = false;
            
            try {
                const userData = await API.get("/users/me");
                userRole = userData.data.role;
                isExistingUser = true;
                console.log("Existing Google user found with role:", userRole);
            } catch (err) {
                if (err.response?.status === 404) {
                    console.log("New Google user, setting up account...");
                    await API.post("/users/setup", { role });
                    userRole = role;
                    console.log("User role saved:", userRole);
                    showSuccess(`Welcome! Your ${role} account has been created successfully.`);
                } else {
                    throw err;
                }
            }
            
            if (isExistingUser) {
                showSuccess(`Welcome back! Signing you in...`);
            }
            
            // Navigate based on saved role
            if (userRole === "borrower") navigate("/borrower");
            else if (userRole === "lender") navigate("/lender");
            else if (userRole === "admin") navigate("/admin");
            else {
                showError("Invalid role detected. Please contact support.");
                navigate("/");
            }
            
            setIsLoggedIn(true);
            
        } catch (error) {
            console.error("Google login failed:", error);
            
            let errorMessage = "Google sign-in failed. Please try again.";
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = "Sign-in was cancelled.";
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = "Popup was blocked. Please allow popups and try again.";
            }
            
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Industry-standard email signup with verification
    const handleEmailSignUp = async (e) => {
        e.preventDefault();
        if (loading || !authInitialized) return;
        setLoading(true);
        
        try {
            const { email, password, confirmPassword } = formData;
            
            if (!email || !password || !confirmPassword) {
                showError('Please fill in all fields');
                setLoading(false);
                return;
            }
            
            // Validate passwords match
            if (password !== confirmPassword) {
                showError("Passwords do not match");
                setLoading(false);
                return;
            }
            
            // Industry-standard password validation
            if (password.length < 8) {
                showError("Password must be at least 8 characters long");
                setLoading(false);
                return;
            }
            
            if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
                showError("Password must contain at least one uppercase letter, one lowercase letter, and one number");
                setLoading(false);
                return;
            }
            
            showInfo('Creating your account...');
            
            // Step 1: Create Firebase account
            const result = await createUserWithEmailAndPassword(auth, email, password);
            
            // Step 2: Send verification email (Industry Standard)
            await sendEmailVerification(result.user, {
                url: `${window.location.origin}/login?verified=true`,
                handleCodeInApp: false
            });
            
            // Step 3: Create unverified user in database
            const token = await getIdToken(result.user, true);
            API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            
            await API.post("/users/setup", { 
                role,
                verified: false, // Mark as unverified initially
                email: result.user.email,
                uid: result.user.uid
            });
            
            // Step 4: Show verification UI
            setVerificationEmail(email);
            setAwaitingVerification(true);
            setIsSignUp(false); // Hide signup form
            
            showSuccess('Account created! Please check your email to verify your account before logging in.');
            
        } catch (error) {
            console.error('Email signup failed:', error);
            
            let errorMessage = 'Account creation failed. Please try again.';
            
            // Handle specific Firebase errors
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'An account with this email already exists. Please sign in instead.';
                setTimeout(() => setIsSignUp(false), 2000);
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Please enter a valid email address.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. Please choose a stronger password.';
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMessage = 'Email/password accounts are not enabled. Please contact support.';
            }
            
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Industry-standard email login with verification check
    const handleEmailLogin = async (e) => {
        e.preventDefault();
        if (loading || !authInitialized) return;
        setLoading(true);
        
        try {
            const { email, password } = formData;
            
            console.log('🔐 Starting email login process for:', email);
            
            if (!email || !password) {
                showError('Please enter both email and password');
                setLoading(false);
                return;
            }
            
            showInfo('Signing you in...');
            
            // Step 1: Firebase authentication
            console.log('🔥 Step 1: Attempting Firebase authentication...');
            const result = await signInWithEmailAndPassword(auth, email, password);
            console.log('✅ Firebase authentication successful for:', result.user.email);
            
            // Step 2: Check email verification status (Industry Standard)
            console.log('📧 Step 2: Checking email verification status...');
            if (!result.user.emailVerified) {
                console.log('❌ Email not verified, signing out user');
                // Sign out the user immediately
                await auth.signOut();
                
                setVerificationEmail(email);
                setAwaitingVerification(true);
                
                showWarning('Please verify your email to continue', {
                    title: 'Email Verification Required',
                    duration: 8000
                });
                
                setLoading(false);
                return;
            }
            console.log('✅ Email is verified');
            
            // Step 3: Get token and set up API
            console.log('🎫 Step 3: Getting Firebase token...');
            const token = await getIdToken(result.user, true);
            localStorage.setItem('token', token);
            API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            console.log('✅ Token obtained and API headers set');
            
            // Step 4: Check if user exists in database with verified status
            console.log('👤 Step 4: Checking user in database...');
            try {
                console.log('🔍 Making API call to /users/me...');
                const userData = await API.get("/users/me");
                console.log('✅ User found in database:', userData.data);
                
                // Update verification status in database if needed
                if (!userData.data.verified) {
                    console.log('📝 Updating verification status in database...');
                    await API.patch("/users/verify", { verified: true });
                    console.log('✅ Verification status updated');
                }
                
                showSuccess('Successfully signed in!');
                
                // Navigate based on role
                const userRole = userData.data.role;
                console.log('🚀 Navigating to role:', userRole);
                if (userRole === "borrower") navigate("/borrower");
                else if (userRole === "lender") navigate("/lender");
                else if (userRole === "admin") navigate("/admin");
                else navigate("/");
                
                setIsLoggedIn(true);
                
            } catch (apiError) {
                console.error('❌ API Error:', apiError);
                
                if (apiError.response?.status === 404) {
                    console.log('👤 User not found in database - redirecting to setup');
                    // User not found in database - redirect to setup
                    showInfo('Please complete your account setup');
                    navigate('/setup', { 
                        state: { 
                            email: result.user.email,
                            name: result.user.displayName || '',
                            uid: result.user.uid,
                            verified: true
                        }
                    });
                } else {
                    console.error('🚨 Unexpected API error:', apiError.response?.data || apiError.message);
                    throw apiError;
                }
            }
            
        } catch (error) {
            console.error('Email login failed:', error);
            
            let errorMessage = 'Sign-in failed. Please check your credentials.';
            
            // Handle specific Firebase errors
            if (error.code === 'auth/invalid-email') {
                errorMessage = 'Please enter a valid email address.';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email. Please sign up first or try signing in with Google.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password. Please try again or reset your password.';
            } else if (error.code === 'auth/invalid-credential') {
                errorMessage = 'Invalid credentials. This email might be registered with Google - try "Quick Login" with Google instead.';
                // Auto-suggest Google login
                setTimeout(() => {
                    setLoginMethod('google');
                    showInfo('Try signing in with Google instead');
                }, 2000);
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Please try again later or reset your password.';
            }
            
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };
    //             errorMessage = 'Please enter a valid email address.';
    //         } else if (error.code === 'auth/user-not-found') {
    //             errorMessage = 'No account found with this email. Please sign up first.';
    //         } else if (error.code === 'auth/wrong-password') {
    //             errorMessage = 'Incorrect password. Please try again.';
    //         } else if (error.code === 'auth/invalid-credential') {
    //             errorMessage = 'Invalid email or password. This email might be registered with Google - try "Continue with Google".';
    //         } else if (error.code === 'auth/too-many-requests') {
    //             errorMessage = 'Too many failed attempts. Please try again later.';
    //         }
            
    //         showError(errorMessage);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    // Industry-standard forgot password flow
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (loading) return;
        
        const email = formData.email;
        if (!email) {
            showError('Please enter your email address');
            return;
        }
        
        setLoading(true);
        
        try {
            await sendPasswordResetEmail(auth, email, {
                url: `${window.location.origin}/login`,
                handleCodeInApp: false
            });
            
            showSuccess('Password reset email sent! Check your inbox and follow the instructions.');
            setShowForgotPassword(false);
            
        } catch (error) {
            console.error('Password reset failed:', error);
            
            let errorMessage = 'Failed to send password reset email. Please try again.';
            
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email address.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Please enter a valid email address.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many requests. Please wait before trying again.';
            }
            
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Resend verification email
    const handleResendVerification = async () => {
        if (loading || !verificationEmail) return;
        setLoading(true);
        
        try {
            // Sign in temporarily to resend verification
            const result = await signInWithEmailAndPassword(auth, verificationEmail, formData.password);
            
            await sendEmailVerification(result.user, {
                url: `${window.location.origin}/login?verified=true`,
                handleCodeInApp: false
            });
            
            // Sign out immediately
            await auth.signOut();
            
            showSuccess('Verification email sent! Please check your inbox.');
            
        } catch (error) {
            console.error('Resend verification failed:', error);
            showError('Failed to resend verification email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Check if user clicked verification link
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('verified') === 'true') {
            showInfo('Email verified! You can now sign in with your credentials.');
            setAwaitingVerification(false);
        }
    }, []);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Toggle password visibility
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Toggle between login and signup
    const toggleAuthMode = () => {
        setIsSignUp(!isSignUp);
        setFormData({ email: '', password: '', confirmPassword: '' });
    };

    // Show loading state while auth is initializing
    if (!authInitialized) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${
                isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
            }`}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                    <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        Initializing authentication...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${
            isDark 
                ? 'bg-gray-900 text-gray-100' 
                : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900'
        }`}>
            <Navbar />
            
            <div className="min-h-screen flex">
                {/* Left side - Branding and features */}
                <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
                    <div className={`absolute inset-0 ${
                        isDark 
                            ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-black' 
                            : 'bg-gradient-to-br from-blue-600 via-purple-700 to-indigo-800'
                    }`}>
                        <div className="absolute inset-0 bg-black/20"></div>
                    </div>
                    
                    <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16 xl:px-20 text-white">
                        <div className="mb-12">
                            <div className="flex items-center mb-6">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                    <CreditCard className="w-6 h-6 text-white" />
                                </div>
                                <h1 className="text-3xl font-bold ml-4">BorrowEase</h1>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-6 mb-8">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-cyan-400">10K+</div>
                                    <div className="text-sm opacity-90">Students</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-green-400">₹50Cr+</div>
                                    <div className="text-sm opacity-90">Funded</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-yellow-400">4.9★</div>
                                    <div className="text-sm opacity-90">Rating</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <h2 className="text-4xl font-bold leading-tight">
                                Why Choose BorrowEase?
                            </h2>
                            
                            <div className="space-y-6">
                                <div className="flex items-start space-x-4">
                                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Zap className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">Lower Interest Rates</h3>
                                        <p className="text-white/80">Get loans at competitive rates with our AI-powered matching</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start space-x-4">
                                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <CheckCircle className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">Quick Approval</h3>
                                        <p className="text-white/80">Fast processing without delays</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start space-x-4">
                                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Shield className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">Secure Platform</h3>
                                        <p className="text-white/80">Your data is protected with enterprise-grade security</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                                <h3 className="font-semibold text-lg mb-4">What Students Say</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <div className="flex text-yellow-400">
                                            {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                                        </div>
                                    </div>
                                    <blockquote className="text-white/90">
                                        "Got my loan approved in just 2 days!"
                                    </blockquote>
                                    <div className="text-sm text-white/70">Priya Sharma • Student</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side - Login form */}
                <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center px-6 py-12">
                    <div className="w-full max-w-md">
                        <div className="text-center mb-8">
                            <h2 className={`text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                {isSignUp ? 'Create Account' : 'Welcome Back'}
                            </h2>
                            <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {isSignUp ? 'Join thousands of students getting easy loans' : 'Sign in to your account'}
                            </p>
                        </div>

                        {/* Role Selection */}
                        <div className="mb-6">
                            <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                I am a:
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole("borrower")}
                                    className={`p-3 rounded-lg border-2 flex items-center justify-center space-x-2 transition-all ${
                                        role === "borrower"
                                            ? isDark 
                                                ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                                                : 'border-blue-500 bg-blue-50 text-blue-700'
                                            : isDark
                                                ? 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                                    }`}
                                >
                                    <Users className="w-4 h-4" />
                                    <span className="font-medium">Borrower</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole("lender")}
                                    className={`p-3 rounded-lg border-2 flex items-center justify-center space-x-2 transition-all ${
                                        role === "lender"
                                            ? isDark 
                                                ? 'border-green-500 bg-green-500/20 text-green-300'
                                                : 'border-green-500 bg-green-50 text-green-700'
                                            : isDark
                                                ? 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                                    }`}
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="font-medium">Lender</span>
                                </button>
                            </div>
                        </div>

                        {/* Authentication Method Toggle */}
                        <div className="mb-6">
                            <div className="flex space-x-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setLoginMethod('google')}
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                                        loginMethod === 'google'
                                            ? isDark 
                                                ? 'bg-gray-700 text-gray-100'
                                                : 'bg-white text-gray-900 shadow-sm'
                                            : isDark
                                                ? 'text-gray-400 hover:text-gray-300'
                                                : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    Quick Login
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLoginMethod('email')}
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                                        loginMethod === 'email'
                                            ? isDark 
                                                ? 'bg-gray-700 text-gray-100'
                                                : 'bg-white text-gray-900 shadow-sm'
                                            : isDark
                                                ? 'text-gray-400 hover:text-gray-300'
                                                : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    Email Login
                                </button>
                            </div>
                        </div>

                        {/* Google Login */}
                        {loginMethod === 'google' && (
                            <div className="space-y-4">
                                <button
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                    className={`w-full flex items-center justify-center px-4 py-3 border rounded-lg font-medium transition-all ${
                                        isDark
                                            ? 'border-gray-600 bg-gray-800 text-gray-100 hover:bg-gray-700'
                                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {loading ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mr-3" />
                                    ) : (
                                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                        </svg>
                                    )}
                                    Continue with Google
                                </button>

                                <div className="text-center">
                                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Don't have an account?{' '}
                                        <button
                                            onClick={toggleAuthMode}
                                            className="text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            Sign up for free
                                        </button>
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Email Verification Required */}
                        {awaitingVerification && (
                            <div className={`p-6 rounded-lg border-2 border-dashed ${
                                isDark ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-200' : 'border-yellow-500/50 bg-yellow-50 text-yellow-800'
                            }`}>
                                <div className="text-center space-y-4">
                                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                                        isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'
                                    }`}>
                                        <Mail className="w-8 h-8 text-yellow-500" />
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2">Verify Your Email</h3>
                                        <p className="text-sm opacity-90 mb-4">
                                            We've sent a verification link to <br/>
                                            <span className="font-medium">{verificationEmail}</span>
                                        </p>
                                        <p className="text-xs opacity-75">
                                            Please check your inbox and click the verification link to activate your account.
                                        </p>
                                    </div>
                                    
                                    <div className="flex flex-col space-y-2">
                                        <button
                                            onClick={handleResendVerification}
                                            disabled={loading}
                                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                                isDark 
                                                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white disabled:bg-yellow-800' 
                                                    : 'bg-yellow-600 hover:bg-yellow-700 text-white disabled:bg-yellow-300'
                                            }`}
                                        >
                                            {loading ? 'Sending...' : 'Resend Verification Email'}
                                        </button>
                                        
                                        <button
                                            onClick={() => {
                                                setAwaitingVerification(false);
                                                setVerificationEmail('');
                                            }}
                                            className={`text-sm ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
                                        >
                                            Back to Login
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Forgot Password Form */}
                        {showForgotPassword && (
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                <div className="text-center mb-6">
                                    <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        Reset Password
                                    </h3>
                                    <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Enter your email address and we'll send you a password reset link.
                                    </p>
                                </div>
                                
                                <div>
                                    <label htmlFor="reset-email" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                                        <input
                                            id="reset-email"
                                            name="email"
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                                isDark 
                                                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                            }`}
                                            placeholder="Enter your email"
                                        />
                                    </div>
                                </div>

                                <div className="flex space-x-3">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {loading ? 'Sending...' : 'Send Reset Link'}
                                    </button>
                                    
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowForgotPassword(false);
                                            setFormData(prev => ({ ...prev, email: '' }));
                                        }}
                                        className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                                            isDark 
                                                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                        }`}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Email Login/Signup Form */}
                        {loginMethod === 'email' && !awaitingVerification && !showForgotPassword && (
                            <form onSubmit={isSignUp ? handleEmailSignUp : handleEmailLogin} className="space-y-4">
                                <div>
                                    <label htmlFor="email" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Email
                                    </label>
                                    <div className="relative">
                                        <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                                isDark
                                                    ? 'border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-400'
                                                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                                            }`}
                                            placeholder="bt21cse020@nituk.ac.in"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="password" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                                isDark
                                                    ? 'border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-400'
                                                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                                            }`}
                                            placeholder="Enter your password"
                                        />
                                        <button
                                            type="button"
                                            onClick={togglePasswordVisibility}
                                            className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {isSignUp && (
                                    <div>
                                        <label htmlFor="confirmPassword" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                                            <input
                                                id="confirmPassword"
                                                name="confirmPassword"
                                                type={showPassword ? "text" : "password"}
                                                required
                                                value={formData.confirmPassword}
                                                onChange={handleInputChange}
                                                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                                    isDark
                                                        ? 'border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-400'
                                                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                                                }`}
                                                placeholder="Confirm your password"
                                            />
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all ${
                                        loading ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                >
                                    {loading ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                                    ) : (
                                        <ArrowRight className="w-5 h-5 mr-2" />
                                    )}
                                    {isSignUp ? 'Create Account' : 'Sign In'}
                                </button>

                                {/* Test API Connection Button */}
                                <button
                                    type="button"
                                    onClick={testAPIConnection}
                                    className="w-full py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                    🔍 Test Server Connection
                                </button>

                                <div className="text-center">
                                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                                        <button
                                            type="button"
                                            onClick={toggleAuthMode}
                                            className="text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            {isSignUp ? 'Sign in' : 'Sign up for free'}
                                        </button>
                                    </span>
                                </div>

                                {!isSignUp && (
                                    <div className="text-center">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowForgotPassword(true);
                                                setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
                                            }}
                                            className="text-sm text-blue-600 hover:text-blue-700"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                )}
                            </form>
                        )}

                        {/* Terms and conditions */}
                        <div className="mt-6 text-center">
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                By signing in, you agree to our{' '}
                                <a href="#" className="text-blue-600 hover:text-blue-700">Terms of Service</a>
                                {' '}and{' '}
                                <a href="#" className="text-blue-600 hover:text-blue-700">Privacy Policy</a>
                            </p>
                        </div>

                        {/* Trust indicators */}
                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center">
                                    <Shield className="w-4 h-4 mr-1" />
                                    SSL Secured
                                </div>
                                <div className="flex items-center">
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    RBI Approved
                                </div>
                                <div className="flex items-center">
                                    <Users className="w-4 h-4 mr-1" />
                                    10K+ Users
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
