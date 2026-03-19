import { api } from './api';

const TOKEN_KEY = 'sq_admin_token';
const MAX_LOGIN_RETRIES = 2;
const RETRY_DELAY_MS = 3_000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err: any): boolean {
  // Network errors, timeouts, and connection aborts are retryable (cold start)
  return (
    err.code === 'ECONNABORTED' ||
    err.code === 'ERR_NETWORK' ||
    err.message === 'Network Error' ||
    err.message === 'Request aborted'
  );
}

export async function login(email: string, password: string): Promise<boolean> {
  let lastError: any;

  for (let attempt = 0; attempt <= MAX_LOGIN_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        await delay(RETRY_DELAY_MS);
      }
      const { data } = await api.post('/auth/login', { email, password });
      if (data.accessToken) {
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        return true;
      }
      return false;
    } catch (err: any) {
      lastError = err;
      if (!isRetryableError(err) || attempt === MAX_LOGIN_RETRIES) {
        break;
      }
    }
  }

  throw lastError;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = '/login';
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
