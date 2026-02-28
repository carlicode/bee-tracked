import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { storage } from '../services/storage';
import type { User, UserType } from '../types';

export interface AuthContextValue {
  user: User | null;
  /** Login with user data, optional token (e.g. Cognito IdToken), and optional sessionId */
  login: (user: User, token?: string, sessionId?: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  getCurrentUser: () => User | null;
  getUserType: () => UserType | null;
  getSessionId: () => string | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => storage.getUser());

  // Sincronizar con storage al montar (p. ej. después de refresh)
  useEffect(() => {
    const stored = storage.getUser();
    if (stored) setUser(stored);
  }, []);

  const login = useCallback((newUser: User, token?: string, sessionId?: string) => {
    storage.setToken(token ?? 'demo-token');
    storage.setUser(newUser);
    if (sessionId) {
      storage.setSessionId(sessionId);
    }
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    storage.clear();
    setUser(null);
    window.location.href = '/';
  }, []);

  const isAuthenticated = useCallback(() => !!storage.getToken() && !!user, [user]);
  const getCurrentUser = useCallback(() => user, [user]);
  const getUserType = useCallback((): UserType | null => user?.userType ?? null, [user]);
  const getSessionId = useCallback(() => storage.getSessionId(), []);

  const value: AuthContextValue = {
    user,
    login,
    logout,
    isAuthenticated,
    getCurrentUser,
    getUserType,
    getSessionId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
