import axios from 'axios';
import * as Keychain from 'react-native-keychain';
import * as Sentry from '@sentry/react-native';
import { showToast } from './toastBridge';
import { ENV } from '../config/env';
import { eventBus, AppEvents } from '../utils/eventBus';

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

// Shared in-flight refresh promise — prevents race condition when multiple
// requests get 401 simultaneously and all try to rotate the refresh token.
let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null;

function isRetryable(error: any): boolean {
  if (!error.response) return true; // network error
  if (error.response.status >= 500) return true; // server error
  if (error.response.status === 429) return true; // rate limited — retry after backoff
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
          // Transient Keychain miss — don't invalidate the session
          return Promise.reject(error);
        }

        // Reuse any in-flight refresh rather than firing a second rotation request.
        // Without this, concurrent 401s each rotate the token and the 2nd+ calls
        // send a already-deleted token, getting a 401 and triggering a logout.
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_URL}/auth/refresh`, { refreshToken })
            .then((res) => res.data)
            .finally(() => {
              refreshPromise = null;
            });
        }

        const data = await refreshPromise;

        await setToken('accessToken', data.accessToken);
        await setToken('refreshToken', data.refreshToken);

        config.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(config);
      } catch (refreshError: any) {
        if (refreshError.response?.status === 401) {
          // Server explicitly rejected the refresh token — session truly expired
          await deleteToken('accessToken');
          await deleteToken('refreshToken');
          eventBus.emit(AppEvents.AUTH_SESSION_EXPIRED);
        }
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
