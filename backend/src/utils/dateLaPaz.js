/**
 * Fechas en zona Bolivia (America/La_Paz, GMT-4 fijo, sin horario de verano).
 */
const TZ_LA_PAZ = 'America/La_Paz';
/** Bolivia = UTC-4 → sumar 4h al reloj local para obtener instante UTC */
const LA_PAZ_UTC_OFFSET_MS = 4 * 60 * 60 * 1000;

function todayYmdLaPaz() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ_LA_PAZ });
}

function nowIsoLaPaz() {
  return new Date().toLocaleString('sv-SE', { timeZone: TZ_LA_PAZ }).replace(' ', 'T');
}

function normalizeFechaYmd(val) {
  const s = String(val || '').trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${mm}-${dd}`;
  }
  return s;
}

function parseHoraParts(hora) {
  const m = String(hora || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]), s: Number(m[3] || 0) };
}

/** Convierte fecha + hora (reloj La Paz) a timestamp UTC (ms). */
function laPazDateTimeToUtcMs(fechaYmd, horaInicio) {
  const fecha = normalizeFechaYmd(fechaYmd);
  const parts = parseHoraParts(horaInicio);
  if (!parts || !fecha) return NaN;
  const [y, mo, d] = fecha.split('-').map(Number);
  if (!y || !mo || !d) return NaN;
  return Date.UTC(y, mo - 1, d, parts.h, parts.m, parts.s) + LA_PAZ_UTC_OFFSET_MS;
}

/** Hoy en La Paz, o mañana (filas legacy con fecha UTC al guardar). */
function isFechaTurnoHoyLaPaz(fechaNorm) {
  const hoy = todayYmdLaPaz();
  if (fechaNorm === hoy) return true;
  const [y, m, d] = hoy.split('-').map(Number);
  const manana = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return fechaNorm === manana;
}

/** Tiempo transcurrido desde inicio de turno (reloj Bolivia) hasta ahora. */
function calcularTiempoTranscurrido(fechaInicio, horaInicio) {
  const startMs = laPazDateTimeToUtcMs(fechaInicio, horaInicio);
  if (Number.isNaN(startMs)) return '—';
  const diffMs = Date.now() - startMs;
  if (diffMs < 0) return '0m';
  const totalMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

module.exports = {
  TZ_LA_PAZ,
  todayYmdLaPaz,
  nowIsoLaPaz,
  normalizeFechaYmd,
  isFechaTurnoHoyLaPaz,
  laPazDateTimeToUtcMs,
  calcularTiempoTranscurrido,
};
