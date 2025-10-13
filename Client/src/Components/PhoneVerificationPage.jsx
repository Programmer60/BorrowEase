import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import PhoneVerification from '../Components/PhoneVerification';
import Navbar from '../Components/Navbar';
import { ArrowLeft } from 'lucide-react';

/**
 * PhoneVerification Test Page
 * Standalone page to test phone verification flow
 */
export default function PhoneVerificationPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [verificationData, setVerificationData] = useState(null);

  const handleVerificationComplete = (data) => {
    console.log('✅ Verification complete:', data);
    setVerificationData(data);
    
    // Redirect after 2 seconds
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  const handleSkip = () => {
    console.log('⏭️ Verification skipped');
    navigate('/dashboard');
  };

  return (
    <>
      <Navbar />
      <div className={`min-h-screen pt-16 ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        {/* Back Button */}
        <div className="max-w-7xl mx-auto px-4 pt-8">
          <button
            onClick={() => navigate(-1)}
            className={`flex items-center gap-2 text-sm font-medium mb-4 ${
              isDark 
                ? 'text-gray-400 hover:text-white' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Phone Verification Component */}
        <PhoneVerification
          onVerificationComplete={handleVerificationComplete}
          onSkip={handleSkip}
          showSkip={true}
          title="Verify Your Phone Number"
          description="Secure your account with phone verification"
        />

        {/* Debug Info (Development Only) */}
        {verificationData && (
          <div className="max-w-md mx-auto mt-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 className="font-semibold text-green-800 dark:text-green-400 mb-2">
              ✅ Verification Data:
            </h3>
            <pre className="text-xs text-green-700 dark:text-green-300 overflow-auto">
              {JSON.stringify(verificationData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </>
  );
}
