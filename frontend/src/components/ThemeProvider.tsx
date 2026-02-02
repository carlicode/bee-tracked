import { createContext, useContext, ReactNode } from 'react';
import type { UserType } from '../types';
import { getTheme, type Theme } from '../config/themes';

interface ThemeContextType {
  theme: Theme;
  userType: UserType;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
  userType: UserType;
}

export const ThemeProvider = ({ children, userType }: ThemeProviderProps) => {
  const theme = getTheme(userType);

  return (
    <ThemeContext.Provider value={{ theme, userType }}>
      {children}
    </ThemeContext.Provider>
  );
};
