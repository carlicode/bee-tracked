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

export type DiaHorario = {
  fecha: string;
  trabaja: boolean;
  horaInicio: string;
  horaFin: string;
};

export type Horario = {
  horarioId: string;
  userId: string;
  userName: string;
  userType: string;
  fechaDesde: string;
  fechaHasta: string;
  dias: Record<string, DiaHorario>;
  estado: 'enviado' | 'activo' | string;
  version: number;
  enviadoPor?: string | null;
  enviadoEn: number;
  editadoPor?: string | null;
  editadoEn?: number | null;
};

export type Habilitacion = {
  habilitada: boolean;
  fechaDesde: string;
  fechaHasta: string;
  habilitadoPor?: string | null;
  habilitadoEn?: number | null;
  baseHorarioId?: string | null;
};

export type WorkerEstado = {
  habilitacion: Habilitacion | null;
  puedeEnviar: boolean;
  horarioActivo: Horario | null;
  ultimoHorario: Horario | null;
  baseParaFormulario: Horario | null;
  historial: Horario[];
};

export type VentanaAbierta = {
  userId: string;
  userName: string;
  userType: string;
  fechaDesde: string;
  fechaHasta: string;
  habilitadoEn: number;
  baseHorarioId?: string | null;
};

export type CeldaVisual = {
  tipo: 'trabaja' | 'libre' | 'fuera_rango';
  horaInicio?: string;
  horaFin?: string;
};

export type FilaVisual = {
  userId: string;
  userName: string;
  userType: string;
  horarioId: string;
  estado: string;
  celdas: Record<string, CeldaVisual>;
};

export function fechasEnRango(fechaDesde: string, fechaHasta: string): string[] {
  const out: string[] = [];
  let cur = new Date(`${fechaDesde}T12:00:00`);
  const end = new Date(`${fechaHasta}T12:00:00`);
  while (cur <= end && out.length < 35) {
    out.push(cur.toISOString().slice(0, 10));
    cur = new Date(cur.getTime() + 86400000);
  }
  return out;
}

export function diaSemanaLabel(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00`);
  return d.toLocaleDateString('es-BO', { weekday: 'short' });
}

export function emptyDias(fechaDesde: string, fechaHasta: string): Record<string, DiaHorario> {
  const out: Record<string, DiaHorario> = {};
  for (const fecha of fechasEnRango(fechaDesde, fechaHasta)) {
    out[fecha] = { fecha, trabaja: false, horaInicio: '06:00', horaFin: '14:00' };
  }
  return out;
}

export const calendariosApi = {
  async getMiEstado(): Promise<WorkerEstado> {
    const { data } = await axios.get<{ success: boolean } & WorkerEstado>(
      `${API_BASE}/api/calendarios/mi-estado`,
      { headers: authHeaders(), timeout: 20000 }
    );
    return data;
  },

  async enviarHorario(input: {
    dias: Record<string, DiaHorario>;
    fechaDesde: string;
    fechaHasta: string;
  }): Promise<Horario> {
    const { data } = await axios.post<{ success: boolean; horario: Horario }>(
      `${API_BASE}/api/calendarios/enviar`,
      input,
      { headers: authHeaders(), timeout: 30000 }
    );
    return data.horario;
  },

  async getVentanas(): Promise<VentanaAbierta[]> {
    const { data } = await axios.get<{ success: boolean; ventanas: VentanaAbierta[] }>(
      `${API_BASE}/api/calendarios/admin/ventanas`,
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.ventanas || [];
  },

  async getPendientes(): Promise<Horario[]> {
    const { data } = await axios.get<{ success: boolean; horarios: Horario[] }>(
      `${API_BASE}/api/calendarios/admin/pendientes`,
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.horarios || [];
  },

  async habilitar(input: {
    userId?: string;
    userName: string;
    userType: string;
    fechaDesde: string;
    fechaHasta: string;
    baseHorarioId?: string;
  }): Promise<Habilitacion> {
    const { data } = await axios.post<{ success: boolean; habilitacion: Habilitacion }>(
      `${API_BASE}/api/calendarios/admin/habilitar`,
      input,
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.habilitacion;
  },

  async rehabilitar(input: { userId?: string; userName: string; userType: string }): Promise<Habilitacion> {
    const { data } = await axios.post<{ success: boolean; habilitacion: Habilitacion }>(
      `${API_BASE}/api/calendarios/admin/rehabilitar`,
      input,
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.habilitacion;
  },

  async editarHorario(
    userName: string,
    horarioId: string,
    dias: Record<string, DiaHorario>,
    marcarActivo = true
  ): Promise<Horario> {
    const { data } = await axios.put<{ success: boolean; horario: Horario }>(
      `${API_BASE}/api/calendarios/admin/editar/${encodeURIComponent(userName)}/${encodeURIComponent(horarioId)}`,
      { dias, marcarActivo },
      { headers: authHeaders(), timeout: 30000 }
    );
    return data.horario;
  },

  async getVisual(fechaDesde: string, fechaHasta: string): Promise<{ fechas: string[]; rows: FilaVisual[] }> {
    const { data } = await axios.get<{ success: boolean; calendario: { fechas: string[]; rows: FilaVisual[] } }>(
      `${API_BASE}/api/calendarios/admin/visual?fechaDesde=${encodeURIComponent(fechaDesde)}&fechaHasta=${encodeURIComponent(fechaHasta)}`,
      { headers: authHeaders(), timeout: 30000 }
    );
    return data.calendario;
  },

  parseError: getErrorMessage,
};
