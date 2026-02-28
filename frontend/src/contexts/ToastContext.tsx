import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useAuth } from '../services/auth';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastState {
  message: string;
  type: ToastType;
  onClose?: () => void;
}

export interface ToastContextValue {
  show: (message: string, type?: ToastType, options?: { onClose?: () => void }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastModal({
  message,
  type,
  onClose,
  onCloseCallback,
  userType,
}: {
  message: string;
  type: ToastType;
  onClose: () => void;
  onCloseCallback?: () => void;
  userType: 'beezero' | 'ecodelivery' | 'operador' | null;
}) {
  const theme = userType === 'ecodelivery' ? 'ecodelivery' : 'beezero'; // operador uses beezero theme

  const config = {
    success: {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgClass: theme === 'beezero' ? 'bg-beezero-yellow' : 'bg-ecodelivery-green',
      textClass: theme === 'beezero' ? 'text-black' : 'text-white',
      buttonClass: theme === 'beezero' ? 'bg-black text-beezero-yellow hover:bg-gray-800' : 'bg-white text-ecodelivery-green hover:bg-gray-100',
    },
    error: {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgClass: 'bg-red-600',
      textClass: 'text-white',
      buttonClass: 'bg-white text-red-600 hover:bg-gray-100',
    },
    info: {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgClass: theme === 'beezero' ? 'bg-beezero-yellow' : 'bg-ecodelivery-green',
      textClass: theme === 'beezero' ? 'text-black' : 'text-white',
      buttonClass: theme === 'beezero' ? 'bg-black text-beezero-yellow hover:bg-gray-800' : 'bg-white text-ecodelivery-green hover:bg-gray-100',
    },
  };

  const { icon, bgClass, textClass, buttonClass } = config[type];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="toast-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        <div className={`${bgClass} ${textClass} p-6 flex flex-col items-center text-center`}>
          <div className="mb-4">{icon}</div>
          <h2 id="toast-title" className="text-lg font-semibold mb-2">
            {type === 'success' && 'Listo'}
            {type === 'error' && 'Error'}
            {type === 'info' && 'Aviso'}
          </h2>
          <p className="text-sm opacity-95 leading-relaxed">{message}</p>
        </div>
        <div className="p-4 bg-gray-50">
          <button
            type="button"
            onClick={() => {
              onCloseCallback?.();
              onClose();
            }}
            className={`w-full py-3 rounded-xl font-semibold transition ${buttonClass}`}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { getUserType } = useAuth();
  const userType = getUserType();
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((message: string, type: ToastType = 'info', options?: { onClose?: () => void }) => {
    setToast({ message, type, onClose: options?.onClose });
  }, []);

  const close = useCallback(() => {
    setToast(null);
  }, []);

  const value: ToastContextValue = { show };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <ToastModal
          message={toast.message}
          type={toast.type}
          onClose={close}
          onCloseCallback={toast.onClose}
          userType={userType}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
