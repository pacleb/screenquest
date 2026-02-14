import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Sentry from '@sentry/react-native';
import { showToast } from './toastBridge';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

function isRetryable(error: any): boolean {
  if (!error.response) return true; // network error
  if (error.response.status >= 500) return true; // server error
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Request interceptor — attach access token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — retry + auth refresh + Sentry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    // --- Retry logic for 5xx / network errors ---
    config._retryCount = config._retryCount || 0;

    if (isRetryable(error) && config._retryCount < MAX_RETRIES) {
      config._retryCount++;
      const backoff = RETRY_BASE_MS * Math.pow(2, config._retryCount - 1);
      await delay(backoff);
      return api(config);
    }

    // Show toast after exhausting retries
    if (config._retryCount >= MAX_RETRIES) {
      if (error.response?.status >= 500) {
        showToast('Server error. Please try again later.', 'error');
      } else if (!error.response) {
        showToast('Network error. Check your connection.', 'error');
      }
    }

    // --- 401 token refresh ---
    if (error.response?.status === 401 && !config._retry) {
      config._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        await SecureStore.setItemAsync('accessToken', data.accessToken);
        await SecureStore.setItemAsync('refreshToken', data.refreshToken);

        config.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(config);
      } catch (refreshError) {
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        return Promise.reject(refreshError);
      }
    }

    // --- Sentry breadcrumb ---
    if (error.response) {
      Sentry.addBreadcrumb({
        category: 'api',
        message: `${config.method?.toUpperCase()} ${config.url} → ${error.response.status}`,
        level: error.response.status >= 500 ? 'error' : 'warning',
        data: {
          status: error.response.status,
          requestId: error.response.headers?.['x-request-id'],
        },
      });
    }

    return Promise.reject(error);
  },
);

export default api;
