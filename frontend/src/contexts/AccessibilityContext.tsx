import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'bee-tracked-large-text';

export interface AccessibilityContextValue {
  largeTextEnabled: boolean;
  toggleLargeText: () => void;
}

export const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [largeTextEnabled, setLargeTextEnabled] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('bee-tracked-large-text', largeTextEnabled);
    try {
      localStorage.setItem(STORAGE_KEY, String(largeTextEnabled));
    } catch {
      // ignore
    }
  }, [largeTextEnabled]);

  const toggleLargeText = useCallback(() => {
    setLargeTextEnabled((prev) => !prev);
  }, []);

  const value: AccessibilityContextValue = {
    largeTextEnabled,
    toggleLargeText,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return ctx;
}
