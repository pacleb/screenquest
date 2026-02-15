import { create } from 'zustand';
import * as Keychain from 'react-native-keychain';
import { authService, UserProfile } from '../services/auth';

// Keychain helpers
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

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  childLogin: (familyCode: string, name: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserProfile) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const token = await getToken('accessToken');
      if (token) {
        const user = await authService.getProfile();
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await deleteToken('accessToken');
      await deleteToken('refreshToken');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  register: async (email, password, name) => {
    const response = await authService.register({ email, password, name });
    await setToken('accessToken', response.accessToken);
    await setToken('refreshToken', response.refreshToken);
    set({ user: response.user, isAuthenticated: true });
  },

  login: async (email, password) => {
    const response = await authService.login({ email, password });
    await setToken('accessToken', response.accessToken);
    await setToken('refreshToken', response.refreshToken);
    set({ user: response.user, isAuthenticated: true });
  },

  childLogin: async (familyCode, name, pin) => {
    const response = await authService.childLogin({ familyCode, name, pin });
    await setToken('accessToken', response.accessToken);
    await setToken('refreshToken', response.refreshToken);
    set({ user: response.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      const refreshToken = await getToken('refreshToken');
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch {
      // Ignore errors during logout
    }
    await deleteToken('accessToken');
    await deleteToken('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),
}));
