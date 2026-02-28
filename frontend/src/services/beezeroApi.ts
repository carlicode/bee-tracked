import axios from 'axios';
import { storage } from './storage';
import type { Carrera } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function isBeezeroApiEnabled(): boolean {
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

export const beezeroApi = {
  /**
   * Registra una carrera en la pestaña del driver en Google Sheet Carreras_drivers.
   */
  async registrarCarrera(
    abejita: string,
    carrera: Partial<Carrera>
  ): Promise<{ carreraId: string; sheetTitle: string }> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const { data } = await axios.post<{
      success: boolean;
      carreraId?: string;
      sheetTitle?: string;
      error?: string;
    }>(
      `${API_BASE}/api/beezero/carreras/registrar`,
      {
        abejita,
        fecha: carrera.fecha,
        cliente: carrera.cliente,
        horaInicio: carrera.horaInicio || '',
        horaFin: carrera.horaFin || '',
        lugarRecojo: carrera.lugarRecojo,
        lugarDestino: carrera.lugarDestino,
        tiempo: carrera.tiempo || '',
        distancia: carrera.distancia ?? 0,
        precio: carrera.precio ?? 0,
        observaciones: carrera.observaciones || '',
        foto: carrera.foto || '',
      },
      { headers: { ...authHeaders(), 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    if (!data.success || data.carreraId == null)
      throw new Error(data.error || 'Error al registrar la carrera');
    return { carreraId: data.carreraId, sheetTitle: data.sheetTitle || '' };
  },

  /**
   * Obtiene las carreras de un driver desde el Google Sheet.
   * Opcionalmente filtra por fecha (YYYY-MM-DD).
   */
  async getCarreras(
    driverName: string,
    fecha?: string
  ): Promise<{ carreras: Carrera[] }> {
    if (!API_BASE) {
      throw new Error('Backend no configurado (VITE_API_URL). No se pueden obtener carreras.');
    }
    const params = fecha ? `?fecha=${encodeURIComponent(fecha)}` : '';
    const { data } = await axios.get<{
      success: boolean;
      carreras?: Array<{
        carreraId: string;
        abejita: string;
        fecha: string;
        cliente: string;
        horaInicio: string;
        horaFin: string;
        lugarRecojo: string;
        lugarDestino: string;
        tiempo: string;
        distancia: number;
        precio: number;
        observaciones: string;
        foto: string;
      }>;
      error?: string;
    }>(
      `${API_BASE}/api/beezero/carreras/${encodeURIComponent(driverName)}${params}`,
      { headers: authHeaders(), timeout: 10000 }
    );
    if (!data.success) throw new Error(data.error || 'Error al obtener carreras');
    const carreras: Carrera[] = (data.carreras || []).map((c) => ({
      fecha: c.fecha,
      cliente: c.cliente,
      horaInicio: c.horaInicio,
      horaFin: c.horaFin,
      lugarRecojo: c.lugarRecojo,
      lugarDestino: c.lugarDestino,
      tiempo: c.tiempo,
      distancia: c.distancia,
      precio: c.precio,
      observaciones: c.observaciones,
    }));
    return { carreras };
  },
};
