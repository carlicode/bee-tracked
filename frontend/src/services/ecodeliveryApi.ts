import axios from 'axios';
import { storage } from './storage';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function isEcodeliveryApiEnabled(): boolean {
  return Boolean(API_BASE);
}

function authHeaders(): Record<string, string> {
  const token = storage.getToken();
  const sessionId = storage.getSessionId();
  const headers: Record<string, string> = {};
  if (token && token !== 'demo-token') headers.Authorization = `Bearer ${token}`;
  if (sessionId) headers['X-Session-Id'] = sessionId;
  return headers;
}

export const ecodeliveryApi = {
  /**
   * Registra inicio de turno en Google Sheet Ecodelivery.
   */
  async iniciarTurno(params: {
    usuario: string;
    fechaInicio: string;
    horaInicio: string;
    latInicio?: number;
    lngInicio?: number;
    timestampInicio: string;
    fotoInicio?: string;
  }): Promise<{ turnoId: string }> {
    if (!API_BASE) throw new Error('Backend no configurado');
    const { data } = await axios.post<{ success: boolean; turnoId?: string; error?: string }>(
      `${API_BASE}/api/ecodelivery/turnos/iniciar`,
      params,
      { headers: { ...authHeaders(), 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    if (!data.success || !data.turnoId) throw new Error(data.error || 'Error al registrar inicio de turno');
    return { turnoId: data.turnoId };
  },

  /**
   * Registra cierre de turno en Google Sheet Ecodelivery.
   */
  async cerrarTurno(params: {
    turnoId: string;
    fechaCierre: string;
    horaCierre: string;
    latCierre?: number;
    lngCierre?: number;
    timestampCierre: string;
    fotoCierre?: string;
  }): Promise<void> {
    if (!API_BASE) throw new Error('Backend no configurado');
    const { data } = await axios.post<{ success: boolean; error?: string }>(
      `${API_BASE}/api/ecodelivery/turnos/cerrar`,
      params,
      { headers: { ...authHeaders(), 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    if (!data.success) throw new Error(data.error || 'Error al registrar cierre de turno');
  },

  /**
   * Registra un delivery en la pestaña del biker en el sheet Carreras_bikers.
   */
  async registrarDelivery(params: {
    bikerName: string;
    cliente: string;
    lugarOrigen: string;
    lugarDestino: string;
    distancia: number;
    porHora?: boolean;
    notas?: string;
    fechaRegistro?: string;
    horaRegistro?: string;
    horaInicio?: string;
    horaFin?: string;
    foto?: string;
  }): Promise<{ deliveryId: string; sheetTitle: string }> {
    if (!API_BASE) throw new Error('Backend no configurado');
    const { data } = await axios.post<{
      success: boolean;
      deliveryId?: string;
      sheetTitle?: string;
      error?: string;
    }>(
      `${API_BASE}/api/ecodelivery/deliveries/registrar`,
      params,
      { headers: { ...authHeaders(), 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    if (!data.success || data.deliveryId == null)
      throw new Error(data.error || 'Error al registrar delivery');
    return { deliveryId: data.deliveryId, sheetTitle: data.sheetTitle || '' };
  },

  /**
   * Obtiene todos los deliveries de un biker desde el Google Sheet
   * Ruta: Carreras_bikers (pestaña del biker)
   */
  async getDeliveriesByBiker(bikerName: string): Promise<{
    deliveries: Array<{
      id: string;
      biker: string;
      fecha: string;
      hora: string;
      cliente: string;
      lugarOrigen: string;
      horaInicio: string;
      lugarDestino: string;
      horaFin: string;
      distancia: number;
      porHora: boolean;
      notas: string;
      foto: string;
    }>;
  }> {
    if (!API_BASE) {
      throw new Error('Backend no configurado (VITE_API_URL). No se pueden obtener deliveries.');
    }
    const { data } = await axios.get<{
      success: boolean;
      deliveries?: any[];
      error?: string;
    }>(`${API_BASE}/api/ecodelivery/deliveries/${encodeURIComponent(bikerName)}`, {
      headers: authHeaders(),
      timeout: 10000,
    });
    if (!data.success) {
      throw new Error(data.error || 'Error al obtener deliveries');
    }
    return { deliveries: data.deliveries || [] };
  },

  /**
   * Sube una foto de turno (inicio/cierre) a S3
   * Ruta: Registros_BeeTracked/Ecodelivery/Turnos/
   */
  async uploadPhoto(params: {
    dataUrl: string;
    username: string;
    momento: 'inicio' | 'cierre';
  }): Promise<{ url: string }> {
    if (!API_BASE) {
      throw new Error('Backend no configurado (VITE_API_URL). No se puede subir la foto.');
    }
    const { data } = await axios.post<{ success: boolean; url?: string; error?: string }>(
      `${API_BASE}/api/ecodelivery/upload-photo`,
      params,
      { headers: { ...authHeaders(), 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    if (!data.success || !data.url) {
      throw new Error(data.error || 'Error al subir la foto');
    }
    return { url: data.url };
  },

  /**
   * Sube una foto de delivery a S3
   * Ruta: Registros_BeeTracked/Ecodelivery/Deliveries/
   */
  async uploadDeliveryPhoto(params: {
    dataUrl: string;
    username: string;
  }): Promise<{ url: string }> {
    if (!API_BASE) {
      throw new Error('Backend no configurado (VITE_API_URL). No se puede subir la foto.');
    }
    const { data } = await axios.post<{ success: boolean; url?: string; error?: string }>(
      `${API_BASE}/api/ecodelivery/upload-delivery-photo`,
      params,
      { headers: { ...authHeaders(), 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    if (!data.success || !data.url) {
      throw new Error(data.error || 'Error al subir la foto');
    }
    return { url: data.url };
  },
};
