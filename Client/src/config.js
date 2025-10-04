// Centralized client configuration for API and Socket URLs
// Usage:
// - Set VITE_API_BASE_URL to your backend origin (no trailing slash), e.g. https://borrowease-ksw5.onrender.com
// - Optionally set VITE_SOCKET_URL if Socket.IO should connect to a different origin; by default it uses API origin

const DEV_BACKEND = 'https://borrowease-ksw5.onrender.com';

// Resolve API origin
const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL && String(import.meta.env.VITE_API_BASE_URL).trim();
const RESOLVED_API_ORIGIN = RAW_API_BASE
  ? new URL(RAW_API_BASE).origin
  : (typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? DEV_BACKEND
      : window.location.origin);

export const API_ORIGIN = RESOLVED_API_ORIGIN;
export const API_BASE_URL = `${RESOLVED_API_ORIGIN.replace(/\/$/, '')}/api`;
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL && String(import.meta.env.VITE_SOCKET_URL).trim()) || RESOLVED_API_ORIGIN;

// Socket URL is API origin by default example: https://borrowease-ksw5.onrender.com