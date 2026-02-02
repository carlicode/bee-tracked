import axios, { AxiosInstance } from 'axios';
import type { Carrera, ApiResponse, Delivery } from '../types';
import type { TurnoSimple } from '../types/turno';
import { storage } from './storage';
import { logError, getErrorMessage } from '../utils/errors';

// Modo demo: usar mock si no hay URL configurada
const DEMO_MODE = !import.meta.env.VITE_APPS_SCRIPT_URL;

let api: AxiosInstance | null = null;

if (!DEMO_MODE) {
  const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;
  
  if (!APPS_SCRIPT_URL) {
    console.warn('VITE_APPS_SCRIPT_URL is not defined. Running in demo mode.');
  } else {
    api = axios.create({
      baseURL: APPS_SCRIPT_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });
  }
}

/**
 * Request data for Apps Script API
 */
interface AppsScriptRequestData {
  path?: string;
  [key: string]: any;
}

/**
 * Helper to make requests to Apps Script
 */
const appsScriptRequest = async <T>(
  method: 'GET' | 'POST',
  path: string,
  data?: AppsScriptRequestData
): Promise<T> => {
  if (DEMO_MODE || !api) {
    // En modo demo, usar mock
    const { mockApiService } = await import('./api-mock');
    const mockMethods: Record<string, Record<string, () => Promise<ApiResponse<unknown>>>> = {
      POST: {
        auth: () => mockApiService.verifyAuth(data?.idToken as string),
        carreras: () => mockApiService.createCarrera(data as any as Carrera, data?.idToken as string),
      },
      GET: {
        carreras: () => mockApiService.getCarreras(data?.fecha as string),
        clientes: () => mockApiService.autocompleteClientes((data?.q as string) || ''),
      },
    };
    const handler = mockMethods[method]?.[path];
    if (handler) {
      return handler() as Promise<T>;
    }
    return { success: false, error: 'Not found' } as T;
  }
  
  const token = storage.getToken();
  
  try {
    if (method === 'GET') {
      const params = new URLSearchParams({
        path,
        token: token || '',
        ...(data || {}),
      } as Record<string, string>);
      const response = await api.get(`?${params.toString()}`);
      return response.data as T;
    } else {
      const response = await api.post('', {
        path,
        ...data,
      });
      return response.data as T;
    }
  } catch (error) {
    logError(error, `API ${method} ${path}`);
    throw new Error(getErrorMessage(error));
  }
};

export const apiService = {
  // Verificar token y obtener usuario
  verifyAuth: async (idToken: string): Promise<ApiResponse<any>> => {
    return appsScriptRequest('POST', 'auth', { idToken });
  },

  // Crear nueva carrera
  createCarrera: async (carrera: Carrera, idToken: string): Promise<ApiResponse<Carrera>> => {
    return appsScriptRequest('POST', 'carreras', {
      ...carrera,
      idToken,
    });
  },

  // Listar carreras
  getCarreras: async (fecha?: string): Promise<ApiResponse<Carrera[]>> => {
    return appsScriptRequest('GET', 'carreras', fecha ? { fecha } : {});
  },

  // Autocomplete clientes
  autocompleteClientes: async (query: string): Promise<ApiResponse<string[]>> => {
    return appsScriptRequest('GET', 'clientes', { q: query });
  },

  // EcoDelivery endpoints
  iniciarTurnoBiker: async (turno: TurnoSimple): Promise<ApiResponse<TurnoSimple>> => {
    return appsScriptRequest('POST', 'ecodelivery/turnos/iniciar', turno as any);
  },

  cerrarTurnoBiker: async (turno: TurnoSimple): Promise<ApiResponse<TurnoSimple>> => {
    return appsScriptRequest('POST', 'ecodelivery/turnos/cerrar', turno as any);
  },

  crearDelivery: async (delivery: Delivery): Promise<ApiResponse<Delivery>> => {
    return appsScriptRequest('POST', 'ecodelivery/deliveries', delivery as any);
  },

  obtenerDeliveriesBiker: async (): Promise<ApiResponse<Delivery[]>> => {
    return appsScriptRequest('GET', 'ecodelivery/deliveries', {});
  },

  obtenerTurnosBiker: async (): Promise<ApiResponse<TurnoSimple[]>> => {
    return appsScriptRequest('GET', 'ecodelivery/turnos', {});
  },
};

