import axios from "axios";
import { auth } from "../firebase";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

let inFlightRefresh = null;
let lastToken = null;
let lastUserUid = null;

API.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return config;
    }

    // Use cached token when the same user is active; Firebase SDK manages expiry for getIdToken()
    if (!lastToken || lastUserUid !== user.uid) {
      lastToken = await user.getIdToken(); // do NOT force refresh on every request
      lastUserUid = user.uid;
    }
    config.headers.Authorization = `Bearer ${lastToken}`;
    return config;
  } catch (error) {
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
      originalRequest._retry = true;
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('No user for refresh');

        // Single-flight refresh to avoid quota exceeded
        if (!inFlightRefresh) {
          inFlightRefresh = user.getIdToken(true).then(t => {
            lastToken = t; lastUserUid = user.uid; return t;
          }).finally(() => { inFlightRefresh = null; });
        }
        const newToken = await inFlightRefresh;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return API(originalRequest);
      } catch (_) {}
    }
    
    return Promise.reject(error);
  }
);

export default API;

// Exporting the API instance for use in other parts of the application
// API is used to make HTTP requests to the backend server
// The interceptor adds the Firebase authentication token to the request headers
