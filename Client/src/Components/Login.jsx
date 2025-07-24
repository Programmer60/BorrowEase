import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, CreditCard, Users, TrendingUp, Shield, CheckCircle, ArrowRight, Star, MessageCircle } from 'lucide-react';

// Import your Firebase auth (you'll need to import these from your actual firebase config)
import { auth, provider, signInWithPopup } from "../firebase";
import { useNavigate } from "react-router-dom";
import API from "../api/api";

export default function Login() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [role, setRole] = useState("borrower");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loginMethod, setLoginMethod] = useState('google'); // 'google' or 'email'
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const navigate = useNavigate(); // Uncomment when using with React Router

    const handleGoogleLogin = async () => {
        if (loading) return;
        setLoading(true);

        try {
            // Your original Firebase Google login logic
            const userCredential = await signInWithPopup(auth, provider);
            const token = await userCredential.user.getIdToken();
            
            API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            
            let userRole;
            try {
                const res = await API.get("/users/me");
                userRole = res.data.role;
            } catch (err) {
                if (err.response?.status === 404) {
                    await API.post("/users/setup", { role });
                    userRole = role;
                    console.log("User role saved:", userRole);
                } else {
                    throw err;
                }
            }
            
            // Navigate based on saved role
            if (userRole === "borrower") navigate("/borrower");
            else if (userRole === "lender") navigate("/lender");
            else {
                alert("Invalid role detected.");
                navigate("/");
            }
            
            setIsLoggedIn(true);
            
            
        } catch (error) {
            console.error("Login failed:", error);
            alert("Login failed. Please try again.");
            setLoading(false);
        }
    };

    const handleEmailLogin = async () => {
        if (loading) return;
        setLoading(true);
        
        try {
            // Add your email login logic here
            // This could be Firebase email/password or your custom auth
            const { email, password } = formData;
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const token = await userCredential.user.getIdToken();
            API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            let userRole;
            try {
                const res = await API.get("/users/me");
                userRole = res.data.role;
            } catch (err) {
                if (err.response?.status === 404) {
                    await API.post("/users/setup", { role });
                    userRole = role;
                    console.log("User role saved:", userRole);
                } else {
                    throw err;
                }
            }
            
            
        } catch (error) {
            console.error("Email login failed:", error);
            alert("Login failed. Please try again.");
            setLoading(false);
        }
    };

    const handleLogout = () => {
        auth.signOut(); // Uncomment when using Firebase
        setIsLoggedIn(false);
        navigate("/"); // Uncomment when using React Router
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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
            {/* Navigation */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                                <CreditCard className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                BorrowEase
                            </span>
                        </div>
                        <div className="hidden md:flex items-center space-x-6">
                            <a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">About</a>
                            <a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">How it Works</a>
                            <a href="#" className="text-gray-600 hover:text-purple-600 transition-colors">Contact</a>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="flex flex-col lg:flex-row min-h-screen">
                {/* Left Side - Features & Info */}
                <div className="lg:w-1/2 px-6 py-12 lg:px-12 lg:py-20">
                    <div className="max-w-lg mx-auto lg:mx-0">
                        <div className="text-center lg:text-left mb-12">
                            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                                Welcome to{' '}
                                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                    BorrowEase
                                </span>
                            </h1>
                            <p className="text-xl text-gray-600 mb-8">
                                Connecting students with trusted lenders for better  loans
                            </p>
                            
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-2xl">
                                    <div className="text-2xl font-bold text-purple-600">10K+</div>
                                    <div className="text-sm text-gray-600">Students</div>
                                </div>
                                <div className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-2xl">
                                    <div className="text-2xl font-bold text-blue-600">₹50Cr+</div>
                                    <div className="text-sm text-gray-600">Funded</div>
                                </div>
                                <div className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-2xl">
                                    <div className="text-2xl font-bold text-green-600">4.9★</div>
                                    <div className="text-sm text-gray-600">Rating</div>
                                </div>
                            </div>
                        </div>

                        {/* Features */}
                        <div className="space-y-6 mb-12">
                            <h3 className="text-2xl font-semibold text-gray-900 text-center lg:text-left">
                                Why Choose BorrowEase?
                            </h3>
                            {features.map((feature, index) => (
                                <div key={index} className="flex items-start space-x-4 p-4 bg-white/60 backdrop-blur-sm rounded-2xl">
                                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                                        <p className="text-gray-600 text-sm">{feature.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Testimonials */}
                        <div className="hidden lg:block">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">What Students Say</h3>
                            <div className="space-y-4">
                                {testimonials.map((testimonial, index) => (
                                    <div key={index} className="p-4 bg-white/60 backdrop-blur-sm rounded-2xl">
                                        <div className="flex items-center space-x-1 mb-2">
                                            {[...Array(testimonial.rating)].map((_, i) => (
                                                <Star key={i} className="w-4 h-4 text-yellow-500 fill-current" />
                                            ))}
                                        </div>
                                        <p className="text-gray-700 text-sm mb-2">"{testimonial.text}"</p>
                                        <div className="text-xs text-gray-500">
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
                        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
                                <p className="text-gray-600">Sign in to your account</p>
                            </div>

                            {/* Role Selection */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-3">I am a:</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setRole('borrower')}
                                        className={`p-3 rounded-xl border-2 transition-all ${
                                            role === 'borrower' 
                                                ? 'border-purple-500 bg-purple-50 text-purple-700' 
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <Users className="w-5 h-5 mx-auto mb-1" />
                                        <div className="text-sm font-medium">Borrower</div>
                                    </button>
                                    <button
                                        onClick={() => setRole('lender')}
                                        className={`p-3 rounded-xl border-2 transition-all ${
                                            role === 'lender' 
                                                ? 'border-purple-500 bg-purple-50 text-purple-700' 
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <TrendingUp className="w-5 h-5 mx-auto mb-1" />
                                        <div className="text-sm font-medium">Lender</div>
                                    </button>
                                </div>
                            </div>

                            {/* Login Method Toggle */}
                            <div className="mb-6">
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button
                                        onClick={() => setLoginMethod('google')}
                                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                                            loginMethod === 'google' 
                                                ? 'bg-white text-gray-900 shadow-sm' 
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        Quick Login
                                    </button>
                                    <button
                                        onClick={() => setLoginMethod('email')}
                                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                                            loginMethod === 'email' 
                                                ? 'bg-white text-gray-900 shadow-sm' 
                                                : 'text-gray-600 hover:text-gray-900'
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
                                /* Email Login Form */
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                placeholder="Enter your email"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={(e) => handleInputChange('password', e.target.value)}
                                                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                placeholder="Enter your password"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center">
                                            <input type="checkbox" className="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50" />
                                            <span className="ml-2 text-sm text-gray-600">Remember me</span>
                                        </label>
                                        <a href="#" className="text-sm text-purple-600 hover:text-purple-500">Forgot password?</a>
                                    </div>

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
                                        {loading ? "Signing in..." : "Sign In"}
                                    </button>
                                </div>
                            )}

                            {/* Divider */}
                            <div className="my-6 flex items-center">
                                <div className="flex-1 border-t border-gray-300"></div>
                                <span className="px-4 text-sm text-gray-500">or</span>
                                <div className="flex-1 border-t border-gray-300"></div>
                            </div>

                            {/* Sign Up Link */}
                            <div className="text-center">
                                <p className="text-sm text-gray-600">
                                    Don't have an account?{' '}
                                    <a href="#" className="text-purple-600 hover:text-purple-500 font-medium">
                                        Sign up for free
                                    </a>
                                </p>
                            </div>

                            {/* Terms */}
                            <p className="mt-6 text-xs text-gray-500 text-center">
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
                            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
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
        </div>
    );
}