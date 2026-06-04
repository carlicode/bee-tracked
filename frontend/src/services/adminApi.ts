import axios, { AxiosError } from 'axios';
import { storage } from './storage';
import type {
  Announcement,
  AnnouncementStats,
  CreateAnnouncementInput,
} from './andiApi';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function isAdminApiEnabled(): boolean {
  return Boolean(API_BASE);
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

export interface AdminDriverTabsResponse {
  tabs: string[];
  allTabs: string[];
}

export interface LiveTurnoActivo {
  turnoId: string;
  userId: string;
  nombre: string;
  horaInicio: string;
  tiempoTranscurrido: string;
  placa?: string;
  tienePermiso?: boolean;
}

export interface LiveDashboardResponse {
  beezero: {
    activos: LiveTurnoActivo[];
    totalActivos: number;
  };
  ecodelivery: {
    activos: LiveTurnoActivo[];
    totalActivos: number;
  };
  operador: {
    activos: LiveTurnoActivo[];
    totalActivos: number;
  };
  resumen: {
    totalActivos: number;
    carrerasHoy: number;
    permisosHoy?: number;
    timestamp: string;
    fecha: string;
  };
}

export type { Announcement, AnnouncementStats };

export interface AdminUser {
  nombre: string;
  usuario: string;
  rol: string;
}

export interface CreateAdminUserInput {
  nombre: string;
  usuario: string;
  password: string;
  rol: string;
}

export interface RendimientoDriver {
  nombre: string;
  totalCarreras: number;
  conPrecio: number;
  sinPrecio: number;
  porcentajeConPrecio: number;
  totalGanancia: number;
}

export interface RendimientoTotales {
  totalCarreras: number;
  conPrecio: number;
  sinPrecio: number;
  porcentaje: number;
  totalGanancia: number;
}

export const adminApi = {
  async getDriverTabs(): Promise<AdminDriverTabsResponse> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const { data } = await axios.get<{
      success: boolean;
      tabs?: string[];
      allTabs?: string[];
      error?: string;
    }>(`${API_BASE}/api/admin/carreras/drivers`, {
      headers: authHeaders(),
      timeout: 20000,
    });
    if (!data.success)
      throw new Error(data.error || 'Error al listar drivers');
    return {
      tabs: data.tabs || [],
      allTabs: data.allTabs || [],
    };
  },

  async getCarrerasByDriver(
    tab: string,
    from?: string,
    to?: string
  ): Promise<{ headers: string[]; carreras: Record<string, string>[]; tab: string }> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    const qs = q.toString();
    const encodedTab = encodeURIComponent(tab);
    const { data } = await axios.get<{
      success: boolean;
      tab?: string;
      headers?: string[];
      carreras?: Record<string, string>[];
      error?: string;
    }>(`${API_BASE}/api/admin/carreras/${encodedTab}${qs ? `?${qs}` : ''}`, {
      headers: authHeaders(),
      timeout: 60000,
    });
    if (!data.success)
      throw new Error(data.error || 'Error al obtener carreras');
    return {
      tab: data.tab || tab,
      headers: data.headers || [],
      carreras: data.carreras || [],
    };
  },

  async getTurnosBeezero(): Promise<{
    headers: string[];
    turnos: Record<string, string>[];
  }> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const { data } = await axios.get<{
      success: boolean;
      headers?: string[];
      turnos?: Record<string, string>[];
      error?: string;
    }>(`${API_BASE}/api/admin/turnos/beezero`, {
      headers: authHeaders(),
      timeout: 60000,
    });
    if (!data.success)
      throw new Error(data.error || 'Error al obtener turnos');
    return {
      headers: data.headers || [],
      turnos: data.turnos || [],
    };
  },

  async getTurnosEcodelivery(): Promise<{
    headers: string[];
    turnos: Record<string, string>[];
  }> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const { data } = await axios.get<{
      success: boolean;
      headers?: string[];
      turnos?: Record<string, string>[];
      error?: string;
    }>(`${API_BASE}/api/admin/turnos/ecodelivery`, {
      headers: authHeaders(),
      timeout: 60000,
    });
    if (!data.success)
      throw new Error(data.error || 'Error al obtener turnos');
    return {
      headers: data.headers || [],
      turnos: data.turnos || [],
    };
  },

  async getLiveDashboard(): Promise<LiveDashboardResponse> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const { data } = await axios.get<{
      success: boolean;
      beezero?: LiveDashboardResponse['beezero'];
      ecodelivery?: LiveDashboardResponse['ecodelivery'];
      operador?: LiveDashboardResponse['operador'];
      resumen?: LiveDashboardResponse['resumen'];
      error?: string;
    }>(`${API_BASE}/api/admin/dashboard/live`, {
      headers: authHeaders(),
      timeout: 30000,
    });
    if (!data.success)
      throw new Error(data.error || 'Error al obtener dashboard en vivo');
    return {
      beezero: data.beezero || { activos: [], totalActivos: 0 },
      ecodelivery: data.ecodelivery || { activos: [], totalActivos: 0 },
      operador: data.operador || { activos: [], totalActivos: 0 },
      resumen: data.resumen || {
        totalActivos: 0,
        carrerasHoy: 0,
        timestamp: new Date().toISOString(),
        fecha: new Date().toISOString().slice(0, 10),
      },
    };
  },

  async getBikerTabs(): Promise<AdminDriverTabsResponse> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const { data } = await axios.get<{
      success: boolean;
      tabs?: string[];
      allTabs?: string[];
      error?: string;
    }>(`${API_BASE}/api/admin/carreras/bikers/tabs`, {
      headers: authHeaders(),
      timeout: 20000,
    });
    if (!data.success) throw new Error(data.error || 'Error al listar bikers');
    return { tabs: data.tabs || [], allTabs: data.allTabs || [] };
  },

  async getEntregasByBiker(
    tab: string,
    from?: string,
    to?: string,
  ): Promise<{ headers: string[]; entregas: Record<string, string>[]; tab: string }> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    const qs = q.toString();
    const { data } = await axios.get<{
      success: boolean;
      tab?: string;
      headers?: string[];
      entregas?: Record<string, string>[];
      error?: string;
    }>(`${API_BASE}/api/admin/carreras/bikers/${encodeURIComponent(tab)}${qs ? `?${qs}` : ''}`, {
      headers: authHeaders(),
      timeout: 60000,
    });
    if (!data.success) throw new Error(data.error || 'Error al obtener entregas');
    return { tab: data.tab || tab, headers: data.headers || [], entregas: data.entregas || [] };
  },

  async getAnnouncements(status?: 'active' | 'expired' | 'all'): Promise<Announcement[]> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const { data } = await axios.get<{
      success: boolean;
      announcements?: Announcement[];
      error?: string;
    }>(`${API_BASE}/api/admin/anuncios`, {
      headers: authHeaders(),
      params: status ? { status } : undefined,
      timeout: 20000,
    });
    if (!data.success)
      throw new Error(data.error || 'Error al listar anuncios');
    return data.announcements || [];
  },

  async deleteAnnouncement(id: string): Promise<void> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const { data } = await axios.delete<{ success: boolean; error?: string }>(
      `${API_BASE}/api/admin/anuncios/${id}`,
      { headers: authHeaders(), timeout: 20000 }
    );
    if (!data.success)
      throw new Error(data.error || 'Error al eliminar anuncio');
  },

  async getAnnouncementStats(id: string): Promise<AnnouncementStats> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const { data } = await axios.get<{ success: boolean; stats: AnnouncementStats; error?: string }>(
      `${API_BASE}/api/admin/anuncios/${id}/stats`,
      { headers: authHeaders(), timeout: 20000 }
    );
    if (!data.success)
      throw new Error(data.error || 'Error al obtener estadísticas');
    return data.stats;
  },

  async createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const { data } = await axios.post<{ success: boolean; announcement: Announcement; error?: string }>(
      `${API_BASE}/api/admin/anuncios`,
      input,
      { headers: authHeaders(), timeout: 20000 }
    );
    if (!data.success)
      throw new Error(data.error || 'Error al crear anuncio');
    return data.announcement;
  },

  async getUsers(): Promise<AdminUser[]> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const { data } = await axios.get<{ success: boolean; users: AdminUser[]; error?: string }>(
      `${API_BASE}/api/admin/usuarios`,
      { headers: authHeaders(), timeout: 20000 }
    );
    if (!data.success) throw new Error(data.error || 'Error al listar usuarios');
    return data.users || [];
  },

  async createUser(input: CreateAdminUserInput): Promise<AdminUser> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const { data } = await axios.post<{ success: boolean; user: AdminUser; error?: string }>(
      `${API_BASE}/api/admin/usuarios`,
      input,
      { headers: authHeaders(), timeout: 20000 }
    );
    if (!data.success) throw new Error(data.error || 'Error al crear usuario');
    return data.user;
  },

  async getRendimiento(params: {
    desde?: string;
    hasta?: string;
    tipo?: 'all' | 'beezero' | 'ecodelivery';
  }): Promise<{ drivers: RendimientoDriver[]; totales: RendimientoTotales }> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const q = new URLSearchParams();
    if (params.desde) q.set('desde', params.desde);
    if (params.hasta) q.set('hasta', params.hasta);
    if (params.tipo) q.set('tipo', params.tipo);
    const { data } = await axios.get<{
      success: boolean;
      drivers: RendimientoDriver[];
      totales: RendimientoTotales;
      error?: string;
    }>(`${API_BASE}/api/admin/rendimiento?${q.toString()}`, {
      headers: authHeaders(),
      timeout: 60000,
    });
    if (!data.success) throw new Error(data.error || 'Error al obtener rendimiento');
    return { drivers: data.drivers || [], totales: data.totales };
  },

  parseError(err: unknown): string {
    return getErrorMessage(err);
  },
};
