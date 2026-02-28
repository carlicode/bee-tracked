const express = require('express');
const router = express.Router();
const {
  getOrCreateSheetInSpreadsheet,
  appendRowToSpreadsheet,
  getRowCountInSpreadsheet,
  getAllRowsFromSpreadsheet,
  getSheetsInSpreadsheet,
} = require('../services/googleSheets');

/** Sheet ID: Carreras_drivers (mismo que Carreras_bikers o configurable) */
const getCarrerasSpreadsheetId = () =>
  process.env.CARRERAS_DRIVERS_SHEET_ID || process.env.CARRERAS_BIKERS_SHEET_ID;

/** Headers para la hoja de carreras BeeZero (por driver) */
const CARRERAS_DRIVERS_HEADERS = [
  'CarreraId', 'Abejita', 'Fecha', 'Cliente', 'Hora Inicio', 'Hora Fin',
  'Lugar Recojo', 'Lugar Destino', 'Tiempo', 'Distancia (km)', 'Precio (Bs)',
  'Observaciones', 'Foto', 'Timestamp Creación', 'Por hora',
];

/**
 * POST /api/beezero/carreras/registrar
 * Registra una carrera en la pestaña del driver en el sheet Carreras_drivers.
 * Si la pestaña no existe, se crea.
 * Body: abejita (driverName), fecha, cliente, horaInicio, horaFin, lugarRecojo, lugarDestino, tiempo, distancia, precio, observaciones, foto?
 */
router.post('/carreras/registrar', async (req, res) => {
  try {
    const spreadsheetId = getCarrerasSpreadsheetId();
    if (!spreadsheetId) {
      return res.status(503).json({
        success: false,
        error: 'CARRERAS_DRIVERS_SHEET_ID o CARRERAS_BIKERS_SHEET_ID no está configurado',
      });
    }

    const {
      abejita,
      fecha,
      cliente,
      horaInicio,
      horaFin,
      lugarRecojo,
      lugarDestino,
      tiempo,
      distancia,
      precio,
      observaciones,
      foto,
    } = req.body || {};

    if (!abejita || !fecha || !cliente || !lugarRecojo || !lugarDestino || precio == null) {
      return res.status(400).json({
        success: false,
        error: 'Faltan abejita, fecha, cliente, lugarRecojo, lugarDestino o precio',
      });
    }

    const timestampCreacion = new Date().toISOString();
    const sheetTitle = await getOrCreateSheetInSpreadsheet(
      spreadsheetId,
      abejita,
      CARRERAS_DRIVERS_HEADERS
    );

    const rowCount = await getRowCountInSpreadsheet(spreadsheetId, sheetTitle);
    const carreraId = rowCount <= 1 ? 0 : rowCount - 1;

    const row = [
      carreraId,
      String(abejita).trim(),
      String(fecha).trim(),
      String(cliente).trim(),
      horaInicio ? String(horaInicio).trim() : '',
      horaFin ? String(horaFin).trim() : '',
      esPorHora ? '' : String(lugarRecojo || '').trim(),
      esPorHora ? '' : String(lugarDestino || '').trim(),
      tiempo ? String(tiempo).trim() : '',
      esPorHora ? 0 : (distancia != null ? Number(distancia) : 0),
      Number(precio),
      observaciones ? String(observaciones).trim() : '',
      foto || '',
      timestampCreacion,
      esPorHora ? 'si' : 'no',
    ];

    await appendRowToSpreadsheet(spreadsheetId, sheetTitle, row);

    res.json({
      success: true,
      carreraId: String(carreraId),
      sheetTitle,
    });
  } catch (err) {
    console.error('Error registrando carrera BeeZero:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al registrar la carrera',
    });
  }
});

/**
 * GET /api/beezero/carreras/:driverName
 * Obtiene todas las carreras de un driver desde su pestaña.
 * Query: fecha? (opcional, filtra por fecha YYYY-MM-DD)
 */
router.get('/carreras/:driverName', async (req, res) => {
  try {
    const spreadsheetId = getCarrerasSpreadsheetId();
    if (!spreadsheetId) {
      return res.status(503).json({
        success: false,
        error: 'CARRERAS_DRIVERS_SHEET_ID o CARRERAS_BIKERS_SHEET_ID no está configurado',
      });
    }

    const { driverName } = req.params;
    const { fecha } = req.query;

    if (!driverName) {
      return res.status(400).json({
        success: false,
        error: 'Falta driverName',
      });
    }

    const sheets = await getSheetsInSpreadsheet(spreadsheetId);
    const sheetExists = sheets.some(
      (s) => s.toLowerCase() === driverName.trim().toLowerCase()
    );

    if (!sheetExists) {
      return res.json({
        success: true,
        carreras: [],
      });
    }

    const rows = await getAllRowsFromSpreadsheet(spreadsheetId, driverName);

    const carreras = rows.map((row) => ({
      carreraId: row[0],
      abejita: row[1],
      fecha: row[2] || '',
      cliente: row[3] || '',
      horaInicio: row[4] || '',
      horaFin: row[5] || '',
      lugarRecojo: row[6] || '',
      lugarDestino: row[7] || '',
      tiempo: row[8] || '',
      distancia: parseFloat(row[9]) || 0,
      precio: parseFloat(row[10]) || 0,
      observaciones: row[11] || '',
      foto: row[12] || '',
      timestampCreacion: row[13] || '',
      porHora: (row[14] || '').toLowerCase() === 'si',
    }));

    let filtered = carreras;
    if (fecha) {
      const fechaStr = String(fecha).trim().slice(0, 10);
      filtered = carreras.filter((c) => (c.fecha || '').slice(0, 10) === fechaStr);
    }

    res.json({
      success: true,
      carreras: filtered,
    });
  } catch (err) {
    console.error('Error obteniendo carreras BeeZero:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al obtener carreras',
    });
  }
});

module.exports = router;
