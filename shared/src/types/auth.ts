export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface SocialAuthRequest {
  idToken: string;
}

export interface ChildLoginRequest {
  familyCode: string;
  name: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  familyId: string | null;
  age: number | null;
  emailVerified: boolean;
}

export type UserRole = 'parent' | 'guardian' | 'child';

export type AuthProvider = 'email' | 'google' | 'apple';
