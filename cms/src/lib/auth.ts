import { api } from './api';

const TOKEN_KEY = 'sq_admin_token';

export async function login(email: string, password: string): Promise<boolean> {
  const { data } = await api.post('/auth/login', { email, password });
  if (data.accessToken) {
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    return true;
  }
  return false;
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
