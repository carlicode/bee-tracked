import { GoogleOAuthProvider } from '@react-oauth/google';
import { storage } from './storage';
import type { User, UserType } from '../types';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

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

  const getUserType = (): UserType | null => {
    const user = storage.getUser();
    return user?.userType || null;
  };

  return {
    logout,
    isAuthenticated,
    getCurrentUser,
    getUserType,
  };
};

