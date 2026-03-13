import axios from 'axios';

// In the browser, use the same-origin proxy to avoid CORS issues.
// On the server (SSR), call the backend directly.
const isBrowser = typeof window !== 'undefined';
const API_BASE = isBrowser
  ? '/api/proxy'  // Next.js rewrite proxies this to the backend (same-origin, no CORS)
  : (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.screenquest.app');

console.log('[CMS DEBUG] API_BASE =', API_BASE);
console.log('[CMS DEBUG] isBrowser =', isBrowser);

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000, // 60s — Render free tier cold starts can take 30-50s
});

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  console.log('[CMS DEBUG] Request:', config.method?.toUpperCase(), config.baseURL, config.url);
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
  (res) => {
    console.log('[CMS DEBUG] Response OK:', res.status, res.config.url);
    return res;
  },
  (error) => {
    console.error('[CMS DEBUG] Response ERROR:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      data: error.response?.data,
      message: error.message,
      code: error.code,
    });
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Don't redirect on login endpoint — let the login page handle its own 401
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        console.warn('[CMS DEBUG] 401 detected — clearing token, redirecting to /login');
        localStorage.removeItem('sq_admin_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
