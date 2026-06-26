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

export type DiaCalendario = {
  fecha: string;
  trabaja: boolean;
  horaInicio: string;
  horaFin: string;
  nota?: string;
};

export type CalendarioSemana = {
  userId: string;
  userName: string;
  userType: string;
  semana: string;
  fechaInicioSemana: string;
  dias: Record<string, DiaCalendario>;
  estado?: string;
};

export type PropuestaCalendario = {
  propuestaId: string;
  userId: string;
  userName: string;
  userType: string;
  semana: string;
  fechaInicioSemana: string;
  dias: Record<string, DiaCalendario>;
  estado: string;
};

export const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;

export const calendariosApi = {
  async getSemanaActual(): Promise<{ semana: string; fechaInicioSemana: string }> {
    const { data } = await axios.get<{
      success: boolean;
      semana: string;
      fechaInicioSemana: string;
    }>(`${API_BASE}/api/calendarios/utils/semana-actual`, {
      headers: authHeaders(),
      timeout: 15000,
    });
    return { semana: data.semana, fechaInicioSemana: data.fechaInicioSemana };
  },

  async getMiCalendario(semana?: string): Promise<CalendarioSemana | CalendarioSemana[]> {
    const url = semana
      ? `${API_BASE}/api/calendarios/mi-calendario?semana=${encodeURIComponent(semana)}`
      : `${API_BASE}/api/calendarios/mi-calendario`;
    const { data } = await axios.get<{
      success: boolean;
      calendario?: CalendarioSemana;
      calendarios?: CalendarioSemana[];
    }>(url, { headers: authHeaders(), timeout: 20000 });
    if (semana) return data.calendario as CalendarioSemana;
    return data.calendarios || [];
  },

  async enviarPropuesta(input: {
    semana: string;
    fechaInicioSemana: string;
    dias: Record<string, Partial<DiaCalendario>>;
  }): Promise<PropuestaCalendario> {
    const { data } = await axios.post<{ success: boolean; propuesta: PropuestaCalendario }>(
      `${API_BASE}/api/calendarios/propuesta`,
      input,
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.propuesta;
  },

  async getAdminSemana(semana: string, userType = 'all'): Promise<CalendarioSemana[]> {
    const { data } = await axios.get<{ success: boolean; calendarios: CalendarioSemana[] }>(
      `${API_BASE}/api/calendarios/admin/semana?semana=${encodeURIComponent(semana)}&userType=${userType}`,
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.calendarios || [];
  },

  async saveAdminSemana(input: {
    semana: string;
    fechaInicioSemana: string;
    calendarios: Array<{
      userId: string;
      userName: string;
      userType: string;
      dias: Record<string, Partial<DiaCalendario>>;
    }>;
  }): Promise<CalendarioSemana[]> {
    const { data } = await axios.post<{ success: boolean; calendarios: CalendarioSemana[] }>(
      `${API_BASE}/api/calendarios/admin/semana`,
      input,
      { headers: authHeaders(), timeout: 30000 }
    );
    return data.calendarios || [];
  },

  async getPropuestasPendientes(): Promise<PropuestaCalendario[]> {
    const { data } = await axios.get<{ success: boolean; propuestas: PropuestaCalendario[] }>(
      `${API_BASE}/api/calendarios/admin/propuestas`,
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.propuestas || [];
  },

  async responderPropuesta(
    propuestaId: string,
    userName: string,
    accion: 'aprobar' | 'rechazar',
    razon?: string
  ): Promise<PropuestaCalendario> {
    const { data } = await axios.post<{ success: boolean; propuesta: PropuestaCalendario }>(
      `${API_BASE}/api/calendarios/admin/propuestas/${encodeURIComponent(propuestaId)}/responder`,
      { userName, accion, razon },
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.propuesta;
  },

  parseError: getErrorMessage,
};
