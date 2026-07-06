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

export type Multa = {
  multaId: string;
  userId: string;
  userName: string;
  userType: string;
  fecha: string;
  tipo: string;
  minutos: number;
  montoBs: number;
  motivo: string;
  estado: string;
};

export type ReglasMultas = {
  margenMinutos: number;
  bloques: Array<{ minMinutos: number; maxMinutos: number; montoBs: number }>;
  tipos: { tardanza?: boolean; ausencia?: boolean; salidaTemprana?: boolean };
};

export const multasApi = {
  async getAdmin(estado = 'all'): Promise<Multa[]> {
    const { data } = await axios.get<{ success: boolean; multas: Multa[] }>(
      `${API_BASE}/api/multas/admin?estado=${estado}`,
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.multas || [];
  },

  async getReglas(): Promise<ReglasMultas> {
    const { data } = await axios.get<{ success: boolean; reglas: ReglasMultas }>(
      `${API_BASE}/api/multas/admin/reglas`,
      { headers: authHeaders(), timeout: 15000 }
    );
    return data.reglas;
  },

  async saveReglas(reglas: ReglasMultas): Promise<ReglasMultas> {
    const { data } = await axios.put<{ success: boolean; reglas: ReglasMultas }>(
      `${API_BASE}/api/multas/admin/reglas`,
      { reglas },
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.reglas;
  },

  async dispensar(userId: string, fecha: string, multaId: string, razon?: string): Promise<Multa> {
    const { data } = await axios.post<{ success: boolean; multa: Multa }>(
      `${API_BASE}/api/multas/admin/${encodeURIComponent(userId)}/${encodeURIComponent(fecha)}/${encodeURIComponent(multaId)}/dispensar`,
      { razon },
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.multa;
  },

  parseError: getErrorMessage,
};
