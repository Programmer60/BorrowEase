import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import API from "../api/api";

const ProtectedRoute = ({ element: Component, requiredRole }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is logged in
        if (!auth.currentUser) {
          navigate('/login');
          return;
        }

        // Check user role if required
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
        console.error('Authentication error:', error.message);
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate, requiredRole]);

  if (isLoading) return null;
  return isAuthorized ? <Component /> : null;
};

export default ProtectedRoute;