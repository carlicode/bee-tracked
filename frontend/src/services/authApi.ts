import axios from 'axios';
import { storage } from './storage';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type SessionCheckResult = {
  valid: boolean;
  code?: string;
  error?: string;
};

function sessionHeaders(): Record<string, string> {
  const token = storage.getToken();
  const sessionId = storage.getSessionId();
  const userId = storage.getUsername();
  const headers: Record<string, string> = {};
  if (token && token !== 'demo-token') headers.Authorization = `Bearer ${token}`;
  if (sessionId) headers['X-Session-Id'] = sessionId;
  if (userId) headers['X-User-Id'] = userId;
  return headers;
}

/**
 * Verifica en el backend si la sesión sigue activa.
 * Si no hay backend o no hay sessionId, asume válida (modo demo / compat).
 */
export async function checkSessionValid(): Promise<SessionCheckResult> {
  if (!API_BASE) return { valid: true };

  const sessionId = storage.getSessionId();
  const userId = storage.getUsername();
  if (!sessionId || !userId) {
    return {
      valid: false,
      code: 'AUTH_REQUIRED',
      error: 'Sesión inválida o expirada. Por favor inicia sesión nuevamente.',
    };
  }

  try {
    const { data } = await axios.get<{
      success: boolean;
      valid: boolean;
      code?: string;
      error?: string;
    }>(`${API_BASE}/api/auth/session/check`, {
      headers: sessionHeaders(),
      timeout: 8000,
    });

    if (data.valid) return { valid: true };
    return {
      valid: false,
      code: data.code || 'SESSION_EXPIRED',
      error: data.error || 'Sesión inválida o expirada. Por favor inicia sesión nuevamente.',
    };
  } catch {
    // Error de red o Lambda cold start: no bloquear al usuario.
    // La API real manejará cualquier error de auth real cuando intente cerrar/abrir el turno.
    return { valid: true };
  }
}
