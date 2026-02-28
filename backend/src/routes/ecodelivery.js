const express = require('express');
const router = express.Router();
// Rutas de Ecodelivery (Turnos y Deliveries/Carreras)
const { uploadEcodeliveryPhoto, uploadEcodeliveryDeliveryPhoto, isS3Configured } = require('../services/s3Upload');
const {
  appendRow,
  updateRowById,
  getRowById,
  getAllRows,
  getOrCreateSheetInSpreadsheet,
  appendRowToSpreadsheet,
  getRowCountInSpreadsheet,
  getSheetsInSpreadsheet,
  getAllRowsFromSpreadsheet,
} = require('../services/googleSheets');

const SHEET_ECODELIVERY = 'Ecodelivery';
const CARRERAS_BIKERS_HEADERS = [
  'DeliveryId', 'Biker', 'Fecha Registro', 'Hora Registro', 'Cliente', 'Lugar Origen',
  'Hora Inicio', 'Lugar Destino', 'Hora Fin', 'Distancia (km)', 'Por Hora', 'Notas', 'Foto',
];

/** Orden de columnas en la hoja Ecodelivery (debe coincidir con SHEET_ECODELIVERY.md) */
const COLS = [
  'TurnoId', 'Usuario', 'Fecha Inicio', 'Hora Inicio', 'Lat Inicio', 'Lng Inicio',
  'Timestamp Inicio', 'Foto Inicio', 'Fecha Cierre', 'Hora Cierre', 'Lat Cierre', 'Lng Cierre',
  'Timestamp Cierre', 'Foto Cierre', 'Estado', 'Timestamp Creación', 'Timestamp Actualización',
];

/**
 * POST /api/ecodelivery/upload-photo
 * Sube una foto opcional al iniciar o cerrar turno (Ecodelivery Turnos).
 * Body: { dataUrl: string, username: string, momento: 'inicio' | 'cierre' }
 * Respuesta: { success: true, url: string } o error
 */
router.post('/upload-photo', async (req, res) => {
  try {
    if (!isS3Configured()) {
      return res.status(503).json({
        success: false,
        error: 'S3 no está configurado. No se puede subir la foto.',
      });
    }

    const { dataUrl, username, momento } = req.body || {};

    if (!dataUrl || !username || !momento) {
      return res.status(400).json({
        success: false,
        error: 'Faltan dataUrl, username o momento (inicio/cierre)',
      });
    }

    if (momento !== 'inicio' && momento !== 'cierre') {
      return res.status(400).json({
        success: false,
        error: 'momento debe ser "inicio" o "cierre"',
      });
    }

    const url = await uploadEcodeliveryPhoto({
      dataUrl,
      username: String(username).trim(),
      momento,
    });

    res.json({
      success: true,
      url,
    });
  } catch (err) {
    console.error('Error subiendo foto Ecodelivery turno:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al subir la foto',
    });
  }
});

/**
 * POST /api/ecodelivery/upload-delivery-photo
 * Sube una foto opcional de un delivery (Ecodelivery Deliveries).
 * Body: { dataUrl: string, username: string }
 * Respuesta: { success: true, url: string } o error
 */
router.post('/upload-delivery-photo', async (req, res) => {
  try {
    if (!isS3Configured()) {
      return res.status(503).json({
        success: false,
        error: 'S3 no está configurado. No se puede subir la foto.',
      });
    }

    const { dataUrl, username } = req.body || {};

    if (!dataUrl || !username) {
      return res.status(400).json({
        success: false,
        error: 'Faltan dataUrl o username',
      });
    }

    const url = await uploadEcodeliveryDeliveryPhoto({
      dataUrl,
      username: String(username).trim(),
    });

    res.json({
      success: true,
      url,
    });
  } catch (err) {
    console.error('Error subiendo foto Ecodelivery delivery:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al subir la foto',
    });
  }
});

/**
 * Obtiene el siguiente ID consecutivo para la hoja Ecodelivery (0, 1, 2, ...)
 */
async function getNextTurnoId() {
  const rows = await getAllRows(SHEET_ECODELIVERY);
  // Fila 0 = headers; número de filas de datos = siguiente ID
  const nextId = rows.length > 0 ? rows.length - 1 : 0;
  return nextId;
}

/**
 * POST /api/ecodelivery/turnos/iniciar
 * Registra inicio de turno en la hoja Ecodelivery.
 * Body: { usuario, fechaInicio, horaInicio, latInicio, lngInicio, timestampInicio, fotoInicio? }
 * Respuesta: { success: true, turnoId: string } (turnoId numérico consecutivo: "0", "1", ...)
 */
router.post('/turnos/iniciar', async (req, res) => {
  try {
    const {
      usuario,
      fechaInicio,
      horaInicio,
      latInicio,
      lngInicio,
      timestampInicio,
      fotoInicio,
    } = req.body || {};

    if (!usuario || !fechaInicio || !horaInicio || timestampInicio == null) {
      return res.status(400).json({
        success: false,
        error: 'Faltan usuario, fechaInicio, horaInicio o timestampInicio',
      });
    }

    const turnoIdNum = await getNextTurnoId();
    const now = new Date().toISOString();

    const row = [
      turnoIdNum,
      String(usuario).trim(),
      String(fechaInicio),
      String(horaInicio),
      latInicio != null ? Number(latInicio) : '',
      lngInicio != null ? Number(lngInicio) : '',
      String(timestampInicio),
      fotoInicio || '',
      '', '', '', '', '', '', // cierre vacío
      'INICIADO',
      now,
      now,
    ];

    await appendRow(SHEET_ECODELIVERY, row);

    res.json({
      success: true,
      turnoId: String(turnoIdNum),
    });
  } catch (err) {
    console.error('Error registrando inicio turno Ecodelivery:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al registrar inicio de turno',
    });
  }
});

/**
 * POST /api/ecodelivery/turnos/cerrar
 * Actualiza la fila del turno con datos de cierre.
 * Body: { turnoId, fechaCierre, horaCierre, latCierre, lngCierre, timestampCierre, fotoCierre? }
 */
router.post('/turnos/cerrar', async (req, res) => {
  try {
    const {
      turnoId,
      fechaCierre,
      horaCierre,
      latCierre,
      lngCierre,
      timestampCierre,
      fotoCierre,
    } = req.body || {};

    if (!turnoId || !fechaCierre || !horaCierre || timestampCierre == null) {
      return res.status(400).json({
        success: false,
        error: 'Faltan turnoId, fechaCierre, horaCierre o timestampCierre',
      });
    }

    const existing = await getRowById(SHEET_ECODELIVERY, turnoId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Turno no encontrado',
      });
    }

    const updatedAt = new Date().toISOString();
    // TurnoId se guarda como número en la hoja; mantener igual al actualizar
    // Soportar tanto 'TurnoId' como 'turnoId' (case-insensitive)
    const turnoIdValue = existing['TurnoId'] || existing['turnoId'] || turnoId;

    const row = [
      turnoIdValue,
      existing['Usuario'],
      existing['Fecha Inicio'],
      existing['Hora Inicio'],
      existing['Lat Inicio'],
      existing['Lng Inicio'],
      existing['Timestamp Inicio'],
      existing['Foto Inicio'],
      String(fechaCierre),
      String(horaCierre),
      latCierre != null ? Number(latCierre) : '',
      lngCierre != null ? Number(lngCierre) : '',
      String(timestampCierre),
      fotoCierre || '',
      'CERRADO',
      existing['Timestamp Creación'],
      updatedAt,
    ];

    await updateRowById(SHEET_ECODELIVERY, turnoId, row);

    res.json({
      success: true,
      message: 'Turno cerrado registrado',
    });
  } catch (err) {
    console.error('Error registrando cierre turno Ecodelivery:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al registrar cierre de turno',
    });
  }
});

/**
 * GET /api/ecodelivery/deliveries/:bikerName
 * Obtiene todos los deliveries de un biker desde su pestaña en 'Carreras_bikers'.
 * Si la pestaña no existe, devuelve un array vacío.
 */
router.get('/deliveries/:bikerName', async (req, res) => {
  try {
    const spreadsheetId = process.env.CARRERAS_BIKERS_SHEET_ID;
    if (!spreadsheetId) {
      return res.status(503).json({
        success: false,
        error: 'CARRERAS_BIKERS_SHEET_ID no está configurado',
      });
    }

    const { bikerName } = req.params;

    if (!bikerName) {
      return res.status(400).json({
        success: false,
        error: 'Falta bikerName',
      });
    }

    // Verificar si existe la pestaña del biker
    const sheets = await getSheetsInSpreadsheet(spreadsheetId);
    const sheetExists = sheets.some(
      (s) => s.toLowerCase() === bikerName.trim().toLowerCase()
    );

    if (!sheetExists) {
      // La pestaña no existe, devolver array vacío
      return res.json({
        success: true,
        deliveries: [],
      });
    }

    // Obtener todas las filas de la pestaña del biker
    const rows = await getAllRowsFromSpreadsheet(spreadsheetId, bikerName);

    // Convertir filas a objetos Delivery
    // Headers: DeliveryId, Biker, Fecha Registro, Hora Registro, Cliente, Lugar Origen,
    //          Hora Inicio, Lugar Destino, Hora Fin, Distancia (km), Por Hora, Notas, Foto
    const deliveries = rows.map((row) => ({
      id: row[0], // DeliveryId
      biker: row[1], // Biker
      fecha: row[2], // Fecha Registro
      hora: row[3], // Hora Registro
      cliente: row[4], // Cliente
      lugarOrigen: row[5], // Lugar Origen
      horaInicio: row[6] || '', // Hora Inicio
      lugarDestino: row[7], // Lugar Destino
      horaFin: row[8] || '', // Hora Fin
      distancia: parseFloat(row[9]) || 0, // Distancia (km)
      porHora: row[10] === 'Sí', // Por Hora
      notas: row[11] || '', // Notas
      foto: row[12] || '', // Foto
    }));

    res.json({
      success: true,
      deliveries,
    });
  } catch (err) {
    console.error('Error obteniendo deliveries del biker:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al obtener deliveries',
    });
  }
});

/**
 * POST /api/ecodelivery/deliveries/registrar
 * Registra un delivery en la pestaña del biker en el sheet Carreras_bikers.
 * Si la pestaña del biker no existe, se crea.
 * Body: bikerName, cliente, lugarOrigen, lugarDestino, distancia, porHora?, notas?,
 *       fechaRegistro?, horaRegistro?, horaInicio?, horaFin?, foto?
 */
router.post('/deliveries/registrar', async (req, res) => {
  try {
    const spreadsheetId = process.env.CARRERAS_BIKERS_SHEET_ID;
    if (!spreadsheetId) {
      return res.status(503).json({
        success: false,
        error: 'CARRERAS_BIKERS_SHEET_ID no está configurado',
      });
    }

    const {
      bikerName,
      cliente,
      lugarOrigen,
      lugarDestino,
      distancia,
      porHora,
      notas,
      fechaRegistro,
      horaRegistro,
      horaInicio,
      horaFin,
      foto,
    } = req.body || {};

    if (!bikerName || !cliente || !lugarOrigen || !lugarDestino || distancia == null) {
      return res.status(400).json({
        success: false,
        error: 'Faltan bikerName, cliente, lugarOrigen, lugarDestino o distancia',
      });
    }

    const ahora = new Date();
    const fecha = fechaRegistro || ahora.toISOString().slice(0, 10);
    const horaReg = horaRegistro || ahora.toTimeString().slice(0, 5);
    const horaIni = horaInicio != null ? String(horaInicio) : '';
    const horaF = horaFin != null ? String(horaFin) : '';

    const sheetTitle = await getOrCreateSheetInSpreadsheet(
      spreadsheetId,
      bikerName,
      CARRERAS_BIKERS_HEADERS
    );

    const rowCount = await getRowCountInSpreadsheet(spreadsheetId, sheetTitle);
    const deliveryId = rowCount <= 1 ? 0 : rowCount - 1;

    const row = [
      deliveryId,
      String(bikerName).trim(),
      fecha,
      horaReg,
      String(cliente).trim(),
      String(lugarOrigen).trim(),
      horaIni,
      String(lugarDestino).trim(),
      horaF,
      Number(distancia),
      porHora ? 'Sí' : 'No',
      notas ? String(notas).trim() : '',
      foto || '', // URL de S3 o vacío
    ];

    await appendRowToSpreadsheet(spreadsheetId, sheetTitle, row);

    res.json({
      success: true,
      deliveryId: String(deliveryId),
      sheetTitle,
    });
  } catch (err) {
    console.error('Error registrando delivery Carreras_bikers:', err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al registrar delivery',
    });
  }
});

module.exports = router;
