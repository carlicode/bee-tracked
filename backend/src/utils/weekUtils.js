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

module.exports = {
  TZ_LA_PAZ,
  todayYmdLaPaz,
  mondayOfWeekYmd,
  isoWeekKey,
  diasDeSemana,
  parseHoraMin,
};
