import axios, { AxiosError } from 'axios';
import { storage } from './storage';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type PermisoMotivo = 'Personal' | 'Salud' | 'Vacaciones' | 'Otro';
export type PermisoEstado = 'pendiente' | 'aprobado' | 'rechazado';

export interface Permiso {
  permisoId: string;
  userId: string;
  userName: string;
  userType: string;
  fecha: string;
  motivo: PermisoMotivo;
  nota: string;
  estado: PermisoEstado;
  creadoEn: number;
  respondidoPor?: string | null;
  respondidoEn?: number | null;
  razonRechazo?: string | null;
}

export interface SolicitarPermisoInput {
  fecha: string;
  motivo: PermisoMotivo;
  nota?: string;
  comprobante?: string;
}

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

export function isPermisosApiEnabled(): boolean {
  return Boolean(API_BASE);
}

export function tomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export const permisosApi = {
  async solicitar(input: SolicitarPermisoInput): Promise<Permiso> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const { data } = await axios.post<{ success: boolean; permiso: Permiso; error?: string }>(
      `${API_BASE}/api/permisos/solicitar`,
      input,
      { headers: authHeaders(), timeout: 20000 }
    );
    if (!data.success) throw new Error(data.error || 'Error al solicitar permiso');
    return data.permiso;
  },

  async getMisPermisos(): Promise<Permiso[]> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const { data } = await axios.get<{ success: boolean; permisos: Permiso[]; error?: string }>(
      `${API_BASE}/api/permisos/mis-permisos`,
      { headers: authHeaders(), timeout: 20000 }
    );
    if (!data.success) throw new Error(data.error || 'Error al listar permisos');
    return data.permisos || [];
  },

  async getAdminPermisos(estado: 'all' | PermisoEstado = 'pendiente'): Promise<Permiso[]> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const { data } = await axios.get<{ success: boolean; permisos: Permiso[]; error?: string }>(
      `${API_BASE}/api/permisos/admin?estado=${estado}`,
      { headers: authHeaders(), timeout: 20000 }
    );
    if (!data.success) throw new Error(data.error || 'Error al listar permisos');
    return data.permisos || [];
  },

  async getPendientesCount(): Promise<number> {
    if (!API_BASE) return 0;
    const { data } = await axios.get<{ success: boolean; count: number }>(
      `${API_BASE}/api/permisos/pendientes/count`,
      { headers: authHeaders(), timeout: 15000 }
    );
    return data.success ? data.count : 0;
  },

  async responder(permisoId: string, accion: 'aprobar' | 'rechazar', razon?: string): Promise<Permiso> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const { data } = await axios.post<{ success: boolean; permiso: Permiso; error?: string }>(
      `${API_BASE}/api/permisos/${encodeURIComponent(permisoId)}/responder`,
      { accion, razon },
      { headers: authHeaders(), timeout: 20000 }
    );
    if (!data.success) throw new Error(data.error || 'Error al responder permiso');
    return data.permiso;
  },

  parseError: getErrorMessage,
};
