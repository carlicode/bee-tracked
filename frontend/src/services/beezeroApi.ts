import axios, { AxiosError } from 'axios';
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

/** Habilitar en consola: window.__BEEZERO_DEBUG__ = true */
const DEBUG = import.meta.env.DEV || (typeof window !== 'undefined' && (window as any).__BEEZERO_DEBUG__);

function getErrorMessage(err: unknown): string {
  if (err instanceof AxiosError && err.response?.data && typeof err.response.data === 'object' && 'error' in err.response.data) {
    return String(err.response.data.error);
  }
  return err instanceof Error ? err.message : 'Error de conexión';
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

    const payload = {
      abejita,
      fecha: carrera.fecha,
      cliente: carrera.cliente,
      horaInicio: carrera.horaInicio || '',
      horaFin: carrera.horaFin || '',
      lugarRecojo: carrera.porHora ? '' : (carrera.lugarRecojo ?? ''),
      lugarDestino: carrera.porHora ? '' : (carrera.lugarDestino ?? ''),
      tiempo: carrera.tiempo || '',
      distancia: carrera.porHora ? 0 : (carrera.distancia ?? 0),
      precio: carrera.precio ?? 0,
      porHora: carrera.porHora ?? false,
      aCuenta: carrera.aCuenta ?? false,
      pagoPorQR: carrera.pagoPorQR ?? false,
      observaciones: carrera.observaciones || '',
      foto: carrera.foto || '',
    };
    const url = `${API_BASE}/api/beezero/carreras/registrar`;
    if (DEBUG) {
      console.debug('[beezeroApi] registrarCarrera', { url, payload, porHora: payload.porHora, aCuenta: payload.aCuenta, pagoPorQR: payload.pagoPorQR });
    }

    try {
      const { data } = await axios.post<{
        success: boolean;
        carreraId?: string;
        sheetTitle?: string;
        error?: string;
      }>(
        url,
        payload,
        { headers: { ...authHeaders(), 'Content-Type': 'application/json' }, timeout: 40000 }
      );
      if (!data.success || data.carreraId == null)
        throw new Error(data.error || 'Error al registrar la carrera');
      return { carreraId: data.carreraId, sheetTitle: data.sheetTitle || '' };
    } catch (err) {
      const ax = err as AxiosError<{ error?: string }>;
      console.warn('[beezeroApi] Error registrarCarrera', {
        url,
        status: ax.response?.status,
        data: ax.response?.data,
        payload,
      });
      throw new Error(getErrorMessage(err));
    }
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
        fechaCreacion: string;
        horaCreacion: string;
        porHora?: boolean;
        aCuenta?: boolean;
        pagoPorQR?: boolean;
      }>;
      error?: string;
    }>(
      `${API_BASE}/api/beezero/carreras/${encodeURIComponent(driverName)}${params}`,
      { headers: authHeaders(), timeout: 10000 }
    );
    if (!data.success) throw new Error(data.error || 'Error al obtener carreras');
    const carreras: Carrera[] = (data.carreras || []).map((c) => ({
      carreraId: c.carreraId,
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
      foto: c.foto,
      fechaCreacion: c.fechaCreacion,
      horaCreacion: c.horaCreacion,
      porHora: c.porHora,
      aCuenta: c.aCuenta,
      pagoPorQR: c.pagoPorQR,
    }));
    return { carreras };
  },

  /**
   * Edita una carrera existente en la pestaña del driver.
   */
  async editarCarrera(
    abejita: string,
    carreraId: string,
    carrera: Partial<Carrera> & { fechaCreacion?: string; horaCreacion?: string },
    original: Carrera
  ): Promise<void> {
    if (!API_BASE) throw new Error('Backend no configurado (VITE_API_URL)');
    const esPorHora = carrera.porHora ?? false;
    const originalData = {
      fecha: original.fecha || '',
      cliente: original.cliente || '',
      horaInicio: original.horaInicio || '',
      horaFin: original.horaFin || '',
      lugarRecojo: original.porHora ? '' : (original.lugarRecojo || ''),
      lugarDestino: original.porHora ? '' : (original.lugarDestino || ''),
      tiempo: original.tiempo || '',
      distancia: String(original.porHora ? 0 : (original.distancia ?? 0)),
      precio: String(original.precio ?? 0),
      observaciones: original.observaciones || '',
      porHora: original.porHora ? 'si' : 'no',
      aCuenta: original.aCuenta ? 'si' : 'no',
      pagoPorQR: original.pagoPorQR ? 'si' : 'no',
    };
    const { data } = await axios.put<{ success: boolean; error?: string }>(
      `${API_BASE}/api/beezero/carreras/${encodeURIComponent(abejita)}/${encodeURIComponent(carreraId)}`,
      {
        fecha: carrera.fecha,
        cliente: carrera.cliente,
        horaInicio: carrera.horaInicio || '',
        horaFin: carrera.horaFin || '',
        lugarRecojo: esPorHora ? '' : (carrera.lugarRecojo ?? ''),
        lugarDestino: esPorHora ? '' : (carrera.lugarDestino ?? ''),
        tiempo: carrera.tiempo || '',
        distancia: esPorHora ? 0 : (carrera.distancia ?? 0),
        precio: carrera.precio ?? 0,
        porHora: esPorHora,
        aCuenta: carrera.aCuenta ?? false,
        pagoPorQR: carrera.pagoPorQR ?? false,
        observaciones: carrera.observaciones || '',
        foto: carrera.foto || '',
        fechaCreacion: carrera.fechaCreacion || '',
        horaCreacion: carrera.horaCreacion || '',
        originalData,
        logPrevio: [],
      },
      { headers: { ...authHeaders(), 'Content-Type': 'application/json' }, timeout: 30000 }
    );
    if (!data.success) throw new Error(data.error || 'Error al editar la carrera');
  },
};
