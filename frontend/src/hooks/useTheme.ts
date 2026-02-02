import { useThemeContext } from '../components/ThemeProvider';

export const useTheme = () => {
  const { theme, userType } = useThemeContext();
  return { theme, userType };
};
