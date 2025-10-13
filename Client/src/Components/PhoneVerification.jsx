import { useState, useEffect, useRef } from 'react';
import { Phone, Shield, CheckCircle, ArrowRight, Loader2, RefreshCw, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from './NotificationSystem';
import API from '../api/api';

/**
 * PhoneVerification Component
 * 
 * A modern, production-ready phone verification component with OTP
 * Features:
 * - Phone number validation with country code support
 * - 6-digit OTP input with auto-focus
 * - Countdown timer for OTP expiry
 * - Rate limiting (3 attempts per hour)
 * - Resend OTP functionality
 * - Responsive design with dark mode support
 * - Accessibility features
 */
export default function PhoneVerification({ 
  onVerificationComplete, 
  onSkip,
  showSkip = false,
  title = "Verify Your Phone Number",
  description = "We'll send you a one-time password to verify your phone number"
}) {
  const { isDark } = useTheme();
  const { showSuccess, showError, showInfo, showWarning } = useNotifications();
  
  // Component state
  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'success'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpExpiry, setOtpExpiry] = useState(300); // 5 minutes
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  
  // Refs for OTP inputs
  const otpInputRefs = useRef([]);
  
  // Country codes for dropdown
  const countryCodes = [
    { code: '+91', country: '🇮🇳 India', flag: '🇮🇳' },
    { code: '+1', country: '🇺🇸 USA', flag: '🇺🇸' },
    { code: '+44', country: '🇬🇧 UK', flag: '🇬🇧' },
    { code: '+971', country: '🇦🇪 UAE', flag: '🇦🇪' },
    { code: '+65', country: '🇸🇬 Singapore', flag: '🇸🇬' },
    { code: '+61', country: '🇦🇺 Australia', flag: '🇦🇺' },
  ];
  
  // Timer countdown effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setResendDisabled(false);
    }
  }, [countdown]);
  
  // OTP expiry countdown
  useEffect(() => {
    if (step === 'otp' && otpExpiry > 0) {
      const timer = setTimeout(() => setOtpExpiry(otpExpiry - 1), 1000);
      return () => clearTimeout(timer);
    } else if (otpExpiry === 0 && step === 'otp') {
      showWarning('OTP expired. Please request a new one.');
      setStep('phone');
      setOtp(['', '', '', '', '', '']);
    }
  }, [otpExpiry, step]);
  
  // Validate phone number
  const validatePhone = (number) => {
    // Remove all non-digit characters
    const cleaned = number.replace(/\D/g, '');
    
    // Basic validation: 10 digits for most countries
    if (countryCode === '+91') {
      return cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned);
    }
    return cleaned.length >= 10 && cleaned.length <= 15;
  };
  
  // Format phone number for display
  const formatPhoneDisplay = () => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (countryCode === '+91' && cleaned.length === 10) {
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return cleaned;
  };
  
  // Handle phone number input
  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setPhoneNumber(value);
  };
  
  // Handle OTP input
  const handleOtpChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when all digits entered
    if (newOtp.every(digit => digit !== '') && index === 5) {
      handleVerifyOtp(newOtp.join(''));
    }
  };
  
  // Handle OTP input keydown
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };
  
  // Handle paste in OTP input
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
    setOtp(newOtp);
    
    // Focus last filled input
    if (pastedData.length > 0) {
      const focusIndex = Math.min(pastedData.length, 5);
      otpInputRefs.current[focusIndex]?.focus();
    }
    
    // Auto-submit if 6 digits
    if (pastedData.length === 6) {
      handleVerifyOtp(pastedData);
    }
  };
  
  // Send OTP
  const handleSendOtp = async () => {
    if (!validatePhone(phoneNumber)) {
      showError('Please enter a valid phone number');
      return;
    }
    
    setLoading(true);
    try {
      const fullPhone = `${countryCode}${phoneNumber}`;
      console.log('📤 Sending OTP to:', fullPhone);
      
      const response = await API.post('/otp/send', { phone: fullPhone });
      
      if (response.data.success) {
        showSuccess('OTP sent successfully! Check your phone.');
        setStep('otp');
        setOtpExpiry(response.data.expiresIn || 300);
        setResendDisabled(true);
        setCountdown(60); // 60 seconds before resend
        
        // Focus first OTP input
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      }
    } catch (error) {
      console.error('❌ Error sending OTP:', error);
      
      if (error.response?.status === 429) {
        showError(error.response.data.message || 'Too many requests. Please try again later.');
        setAttemptsLeft(0);
      } else {
        showError(error.response?.data?.message || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Verify OTP
  const handleVerifyOtp = async (otpCode = otp.join('')) => {
    if (otpCode.length !== 6) {
      showError('Please enter the complete 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      const fullPhone = `${countryCode}${phoneNumber}`;
      console.log('🔍 Verifying OTP:', otpCode);
      
      const response = await API.post('/otp/verify', { 
        phone: fullPhone, 
        otp: otpCode 
      });
      
      if (response.data.success) {
        showSuccess('Phone number verified successfully! ✅');
        setStep('success');
        
        // Call completion callback after animation
        setTimeout(() => {
          onVerificationComplete?.({
            phone: fullPhone,
            verified: true,
            timestamp: new Date().toISOString()
          });
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Error verifying OTP:', error);
      
      const message = error.response?.data?.message || 'Invalid OTP. Please try again.';
      showError(message);
      
      // Update attempts left
      if (error.response?.data?.attemptsLeft !== undefined) {
        setAttemptsLeft(error.response.data.attemptsLeft);
      }
      
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
      
      // If max attempts exceeded, go back to phone input
      if (error.response?.status === 429 || attemptsLeft <= 0) {
        setTimeout(() => {
          setStep('phone');
          setOtp(['', '', '', '', '', '']);
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Resend OTP
  const handleResendOtp = async () => {
    if (resendDisabled) return;
    
    setLoading(true);
    try {
      const fullPhone = `${countryCode}${phoneNumber}`;
      console.log('🔄 Resending OTP to:', fullPhone);
      
      const response = await API.post('/otp/resend', { phone: fullPhone });
      
      if (response.data.success) {
        showInfo('New OTP sent! Check your phone.');
        setOtp(['', '', '', '', '', '']);
        setOtpExpiry(response.data.expiresIn || 300);
        setResendDisabled(true);
        setCountdown(60);
        otpInputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('❌ Error resending OTP:', error);
      showError(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };
  
  // Format time display (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Change phone number
  const handleChangePhone = () => {
    setStep('phone');
    setOtp(['', '', '', '', '', '']);
    setOtpExpiry(300);
    setAttemptsLeft(3);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    }`}>
      <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`p-8 text-center ${
          isDark 
            ? 'bg-gradient-to-br from-blue-600 to-purple-600' 
            : 'bg-gradient-to-br from-blue-500 to-purple-500'
        }`}>
          <div className="flex justify-center mb-4">
            {step === 'success' ? (
              <CheckCircle className="w-16 h-16 text-white animate-bounce" />
            ) : (
              <Shield className="w-16 h-16 text-white" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {step === 'success' ? 'Verified!' : title}
          </h2>
          <p className="text-blue-100 text-sm">
            {step === 'success' 
              ? 'Your phone number has been verified successfully'
              : step === 'otp' 
              ? `Enter the code sent to ${countryCode} ${formatPhoneDisplay()}`
              : description
            }
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Step 1: Phone Number Input */}
          {step === 'phone' && (
            <div className="space-y-6 animate-fade-in">
              {/* Country Code & Phone Input */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Phone Number
                </label>
                <div className="flex gap-2">
                  {/* Country Code Selector */}
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className={`px-3 py-3 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    {countryCodes.map(({ code, flag }) => (
                      <option key={code} value={code}>
                        {flag} {code}
                      </option>
                    ))}
                  </select>
                  
                  {/* Phone Number Input */}
                  <div className="flex-1 relative">
                    <Phone className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="Enter phone number"
                      maxLength={15}
                      className={`w-full pl-11 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && validatePhone(phoneNumber)) {
                          handleSendOtp();
                        }
                      }}
                    />
                  </div>
                </div>
                
                {/* Validation Helper */}
                {phoneNumber && (
                  <p className={`text-xs mt-2 ${
                    validatePhone(phoneNumber) 
                      ? 'text-green-500' 
                      : 'text-orange-500'
                  }`}>
                    {validatePhone(phoneNumber) 
                      ? '✓ Valid phone number' 
                      : 'Please enter a valid phone number'
                    }
                  </p>
                )}
              </div>

              {/* Send OTP Button */}
              <button
                onClick={handleSendOtp}
                disabled={loading || !validatePhone(phoneNumber)}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                  loading || !validatePhone(phoneNumber)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    Send OTP
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Skip Option */}
              {showSkip && onSkip && (
                <button
                  onClick={onSkip}
                  className={`w-full py-2 text-sm ${
                    isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'
                  }`}
                >
                  Skip for now
                </button>
              )}

              {/* Security Notice */}
              <div className={`text-xs text-center p-3 rounded-lg ${
                isDark ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-gray-600'
              }`}>
                <Shield className="w-4 h-4 inline mr-1" />
                Your phone number is encrypted and secure
              </div>
            </div>
          )}

          {/* Step 2: OTP Input */}
          {step === 'otp' && (
            <div className="space-y-6 animate-fade-in">
              {/* OTP Input Boxes */}
              <div>
                <label className={`block text-sm font-medium mb-4 text-center ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Enter 6-Digit OTP
                </label>
                <div className="flex justify-center gap-2 mb-4">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={index === 0 ? handleOtpPaste : undefined}
                      className={`w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        isDark 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      } ${digit ? 'border-blue-500' : ''}`}
                    />
                  ))}
                </div>
              </div>

              {/* Timer & Attempts */}
              <div className="flex justify-between items-center text-sm">
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                  {otpExpiry > 0 ? (
                    <>⏱️ Expires in {formatTime(otpExpiry)}</>
                  ) : (
                    <>⏱️ OTP Expired</>
                  )}
                </span>
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                  {attemptsLeft} attempts left
                </span>
              </div>

              {/* Verify Button */}
              <button
                onClick={() => handleVerifyOtp()}
                disabled={loading || otp.some(digit => !digit)}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                  loading || otp.some(digit => !digit)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Verify OTP
                  </>
                )}
              </button>

              {/* Resend & Change Number */}
              <div className="flex justify-between items-center">
                <button
                  onClick={handleResendOtp}
                  disabled={resendDisabled || loading}
                  className={`text-sm font-medium flex items-center gap-1 ${
                    resendDisabled || loading
                      ? 'text-gray-400 cursor-not-allowed'
                      : isDark 
                      ? 'text-blue-400 hover:text-blue-300' 
                      : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  {resendDisabled ? `Resend in ${countdown}s` : 'Resend OTP'}
                </button>
                
                <button
                  onClick={handleChangePhone}
                  className={`text-sm font-medium ${
                    isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'
                  }`}
                >
                  Change Number
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h3 className={`text-xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Verification Complete!
              </h3>
              <p className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Your phone number has been verified successfully.
              </p>
              <div className={`p-3 rounded-lg ${
                isDark ? 'bg-gray-700' : 'bg-green-50'
              }`}>
                <p className={`text-sm font-medium ${
                  isDark ? 'text-green-400' : 'text-green-700'
                }`}>
                  ✓ {countryCode} {formatPhoneDisplay()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
