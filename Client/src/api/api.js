import axios from "axios";
import { auth } from "../firebase";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

API.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (!user) {
    return config;
  }

  const token = await user.getIdToken();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;

// Exporting the API instance for use in other parts of the application
// API is used to make HTTP requests to the backend server
// The interceptor adds the Firebase authentication token to the request headers
