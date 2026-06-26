import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function headers() {
  const token = localStorage.getItem('idToken');
  const session = localStorage.getItem('sessionId');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(session ? { 'X-Session-Id': session } : {}),
  };
}

export interface KmRegistro {
  id: string;
  Biker?: string;
  biker?: string;
  Cliente?: string;
  cliente?: string;
  Recojo?: string;
  Entrega?: string;
  'Direccion Recojo'?: string;
  'Direccion Entrega'?: string;
  'Medio Transporte'?: string;
  'Medio de transporte'?: string;
  Operador?: string;
  operador?: string;
  Kilometraje?: string;
  kilometraje?: string;
  'Fecha Registro'?: string;
  Fechas?: string;
  fecha?: string;
  'Hora Ini'?: string;
  'Hora Fin'?: string;
  'Dist. [Km]'?: string;
  [key: string]: string | undefined;
}

export interface KmStats {
  totalRegistros: number;
  totalPendientes: number;
  kmTotal: number;
  bikers: string[];
  pctCompletado: number;
}

function parseBiker(r: KmRegistro): string {
  return r['Biker'] || r['biker'] || '';
}

function parseKm(r: KmRegistro): number {
  const raw = r['Kilometraje'] || r['kilometraje'] || '';
  const num = parseFloat(String(raw).replace(',', '.').replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

function parseFecha(r: KmRegistro): string {
  return r['Fechas'] || r['Fecha Registro'] || r['fecha'] || '';
}

export function calcStats(registros: KmRegistro[], pendientes: KmRegistro[]): KmStats {
  const total = registros.length + pendientes.length;
  const kmTotal = registros.reduce((s, r) => s + parseKm(r), 0);
  const bikerSet = new Set([
    ...registros.map(parseBiker),
    ...pendientes.map(parseBiker),
  ].filter(Boolean));
  return {
    totalRegistros: registros.length,
    totalPendientes: pendientes.length,
    kmTotal: Math.round(kmTotal * 10) / 10,
    bikers: Array.from(bikerSet).sort(),
    pctCompletado: total > 0 ? Math.round((registros.length / total) * 100) : 0,
  };
}

export const adminKilometrajeApi = {
  async getRegistros(params: { bikerName?: string; from?: string; to?: string } = {}) {
    const { data } = await axios.get<{ success: boolean; registros: KmRegistro[] }>(
      `${BASE}/api/admin/kilometraje/registros`,
      { headers: headers(), params }
    );
    return data.registros;
  },

  async getPendientes(params: { bikerName?: string; from?: string; to?: string } = {}) {
    const { data } = await axios.get<{ success: boolean; pendientes: KmRegistro[] }>(
      `${BASE}/api/admin/kilometraje/pendientes`,
      { headers: headers(), params }
    );
    return data.pendientes;
  },

  async exportCsv(tab: 'registros' | 'pendientes', params: { bikerName?: string; from?: string; to?: string } = {}) {
    const { data } = await axios.get(`${BASE}/api/admin/kilometraje/export.csv`, {
      headers: headers(),
      params: { tab, ...params },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `km-${tab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  parseBiker,
  parseKm,
  parseFecha,
};
