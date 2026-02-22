import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

console.log('[CMS DEBUG] API_BASE =', API_BASE);
console.log('[CMS DEBUG] NEXT_PUBLIC_API_URL =', process.env.NEXT_PUBLIC_API_URL);

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
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
      console.warn('[CMS DEBUG] 401 detected — clearing token, redirecting to /login');
      localStorage.removeItem('sq_admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
