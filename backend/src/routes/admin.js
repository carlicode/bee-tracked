const express = require('express');
const {
  getSheetsInSpreadsheet,
  getAllRowsWithHeadersFromSpreadsheet,
} = require('../services/googleSheets');

const router = express.Router();

function carrerasDriversSpreadsheetId() {
  return (
    process.env.CARRERAS_DRIVERS_SHEET_ID ||
    process.env.CARRERAS_BIKERS_SHEET_ID ||
    ''
  );
}

function turnosSpreadsheetId() {
  return process.env.GOOGLE_SHEET_ID || '';
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    const key = h != null && String(h).trim() !== '' ? String(h).trim() : `col_${i}`;
    obj[key] = row[i] != null ? String(row[i]) : '';
  });
  return obj;
}

function parseDateLoose(s) {
  if (!s || typeof s !== 'string') return null;
  const t = s.trim();
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function inDateRange(fechaStr, from, to) {
  if (!from && !to) return true;
  const d = parseDateLoose(fechaStr);
  if (!d) return true;
  if (from) {
    const f = parseDateLoose(from);
    if (f && d < f) return false;
  }
  if (to) {
    const t = parseDateLoose(to);
    if (t && d > t) return false;
  }
  return true;
}

/** Excluye pestañas que no son de un driver individual */
function filterDriverTabs(names) {
  return (names || []).filter((n) => {
    if (!n || typeof n !== 'string') return false;
    const lower = n.toLowerCase();
    if (lower === 'registros') return false;
    if (lower.includes('backup')) return false;
    return true;
  });
}

const LIVE_CACHE_TTL_MS = 25 * 1000;
let liveDashboardCache = { data: null, expiresAt: 0 };

const TZ_LA_PAZ = 'America/La_Paz';

function todayYmd() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ_LA_PAZ });
}

function normHeader(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function findHeaderKey(headers, ...candidates) {
  const normToReal = new Map();
  for (const h of headers) {
    const t = String(h || '').trim();
    if (!t) continue;
    normToReal.set(normHeader(t), t);
  }
  for (const c of candidates) {
    const hit = normToReal.get(normHeader(c));
    if (hit) return hit;
  }
  return null;
}

function normalizeEstado(val) {
  return String(val || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function normalizeFecha(val) {
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

/** horaInicio + fechaInicio → "2h 30m" o "45m" */
function calcularTiempo(horaInicio, fechaInicio) {
  const parts = parseHoraParts(horaInicio);
  if (!parts) return '—';
  const fecha = normalizeFecha(fechaInicio || todayYmd());
  const [y, mo, d] = fecha.split('-').map(Number);
  if (!y || !mo || !d) return '—';
  const start = new Date(y, mo - 1, d, parts.h, parts.m, parts.s);
  if (Number.isNaN(start.getTime())) return '—';
  const diffMs = Date.now() - start.getTime();
  if (diffMs < 0) return '0m';
  const totalMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function mapActiveTurno(obj, headers, tipo) {
  const idKey = findHeaderKey(headers, 'ID', 'TurnoId', 'Turno ID');
  const fechaKey = findHeaderKey(headers, 'Fecha Inicio');
  const horaKey = findHeaderKey(headers, 'Hora Inicio');
  const estadoKey = findHeaderKey(headers, 'Estado');
  const nombreKey =
    tipo === 'beezero'
      ? findHeaderKey(headers, 'Abejita')
      : findHeaderKey(headers, 'Usuario', 'Biker', '- Turnos');
  const placaKey = findHeaderKey(headers, 'Auto (Placa)', 'Auto', 'Placa');

  const fecha = normalizeFecha(obj[fechaKey] || '');
  const estado = normalizeEstado(obj[estadoKey] || '');
  if (fecha !== todayYmd() || estado !== 'INICIADO') return null;

  const nombre = String(obj[nombreKey] || '').trim();
  const horaInicio = String(obj[horaKey] || '').trim();
  const turnoId = String(obj[idKey] ?? '').trim();
  const userId = nombre || turnoId;

  const item = {
    turnoId,
    userId,
    nombre: nombre || userId,
    horaInicio,
    tiempoTranscurrido: calcularTiempo(horaInicio, fecha),
  };
  if (tipo === 'beezero') {
    item.placa = String(obj[placaKey] || '').trim();
  }
  return item;
}

async function readTurnosSheet(sid, sheetCandidates) {
  let lastErr = null;
  for (const sheetName of sheetCandidates) {
    try {
      return await getAllRowsWithHeadersFromSpreadsheet(sid, sheetName, 'A:AE');
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('No se pudo leer la hoja de turnos');
}

async function buildLiveDashboardPayload() {
  const sid = turnosSpreadsheetId();
  if (!sid) {
    const err = new Error('GOOGLE_SHEET_ID no configurado');
    err.statusCode = 500;
    throw err;
  }

  const [beezeroSheet, ecodeliverySheet] = await Promise.all([
    readTurnosSheet(sid, ['BeeZero', 'beezero']),
    readTurnosSheet(sid, ['Ecodelivery']),
  ]);

  const beezeroActivos = beezeroSheet.rows
    .map((row) => rowToObject(beezeroSheet.headers, row))
    .map((obj) => mapActiveTurno(obj, beezeroSheet.headers, 'beezero'))
    .filter(Boolean)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const ecodeliveryActivos = ecodeliverySheet.rows
    .map((row) => rowToObject(ecodeliverySheet.headers, row))
    .map((obj) => mapActiveTurno(obj, ecodeliverySheet.headers, 'ecodelivery'))
    .filter(Boolean)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const totalActivos = beezeroActivos.length + ecodeliveryActivos.length;

  return {
    success: true,
    beezero: {
      activos: beezeroActivos,
      totalActivos: beezeroActivos.length,
    },
    ecodelivery: {
      activos: ecodeliveryActivos,
      totalActivos: ecodeliveryActivos.length,
    },
    resumen: {
      totalActivos,
      carrerasHoy: 0,
      timestamp: new Date().toISOString(),
      fecha: todayYmd(),
    },
  };
}

/**
 * GET /api/admin/carreras/drivers
 * Lista nombres de pestañas (drivers) del spreadsheet de carreras.
 */
router.get('/carreras/drivers', async (req, res) => {
  try {
    const sid = carrerasDriversSpreadsheetId();
    if (!sid) {
      return res.status(500).json({
        success: false,
        error: 'CARRERAS_DRIVERS_SHEET_ID o CARRERAS_BIKERS_SHEET_ID no configurado',
      });
    }
    const all = await getSheetsInSpreadsheet(sid);
    const drivers = filterDriverTabs(all);
    res.json({ success: true, tabs: drivers, allTabs: all });
  } catch (err) {
    console.error('[admin] carreras/drivers', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al listar pestañas',
    });
  }
});

/**
 * GET /api/admin/carreras/:tab
 * Filas de carreras de una pestaña; query: from, to (YYYY-MM-DD) sobre columna Fecha
 */
router.get('/carreras/:tab', async (req, res) => {
  try {
    const sid = carrerasDriversSpreadsheetId();
    if (!sid) {
      return res.status(500).json({
        success: false,
        error: 'CARRERAS_DRIVERS_SHEET_ID o CARRERAS_BIKERS_SHEET_ID no configurado',
      });
    }
    const rawTab = req.params.tab ? decodeURIComponent(req.params.tab) : '';
    const tab = rawTab.trim();
    if (!tab) {
      return res.status(400).json({ success: false, error: 'Pestaña requerida' });
    }
    const { from, to } = req.query;

    const { headers, rows } = await getAllRowsWithHeadersFromSpreadsheet(
      sid,
      tab,
      'A:AD'
    );

    if (!headers.length) {
      return res.json({ success: true, tab, carreras: [], headers: [] });
    }

    const fechaKey =
      headers.find((h) => String(h).trim().toLowerCase() === 'fecha') || 'Fecha';

    const objects = rows
      .map((row) => rowToObject(headers, row))
      .filter((obj) => inDateRange(obj[fechaKey] || obj.Fecha || '', from, to));

    res.json({
      success: true,
      tab,
      headers,
      carreras: objects,
    });
  } catch (err) {
    console.error('[admin] carreras/:tab', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al leer carreras',
    });
  }
});

/**
 * GET /api/admin/turnos/beezero
 */
router.get('/turnos/beezero', async (req, res) => {
  try {
    const sid = turnosSpreadsheetId();
    if (!sid) {
      return res.status(500).json({
        success: false,
        error: 'GOOGLE_SHEET_ID no configurado',
      });
    }
    const { headers, rows } = await getAllRowsWithHeadersFromSpreadsheet(
      sid,
      'beezero',
      'A:AE'
    );
    const turnos = rows.map((row) => rowToObject(headers, row));
    res.json({ success: true, headers, turnos });
  } catch (err) {
    console.error('[admin] turnos/beezero', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al leer turnos beezero',
    });
  }
});

/**
 * GET /api/admin/turnos/ecodelivery
 */
router.get('/turnos/ecodelivery', async (req, res) => {
  try {
    const sid = turnosSpreadsheetId();
    if (!sid) {
      return res.status(500).json({
        success: false,
        error: 'GOOGLE_SHEET_ID no configurado',
      });
    }
    const { headers, rows } = await getAllRowsWithHeadersFromSpreadsheet(
      sid,
      'Ecodelivery',
      'A:AE'
    );
    const turnos = rows.map((row) => rowToObject(headers, row));
    res.json({ success: true, headers, turnos });
  } catch (err) {
    console.error('[admin] turnos/ecodelivery', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al leer turnos Ecodelivery',
    });
  }
});

/**
 * GET /api/admin/dashboard/live
 * Turnos activos hoy (BeeZero + Ecodelivery) con cache ~25s
 */
router.get('/dashboard/live', async (req, res) => {
  try {
    const now = Date.now();
    if (liveDashboardCache.data && liveDashboardCache.expiresAt > now) {
      return res.json(liveDashboardCache.data);
    }

    const payload = await buildLiveDashboardPayload();
    liveDashboardCache = {
      data: payload,
      expiresAt: now + LIVE_CACHE_TTL_MS,
    };
    res.json(payload);
  } catch (err) {
    console.error('[admin] dashboard/live', err);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Error al obtener dashboard en vivo',
    });
  }
});

module.exports = router;
