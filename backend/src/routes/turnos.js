const express = require('express');
const router = express.Router();
const { appendRow, updateRowById, getRowById, getAllRows } = require('../services/googleSheets');
const { uploadBeezeroPhoto, uploadBeezeroGastoPhoto } = require('../services/s3Upload');
const { resolvePhotoField } = require('../services/photoUrl');
const { saveTurnoToDynamo } = require('../services/dualWrite');
const { todayYmdLaPaz, normalizeFechaYmd, isFechaTurnoHoyLaPaz } = require('../utils/dateLaPaz');
const { optionalAuth } = require('../middleware/auth');
const { touchSession, isSessionValid } = require('../services/sessionManager');

function normalizeGastos(gastos) {
  if (!Array.isArray(gastos)) return [];
  return gastos
    .map((gasto) => ({
      tipo: typeof gasto?.tipo === 'string' ? gasto.tipo.trim() : '',
      monto: Number(gasto?.monto) || 0,
      descripcion: typeof gasto?.descripcion === 'string' ? gasto.descripcion.trim() : '',
      foto: typeof gasto?.foto === 'string' ? gasto.foto : '',
      placa: typeof gasto?.placa === 'string' ? gasto.placa.trim() : '',
    }))
    .filter((gasto) => gasto.tipo && gasto.monto > 0);
}

/**
 * Escribe cada gasto en la hoja BeeZero_Gastos (1 fila por gasto).
 * Columnas: ID Gasto | Turno ID | Tipo | Monto (Bs) | Descripción | Foto | Timestamp
 */
async function saveGastosToSheet(turnoId, abejita, gastos, timestamp) {
  for (let i = 0; i < gastos.length; i++) {
    const gasto = gastos[i];
    const gastoId = `${turnoId}-${i + 1}`;

    const fotoUrl = await resolvePhotoField(gasto.foto, (dataUrl) =>
      uploadBeezeroGastoPhoto({
        dataUrl,
        turnoId,
        abejita,
        num: i + 1,
      })
    );

    await appendRow('BeeZero_Gastos', [
      gastoId,                  // A: ID Gasto
      turnoId,                  // B: Turno ID
      gasto.tipo,               // C: Tipo
      gasto.monto,              // D: Monto (Bs)
      gasto.descripcion || '',  // E: Descripción
      fotoUrl,                  // F: Foto
      timestamp,                // G: Timestamp
      gasto.placa || '',        // H: Placa
    ]);
  }
}

// Middleware para validar sesión activa (async: soporta DynamoDB)
async function validateSession(req, res, next) {
  try {
    const userId = req.user?.username || req.body?.userId || req.query?.userId;
    const sessionId = req.headers['x-session-id'] || req.body?.sessionId || req.query?.sessionId;

    if (!userId) {
      return next();
    }

    if (sessionId) {
      const valid = await isSessionValid(userId, sessionId);
      if (!valid) {
        return res.status(401).json({
          success: false,
          error: 'Sesión inválida o expirada. Por favor inicia sesión nuevamente.',
          code: 'SESSION_EXPIRED',
        });
      }
    }

    await touchSession(userId);
    next();
  } catch (err) {
    console.error('Error en validateSession:', err);
    next(err);
  }
}

/**
 * POST /api/turnos/iniciar
 * Registrar inicio de turno
 *
 * Columnas BeeZero:
 * A: ID | B: Timestamp Creación | C: Hora Inicio | D: Hora Cierre | E: Fecha Inicio | F: Fecha Cierre
 * G: Abejita | H: Auto (Placa) | I: Km Inicio | J: Km Cierre | K: Bateria Inicio | L: Bateria Cierre
 * M: Apertura Caja | N: Cierre Caja | O: ID Gastos | P: Total Gastos | Q: Diferencia
 * R: Daños Auto Inicio | S: Foto Tablero Inicio | T: Foto Ext Inicio
 * U: Daños Auto Cierre | V: Foto Tablero Cierre | W: Foto Ext Cierre
 * X: Ubic Inicio Lat | Y: Ubic Inicio Lng | Z: Ubic Cierre Lat | AA: Ubic Cierre Lng
 * AB: Observaciones | AC: Timestamp Actualización | AD: Estado
 */
function findTurnoIniciadoAbierto(rows, abejita) {
  if (!rows?.length) return null;
  const headers = rows[0];
  const dataRows = rows.slice(1);
  const abejitaNorm = String(abejita || '').trim().toLowerCase();
  let best = null;

  for (const row of dataRows) {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] != null ? String(row[index]) : '';
    });
    const estado = String(obj.Estado || '')
      .trim()
      .toUpperCase();
    if (estado !== 'INICIADO') continue;
    const nombre = String(obj.Abejita || '').trim().toLowerCase();
    if (nombre !== abejitaNorm) continue;
    const fecha = normalizeFechaYmd(obj['Fecha Inicio'] || '');
    if (!isFechaTurnoHoyLaPaz(fecha)) continue;
    const id = obj.ID ?? obj.Id ?? '';
    const idNum = Number(id);
    if (!best || idNum > Number(best.id)) {
      best = { id: String(id), row: obj };
    }
  }
  return best;
}

router.post('/iniciar', optionalAuth, validateSession, async (req, res) => {
  try {
    const {
      abejita,
      auto,
      aperturaCaja,
      kilometraje,
      bateria,
      danosAuto,
      fotoPantalla,
      fotoExterior,
      horaInicio,
      ubicacionInicio,
    } = req.body;

    if (!abejita || !auto || aperturaCaja === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: abejita, auto, aperturaCaja',
      });
    }

    const rows = await getAllRows('BeeZero');
    const turnoAbierto = findTurnoIniciadoAbierto(rows, abejita);
    if (turnoAbierto) {
      return res.status(400).json({
        success: false,
        error: `Ya tienes un turno activo (ID ${turnoAbierto.id}). Ciérralo antes de iniciar otro.`,
        code: 'TURNO_ACTIVO_EXISTS',
        turnoId: turnoAbierto.id,
      });
    }

    const id = rows.length; // 0 datos => 1, 1 dato => 2, ...
    const now = new Date().toISOString();
    const fecha = todayYmdLaPaz();

    const urlFotoTableroInicio = await resolvePhotoField(fotoPantalla, (dataUrl) =>
      uploadBeezeroPhoto({ dataUrl, turnoId: id, tipo: 'tablero', momento: 'inicio' })
    );
    const urlFotoExteriorInicio = await resolvePhotoField(fotoExterior, (dataUrl) =>
      uploadBeezeroPhoto({ dataUrl, turnoId: id, tipo: 'danos', momento: 'inicio' })
    );

    const rowValues = [
      id,                         // A: ID
      now,                        // B: Timestamp Creación
      horaInicio || '',           // C: Hora Inicio
      '',                         // D: Hora Cierre
      fecha,                      // E: Fecha Inicio
      '',                         // F: Fecha Cierre
      abejita,                    // G: Abejita
      auto,                       // H: Auto (Placa)
      kilometraje || '',          // I: Kilometraje Inicio
      '',                         // J: Kilometraje Cierre
      bateria ?? '',              // K: Bateria Inicio
      '',                         // L: Bateria Cierre
      aperturaCaja,               // M: Apertura Caja (Bs)
      '',                         // N: Cierre Caja (Bs)
      '',                         // O: ID Gastos
      '',                         // P: Total Gastos (Bs)
      '',                         // Q: Diferencia (Bs)
      danosAuto || 'ninguno',     // R: Daños Auto Inicio
      urlFotoTableroInicio,       // S: Foto Tablero Inicio
      urlFotoExteriorInicio,      // T: Foto Exterior Inicio
      '',                         // U: Daños Auto Cierre
      '',                         // V: Foto Tablero Cierre
      '',                         // W: Foto Exterior Cierre
      ubicacionInicio?.lat || '', // X: Ubicación Inicio (Lat)
      ubicacionInicio?.lng || '', // Y: Ubicación Inicio (Lng)
      '',                         // Z: Ubicación Cierre (Lat)
      '',                         // AA: Ubicación Cierre (Lng)
      '',                         // AB: Observaciones
      now,                        // AC: Timestamp Actualización
      'INICIADO',                 // AD: Estado
    ];

    await appendRow('BeeZero', rowValues);

    await saveTurnoToDynamo({
      turnoId: id,
      nombre: abejita,
      tipo: 'beezero',
      fecha,
      horaInicio: horaInicio || '',
      placa: auto,
      kmInicio: kilometraje || '',
      bateriaInicio: bateria ?? '',
      aperturaCaja,
      estado: 'INICIADO',
      danosAutoInicio: danosAuto || 'ninguno',
      ubicacionInicioLat: ubicacionInicio?.lat || '',
      ubicacionInicioLng: ubicacionInicio?.lng || '',
      fotoTableroInicio: urlFotoTableroInicio,
      fotoExteriorInicio: urlFotoExteriorInicio,
      createdAt: Date.now(),
    });

    res.json({
      success: true,
      message: 'Turno iniciado exitosamente',
      data: {
        id,
        abejita,
        auto,
        aperturaCaja,
        horaInicio,
        estado: 'INICIADO',
      },
    });
  } catch (error) {
    console.error('Error iniciando turno:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al iniciar turno',
    });
  }
});

/**
 * POST /api/turnos/:id/cerrar
 * Cerrar un turno existente
 * Fórmula diferencia: Cierre - Apertura - Total Gastos
 */
router.post('/:id/cerrar', optionalAuth, validateSession, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cierreCaja,
      kilometraje,
      bateria,
      danosAuto,
      fotoPantalla,
      fotoExterior,
      horaCierre,
      ubicacionFin,
      observaciones,
      gastos,
    } = req.body;

    if (!cierreCaja) {
      return res.status(400).json({
        success: false,
        error: 'El cierre de caja es requerido',
      });
    }

    const turnoExistente = await getRowById('BeeZero', id);

    if (!turnoExistente) {
      return res.status(404).json({
        success: false,
        error: 'Turno no encontrado',
      });
    }

    if (turnoExistente.Estado === 'CERRADO') {
      return res.status(400).json({
        success: false,
        error: 'Este turno ya está cerrado',
      });
    }

    const now = new Date().toISOString();
    const fechaCierre = todayYmdLaPaz();

    const gastosNormalizados = normalizeGastos(gastos);
    const totalGastos = gastosNormalizados.reduce((acc, gasto) => acc + gasto.monto, 0);

    // Diferencia = Cierre - Apertura - Total Gastos
    const apertura = parseFloat(turnoExistente['Apertura Caja (Bs)']) || 0;
    const cierre = parseFloat(cierreCaja) || 0;
    const diferencia = cierre - apertura - totalGastos;

    // Guardar gastos en BeeZero_Gastos (1 fila por gasto)
    const gastoIds = gastosNormalizados.map((_, i) => `${id}-${i + 1}`);
    if (gastosNormalizados.length > 0) {
      await saveGastosToSheet(id, turnoExistente.Abejita || '', gastosNormalizados, now);
    }

    const urlFotoTableroCierre = await resolvePhotoField(fotoPantalla, (dataUrl) =>
      uploadBeezeroPhoto({ dataUrl, turnoId: id, tipo: 'tablero', momento: 'cierre' })
    );
    const urlFotoExteriorCierre = await resolvePhotoField(fotoExterior, (dataUrl) =>
      uploadBeezeroPhoto({ dataUrl, turnoId: id, tipo: 'danos', momento: 'cierre' })
    );

    const rowValues = [
      id,                                                                   // A: ID
      turnoExistente['Timestamp Creación'],                                 // B: Timestamp Creación
      turnoExistente['Hora Inicio'],                                        // C: Hora Inicio
      horaCierre || '',                                                     // D: Hora Cierre
      turnoExistente['Fecha Inicio'],                                       // E: Fecha Inicio
      fechaCierre,                                                          // F: Fecha Cierre
      turnoExistente.Abejita,                                               // G: Abejita
      turnoExistente['Auto (Placa)'],                                       // H: Auto (Placa)
      turnoExistente['Kilometraje Inicio'],                                  // I: Kilometraje Inicio
      kilometraje || '',                                                    // J: Kilometraje Cierre
      turnoExistente['Bateria Inicio'] || turnoExistente['Bateria'] || '', // K: Bateria Inicio
      bateria ?? '',                                                        // L: Bateria Cierre
      turnoExistente['Apertura Caja (Bs)'],                                 // M: Apertura Caja (Bs)
      cierreCaja,                                                           // N: Cierre Caja (Bs)
      gastoIds.length > 0 ? gastoIds.join(', ') : '',                      // O: ID Gastos
      totalGastos.toFixed(2),                                               // P: Total Gastos (Bs)
      diferencia.toFixed(2),                                                // Q: Diferencia (Bs)
      turnoExistente['Daños Auto Inicio'],                                   // R: Daños Auto Inicio
      turnoExistente['Foto Tablero Inicio'],                                 // S: Foto Tablero Inicio
      turnoExistente['Foto Exterior Inicio'],                                // T: Foto Exterior Inicio
      danosAuto || 'ninguno',                                               // U: Daños Auto Cierre
      urlFotoTableroCierre,                                                 // V: Foto Tablero Cierre
      urlFotoExteriorCierre,                                                // W: Foto Exterior Cierre
      turnoExistente['Ubicación Inicio (Lat)'],                             // X: Ubicación Inicio (Lat)
      turnoExistente['Ubicación Inicio (Lng)'],                             // Y: Ubicación Inicio (Lng)
      ubicacionFin?.lat || '',                                              // Z: Ubicación Cierre (Lat)
      ubicacionFin?.lng || '',                                              // AA: Ubicación Cierre (Lng)
      observaciones || '',                                                  // AB: Observaciones
      now,                                                                  // AC: Timestamp Actualización
      'CERRADO',                                                            // AD: Estado
    ];

    await updateRowById('BeeZero', id, rowValues);

    await saveTurnoToDynamo({
      turnoId: id,
      nombre: turnoExistente.Abejita,
      tipo: 'beezero',
      fecha: turnoExistente['Fecha Inicio'],
      fechaCierre,
      horaInicio: turnoExistente['Hora Inicio'],
      horaCierre: horaCierre || '',
      placa: turnoExistente['Auto (Placa)'],
      kmInicio: turnoExistente['Kilometraje Inicio'],
      kmFin: kilometraje || '',
      bateriaInicio: turnoExistente['Bateria Inicio'] || turnoExistente['Bateria'] || '',
      bateriaCierre: bateria ?? '',
      aperturaCaja: turnoExistente['Apertura Caja (Bs)'],
      cierreCaja,
      totalGastos: totalGastos.toFixed(2),
      diferencia: diferencia.toFixed(2),
      gastoIds: gastoIds.length > 0 ? gastoIds.join(', ') : '',
      danosAutoInicio: turnoExistente['Daños Auto Inicio'],
      danosAutoCierre: danosAuto || 'ninguno',
      fotoTableroInicio: turnoExistente['Foto Tablero Inicio'],
      fotoExteriorInicio: turnoExistente['Foto Exterior Inicio'],
      fotoTableroCierre: urlFotoTableroCierre,
      fotoExteriorCierre: urlFotoExteriorCierre,
      ubicacionInicioLat: turnoExistente['Ubicación Inicio (Lat)'],
      ubicacionInicioLng: turnoExistente['Ubicación Inicio (Lng)'],
      ubicacionCierreLat: ubicacionFin?.lat || '',
      ubicacionCierreLng: ubicacionFin?.lng || '',
      observaciones: observaciones || '',
      estado: 'CERRADO',
      createdAt: Date.parse(turnoExistente['Timestamp Creación']) || Date.now(),
      updatedAt: Date.now(),
    });

    res.json({
      success: true,
      message: 'Turno cerrado exitosamente',
      data: {
        id,
        cierreCaja,
        totalGastos: totalGastos.toFixed(2),
        gastos: gastosNormalizados,
        diferencia: diferencia.toFixed(2),
        horaCierre,
        estado: 'CERRADO',
      },
    });
  } catch (error) {
    console.error('Error cerrando turno:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al cerrar turno',
    });
  }
});

/**
 * GET /api/turnos/:id/gastos
 * Obtener gastos de un turno desde BeeZero_Gastos
 */
router.get('/:id/gastos', async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await getAllRows('BeeZero_Gastos');

    if (rows.length <= 1) {
      return res.json({ success: true, data: [] });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const gastos = dataRows
      .filter((row) => String(row[1]) === String(id)) // columna B = Turno ID
      .map((row) => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return {
          id: obj['ID Gasto'],
          tipo: obj['Tipo'],
          monto: parseFloat(obj['Monto (Bs)']) || 0,
          descripcion: obj['Descripción'] || '',
          foto: obj['Foto'] || '',
          timestamp: obj['Timestamp'],
        };
      });

    res.json({ success: true, data: gastos });
  } catch (error) {
    console.error('Error obteniendo gastos:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener gastos',
    });
  }
});

/**
 * GET /api/turnos
 * Obtener todos los turnos
 */
router.get('/', async (req, res) => {
  try {
    const rows = await getAllRows('BeeZero');

    if (rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const turnos = dataRows.map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    res.json({ success: true, data: turnos });
  } catch (error) {
    console.error('Error obteniendo turnos:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener turnos',
    });
  }
});

/**
 * GET /api/turnos/:id
 * Obtener un turno por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const turno = await getRowById('BeeZero', id);

    if (!turno) {
      return res.status(404).json({
        success: false,
        error: 'Turno no encontrado',
      });
    }

    res.json({ success: true, data: turno });
  } catch (error) {
    console.error('Error obteniendo turno:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener turno',
    });
  }
});

module.exports = router;
