import axios from "axios";
import { auth } from "../firebase";
import { API_BASE_URL } from "../config";

const API = axios.create({
  baseURL: API_BASE_URL,
});

let inFlightRefresh = null;
let lastToken = null;
let lastTokenTime = null;
let lastUserUid = null;

API.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('⚠️ API request without authenticated user');
      return config;
    }

    const now = Date.now();
    const tokenAge = lastTokenTime ? (now - lastTokenTime) / 1000 : Infinity;
    
    // Force refresh if: no token, different user, or token older than 50 minutes (Firebase tokens expire at 60 min)
    const needsRefresh = !lastToken || lastUserUid !== user.uid || tokenAge > 3000;
    
    if (needsRefresh) {
      console.log('🔄 Refreshing Firebase token (age:', Math.round(tokenAge), 'seconds)');
      lastToken = await user.getIdToken(tokenAge > 3000); // force refresh if old
      lastUserUid = user.uid;
      lastTokenTime = now;
    }
    
    config.headers.Authorization = `Bearer ${lastToken}`;
    return config;
  } catch (error) {
    console.error('❌ Failed to get auth token:', error);
    // If token fetch fails, proceed without auth; response interceptor will try a single refresh on 401
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
      console.warn('⚠️ Got 401, attempting token refresh...');
      originalRequest._retry = true;
      try {
        const user = auth.currentUser;
        if (!user) {
          console.error('❌ No user for refresh, redirecting to login');
          // Clear stale state
          lastToken = null;
          lastTokenTime = null;
          lastUserUid = null;
          // Redirect to login
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          throw new Error('No user for refresh');
        }

        // Single-flight refresh to avoid quota exceeded
        if (!inFlightRefresh) {
          inFlightRefresh = user.getIdToken(true).then(t => {
            console.log('✅ Token refreshed successfully');
            lastToken = t; 
            lastUserUid = user.uid; 
            lastTokenTime = Date.now();
            return t;
          }).finally(() => { inFlightRefresh = null; });
        }
        const newToken = await inFlightRefresh;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return API(originalRequest);
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        // Clear stale state
        lastToken = null;
        lastTokenTime = null;
        lastUserUid = null;
      }
    }
    
    return Promise.reject(error);
  }
);

export default API;

// Exporting the API instance for use in other parts of the application
// API is used to make HTTP requests to the backend server
// The interceptor adds the Firebase authentication token to the request headers

// Expose for places that reference window.API defensively
if (typeof window !== 'undefined') {
  window.API = API;
}
