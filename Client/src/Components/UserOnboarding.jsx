import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from './NotificationSystem';
import { CheckCircle, Circle, User, Phone, Shield, ArrowRight, Briefcase, Target } from 'lucide-react';
import PhoneVerification from './PhoneVerification';
import API from '../api/api';

/**
 * User Onboarding Flow - Multi-Step Setup
 * 
 * Step 1: Welcome & Role Selection
 * Step 2: Phone Verification (Mandatory - Like RangDe, LenDenClub, Faircent)
 * Step 3: Complete Profile Setup
 * Step 4: Success & Dashboard
 * 
 * This ensures all users verify their phone before accessing the platform
 */
export default function UserOnboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();
  const { showSuccess, showError, showInfo } = useNotifications();
  
  // Get user data from location state (passed from login/signup)
  const userFromState = location.state || {};
  
  const [currentStep, setCurrentStep] = useState(1);
  const [role, setRole] = useState(userFromState.role || '');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Profile data
  const [profileData, setProfileData] = useState({
    name: userFromState.name || '',
    email: userFromState.email || '',
    bio: '',
    occupation: '',
    city: '',
  });
  
  const steps = [
    { id: 1, name: 'Role Selection', icon: Briefcase },
    { id: 2, name: 'Phone Verification', icon: Phone },
    { id: 3, name: 'Complete Profile', icon: User },
    { id: 4, name: 'Success', icon: CheckCircle },
  ];
  
  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        showError('Please login first');
        navigate('/login');
        return;
      }
      
      // Check if user already has role
      try {
        const response = await API.get('/users/me');
        if (response.data.role && response.data.phoneVerified) {
          // User already completed onboarding
          showInfo('You have already completed setup');
          navigate(response.data.role === 'borrower' ? '/borrower' : '/lender');
        } else if (response.data.role && !response.data.phoneVerified) {
          // User has role but not phone verified
          setRole(response.data.role);
          setCurrentStep(2);
        } else if (response.data.phoneVerified && !response.data.role) {
          // User verified phone but didn't select role
          setPhoneVerified(true);
          setPhoneNumber(response.data.phone);
          setCurrentStep(1);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    };
    
    checkAuth();
  }, []);
  
  // Step 1: Role Selection
  const handleRoleSelection = async () => {
    if (!role) {
      showError('Please select your role');
      return;
    }
    
    setLoading(true);
    try {
      // Save role to backend
      await API.post('/users/setup', { role });
      showSuccess(`You're joining as a ${role}!`);
      setCurrentStep(2);
    } catch (error) {
      console.error('Error saving role:', error);
      showError('Failed to save role. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Step 2: Phone Verification Complete
  const handlePhoneVerificationComplete = async (data) => {
    setPhoneVerified(true);
    setPhoneNumber(data.phone);
    
    try {
      // Save phone to backend
      await API.post('/users/update-phone', {
        phone: data.phone,
        phoneVerified: true
      });
      
      showSuccess('Phone verified successfully!');
      
      // Move to next step after 1 second
      setTimeout(() => {
        setCurrentStep(3);
      }, 1500);
      
    } catch (error) {
      console.error('Error saving phone:', error);
      showError('Failed to save phone number');
    }
  };
  
  // Step 3: Complete Profile
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    if (!profileData.name || !profileData.city) {
      showError('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    try {
      await API.patch('/users/profile', {
        name: profileData.name,
        bio: profileData.bio,
        occupation: profileData.occupation,
        city: profileData.city,
        onboardingComplete: true
      });
      
      showSuccess('Profile completed successfully!');
      setCurrentStep(4);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate(role === 'borrower' ? '/borrower' : '/lender');
      }, 2000);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      showError('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${
      isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    }`}>
      {/* Progress Steps Header */}
      <div className={`sticky top-0 z-10 ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border-b`}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isComplete = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  {/* Step Circle */}
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                      ${isComplete 
                        ? 'bg-green-500 text-white' 
                        : isActive 
                        ? 'bg-blue-500 text-white' 
                        : isDark 
                        ? 'bg-gray-700 text-gray-400' 
                        : 'bg-gray-200 text-gray-500'
                      }
                    `}>
                      {isComplete ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <span className={`
                      mt-2 text-xs font-medium text-center hidden sm:block
                      ${isActive 
                        ? isDark ? 'text-blue-400' : 'text-blue-600' 
                        : isDark ? 'text-gray-400' : 'text-gray-600'
                      }
                    `}>
                      {step.name}
                    </span>
                  </div>
                  
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className={`
                      flex-1 h-1 mx-2 transition-all duration-300
                      ${isComplete 
                        ? 'bg-green-500' 
                        : isDark ? 'bg-gray-700' : 'bg-gray-200'
                      }
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Step 1: Role Selection */}
        {currentStep === 1 && (
          <div className="animate-fade-in">
            <div className={`rounded-2xl shadow-xl overflow-hidden ${
              isDark ? 'bg-gray-800' : 'bg-white'
            }`}>
              {/* Header */}
              <div className={`p-8 text-center ${
                isDark 
                  ? 'bg-gradient-to-br from-blue-600 to-purple-600' 
                  : 'bg-gradient-to-br from-blue-500 to-purple-500'
              }`}>
                <Target className="w-16 h-16 text-white mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white mb-2">
                  Welcome to BorrowEase!
                </h2>
                <p className="text-blue-100">
                  Let's get started by choosing your role
                </p>
              </div>

              {/* Content */}
              <div className="p-8">
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {/* Borrower Card */}
                  <div
                    onClick={() => setRole('borrower')}
                    className={`
                      p-6 rounded-xl border-2 cursor-pointer transition-all duration-200
                      ${role === 'borrower'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : isDark
                        ? 'border-gray-700 hover:border-gray-600 bg-gray-700/50'
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center
                        ${role === 'borrower'
                          ? 'bg-blue-500 text-white'
                          : isDark
                          ? 'bg-gray-600 text-gray-300'
                          : 'bg-gray-200 text-gray-600'
                        }
                      `}>
                        <Target className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-xl font-bold mb-2 ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          I'm a Borrower
                        </h3>
                        <p className={`text-sm ${
                          isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Looking to get funded for personal or business needs
                        </p>
                        <ul className={`mt-4 space-y-2 text-sm ${
                          isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Create loan requests
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Get funded by lenders
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Flexible repayment options
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Lender Card */}
                  <div
                    onClick={() => setRole('lender')}
                    className={`
                      p-6 rounded-xl border-2 cursor-pointer transition-all duration-200
                      ${role === 'lender'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : isDark
                        ? 'border-gray-700 hover:border-gray-600 bg-gray-700/50'
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center
                        ${role === 'lender'
                          ? 'bg-purple-500 text-white'
                          : isDark
                          ? 'bg-gray-600 text-gray-300'
                          : 'bg-gray-200 text-gray-600'
                        }
                      `}>
                        <Briefcase className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-xl font-bold mb-2 ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          I'm a Lender
                        </h3>
                        <p className={`text-sm ${
                          isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Looking to earn returns by funding loans
                        </p>
                        <ul className={`mt-4 space-y-2 text-sm ${
                          isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Browse loan requests
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Fund verified borrowers
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Earn competitive returns
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Continue Button */}
                <button
                  onClick={handleRoleSelection}
                  disabled={!role || loading}
                  className={`
                    w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200
                    flex items-center justify-center gap-2
                    ${!role || loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl'
                    }
                  `}
                >
                  {loading ? 'Saving...' : 'Continue'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Phone Verification */}
        {currentStep === 2 && (
          <div className="animate-fade-in">
            <PhoneVerification
              onVerificationComplete={handlePhoneVerificationComplete}
              showSkip={false}
              title="Verify Your Phone Number"
              description="For security and compliance, we need to verify your phone number (Required for P2P lending)"
            />
            
            {/* Why Phone Verification */}
            <div className={`mt-8 p-6 rounded-xl ${
              isDark ? 'bg-gray-800' : 'bg-white'
            } shadow-lg`}>
              <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                <Shield className="w-5 h-5 text-blue-500" />
                Why do we need your phone number?
              </h3>
              <div className={`space-y-3 text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Regulatory Compliance:
                    </strong> RBI guidelines require P2P platforms to verify all users
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Security:
                    </strong> Adds an extra layer of protection to your account
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Important Notifications:
                    </strong> Get instant alerts about loan status, payments, and updates
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      Fraud Prevention:
                    </strong> Helps us maintain a safe and trusted community
                  </p>
                </div>
              </div>
              <div className={`mt-4 p-3 rounded-lg ${
                isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
              }`}>
                <p className={`text-xs ${
                  isDark ? 'text-blue-400' : 'text-blue-700'
                }`}>
                  🔒 Your phone number is encrypted and will never be shared with third parties
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Complete Profile */}
        {currentStep === 3 && (
          <div className="animate-fade-in">
            <div className={`rounded-2xl shadow-xl overflow-hidden ${
              isDark ? 'bg-gray-800' : 'bg-white'
            }`}>
              {/* Header */}
              <div className={`p-8 text-center ${
                isDark 
                  ? 'bg-gradient-to-br from-green-600 to-emerald-600' 
                  : 'bg-gradient-to-br from-green-500 to-emerald-500'
              }`}>
                <User className="w-16 h-16 text-white mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white mb-2">
                  Complete Your Profile
                </h2>
                <p className="text-green-100">
                  Tell us a bit about yourself
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleProfileSubmit} className="p-8 space-y-6">
                {/* Name */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    className={`w-full px-4 py-3 rounded-lg border bg-gray-100 cursor-not-allowed ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-400' 
                        : 'bg-gray-100 border-gray-300 text-gray-600'
                    }`}
                    readOnly
                  />
                </div>

                {/* Phone (Read-only) */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Phone Number ✓
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    className={`w-full px-4 py-3 rounded-lg border bg-green-50 cursor-not-allowed ${
                      isDark 
                        ? 'bg-green-900/20 border-green-800 text-green-400' 
                        : 'bg-green-50 border-green-300 text-green-700'
                    }`}
                    readOnly
                  />
                </div>

                {/* City */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    City *
                  </label>
                  <input
                    type="text"
                    value={profileData.city}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Enter your city"
                    required
                  />
                </div>

                {/* Occupation */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Occupation (Optional)
                  </label>
                  <input
                    type="text"
                    value={profileData.occupation}
                    onChange={(e) => setProfileData({ ...profileData, occupation: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="e.g., Software Engineer, Business Owner"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Bio (Optional)
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    rows={4}
                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Tell us about yourself (optional)"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`
                    w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200
                    flex items-center justify-center gap-2
                    ${loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl'
                    }
                  `}
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                  <CheckCircle className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {currentStep === 4 && (
          <div className="animate-fade-in">
            <div className={`rounded-2xl shadow-xl overflow-hidden text-center p-12 ${
              isDark ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400 animate-bounce" />
              </div>
              <h2 className={`text-3xl font-bold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Welcome to BorrowEase!
              </h2>
              <p className={`text-lg mb-8 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Your account is ready. Redirecting to your dashboard...
              </p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
