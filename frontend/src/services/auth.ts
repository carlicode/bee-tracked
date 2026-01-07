import { GoogleOAuthProvider } from '@react-oauth/google';
import { storage } from './storage';
import type { User } from '../types';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'demo-client-id';

// Solo exportar si está disponible (modo demo no lo necesita)
export { GoogleOAuthProvider, GOOGLE_CLIENT_ID };

export const useAuth = () => {
  const logout = () => {
    storage.clear();
    window.location.href = '/';
  };

  const isAuthenticated = (): boolean => {
    return !!storage.getToken() && !!storage.getUser();
  };

  const getCurrentUser = (): User | null => {
    return storage.getUser();
  };

  return {
    logout,
    isAuthenticated,
    getCurrentUser,
  };
};

