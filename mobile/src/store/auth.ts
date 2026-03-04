import { create } from 'zustand';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, UserProfile } from '../services/auth';

const USER_CACHE_KEY = 'sq:user';

async function getCachedUser(): Promise<UserProfile | null> {
  try {
    const json = await AsyncStorage.getItem(USER_CACHE_KEY);
    return json ? (JSON.parse(json) as UserProfile) : null;
  } catch {
    return null;
  }
}

async function cacheUser(user: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    // Non-critical — don't fail the auth flow
  }
}

async function clearCachedUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_CACHE_KEY).catch(() => {});
}

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
  childLogin: (familyCode: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserProfile) => void;
  updateAvatar: (emoji: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const token = await getToken('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }

      // Restore cached profile immediately so the app renders while we verify
      const cachedUser = await getCachedUser();
      if (cachedUser) {
        set({ user: cachedUser, isAuthenticated: true });
      }

      try {
        const user = await authService.getProfile();
        await cacheUser(user);
        set({ user, isAuthenticated: true, isLoading: false });
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          // Interceptor tried to refresh and the server definitively rejected it
          await deleteToken('accessToken');
          await deleteToken('refreshToken');
          await clearCachedUser();
          set({ user: null, isAuthenticated: false, isLoading: false });
        } else {
          // Network error, 5xx, or transient failure — keep tokens and cached user
          set({ isLoading: false });
        }
      }
    } catch {
      // Keychain access failure — don't wipe the session
      set({ isLoading: false });
    }
  },

  register: async (email, password, name) => {
    const response = await authService.register({ email, password, name });
    await setToken('accessToken', response.accessToken);
    await setToken('refreshToken', response.refreshToken);
    await cacheUser(response.user);
    set({ user: response.user, isAuthenticated: true });
  },

  login: async (email, password) => {
    const response = await authService.login({ email, password });
    await setToken('accessToken', response.accessToken);
    await setToken('refreshToken', response.refreshToken);
    await cacheUser(response.user);
    set({ user: response.user, isAuthenticated: true });
  },

  childLogin: async (familyCode, name) => {
    const response = await authService.childLogin({ familyCode, name });
    await setToken('accessToken', response.accessToken);
    await setToken('refreshToken', response.refreshToken);
    await cacheUser(response.user);
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
    await clearCachedUser();
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user) => {
    cacheUser(user);
    set({ user });
  },

  updateAvatar: async (emoji: string) => {
    const updated = await authService.updateAvatar(emoji);
    await cacheUser(updated);
    set({ user: updated });
  },
}));
