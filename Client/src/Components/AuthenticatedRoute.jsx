import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";

const AuthenticatedRoute = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Wait for Firebase auth to be ready
        const user = await new Promise((resolve) => {
          const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
          });
        });

        if (!user) {
          console.log("No authenticated user, redirecting to login");
          navigate('/login');
          return;
        }

        // Critical Security Check: Email Verification Required
        if (!user.emailVerified && user.providerData[0]?.providerId === 'password') {
          console.log('🚫 AuthenticatedRoute: Email not verified for:', user.email);
          alert('Please verify your email address before accessing this page. Check your inbox for the verification link.');
          await auth.signOut(); // Sign out unverified user
          navigate('/login');
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error('Authentication error:', error);
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : null;
};

export default AuthenticatedRoute;
