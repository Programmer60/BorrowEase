import axios from "axios";
import { auth } from "../firebase";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

API.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('⚠️ No authenticated user found');
      return config;
    }

    console.log('🔑 Getting token for user:', user.email);
    const token = await user.getIdToken(true); // Force refresh token
    config.headers.Authorization = `Bearer ${token}`;
    console.log('✅ Token added to request');
    return config;
  } catch (error) {
    console.error('❌ Error in API interceptor:', error);
    return config;
  }
});

// Response interceptor to handle token expiration
API.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log('🔄 Token expired, attempting to refresh...');
      
      try {
        const user = auth.currentUser;
        if (user) {
          const newToken = await user.getIdToken(true);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          console.log('✅ Token refreshed, retrying request');
          return API(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default API;

// Exporting the API instance for use in other parts of the application
// API is used to make HTTP requests to the backend server
// The interceptor adds the Firebase authentication token to the request headers
