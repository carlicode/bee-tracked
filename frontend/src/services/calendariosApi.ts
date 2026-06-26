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

export type Turno = {
  inicio: string;
  fin: string;
};

export type DiaHorario = {
  fecha: string;
  trabaja: boolean;
  turnos: Turno[];
  horaInicio: string;
  horaFin: string;
};

export const SLOT_MINUTES = 30;
export const GRID_HORA_INICIO = '05:00';
export const GRID_HORA_FIN = '22:00';

export function timeToMinutes(h: string): number {
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + (mm || 0);
}

export function minutesToTime(m: number): string {
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function slotsInRange(inicio = GRID_HORA_INICIO, fin = GRID_HORA_FIN): string[] {
  const start = timeToMinutes(inicio);
  const end = timeToMinutes(fin);
  const out: string[] = [];
  for (let m = start; m < end; m += SLOT_MINUTES) {
    out.push(minutesToTime(m));
  }
  return out;
}

export function deriveHorasFromTurnos(turnos: Turno[]): { horaInicio: string; horaFin: string } {
  if (turnos.length === 0) return { horaInicio: '', horaFin: '' };
  return {
    horaInicio: turnos[0].inicio,
    horaFin: turnos[turnos.length - 1].fin,
  };
}

export function normalizeDiaHorario(d: Partial<DiaHorario> & { fecha: string }): DiaHorario {
  let turnos = d.turnos;
  if (!turnos || turnos.length === 0) {
    if (d.trabaja && d.horaInicio && d.horaFin) {
      turnos = [{ inicio: d.horaInicio, fin: d.horaFin }];
    } else {
      turnos = [];
    }
  }
  const trabaja = turnos.length > 0;
  const { horaInicio, horaFin } = deriveHorasFromTurnos(turnos);
  return { fecha: d.fecha, trabaja, turnos, horaInicio, horaFin };
}

export function turnosToBlocks(
  turnos: Turno[],
  gridInicio = GRID_HORA_INICIO,
  gridFin = GRID_HORA_FIN
): Set<number> {
  const gridStart = timeToMinutes(gridInicio);
  const slots = slotsInRange(gridInicio, gridFin);
  const selected = new Set<number>();
  for (const t of turnos) {
    const ini = timeToMinutes(t.inicio);
    const fin = timeToMinutes(t.fin);
    for (let m = ini; m < fin; m += SLOT_MINUTES) {
      const idx = (m - gridStart) / SLOT_MINUTES;
      if (idx >= 0 && idx < slots.length) selected.add(idx);
    }
  }
  return selected;
}

export function blocksToTurnos(
  blocks: Set<number>,
  gridInicio = GRID_HORA_INICIO,
  gridFin = GRID_HORA_FIN
): Turno[] {
  if (blocks.size === 0) return [];
  const gridStart = timeToMinutes(gridInicio);
  const slots = slotsInRange(gridInicio, gridFin);
  const sorted = [...blocks].sort((a, b) => a - b);
  const turnos: Turno[] = [];
  let startIdx = sorted[0];
  let prevIdx = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur !== prevIdx + 1) {
      const inicio = minutesToTime(gridStart + startIdx * SLOT_MINUTES);
      const fin = minutesToTime(gridStart + (prevIdx + 1) * SLOT_MINUTES);
      if (startIdx < slots.length) turnos.push({ inicio, fin });
      startIdx = cur;
    }
    if (cur != null) prevIdx = cur;
  }
  return turnos;
}

export function groupIntoWeeks(fechas: string[]): string[][] {
  const weeks: string[][] = [];
  for (let i = 0; i < fechas.length; i += 7) {
    weeks.push(fechas.slice(i, i + 7));
  }
  return weeks;
}

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
    out[fecha] = normalizeDiaHorario({ fecha, trabaja: false, turnos: [], horaInicio: '', horaFin: '' });
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
