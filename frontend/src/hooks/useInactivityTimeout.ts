import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../services/auth';

// 10 minutos de inactividad (en milisegundos)
const INACTIVITY_TIMEOUT = 10 * 60 * 1000;

// Eventos que indican actividad del usuario
const ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
];

/**
 * Hook para detectar inactividad y cerrar sesión automáticamente
 */
export function useInactivityTimeout() {
  const { logout, isAuthenticated } = useAuth();
  const timeoutRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Establecer nuevo timeout
    timeoutRef.current = window.setTimeout(() => {
      if (isAuthenticated()) {
        console.log('⏱️ Sesión expirada por inactividad');
        logout();
        alert('Tu sesión ha expirado por inactividad. Por favor inicia sesión nuevamente.');
      }
    }, INACTIVITY_TIMEOUT);
  }, [logout, isAuthenticated]);

  useEffect(() => {
    // Solo activar si el usuario está autenticado
    if (!isAuthenticated()) {
      return;
    }

    // Iniciar el timer
    resetTimer();

    // Agregar listeners para eventos de actividad
    const handleActivity = () => resetTimer();

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, resetTimer]);

  return {
    lastActivity: lastActivityRef.current,
    resetTimer,
  };
}

/**
 * Hook para mostrar advertencia antes de que expire la sesión
 */
export function useInactivityWarning(warningTimeMs = 60 * 1000) {
  const { isAuthenticated } = useAuth();
  const warningShownRef = useRef(false);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isAuthenticated()) {
      return;
    }

    const checkInterval = setInterval(() => {
      const inactiveDuration = Date.now() - lastActivityRef.current;
      const timeUntilExpiry = INACTIVITY_TIMEOUT - inactiveDuration;

      if (timeUntilExpiry <= warningTimeMs && !warningShownRef.current) {
        warningShownRef.current = true;
        console.log('⚠️ Advertencia: la sesión expirará pronto');
        // Aquí podrías mostrar un toast o modal
      }

      if (timeUntilExpiry > warningTimeMs) {
        warningShownRef.current = false;
      }
    }, 5000); // Verificar cada 5 segundos

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      warningShownRef.current = false;
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      clearInterval(checkInterval);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, warningTimeMs]);
}
