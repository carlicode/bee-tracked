import axios from 'axios';
import { storage } from './storage';

const API_BASE = import.meta.env.VITE_API_URL || '';

function authHeaders(): Record<string, string> {
  const token = storage.getToken();
  const sessionId = storage.getSessionId();
  const headers: Record<string, string> = {};
  
  if (token && token !== 'demo-token') {
    headers.Authorization = `Bearer ${token}`;
  }
  
  if (sessionId) {
    headers['X-Session-Id'] = sessionId;
  }
  
  return headers;
}

export const turnosApi = {
  /** Devuelve true si el frontend está configurado para usar el backend (Google Sheet). */
  isEnabled: (): boolean => Boolean(API_BASE),

  /**
   * Iniciar turno en el backend (escribe en la hoja BeeZero).
   * Payload compatible con POST /api/turnos/iniciar
   */
  async iniciar(payload: {
    abejita: string;
    auto: string;
    aperturaCaja: number;
    kilometraje?: number;
    danosAuto?: string;
    fotoPantalla?: string;
    fotoExterior?: string;
    horaInicio?: string;
    ubicacionInicio?: { lat: number; lng: number };
  }): Promise<{ id: string }> {
    try {
      const { data } = await axios.post<{ success: boolean; data: { id: string } }>(
        `${API_BASE}/api/turnos/iniciar`,
        payload,
        { timeout: 15000, headers: authHeaders() }
      );
      if (!data.success || !data.data?.id) throw new Error('Respuesta inválida al iniciar turno');
      return { id: data.data.id };
    } catch (err: unknown) {
      const ax = err && typeof err === 'object' && 'response' in err ? err as { response?: { status?: number; data?: { error?: string } }; message?: string } : null;
      const msg = ax?.response?.data?.error || (err instanceof Error ? err.message : 'Error de conexión');
      const status = ax?.response?.status;
      console.error('[turnosApi.iniciar]', status, msg, ax?.response?.data);
      throw new Error(status === 404 || (err instanceof Error && err.message.includes('Network Error')) ? 'Servidor no encontrado. ¿Está el backend en marcha en http://localhost:3001?' : msg);
    }
  },

  /**
   * Cerrar turno en el backend (actualiza la fila en la hoja BeeZero).
   */
  async cerrar(
    id: string,
    payload: {
      cierreCaja: number;
      qr?: number;
      kilometraje?: number;
      danosAuto?: string;
      fotoPantalla?: string;
      fotoExterior?: string;
      horaCierre?: string;
      ubicacionFin?: { lat: number; lng: number };
      observaciones?: string;
    }
  ): Promise<void> {
    try {
      const { data } = await axios.post<{ success: boolean }>(
        `${API_BASE}/api/turnos/${encodeURIComponent(id)}/cerrar`,
        payload,
        { timeout: 15000, headers: authHeaders() }
      );
      if (!data.success) throw new Error('Error al cerrar turno');
    } catch (err: unknown) {
      const ax = err && typeof err === 'object' && 'response' in err ? err as { response?: { status?: number; data?: { error?: string } }; message?: string } : null;
      const msg = ax?.response?.data?.error || (err instanceof Error ? err.message : 'Error de conexión');
      console.error('[turnosApi.cerrar]', ax?.response?.status, msg, ax?.response?.data);
      throw new Error(ax?.response?.status === 404 || (err instanceof Error && err.message.includes('Network Error')) ? 'Servidor no encontrado. ¿Está el backend en marcha?' : msg);
    }
  },
};
