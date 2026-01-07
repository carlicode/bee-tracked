import axios from 'axios';
import type { Carrera, ApiResponse } from '../types';
import { storage } from './storage';

// Modo demo: usar mock si no hay URL configurada
const DEMO_MODE = !import.meta.env.VITE_APPS_SCRIPT_URL;

if (!DEMO_MODE) {
  const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;
  
  if (!APPS_SCRIPT_URL) {
    throw new Error('VITE_APPS_SCRIPT_URL is not defined');
  }
}

let api: any = null;
if (!DEMO_MODE) {
  api = axios.create({
    baseURL: import.meta.env.VITE_APPS_SCRIPT_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// Helper para hacer requests a Apps Script
const appsScriptRequest = async <T>(
  method: 'GET' | 'POST',
  path: string,
  data?: any
): Promise<T> => {
  if (DEMO_MODE) {
    // En modo demo, usar mock
    const { mockApiService } = await import('./api-mock');
    const mockMethods: any = {
      'POST': {
        'auth': () => mockApiService.verifyAuth(data?.idToken),
        'carreras': () => mockApiService.createCarrera(data, data?.idToken),
      },
      'GET': {
        'carreras': () => mockApiService.getCarreras(data?.fecha),
        'clientes': () => mockApiService.autocompleteClientes(data?.q || ''),
      },
    };
    return mockMethods[method]?.[path]() || { success: false, error: 'Not found' };
  }
  
  const token = storage.getToken();
  
  if (method === 'GET') {
    const params = new URLSearchParams({
      path,
      token: token || '',
      ...(data || {}),
    });
    const response = await api.get(`?${params.toString()}`);
    return response.data;
  } else {
    const response = await api.post('', {
      path,
      ...data,
    });
    return response.data;
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
};

