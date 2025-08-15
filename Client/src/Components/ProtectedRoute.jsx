import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import API from "../api/api";

const ProtectedRoute = ({ element: Component, requiredRole }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for Firebase to restore the session after a full-page redirect
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        if (!user) {
          // No session
          navigate('/login');
          return;
        }

        // Only check role once the user is available (token attached by interceptor)
        if (requiredRole) {
          const res = await API.get('/users/me');
          if (res.data.role !== requiredRole) {
            alert(`Access denied. You are not a ${requiredRole}.`);
            navigate('/');
            return;
          }
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Authentication error:', error?.response?.data || error?.message || error);
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate, requiredRole]);

  if (isLoading) return null;
  return isAuthorized ? <Component /> : null;
};

export default ProtectedRoute;