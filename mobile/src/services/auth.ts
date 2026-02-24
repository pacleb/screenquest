import api from './api';

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ChildLoginData {
  familyCode: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
  role: 'parent' | 'guardian' | 'child';
  familyId: string | null;
  age: number | null;
  emailVerified: boolean;
}

export const authService = {
  register: (data: RegisterData) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: LoginData) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  childLogin: (data: ChildLoginData) =>
    api.post<AuthResponse>('/auth/child-login', data).then((r) => r.data),

  getProfile: () =>
    api.get<UserProfile>('/auth/me').then((r) => r.data),

  verifyEmail: (token: string) =>
    api.post('/auth/verify-email', { token }).then((r) => r.data),

  resendVerification: () =>
    api.post('/auth/resend-verification').then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }).then((r) => r.data),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }).then((r) => r.data),

  logoutAll: () =>
    api.post('/auth/logout-all').then((r) => r.data),

  updateAvatar: (emoji: string) =>
    api.post<UserProfile>('/auth/avatar', { emoji }).then((r) => r.data),
};
