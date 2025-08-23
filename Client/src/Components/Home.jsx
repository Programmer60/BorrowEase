import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import { useTheme } from "../contexts/ThemeContext";
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  Users, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  Star,
  ArrowRight,
  Target,
  Award,
  Heart,
  BookOpen,
  CreditCard,
  Globe,
  Sparkles
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className={`min-h-screen ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 to-indigo-100'
    }`}>
      <Navbar />
      
      {/* Hero Section */}
      <main className="relative overflow-hidden">
        {/* Background Elements */}
        <div className={`absolute inset-0 ${
          isDark 
            ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900' 
            : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
        }`}></div>
        <div className={`absolute top-10 left-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse ${
          isDark 
            ? 'bg-blue-800' 
            : 'bg-blue-200'
        }`}></div>
        <div className={`absolute bottom-10 right-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse ${
          isDark 
            ? 'bg-purple-800' 
            : 'bg-purple-200'
        }`}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left space-y-8">
              <div className="space-y-4">
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-4 ${
                  isDark 
                    ? 'bg-blue-900/50 text-blue-300' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Trusted by 10,000+ Students
                </div>
                <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight ${
                  isDark ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  Empowering Student
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Dreams</span>
                  <br />with Smart Lending
                </h1>
                <p className={`text-xl max-w-2xl leading-relaxed ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Connect directly with trusted lenders for quick, transparent, and affordable student loans. 
                  Your education journey starts here.
                </p>
              </div>

              {/* Key Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span>Lower Interest Rates</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-700">
                  <Zap className="w-5 h-5" />
                  <span>Quick Approval</span>
                </div>
                <div className="flex items-center space-x-2 text-purple-700">
                  <Shield className="w-5 h-5" />
                  <span>Verified Students</span>
                </div>
              </div>

              {/* Call to Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 items-center lg:items-start">
                <Link
                  to="/login"
                  className="group w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                  Get a Loan Now
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/login"
                  className={`w-full sm:w-auto px-8 py-4 rounded-xl text-lg font-semibold transition-all border shadow-sm hover:shadow-md flex items-center justify-center ${
                    isDark 
                      ? 'bg-gray-800 text-gray-200 hover:bg-gray-700 border-gray-600 hover:border-gray-500' 
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Become a Lender
                  <Target className="w-5 h-5 ml-2" />
                </Link>
              </div>
            </div>

            {/* Right Column - Visual Elements */}
            <div className="relative">
              <div className={`relative rounded-2xl shadow-2xl p-8 border ${
                isDark 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-100'
              }`}>
                {/* Mock Dashboard Preview */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-semibold ${
                      isDark ? 'text-gray-100' : 'text-gray-900'
                    }`}>Student Dashboard</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg ${
                      isDark 
                        ? 'bg-gradient-to-r from-green-900/50 to-green-800/50' 
                        : 'bg-gradient-to-r from-green-50 to-green-100'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <span className={`text-sm font-medium ${
                          isDark ? 'text-green-400' : 'text-green-700'
                        }`}>Total Borrowed</span>
                      </div>
                      <p className={`text-2xl font-bold mt-2 ${
                        isDark ? 'text-green-300' : 'text-green-800'
                      }`}>₹45,000</p>
                    </div>
                    <div className={`p-4 rounded-lg ${
                      isDark 
                        ? 'bg-gradient-to-r from-blue-900/50 to-blue-800/50' 
                        : 'bg-gradient-to-r from-blue-50 to-blue-100'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <span className={`text-sm font-medium ${
                          isDark ? 'text-blue-400' : 'text-blue-700'
                        }`}>Active Loans</span>
                      </div>
                      <p className={`text-2xl font-bold mt-2 ${
                        isDark ? 'text-blue-300' : 'text-blue-800'
                      }`}>2</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className={`flex items-center justify-between p-3 rounded-lg ${
                      isDark ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className={`font-medium ${
                            isDark ? 'text-gray-200' : 'text-gray-900'
                          }`}>Course Materials</p>
                          <p className={`text-sm ${
                            isDark ? 'text-gray-400' : 'text-gray-500'
                          }`}>₹15,000</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Funded</span>
                    </div>
                    <div className={`flex items-center justify-between p-3 rounded-lg ${
                      isDark ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <CreditCard className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className={`font-medium ${
                            isDark ? 'text-gray-200' : 'text-gray-900'
                          }`}>Laptop Purchase</p>
                          <p className={`text-sm ${
                            isDark ? 'text-gray-400' : 'text-gray-500'
                          }`}>₹30,000</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Approved</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <div className={`absolute -top-6 -right-6 p-4 rounded-xl shadow-lg ${
                isDark ? 'bg-yellow-900/70 backdrop-blur-sm' : 'bg-yellow-100'
              }`}>
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className={`text-sm font-bold ${
                      isDark ? 'text-yellow-300' : 'text-yellow-800'
                    }`}>4.9/5</p>
                    <p className={`text-xs ${
                      isDark ? 'text-yellow-400' : 'text-yellow-600'
                    }`}>User Rating</p>
                  </div>
                </div>
              </div>
              
              <div className={`absolute -bottom-6 -left-6 p-4 rounded-xl shadow-lg ${
                isDark ? 'bg-green-900/70 backdrop-blur-sm' : 'bg-green-100'
              }`}>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className={`text-sm font-bold ${
                      isDark ? 'text-green-300' : 'text-green-800'
                    }`}>98%</p>
                    <p className={`text-xs ${
                      isDark ? 'text-green-400' : 'text-green-600'
                    }`}>Success Rate</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className={`relative py-20 ${
        isDark ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
              isDark ? 'text-gray-100' : 'text-gray-900'
            }`}>
              Why Choose BorrowEase?
            </h2>
            <p className={`text-xl max-w-3xl mx-auto ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}>
              We're revolutionizing student lending with transparency, speed, and affordability at the core.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className={`group p-8 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border ${
              isDark 
                ? 'bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-700/50' 
                : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'
            }`}>
              <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-4 ${
                isDark ? 'text-gray-100' : 'text-gray-900'
              }`}>Lower Interest Rates</h3>
              <p className={`leading-relaxed ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Borrow directly from peers at 2-5% lower interest rates than traditional banks and NBFCs. 
                Save thousands on your education loans.
              </p>
              <div className="mt-4 text-blue-600 font-semibold">Starting from 8% APR</div>
            </div>

            {/* Feature 2 */}
            <div className={`group p-8 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border ${
              isDark 
                ? 'bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-700/50' 
                : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
            }`}>
              <div className="bg-green-600 w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-4 ${
                isDark ? 'text-gray-100' : 'text-gray-900'
              }`}>Lightning Fast Approval</h3>
              <p className={`leading-relaxed ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Get loans approved in under 24 hours without endless paperwork or rigid credit checks. 
                Focus on your studies, not bureaucracy.
              </p>
              <div className="mt-4 text-green-600 font-semibold">Avg. 6 hours approval</div>
            </div>

            {/* Feature 3 */}
            <div className={`group p-8 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border ${
              isDark 
                ? 'bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-700/50' 
                : 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'
            }`}>
              <div className="bg-purple-600 w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-4 ${
                isDark ? 'text-gray-100' : 'text-gray-900'
              }`}>Transparent & Secure</h3>
              <p className={`leading-relaxed ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Know exactly who funded your loan and track repayments in real-time. 
                Bank-grade security protects your data.
              </p>
              <div className="mt-4 text-purple-600 font-semibold">100% Transparent</div>
            </div>

            {/* Feature 4 */}
            <div className={`group p-8 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border ${
              isDark 
                ? 'bg-gradient-to-br from-orange-900/50 to-orange-800/50 border-orange-700/50' 
                : 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'
            }`}>
              <div className="bg-orange-600 w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-4 ${
                isDark ? 'text-gray-100' : 'text-gray-900'
              }`}>Verified Community</h3>
              <p className={`leading-relaxed ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Connect with verified students and trusted lenders in our secure community. 
                KYC verification ensures authenticity.
              </p>
              <div className="mt-4 text-orange-600 font-semibold">10,000+ Members</div>
            </div>

            {/* Feature 5 */}
            <div className={`group p-8 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border ${
              isDark 
                ? 'bg-gradient-to-br from-indigo-900/50 to-indigo-800/50 border-indigo-700/50' 
                : 'bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200'
            }`}>
              <div className="bg-indigo-600 w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-4 ${
                isDark ? 'text-gray-100' : 'text-gray-900'
              }`}>Build Credit Score</h3>
              <p className={`leading-relaxed ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Every successful repayment improves your credit score on our platform, 
                unlocking better rates for future loans.
              </p>
              <div className="mt-4 text-indigo-600 font-semibold">Trust Score System</div>
            </div>

            {/* Feature 6 */}
            <div className={`group p-8 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border ${
              isDark 
                ? 'bg-gradient-to-br from-pink-900/50 to-pink-800/50 border-pink-700/50' 
                : 'bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200'
            }`}>
              <div className="bg-pink-600 w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-4 ${
                isDark ? 'text-gray-100' : 'text-gray-900'
              }`}>Student-First Approach</h3>
              <p className={`leading-relaxed ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Built by students, for students. We understand your challenges and provide 
                flexible repayment options that work with your schedule.
              </p>
              <div className="mt-4 text-pink-600 font-semibold">Flexible Terms</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={`py-20 ${
        isDark 
          ? 'bg-gradient-to-r from-blue-900 to-purple-900' 
          : 'bg-gradient-to-r from-blue-600 to-purple-600'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Trusted by Students Nationwide
            </h2>
            <p className={`text-xl ${
              isDark ? 'text-blue-200' : 'text-blue-100'
            }`}>
              Join thousands of students who have funded their dreams with BorrowEase
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-white mb-2">10K+</div>
              <div className={`${
                isDark ? 'text-blue-200' : 'text-blue-100'
              }`}>Students Helped</div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-white mb-2">₹50Cr+</div>
              <div className={`${
                isDark ? 'text-blue-200' : 'text-blue-100'
              }`}>Loans Funded</div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-white mb-2">98%</div>
              <div className={`${
                isDark ? 'text-blue-200' : 'text-blue-100'
              }`}>Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-white mb-2">24hrs</div>
              <div className={`${
                isDark ? 'text-blue-200' : 'text-blue-100'
              }`}>Avg. Approval</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-20 ${
        isDark 
          ? 'bg-gradient-to-br from-gray-900 to-blue-900' 
          : 'bg-gradient-to-br from-gray-50 to-blue-50'
      }`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className={`rounded-3xl shadow-2xl p-8 sm:p-12 border ${
            isDark 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-100'
          }`}>
            <div className="mb-8">
              <Globe className="w-16 h-16 text-blue-600 mx-auto mb-6" />
              <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Ready to Fund Your Dreams?
              </h2>
              <p className={`text-xl mb-8 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Join the fastest-growing student lending platform in India. Get started in under 5 minutes.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/login"
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Start Your Loan Journey
              </Link>
              <Link
                to="/login"
                className={`w-full sm:w-auto font-medium ${
                  isDark 
                    ? 'text-gray-300 hover:text-white' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Learn more about lending →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 ${
        isDark ? 'bg-black' : 'bg-gray-900'
      } text-white`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <h3 className="text-2xl font-bold mb-4">BorrowEase</h3>
              <p className={`mb-4 max-w-md ${
                isDark ? 'text-gray-300' : 'text-gray-400'
              }`}>
                Empowering students with transparent, affordable, and fast lending solutions. 
                Your education journey starts here.
              </p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">B</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">For Students</a></li>
                <li><a href="#" className="hover:text-white transition-colors">For Lenders</a></li>
                <li><a href="#" className="hover:text-white transition-colors">How it Works</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} BorrowEase. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
// This is the main home page component for BorrowEase, featuring a navigation bar, hero section, and feature highlights.