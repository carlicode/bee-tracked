import axios from 'axios';
import { storage } from './storage';
import type { Turno } from '../types/turno';

const API_BASE = import.meta.env.VITE_API_URL || '';

/** Convierte fila del Sheet a formato Turno local */
function sheetRowToTurno(row: Record<string, unknown>): Turno {
  const lat = row['Ubicación Inicio (Lat)'];
  const lng = row['Ubicación Inicio (Lng)'];
  return {
    id: row.ID != null ? String(row.ID) : undefined,
    abejita: (row.Abejita as string) || '',
    auto: (row['Auto (Placa)'] as string) || '',
    aperturaCaja: parseFloat(String(row['Apertura Caja (Bs)'] || '0')) || 0,
    totalGastos: row['Total Gastos'] ? parseFloat(String(row['Total Gastos'])) : undefined,
    kilometraje: row['Kilometraje Inicio'] ? parseInt(String(row['Kilometraje Inicio'])) : undefined,
    bateria: (() => {
      const val = row['Bateria Inicio'] ?? row.Bateria;
      return val != null && val !== '' ? parseFloat(String(val)) : undefined;
    })(),
    danosAuto: (row['Daños Auto Inicio'] as string) || 'ninguno',
    fotoPantalla: (row['Foto Tablero Inicio'] as string) || '',
    fotoExterior: (row['Foto Exterior Inicio'] as string) || '',
    horaInicio: row['Hora Inicio'] as string,
    ubicacionInicio: {
      lat: parseFloat(String(lat || '0').replace(',', '.')) || 0,
      lng: parseFloat(String(lng || '0').replace(',', '.')) || 0,
      timestamp: (row['Timestamp Creación'] as string) || '',
    },
    turnoIniciado: true,
    turnoCerrado: false,
    createdAt: row['Timestamp Creación'] as string,
  };
}

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
   * Obtener turno activo (INICIADO) del usuario desde el backend.
   * Siempre consultar backend primero cuando está habilitado; localStorage es fallback.
   */
  async getTurnoActivo(driverName: string): Promise<Turno | null> {
    if (!API_BASE || !driverName) return null;
    try {
      const { data } = await axios.get<{ success: boolean; data?: Record<string, unknown> | null }>(
        `${API_BASE}/api/turnos/activo`,
        { params: { usuario: driverName }, timeout: 8000, headers: authHeaders() }
      );
      if (!data.success || !data.data) return null;
      return sheetRowToTurno(data.data);
    } catch (err) {
      console.error('[turnosApi.getTurnoActivo]', err);
      return null;
    }
  },

  /**
   * Iniciar turno en el backend (escribe en la hoja BeeZero).
   * Payload compatible con POST /api/turnos/iniciar
   */
  async iniciar(payload: {
    abejita: string;
    auto: string;
    aperturaCaja: number;
    kilometraje?: number | string;
    bateria?: number | string;
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
        { timeout: 40000, headers: authHeaders() }
      );
      if (!data.success || !data.data?.id) throw new Error('Respuesta inválida al iniciar turno');
      return { id: data.data.id };
    } catch (err: unknown) {
      const ax = axios.isAxiosError(err) ? err : null;
      const data = ax?.response?.data as { error?: string; code?: string } | undefined;
      const msg = data?.error || (err instanceof Error ? err.message : 'Error de conexión');
      const status = ax?.response?.status;
      console.error('[turnosApi.iniciar]', status, msg, data);
      const sinRespuesta = Boolean(ax) && !ax?.response;
      const e = new Error(
        sinRespuesta
          ? 'No se pudo conectar con el servidor. Revisa tu señal e intenta de nuevo en unos segundos.'
          : msg
      ) as Error & { statusCode?: number; code?: string };
      e.statusCode = status;
      e.code = data?.code;
      throw e;
    }
  },

  /**
   * Cerrar turno en el backend (actualiza la fila en la hoja BeeZero).
   */
  async cerrar(
    id: string,
    payload: {
      abejita?: string;
      cierreCaja: number;
      pagosQR?: number;
      gastos?: { tipo: string; monto: number; descripcion?: string }[];
      kilometraje?: number | string;
      bateria?: number | string;
      danosAuto?: string;
      fotoPantalla?: string;
      fotoExterior?: string;
      horaCierre?: string;
      ubicacionFin?: { lat: number; lng: number };
      observaciones?: string;
    }
  ): Promise<void> {
    const post = async () => {
      const { data } = await axios.post<{ success: boolean }>(
        `${API_BASE}/api/turnos/${encodeURIComponent(id)}/cerrar`,
        payload,
        { timeout: 40000, headers: authHeaders() }
      );
      if (!data.success) throw new Error('Error al cerrar turno');
    };

    const clasificar = (err: unknown) => {
      const ax = axios.isAxiosError(err) ? err : null;
      const data = ax?.response?.data as { error?: string } | undefined;
      return {
        status: ax?.response?.status,
        msg: data?.error || (err instanceof Error ? err.message : 'Error de conexión'),
        // Error axios sin respuesta = falla de red / timeout (el request pudo o no haber llegado)
        sinRespuesta: Boolean(ax) && !ax?.response,
      };
    };

    const lanzarConStatus = (msg: string, status?: number): never => {
      const e = new Error(msg) as Error & { statusCode?: number };
      e.statusCode = status;
      throw e;
    };

    try {
      await post();
      return;
    } catch (err: unknown) {
      const e1 = clasificar(err);
      console.error('[turnosApi.cerrar] intento 1', e1.status, e1.msg);
      if (e1.status === 401) lanzarConStatus(e1.msg, 401);
      if (!e1.sinRespuesta) throw new Error(e1.msg);
    }

    // Falla de red: reintentar una vez tras 2s (el patrón que ya usa iniciar turno)
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      await post();
    } catch (err: unknown) {
      const e2 = clasificar(err);
      console.error('[turnosApi.cerrar] intento 2', e2.status, e2.msg);
      // Si el primer intento sí llegó al servidor, el reintento responde "ya está cerrado": es éxito
      if (e2.status === 400 && e2.msg.toLowerCase().includes('ya está cerrado')) return;
      if (e2.status === 401) lanzarConStatus(e2.msg, 401);
      if (e2.sinRespuesta) {
        throw new Error(
          'No se pudo conectar con el servidor. Tus datos siguen en el formulario: revisa tu señal e intenta de nuevo.'
        );
      }
      throw new Error(e2.msg);
    }
  },
};
