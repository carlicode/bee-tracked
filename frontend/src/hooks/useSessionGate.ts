import { useCallback, useState } from 'react';
import { useAuth } from '../services/auth';
import { checkSessionValid } from '../services/authApi';

export function useSessionGate() {
  const { logout } = useAuth();
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionMessage, setSessionMessage] = useState<string | undefined>();
  const [checkingSession, setCheckingSession] = useState(false);

  const relogin = useCallback(() => {
    logout();
  }, [logout]);

  const guardAction = useCallback(async (action: () => void | Promise<void>): Promise<boolean> => {
    setCheckingSession(true);
    setSessionExpired(false);
    setSessionMessage(undefined);

    try {
      const result = await checkSessionValid();
      if (!result.valid) {
        setSessionExpired(true);
        setSessionMessage(result.error);
        return false;
      }
      await action();
      return true;
    } finally {
      setCheckingSession(false);
    }
  }, []);

  return {
    sessionExpired,
    sessionMessage,
    checkingSession,
    guardAction,
    relogin,
  };
}
