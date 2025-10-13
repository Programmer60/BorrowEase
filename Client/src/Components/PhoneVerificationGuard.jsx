import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/api';
import { useNotifications } from './NotificationSystem';

/**
 * PhoneVerificationGuard
 * 
 * Checks if user has verified phone number
 * Redirects to onboarding if not verified
 * This ensures all users complete phone verification before accessing the platform
 */
export default function PhoneVerificationGuard({ children }) {
  const navigate = useNavigate();
  const { showInfo } = useNotifications();

  useEffect(() => {
    const checkPhoneVerification = async () => {
      try {
        const response = await API.get('/users/me');
        const user = response.data;

        // If user doesn't have phone verified, redirect to onboarding
        if (!user.phoneVerified) {
          console.log('📱 Phone not verified - redirecting to onboarding');
          showInfo('Please complete phone verification to continue');
          navigate('/onboarding', {
            state: {
              email: user.email,
              name: user.name,
              role: user.role,
              verified: true
            }
          });
        }
      } catch (error) {
        console.error('Error checking phone verification:', error);
        // If error fetching user, they might need to login again
        if (error.response?.status === 401) {
          navigate('/login');
        }
      }
    };

    checkPhoneVerification();
  }, [navigate, showInfo]);

  return children;
}
