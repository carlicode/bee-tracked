/** Convierte precio desde hoja (ej. "15", "14,5") a número para sumar. */
export function parsePrecioBs(raw: string): number {
  if (!raw || typeof raw !== 'string') return 0;
  const t = raw.trim().replace(/\s/g, '').replace(',', '.');
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

/** Valores típicos de columnas sí/no en hojas. */
export function isTruthyCell(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  return s === 'si' || s === 'sí' || s === 'true' || s === '1' || s === 'yes';
}
