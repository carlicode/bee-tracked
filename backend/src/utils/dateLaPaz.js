/**
 * Fechas en zona Bolivia (America/La_Paz) — misma lógica que dashboard live y permisos.
 */
const TZ_LA_PAZ = 'America/La_Paz';

function todayYmdLaPaz() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ_LA_PAZ });
}

function nowIsoLaPaz() {
  return new Date().toLocaleString('sv-SE', { timeZone: TZ_LA_PAZ }).replace(' ', 'T');
}

module.exports = {
  TZ_LA_PAZ,
  todayYmdLaPaz,
  nowIsoLaPaz,
};
