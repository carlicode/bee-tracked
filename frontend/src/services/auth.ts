import { useContext } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthContext } from '../contexts/AuthContext';
import type { User, UserType } from '../types';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export { GoogleOAuthProvider, GOOGLE_CLIENT_ID };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Re-export for components that need the type
export type { User, UserType };
