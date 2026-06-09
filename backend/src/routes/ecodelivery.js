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
const { saveTurnoToDynamo, saveCarreraToDynamo } = require('../services/dualWrite');
const { todayYmdLaPaz } = require('../utils/dateLaPaz');

const SHEET_ECODELIVERY = 'Ecodelivery';
const SHEET_OPERADORES = 'operadores'; // Tab de operadores en el mismo spreadsheet
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
 * GET /api/ecodelivery/turnos/activo?usuario=NombreUsuario
 * Devuelve el turno activo del usuario desde DynamoDB, o null si no existe.
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { slugUserId } = require('../services/dynamoUtils');

router.get('/turnos/activo', async (req, res) => {
  try {
    const usuario = String(req.query.usuario || '').trim();
    if (!usuario) {
      return res.status(400).json({ success: false, error: 'Parámetro usuario requerido' });
    }

    const dynamo = DynamoDBDocumentClient.from(
      new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })
    );
    const slugCandidates = [
      slugUserId(usuario),
      slugUserId(usuario.split(/\s+/).slice(0, 2).join(' ')),
    ].filter((slug, index, arr) => slug && arr.indexOf(slug) === index);

    let turno = null;
    for (const userId of slugCandidates) {
      const result = await dynamo.send(new QueryCommand({
        TableName: process.env.TURNOS_TABLE || 'bee-tracked-turnos-prod',
        KeyConditionExpression: 'PK = :pk',
        FilterExpression: '#est = :activo',
        ExpressionAttributeNames: { '#est': 'estado' },
        ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':activo': 'activo' },
        ScanIndexForward: false, // más reciente primero (SK descendente)
      }));
      // Tomar el turno más reciente (mayor SK = TURNO#128 > TURNO#121)
      const activos = result.Items || [];
      if (activos.length > 0) {
        turno = activos[0]; // ya viene el más reciente por ScanIndexForward: false
        break;
      }
    }
    if (!turno) {
      return res.json({ success: true, data: null });
    }

    return res.json({
      success: true,
      data: {
        id: turno.turnoId,
        turnoId: turno.turnoId,
        bikerName: turno.nombre,
        horaInicio: turno.horaInicio,
        turnoIniciado: true,
        turnoCerrado: false,
        createdAt: turno.timestampInicio || '',
      },
    });
  } catch (err) {
    console.error('[ecodelivery] GET /turnos/activo error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Obtiene el siguiente ID consecutivo para la hoja Ecodelivery (0, 1, 2, ...)
 */
async function getNextTurnoId(tipo = 'ecodelivery') {
  const sheet = tipo === 'operador' ? SHEET_OPERADORES : SHEET_ECODELIVERY;
  const rows = await getAllRows(sheet);
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
      tipo: tipoParam,
    } = req.body || {};
    const tipo = tipoParam === 'operador' ? 'operador' : 'ecodelivery';

    if (!usuario || !fechaInicio || !horaInicio || timestampInicio == null) {
      return res.status(400).json({
        success: false,
        error: 'Faltan usuario, fechaInicio, horaInicio o timestampInicio',
      });
    }

    const turnoIdNum = await getNextTurnoId(tipo);
    const now = new Date().toISOString();
    const fechaInicioBolivia = todayYmdLaPaz();

    const row = [
      turnoIdNum,
      String(usuario).trim(),
      fechaInicioBolivia,
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

    const sheetDestino = tipo === 'operador' ? SHEET_OPERADORES : SHEET_ECODELIVERY;
    await appendRow(sheetDestino, row);

    await saveTurnoToDynamo({
      turnoId: String(turnoIdNum),
      nombre: String(usuario).trim(),
      tipo,
      fecha: fechaInicioBolivia,
      horaInicio: String(horaInicio),
      latInicio: latInicio != null ? Number(latInicio) : '',
      lngInicio: lngInicio != null ? Number(lngInicio) : '',
      timestampInicio: String(timestampInicio),
      fotoInicio: fotoInicio || '',
      estado: 'INICIADO',
      createdAt: Number(timestampInicio) || Date.now(),
    });

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
      tipo: tipoParam,
    } = req.body || {};
    const tipoCierre = tipoParam === 'operador' ? 'operador' : 'ecodelivery';
    const sheetCierre = tipoCierre === 'operador' ? SHEET_OPERADORES : SHEET_ECODELIVERY;

    if (!turnoId || !fechaCierre || !horaCierre || timestampCierre == null) {
      return res.status(400).json({
        success: false,
        error: 'Faltan turnoId, fechaCierre, horaCierre o timestampCierre',
      });
    }

    let existing = await getRowById(sheetCierre, turnoId);

    // Fallback: si no se encuentra por ID, buscar el último turno INICIADO del usuario por nombre
    if (!existing && req.body?.usuario) {
      const allRows = await getAllRows(sheetCierre);
      const headers = allRows[0] || {};
      const dataRows = allRows.slice(1);
      // Buscar la última fila con el mismo usuario y estado INICIADO
      const match = dataRows
        .filter(r => {
          const u = r['Usuario'] || r['usuario'] || '';
          const e = r['Estado'] || r['estado'] || '';
          return u === req.body.usuario && e === 'INICIADO';
        })
        .pop(); // tomar la más reciente
      if (match) {
        existing = match;
        console.info(`[cerrar turno] Fallback: encontrado por nombre "${req.body.usuario}"`);
      }
    }

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Turno no encontrado',
      });
    }

    const updatedAt = new Date().toISOString();
    const fechaCierreBolivia = todayYmdLaPaz();
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
      fechaCierreBolivia,
      String(horaCierre),
      latCierre != null ? Number(latCierre) : '',
      lngCierre != null ? Number(lngCierre) : '',
      String(timestampCierre),
      fotoCierre || '',
      'CERRADO',
      existing['Timestamp Creación'],
      updatedAt,
    ];

    await updateRowById(sheetCierre, turnoId, row);

    // Actualizar DynamoDB directamente con UpdateCommand (más confiable que saveTurnoToDynamo,
    // que usa PutItem completo y falla silencioso si no puede reconstruir el item).
    try {
      const dynamoCierre = DynamoDBDocumentClient.from(
        new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })
      );
      const nombreUsuario = existing['Usuario'] || req.body?.usuario || '';
      const { slugUserId } = require('../services/dynamoUtils');
      const userId = slugUserId(nombreUsuario);

      await dynamoCierre.send(new UpdateCommand({
        TableName: process.env.TURNOS_TABLE || 'bee-tracked-turnos-prod',
        Key: { PK: `USER#${userId}`, SK: `TURNO#${String(turnoIdValue)}` },
        UpdateExpression: 'SET estado = :e, horaCierre = :hc, fechaCierre = :fc, latCierre = :latC, lngCierre = :lngC, timestampCierre = :tsC, fotoCierre = :fotoC, updatedAt = :ua',
        ExpressionAttributeValues: {
          ':e': 'cerrado',
          ':hc': String(horaCierre),
          ':fc': fechaCierreBolivia,
          ':latC': latCierre != null ? String(latCierre) : '',
          ':lngC': lngCierre != null ? String(lngCierre) : '',
          ':tsC': String(timestampCierre),
          ':fotoC': fotoCierre || '',
          ':ua': Date.now(),
        },
      }));
      console.info(`[cerrar turno] DynamoDB actualizado: USER#${userId} TURNO#${turnoIdValue}`);
    } catch (dynamoErr) {
      // No fallar el request si DynamoDB falla, pero sí loguear
      console.error('[cerrar turno] DynamoDB update error:', dynamoErr.message);
    }

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

    await saveCarreraToDynamo({
      carreraId: String(deliveryId),
      nombre: String(bikerName).trim(),
      tipo: 'biker',
      fecha,
      horaRegistro: horaReg,
      cliente: String(cliente).trim(),
      horaInicio: horaIni,
      horaFin: horaF,
      lugarRecojo: String(lugarOrigen).trim(),
      lugarDestino: String(lugarDestino).trim(),
      distancia: Number(distancia),
      porHora: porHora ? 'Sí' : 'No',
      observaciones: notas ? String(notas).trim() : '',
      foto: foto || '',
    });

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

// Rutas Kilometraje (carreras del día + registrar km)
const kilometrajeRouter = require('./kilometraje');
router.use('/', kilometrajeRouter);

module.exports = router;
