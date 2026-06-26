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

export type Extraordinario = {
  extraId: string;
  titulo: string;
  fecha: string;
  descripcion: string;
  horaInicioSugerida: string;
  horaFinSugerida: string;
  estado: string;
  reemplazaHorarioNormal?: boolean | null;
};

export type InscripcionExtra = {
  extraId: string;
  userId: string;
  userName: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
};

export const extraordinariosApi = {
  async getAbiertos(): Promise<Extraordinario[]> {
    const { data } = await axios.get<{ success: boolean; extraordinarios: Extraordinario[] }>(
      `${API_BASE}/api/extraordinarios/abiertos`,
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.extraordinarios || [];
  },

  async inscribirse(extraId: string, horaInicio?: string, horaFin?: string): Promise<InscripcionExtra> {
    const { data } = await axios.post<{ success: boolean; inscripcion: InscripcionExtra }>(
      `${API_BASE}/api/extraordinarios/${encodeURIComponent(extraId)}/inscribirse`,
      { horaInicio, horaFin },
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.inscripcion;
  },

  async getMisInscripciones(): Promise<InscripcionExtra[]> {
    const { data } = await axios.get<{ success: boolean; inscripciones: InscripcionExtra[] }>(
      `${API_BASE}/api/extraordinarios/mis-inscripciones`,
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.inscripciones || [];
  },

  async getAdmin(estado = 'all'): Promise<Extraordinario[]> {
    const { data } = await axios.get<{ success: boolean; extraordinarios: Extraordinario[] }>(
      `${API_BASE}/api/extraordinarios/admin?estado=${estado}`,
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.extraordinarios || [];
  },

  async crear(input: {
    titulo: string;
    fecha: string;
    descripcion?: string;
    horaInicioSugerida?: string;
    horaFinSugerida?: string;
    reemplazaHorarioNormal?: boolean;
  }): Promise<Extraordinario> {
    const { data } = await axios.post<{ success: boolean; extraordinario: Extraordinario }>(
      `${API_BASE}/api/extraordinarios/admin`,
      input,
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.extraordinario;
  },

  async cerrar(extraId: string): Promise<Extraordinario> {
    const { data } = await axios.post<{ success: boolean; extraordinario: Extraordinario }>(
      `${API_BASE}/api/extraordinarios/admin/${encodeURIComponent(extraId)}/cerrar`,
      {},
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.extraordinario;
  },

  async getInscripciones(extraId: string): Promise<InscripcionExtra[]> {
    const { data } = await axios.get<{ success: boolean; inscripciones: InscripcionExtra[] }>(
      `${API_BASE}/api/extraordinarios/admin/${encodeURIComponent(extraId)}/inscripciones`,
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.inscripciones || [];
  },

  async responderInscripcion(
    extraId: string,
    userName: string,
    accion: 'aprobar' | 'rechazar',
    razon?: string
  ): Promise<InscripcionExtra> {
    const { data } = await axios.post<{ success: boolean; inscripcion: InscripcionExtra }>(
      `${API_BASE}/api/extraordinarios/admin/${encodeURIComponent(extraId)}/inscripciones/responder`,
      { userName, accion, razon },
      { headers: authHeaders(), timeout: 20000 }
    );
    return data.inscripcion;
  },

  parseError: getErrorMessage,
};
