const express = require('express');
const {
  getSheetsInSpreadsheet,
  getAllRowsWithHeadersFromSpreadsheet,
  batchGetRowsWithHeadersFromSpreadsheet,
  classifyCarreraTabHeaders,
  listCarreraTabsByKind,
} = require('../services/googleSheets');
const { sessionAuth, requireAdmin, requireAdminOrOperador } = require('../middleware/sessionAuth');
const { isDynamoReadEnabled, slugUserId } = require('../services/dynamoUtils');
const {
  todayYmdLaPaz,
  normalizeFechaYmd,
  isFechaTurnoHoyLaPaz,
  calcularTiempoTranscurrido,
} = require('../utils/dateLaPaz');
const turnosService = require('../services/turnosService');
const carrerasService = require('../services/carrerasService');
const permisosService = require('../services/permisosService');

const router = express.Router();

// sessionAuth en todas las rutas; requireAdmin en todo EXCEPTO dashboard/live
// (dashboard/live permite también operadores via requireAdminOrOperador)
router.use(sessionAuth);
router.use((req, res, next) => {
  if (req.path === '/dashboard/live') {
    return requireAdminOrOperador(req, res, next);
  }
  return requireAdmin(req, res, next);
});

function carrerasDriversSpreadsheetId() {
  return process.env.CARRERAS_DRIVERS_SHEET_ID || '';
}

function carrerasBikersSpreadsheetId() {
  return process.env.CARRERAS_BIKERS_SHEET_ID || '';
}

function carrerasDriversSpreadsheetIdOrFallback() {
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

function todayYmd() {
  return todayYmdLaPaz();
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
  return normalizeFechaYmd(val);
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
  const aperturaKey = findHeaderKey(headers, 'Apertura Caja (Bs)', 'Apertura Caja', 'Apertura');

  const fecha = normalizeFecha(obj[fechaKey] || '');
  const estado = normalizeEstado(obj[estadoKey] || '');
  if (!isFechaTurnoHoyLaPaz(fecha) || estado !== 'INICIADO') return null;

  const nombre = String(obj[nombreKey] || '').trim();
  const horaInicio = String(obj[horaKey] || '').trim();
  const turnoId = String(obj[idKey] ?? '').trim();
  const userId = nombre || turnoId;

  const item = {
    turnoId,
    userId,
    nombre: nombre || userId,
    horaInicio,
    tiempoTranscurrido: calcularTiempoTranscurrido(fecha, horaInicio),
  };
  if (tipo === 'beezero') {
    item.placa = String(obj[placaKey] || '').trim();
    const aperturaRaw = parseFloat(String(obj[aperturaKey] || '').replace(',', '.'));
    item.aperturaCaja = isNaN(aperturaRaw) ? null : aperturaRaw;
  }
  return item;
}

function buildPermisoLookup(permisos) {
  const lookup = new Set();
  for (const p of permisos) {
    if (p.userId) lookup.add(String(p.userId).trim().toLowerCase());
    if (p.userName) {
      lookup.add(String(p.userName).trim().toLowerCase());
      lookup.add(slugUserId(p.userName));
    }
  }
  return lookup;
}

/** Un solo turno INICIADO por nombre (el de ID más alto — evita duplicados en Sheets). */
function dedupeActivosPorNombre(activos) {
  const byNombre = new Map();
  for (const t of activos) {
    const key = String(t.nombre || '').trim().toLowerCase();
    if (!key) continue;
    const prev = byNombre.get(key);
    const idNum = Number(t.turnoId);
    const prevNum = prev ? Number(prev.turnoId) : NaN;
    if (!prev || (Number.isFinite(idNum) && idNum >= prevNum) || !Number.isFinite(prevNum)) {
      byNombre.set(key, t);
    }
  }
  return Array.from(byNombre.values());
}

function attachTienePermiso(activos, permisoLookup) {
  return activos.map((t) => {
    const nombreNorm = String(t.nombre || '').trim().toLowerCase();
    const userIdNorm = String(t.userId || '').trim().toLowerCase();
    const tienePermiso =
      permisoLookup.has(userIdNorm) ||
      permisoLookup.has(nombreNorm) ||
      permisoLookup.has(slugUserId(t.nombre));
    return { ...t, tienePermiso };
  });
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

function countRowsForToday(sheetsData) {
  const today = todayYmd();
  let count = 0;

  for (const sheet of sheetsData) {
    if (!sheet.headers.length) continue;
    const fechaKey =
      findHeaderKey(sheet.headers, 'Fecha') ||
      sheet.headers.find((h) => String(h).trim().toLowerCase() === 'fecha') ||
      'Fecha';
    const fechaIndex = sheet.headers.indexOf(fechaKey);
    if (fechaIndex === -1) continue;

    for (const row of sheet.rows) {
      const fechaVal = row[fechaIndex];
      if (normalizeFecha(fechaVal) === today) count += 1;
    }
  }

  return count;
}

async function countCarrerasHoyInSpreadsheet(spreadsheetId) {
  if (!spreadsheetId) return 0;

  const tabs = filterDriverTabs(await getSheetsInSpreadsheet(spreadsheetId));
  if (!tabs.length) return 0;

  const sheetsData = await batchGetRowsWithHeadersFromSpreadsheet(
    spreadsheetId,
    tabs,
    'A:AD'
  );
  return countRowsForToday(sheetsData);
}

async function countCarrerasHoy() {
  const bikersId = carrerasBikersSpreadsheetId();
  const driversId = carrerasDriversSpreadsheetId();

  if (bikersId && driversId && bikersId === driversId) {
    return countCarrerasHoyInSpreadsheet(bikersId);
  }

  const [bikersCount, driversCount] = await Promise.all([
    countCarrerasHoyInSpreadsheet(bikersId),
    countCarrerasHoyInSpreadsheet(driversId),
  ]);

  return bikersCount + driversCount;
}

async function buildLiveDashboardPayload() {
  const sid = turnosSpreadsheetId();
  if (!sid) {
    const err = new Error('GOOGLE_SHEET_ID no configurado');
    err.statusCode = 500;
    throw err;
  }

  const [beezeroSheet, ecodeliverySheet, carrerasHoy] = await Promise.all([
    readTurnosSheet(sid, ['BeeZero', 'beezero']),
    readTurnosSheet(sid, ['Ecodelivery']),
    countCarrerasHoy(),
  ]);

  // Operadores: leemos directamente de DynamoDB (tipo = 'operador')
  let operadorActivos = [];
  if (isDynamoReadEnabled()) {
    try {
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
      const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }));
      const fechaHoyStr = todayYmd();
      const result = await dynamo.send(new ScanCommand({
        TableName: 'bee-tracked-turnos-prod',
        FilterExpression: '#tipo = :tipo AND #estado = :estado AND #fecha = :fecha',
        ExpressionAttributeNames: { '#tipo': 'tipo', '#estado': 'estado', '#fecha': 'fecha' },
        ExpressionAttributeValues: { ':tipo': 'operador', ':estado': 'activo', ':fecha': fechaHoyStr },
      }));
      operadorActivos = (result.Items || []).map((item) => ({
        turnoId: item.turnoId || item.SK || '',
        userId: item.userId || '',
        nombre: item.nombre || '',
        horaInicio: item.horaInicio || '',
        tiempoTranscurrido: item.horaInicio ? calcularTiempoTranscurrido(item.fecha, item.horaInicio) : '—',
      })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    } catch (err) {
      console.warn('[admin] dashboard/live operadores dynamo failed', err.message);
    }
  }

  let beezeroActivos = dedupeActivosPorNombre(
    beezeroSheet.rows
      .map((row) => rowToObject(beezeroSheet.headers, row))
      .map((obj) => mapActiveTurno(obj, beezeroSheet.headers, 'beezero'))
      .filter(Boolean)
  ).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  let ecodeliveryActivos = dedupeActivosPorNombre(
    ecodeliverySheet.rows
      .map((row) => rowToObject(ecodeliverySheet.headers, row))
      .map((obj) => mapActiveTurno(obj, ecodeliverySheet.headers, 'ecodelivery'))
      .filter(Boolean)
  ).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const fechaHoy = todayYmd();
  let permisosHoy = 0;
  if (isDynamoReadEnabled()) {
    try {
      const aprobadosHoy = await permisosService.listAprobadosForFecha(fechaHoy);
      permisosHoy = aprobadosHoy.length;
      const permisoLookup = buildPermisoLookup(aprobadosHoy);
      beezeroActivos = attachTienePermiso(beezeroActivos, permisoLookup);
      ecodeliveryActivos = attachTienePermiso(ecodeliveryActivos, permisoLookup);
    } catch (err) {
      console.warn('[admin] dashboard/live permisos query failed', err.message);
    }
  }

  const totalActivos = beezeroActivos.length + ecodeliveryActivos.length + operadorActivos.length;

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
    operador: {
      activos: operadorActivos,
      totalActivos: operadorActivos.length,
    },
    resumen: {
      totalActivos,
      carrerasHoy,
      permisosHoy,
      timestamp: new Date().toISOString(),
      fecha: fechaHoy,
    },
  };
}

/**
 * GET /api/admin/carreras/drivers
 * Lista nombres de pestañas (drivers) del spreadsheet de carreras BeeZero.
 */
router.get('/carreras/drivers', async (req, res) => {
  try {
    const sid = carrerasDriversSpreadsheetIdOrFallback();
    if (!sid) {
      return res.status(500).json({
        success: false,
        error: 'CARRERAS_DRIVERS_SHEET_ID o CARRERAS_BIKERS_SHEET_ID no configurado',
      });
    }
    const all = await getSheetsInSpreadsheet(sid);
    const drivers = await listCarreraTabsByKind(sid, 'driver');
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
 * GET /api/admin/carreras/bikers/tabs
 * Lista pestañas del spreadsheet de entregas EcoDelivery (CARRERAS_BIKERS_SHEET_ID).
 */
router.get('/carreras/bikers/tabs', async (req, res) => {
  try {
    if (isDynamoReadEnabled()) {
      const tabs = await carrerasService.listTabs('biker');
      return res.json({ success: true, tabs, allTabs: tabs });
    }

    const sid = carrerasBikersSpreadsheetId();
    if (!sid) {
      return res.status(500).json({
        success: false,
        error: 'CARRERAS_BIKERS_SHEET_ID no configurado',
      });
    }
    const all = await getSheetsInSpreadsheet(sid);
    const bikers = await listCarreraTabsByKind(sid, 'biker');
    res.json({ success: true, tabs: bikers, allTabs: all });
  } catch (err) {
    console.error('[admin] carreras/bikers/tabs', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al listar pestañas de bikers',
    });
  }
});

/**
 * GET /api/admin/carreras/bikers/:tab
 * Filas de entregas de un biker; query: from, to (YYYY-MM-DD)
 */
router.get('/carreras/bikers/:tab', async (req, res) => {
  try {
    const rawTab = req.params.tab ? decodeURIComponent(req.params.tab) : '';
    const tab = rawTab.trim();
    if (!tab) {
      return res.status(400).json({ success: false, error: 'Pestaña requerida' });
    }
    const { from, to } = req.query;

    if (isDynamoReadEnabled()) {
      const { headers, rows } = await carrerasService.listCarrerasByTab(tab, 'biker', from, to);
      return res.json({ success: true, tab, headers, entregas: rows });
    }

    const sid = carrerasBikersSpreadsheetId();
    if (!sid) {
      return res.status(500).json({
        success: false,
        error: 'CARRERAS_BIKERS_SHEET_ID no configurado',
      });
    }
    const { headers, rows } = await getAllRowsWithHeadersFromSpreadsheet(
      sid,
      tab,
      'A:AD'
    );

    if (!headers.length) {
      return res.json({ success: true, tab, entregas: [], headers: [] });
    }

    if (classifyCarreraTabHeaders(headers) === 'driver') {
      return res.status(400).json({
        success: false,
        error:
          'Esta pestaña es de driver (BeeZero). Usa Carreras drivers, no Carreras bikers.',
        code: 'WRONG_SHEET_KIND',
      });
    }

    const fechaKey =
      headers.find((h) => String(h).trim().toLowerCase() === 'fecha registro') ||
      headers.find((h) => String(h).trim().toLowerCase() === 'fecha') ||
      'Fecha Registro';

    const objects = rows
      .map((row) => rowToObject(headers, row))
      .filter((obj) => inDateRange(obj[fechaKey] || obj['Fecha Registro'] || obj['Fecha'] || '', from, to));

    res.json({ success: true, tab, headers, entregas: objects });
  } catch (err) {
    console.error('[admin] carreras/bikers/:tab', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al leer entregas de biker',
    });
  }
});

/**
 * GET /api/admin/carreras/:tab
 * Filas de carreras de una pestaña; query: from, to (YYYY-MM-DD) sobre columna Fecha
 */
router.get('/carreras/:tab', async (req, res) => {
  try {
    const rawTab = req.params.tab ? decodeURIComponent(req.params.tab) : '';
    const tab = rawTab.trim();
    if (!tab) {
      return res.status(400).json({ success: false, error: 'Pestaña requerida' });
    }
    const { from, to } = req.query;

    if (isDynamoReadEnabled()) {
      const { headers, rows } = await carrerasService.listCarrerasByTab(tab, 'beezero', from, to);
      return res.json({ success: true, tab, headers, carreras: rows });
    }

    const sid = carrerasDriversSpreadsheetIdOrFallback();
    if (!sid) {
      return res.status(500).json({
        success: false,
        error: 'CARRERAS_DRIVERS_SHEET_ID o CARRERAS_BIKERS_SHEET_ID no configurado',
      });
    }
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
    if (isDynamoReadEnabled()) {
      const { headers, turnos } = await turnosService.listTurnosForAdmin('beezero');
      return res.json({ success: true, headers, turnos });
    }

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
    if (isDynamoReadEnabled()) {
      const { headers, turnos } = await turnosService.listTurnosForAdmin('ecodelivery');
      return res.json({ success: true, headers, turnos });
    }

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
 * Turnos activos hoy (BeeZero + Ecodelivery + Operadores) con cache ~25s
 * Accesible para admin, rrhh y operador.
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

function parsePrecioBs(val) {
  const n = parseFloat(String(val || '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function emptyDriverStats(nombre) {
  return {
    nombre,
    totalCarreras: 0,
    conPrecio: 0,
    sinPrecio: 0,
    porcentajeConPrecio: 0,
    totalGanancia: 0,
  };
}

function accumulateDriverStats(stats, precio) {
  stats.totalCarreras += 1;
  if (precio > 0) {
    stats.conPrecio += 1;
    stats.totalGanancia += precio;
  } else {
    stats.sinPrecio += 1;
  }
  stats.porcentajeConPrecio =
    stats.totalCarreras > 0
      ? Math.round((stats.conPrecio / stats.totalCarreras) * 1000) / 10
      : 0;
}

/**
 * GET /api/admin/rendimiento?desde=&hasta=&tipo=beezero|ecodelivery|all
 */
router.get('/rendimiento', async (req, res) => {
  try {
    const desde = String(req.query.desde || '').trim();
    const hasta = String(req.query.hasta || '').trim();
    const tipoFilter = String(req.query.tipo || 'all').toLowerCase();

    if (!isDynamoReadEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'Lectura DynamoDB no habilitada',
      });
    }

    const tipos = [];
    if (tipoFilter === 'all' || tipoFilter === 'beezero') tipos.push('beezero');
    if (tipoFilter === 'all' || tipoFilter === 'ecodelivery') tipos.push('biker');

    const byDriver = new Map();

    for (const tipo of tipos) {
      const tabs = await carrerasService.listTabs(tipo);
      for (const tab of tabs) {
        const { rows } = await carrerasService.listCarrerasByTab(tab, tipo, desde, hasta);
        if (!byDriver.has(tab)) byDriver.set(tab, emptyDriverStats(tab));
        const stats = byDriver.get(tab);

        for (const row of rows) {
          const precio =
            tipo === 'beezero'
              ? parsePrecioBs(row['Precio (Bs)'])
              : parsePrecioBs(row['Por Hora']);
          accumulateDriverStats(stats, precio);
        }
      }
    }

    const drivers = Array.from(byDriver.values()).sort(
      (a, b) => b.totalGanancia - a.totalGanancia
    );

    const totales = {
      totalCarreras: 0,
      conPrecio: 0,
      sinPrecio: 0,
      porcentaje: 0,
      totalGanancia: 0,
    };

    for (const d of drivers) {
      totales.totalCarreras += d.totalCarreras;
      totales.conPrecio += d.conPrecio;
      totales.sinPrecio += d.sinPrecio;
      totales.totalGanancia += d.totalGanancia;
    }
    totales.porcentaje =
      totales.totalCarreras > 0
        ? Math.round((totales.conPrecio / totales.totalCarreras) * 1000) / 10
        : 0;

    res.json({ success: true, drivers, totales });
  } catch (err) {
    console.error('[admin] rendimiento', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al obtener rendimiento',
    });
  }
});

module.exports = router;
