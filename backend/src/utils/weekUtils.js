const TZ_LA_PAZ = 'America/La_Paz';

function parseYmd(ymd) {
  const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

/** Lunes de la semana ISO (YYYY-MM-DD) para una fecha en La Paz */
function mondayOfWeekYmd(fechaYmd) {
  const p = parseYmd(fechaYmd);
  if (!p) return '';
  const utc = Date.UTC(p.y, p.mo - 1, p.d);
  const day = new Date(utc).getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(utc + diff * 86400000);
  return mon.toISOString().slice(0, 10);
}

/** ISO week string YYYY-Www (aprox. estándar) */
function isoWeekKey(fechaYmd) {
  const mon = mondayOfWeekYmd(fechaYmd);
  const p = parseYmd(mon);
  if (!p) return '';
  const jan4 = Date.UTC(p.y, 0, 4);
  const jan4Day = new Date(jan4).getUTCDay() || 7;
  const week1Mon = jan4 - (jan4Day - 1) * 86400000;
  const monUtc = Date.UTC(p.y, p.mo - 1, p.d);
  const weekNum = Math.floor((monUtc - week1Mon) / (7 * 86400000)) + 1;
  const year = weekNum < 1 ? p.y - 1 : p.y;
  const w = weekNum < 1 ? 52 : weekNum > 52 ? 1 : weekNum;
  return `${year}-W${String(w).padStart(2, '0')}`;
}

function todayYmdLaPaz() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ_LA_PAZ });
}

function diasDeSemana(fechaInicioSemana) {
  const p = parseYmd(fechaInicioSemana);
  if (!p) return [];
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.UTC(p.y, p.mo - 1, p.d + i));
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function parseHoraMin(hora) {
  const m = String(hora || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function normalizeYmd(value) {
  const s = String(value || '').trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

/** Fechas inclusive YYYY-MM-DD, máx maxDays */
function fechasEnRango(fechaDesde, fechaHasta, maxDays = 35) {
  const desde = normalizeYmd(fechaDesde);
  const hasta = normalizeYmd(fechaHasta);
  if (!desde || !hasta || hasta < desde) return [];
  const p = parseYmd(desde);
  const out = [];
  let cur = Date.UTC(p.y, p.mo - 1, p.d);
  const end = Date.parse(`${hasta}T12:00:00Z`);
  while (cur <= end) {
    out.push(new Date(cur).toISOString().slice(0, 10));
    cur += 86400000;
  }
  if (out.length > maxDays) {
    const err = new Error(`El rango no puede superar ${maxDays} días`);
    err.statusCode = 400;
    err.code = 'RANGE_TOO_LONG';
    throw err;
  }
  return out;
}

function diffDaysInclusive(desde, hasta) {
  const d = normalizeYmd(desde);
  const h = normalizeYmd(hasta);
  if (!d || !h) return 0;
  return fechasEnRango(d, h, 9999).length;
}

module.exports = {
  TZ_LA_PAZ,
  todayYmdLaPaz,
  mondayOfWeekYmd,
  isoWeekKey,
  diasDeSemana,
  parseHoraMin,
  normalizeYmd,
  fechasEnRango,
  diffDaysInclusive,
};
