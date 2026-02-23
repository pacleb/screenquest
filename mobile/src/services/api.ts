import axios from 'axios';
import * as Keychain from 'react-native-keychain';
import * as Sentry from '@sentry/react-native';
import { showToast } from './toastBridge';
import { ENV } from '../config/env';

const API_URL = ENV.apiUrl;

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

// Keychain helpers for token storage
async function getToken(key: string): Promise<string | null> {
  try {
    const result = await Keychain.getGenericPassword({ service: key });
    return result ? result.password : null;
  } catch {
    return null;
  }
}

async function setToken(key: string, value: string): Promise<void> {
  await Keychain.setGenericPassword(key, value, { service: key });
}

async function deleteToken(key: string): Promise<void> {
  await Keychain.resetGenericPassword({ service: key });
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
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
  const token = await getToken('accessToken');
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

    // --- 401 token refresh (skip for auth endpoints) ---
    const isAuthEndpoint = config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/register') ||
      config.url?.includes('/auth/child-login') ||
      config.url?.includes('/auth/forgot-password') ||
      config.url?.includes('/auth/reset-password');

    if (error.response?.status === 401 && !config._retry && !isAuthEndpoint) {
      config._retry = true;

      try {
        const refreshToken = await getToken('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        await setToken('accessToken', data.accessToken);
        await setToken('refreshToken', data.refreshToken);

        config.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(config);
      } catch (refreshError) {
        await deleteToken('accessToken');
        await deleteToken('refreshToken');
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
