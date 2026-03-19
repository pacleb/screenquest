import axios from 'axios';

// In the browser, use the same-origin proxy to avoid CORS issues.
// On the server (SSR), call the backend directly.
const isBrowser = typeof window !== 'undefined';
const serverApiBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

if (!isBrowser && !serverApiBase) {
  throw new Error(
    'CMS backend URL is not configured for SSR. Set BACKEND_URL (or NEXT_PUBLIC_API_URL).',
  );
}

const API_BASE = isBrowser
  ? '/api/proxy'  // Next.js rewrite proxies this to the backend (same-origin, no CORS)
  : (serverApiBase as string);

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000, // 60s — Render free tier cold starts can take 30-50s
});

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sq_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Don't redirect on login endpoint — let the login page handle its own 401
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('sq_admin_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
