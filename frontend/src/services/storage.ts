import type { User } from '../types';
import { APP_CONFIG } from '../config/constants';

/**
 * LocalStorage service with type safety
 */
export const storage = {
  setToken: (token: string): void => {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.TOKEN, token);
  },

  getToken: (): string | null => {
    return localStorage.getItem(APP_CONFIG.STORAGE_KEYS.TOKEN);
  },

  removeToken: (): void => {
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.TOKEN);
  },

  setUser: (user: User): void => {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
  },

  getUser: (): User | null => {
    try {
      const user = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER);
      return user ? (JSON.parse(user) as User) : null;
    } catch {
      return null;
    }
  },

  removeUser: (): void => {
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER);
  },

  clear: (): void => {
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.SESSION_ID);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USERNAME);
  },

  // Session ID management
  setSessionId: (sessionId: string): void => {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.SESSION_ID, sessionId);
  },

  getSessionId: (): string | null => {
    return localStorage.getItem(APP_CONFIG.STORAGE_KEYS.SESSION_ID);
  },

  removeSessionId: (): void => {
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.SESSION_ID);
  },

  // Refresh token management (Cognito)
  setRefreshToken: (refreshToken: string): void => {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
  },

  removeRefreshToken: (): void => {
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
  },

  // Username management (for refresh)
  setUsername: (username: string): void => {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USERNAME, username);
  },

  getUsername: (): string | null => {
    return localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USERNAME);
  },

  removeUsername: (): void => {
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USERNAME);
  },

  // Additional storage helpers
  setItem: <T>(key: string, value: T): void => {
    localStorage.setItem(key, JSON.stringify(value));
  },

  getItem: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : null;
    } catch {
      return null;
    }
  },

  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  },
};

