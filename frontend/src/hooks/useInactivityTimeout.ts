import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../services/auth';
import { useToast } from '../contexts/ToastContext';

// 30 minutos de inactividad (en milisegundos)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
// Aviso 2 minutos antes de expirar
const WARNING_BEFORE_MS = 2 * 60 * 1000;
const CHECK_INTERVAL_MS = 5000;

const ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'keyup',
  'input',
  'change',
  'scroll',
  'touchstart',
  'click',
];

/**
 * Hook para detectar inactividad, avisar antes de expirar y cerrar sesión automáticamente
 */
export function useInactivityTimeout() {
  const { logout, isAuthenticated } = useAuth();
  const toast = useToast();
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef(false);
  const expiryShownRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    expiryShownRef.current = false;
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      return;
    }

    resetTimer();

    const checkInactivity = () => {
      if (!isAuthenticated()) return;

      const inactiveDuration = Date.now() - lastActivityRef.current;
      const timeUntilExpiry = INACTIVITY_TIMEOUT - inactiveDuration;

      if (timeUntilExpiry <= 0 && !expiryShownRef.current) {
        expiryShownRef.current = true;
        console.log('⏱️ Sesión expirada por inactividad');
        toast.show(
          'Tu sesión ha expirado por inactividad (30 min). Por favor inicia sesión nuevamente.',
          'info',
          { onClose: () => logout() }
        );
        return;
      }

      if (
        timeUntilExpiry <= WARNING_BEFORE_MS &&
        timeUntilExpiry > 0 &&
        !warningShownRef.current &&
        !expiryShownRef.current
      ) {
        warningShownRef.current = true;
        toast.show(
          'Tu sesión expira en 2 minutos. Toca Aceptar para mantener la sesión.',
          'info',
          { onClose: resetTimer }
        );
      }

      if (timeUntilExpiry > WARNING_BEFORE_MS) {
        warningShownRef.current = false;
      }
    };

    intervalRef.current = window.setInterval(checkInactivity, CHECK_INTERVAL_MS);

    const handleActivity = () => resetTimer();
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, logout, toast, resetTimer]);

  return {
    lastActivity: lastActivityRef.current,
    resetTimer,
  };
}
