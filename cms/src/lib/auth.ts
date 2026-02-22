import { api } from './api';

const TOKEN_KEY = 'sq_admin_token';

export async function login(email: string, password: string): Promise<boolean> {
  console.log('[CMS DEBUG] login() called with email:', email);
  try {
    const { data } = await api.post('/auth/login', { email, password });
    console.log('[CMS DEBUG] login() response data keys:', Object.keys(data));
    if (data.accessToken) {
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      console.log('[CMS DEBUG] login() token stored, returning true');
      return true;
    }
    console.warn('[CMS DEBUG] login() no accessToken in response:', data);
    return false;
  } catch (err: any) {
    console.error('[CMS DEBUG] login() threw:', err.message, err.response?.data);
    throw err;
  }
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
