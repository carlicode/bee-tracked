import axios, { AxiosError } from 'axios';
import { storage } from './storage';

const API_BASE = import.meta.env.VITE_API_URL || '';

function authHeaders(): Record<string, string> {
  const token = storage.getToken();
  const sessionId = storage.getSessionId();
  const username = storage.getUsername();
  const headers: Record<string, string> = {};
  if (token && token !== 'demo-token') headers.Authorization = `Bearer ${token}`;
  if (sessionId) headers['X-Session-Id'] = sessionId;
  if (username) headers['X-User-Id'] = username;
  return headers;
}

function getErrorMessage(err: unknown): string {
  if (
    err instanceof AxiosError &&
    err.response?.data &&
    typeof err.response.data === 'object' &&
    'error' in err.response.data
  ) {
    return String((err.response.data as { error?: string }).error);
  }
  return err instanceof Error ? err.message : 'Error de conexión';
}

export type DiaAsistencia = {
  fecha: string;
  resultado: string;
  detalle: string;
  horaEsperadaInicio?: string;
  horaEsperadaFin?: string;
  horaRealInicio?: string;
  horaRealFin?: string;
  minutosRetraso?: number;
  turnoId?: string | null;
};

export type ReporteAsistencia = {
  userId: string;
  userName: string;
  userType: string;
  fechaDesde?: string;
  fechaHasta?: string;
  dias: DiaAsistencia[];
};

export type TrabajadorTiempoReal = {
  userId: string;
  userName: string;
  userType: string;
  horaEsperadaInicio: string;
  horaEsperadaFin: string;
  horaRealInicio: string;
  horaRealFin: string;
  estado: string;
  minutosRetraso: number;
  turnoActivo: boolean;
  detalle: string;
  turnoId?: string | null;
};

export type ResumenTiempoReal = {
  debeTrabajar: number;
  trabajandoAhora: number;
  ausentes: number;
  libre: number;
  sinHorario: number;
  pendientes: number;
};

export type EstadoTiempoReal = {
  fecha: string;
  trabajadores: TrabajadorTiempoReal[];
  resumen: ResumenTiempoReal;
};

export const asistenciaApi = {
  async getTiempoReal(fecha?: string, userType = 'all'): Promise<EstadoTiempoReal> {
    const params = new URLSearchParams({ userType });
    if (fecha) params.set('fecha', fecha);
    const { data } = await axios.get<{
      success: boolean;
      fecha: string;
      trabajadores: TrabajadorTiempoReal[];
      resumen: ResumenTiempoReal;
    }>(`${API_BASE}/api/asistencia/tiempo-real?${params.toString()}`, {
      headers: authHeaders(),
      timeout: 30000,
    });
    return {
      fecha: data.fecha,
      trabajadores: data.trabajadores || [],
      resumen: data.resumen,
    };
  },

  async getReporte(
    fechaDesde: string,
    fechaHasta: string,
    userType = 'all',
    generarMultas = false
  ): Promise<ReporteAsistencia[]> {
    const { data } = await axios.get<{ success: boolean; reporte: ReporteAsistencia[] }>(
      `${API_BASE}/api/asistencia/reporte?fechaDesde=${encodeURIComponent(fechaDesde)}&fechaHasta=${encodeURIComponent(fechaHasta)}&userType=${userType}&generarMultas=${generarMultas}`,
      { headers: authHeaders(), timeout: 60000 }
    );
    return data.reporte || [];
  },

  exportCsvUrl(fechaDesde: string, fechaHasta: string, userType = 'all'): string {
    return `${API_BASE}/api/asistencia/export?fechaDesde=${encodeURIComponent(fechaDesde)}&fechaHasta=${encodeURIComponent(fechaHasta)}&userType=${userType}`;
  },

  parseError: getErrorMessage,
};
