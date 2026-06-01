/** Columnas esperadas en hoja Carreras_drivers (orden de tabla admin). */
export const CARRERA_ADMIN_COLUMNS = [
  'CarreraId',
  'Abejita',
  'Fecha',
  'Cliente',
  'Hora Inicio',
  'Hora Fin',
  'Lugar Recojo',
  'Lugar Destino',
  'Tiempo',
  'Distancia (km)',
  'Precio (Bs)',
  'Observaciones',
  'Foto',
  'Fecha creación',
  'Hora creación',
  'Por hora',
  'A cuenta',
  'Pago por QR',
] as const;

export type CarreraAdminColumn = (typeof CARRERA_ADMIN_COLUMNS)[number];

function normHeader(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/** Mapeo nombre canónico → clave real en el objeto devuelto por el backend */
export function buildCarreraHeaderMap(sheetHeaders: string[]): Partial<Record<CarreraAdminColumn, string>> {
  const map: Partial<Record<CarreraAdminColumn, string>> = {};
  const byNorm = new Map<string, string>();
  for (const h of sheetHeaders) {
    const t = String(h || '').trim();
    if (!t) continue;
    byNorm.set(normHeader(t), t);
  }
  for (const col of CARRERA_ADMIN_COLUMNS) {
    const nk = normHeader(col);
    const real = byNorm.get(nk);
    if (real) map[col] = real;
  }
  return map;
}

export function pickMapped(
  row: Record<string, string>,
  headerMap: Partial<Record<CarreraAdminColumn, string>>,
  col: CarreraAdminColumn
): string {
  const k = headerMap[col];
  if (!k) return '';
  const v = row[k];
  return v != null ? String(v) : '';
}
