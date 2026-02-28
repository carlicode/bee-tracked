const express = require('express');
const router = express.Router();
const { appendRow, updateRowById, getRowById, getAllRows } = require('../services/googleSheets');
const { uploadBeezeroPhoto, isS3Configured } = require('../services/s3Upload');
const { optionalAuth } = require('../middleware/auth');
const { touchSession, isSessionValid, getSession } = require('../services/sessionManager');

// Middleware para validar sesión activa
function validateSession(req, res, next) {
  // Extraer userId del JWT (si existe) o del body/query
  const userId = req.user?.username || req.body?.userId || req.query?.userId;
  const sessionId = req.headers['x-session-id'] || req.body?.sessionId || req.query?.sessionId;

  if (!userId) {
    // Si no hay userId, permitir continuar (para compatibilidad con modo demo)
    return next();
  }

  // Verificar si la sesión es válida
  if (sessionId && !isSessionValid(userId, sessionId)) {
    return res.status(401).json({
      success: false,
      error: 'Sesión inválida o expirada. Por favor inicia sesión nuevamente.',
      code: 'SESSION_EXPIRED',
    });
  }

  // Actualizar actividad de la sesión
  touchSession(userId);
  next();
}

/**
 * POST /api/turnos/iniciar
 * Registrar inicio de turno
 */
router.post('/iniciar', optionalAuth, validateSession, async (req, res) => {
  try {
    const {
      abejita,
      auto,
      aperturaCaja,
      kilometraje,
      danosAuto,
      fotoPantalla,
      fotoExterior,
      horaInicio,
      ubicacionInicio,
    } = req.body;

    // Validaciones
    if (!abejita || !auto || aperturaCaja === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: abejita, auto, aperturaCaja',
      });
    }

    // ID secuencial empezando en 1 (fila 1 = headers, fila 2 = ID 1, etc.)
    const rows = await getAllRows('BeeZero');
    const nextId = rows.length; // 0 datos => 1, 1 dato => 2, ...
    const id = nextId;
    const now = new Date().toISOString();
    const fecha = now.split('T')[0]; // YYYY-MM-DD

    // Fotos: subir a S3 (beezero/tablero/ y beezero/danos/) si está configurado
    let urlFotoTableroInicio = '';
    let urlFotoExteriorInicio = '';
    if (isS3Configured()) {
      try {
        if (fotoPantalla) {
          urlFotoTableroInicio = await uploadBeezeroPhoto({
            dataUrl: fotoPantalla,
            turnoId: id,
            tipo: 'tablero',
            momento: 'inicio',
          });
        }
        if (fotoExterior) {
          urlFotoExteriorInicio = await uploadBeezeroPhoto({
            dataUrl: fotoExterior,
            turnoId: id,
            tipo: 'danos',
            momento: 'inicio',
          });
        }
      } catch (err) {
        console.error('Error subiendo fotos a S3 (inicio):', err.message);
      }
    }

    const rowValues = [
      id, // A: ID
      abejita, // B: Abejita
      auto, // C: Auto (Placa)
      kilometraje || '', // D: Kilometraje Inicio
      '', // E: Kilometraje Cierre (vacío por ahora)
      aperturaCaja, // F: Apertura Caja (Bs)
      '', // G: Cierre Caja (Bs) (vacío)
      '', // H: QR (Bs) (vacío)
      '', // I: Diferencia (Bs) (vacío)
      danosAuto || 'ninguno', // J: Daños Auto Inicio
      '', // K: Daños Auto Cierre (vacío)
      urlFotoTableroInicio, // L: Foto Tablero Inicio
      urlFotoExteriorInicio, // M: Foto Exterior Inicio (daños)
      '', // N: Foto Tablero Cierre (vacío)
      '', // O: Foto Exterior Cierre (vacío)
      horaInicio || '', // P: Hora Inicio
      '', // Q: Hora Cierre (vacío)
      fecha, // R: Fecha Inicio
      '', // S: Fecha Cierre (vacío)
      ubicacionInicio?.lat || '', // T: Ubicación Inicio (Lat)
      ubicacionInicio?.lng || '', // U: Ubicación Inicio (Lng)
      '', // V: Ubicación Cierre (Lat) (vacío)
      '', // W: Ubicación Cierre (Lng) (vacío)
      '', // X: Observaciones (vacío)
      'INICIADO', // Y: Estado
      now, // Z: Timestamp Creación
      now, // AA: Timestamp Actualización
    ];

    // Agregar fila a Google Sheets
    await appendRow('BeeZero', rowValues);

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
 */
router.post('/:id/cerrar', optionalAuth, validateSession, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cierreCaja,
      qr,
      kilometraje,
      danosAuto,
      fotoPantalla,
      fotoExterior,
      horaCierre,
      ubicacionFin,
      observaciones,
    } = req.body;

    // Validaciones
    if (!cierreCaja) {
      return res.status(400).json({
        success: false,
        error: 'El cierre de caja es requerido',
      });
    }

    // Obtener el turno existente
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
    const fechaCierre = now.split('T')[0];

    // Calcular diferencia (suma de apertura + QR + cierre)
    const apertura = parseFloat(turnoExistente['Apertura Caja (Bs)']) || 0;
    const cierre = parseFloat(cierreCaja) || 0;
    const qrMonto = parseFloat(qr) || 0;
    const diferencia = apertura + qrMonto + cierre;

    // Fotos cierre: subir a S3 si está configurado
    let urlFotoTableroCierre = '';
    let urlFotoExteriorCierre = '';
    if (isS3Configured()) {
      try {
        if (fotoPantalla) {
          urlFotoTableroCierre = await uploadBeezeroPhoto({
            dataUrl: fotoPantalla,
            turnoId: id,
            tipo: 'tablero',
            momento: 'cierre',
          });
        }
        if (fotoExterior) {
          urlFotoExteriorCierre = await uploadBeezeroPhoto({
            dataUrl: fotoExterior,
            turnoId: id,
            tipo: 'danos',
            momento: 'cierre',
          });
        }
      } catch (err) {
        console.error('Error subiendo fotos a S3 (cierre):', err.message);
      }
    }

    const rowValues = [
      id, // A: ID
      turnoExistente.Abejita, // B: Abejita
      turnoExistente['Auto (Placa)'], // C: Auto
      turnoExistente['Kilometraje Inicio'], // D: Kilometraje Inicio
      kilometraje || '', // E: Kilometraje Cierre
      turnoExistente['Apertura Caja (Bs)'], // F: Apertura Caja
      cierreCaja, // G: Cierre Caja
      qr || 0, // H: QR
      diferencia.toFixed(2), // I: Diferencia
      turnoExistente['Daños Auto Inicio'], // J: Daños Auto Inicio
      danosAuto || 'ninguno', // K: Daños Auto Cierre
      turnoExistente['Foto Tablero Inicio'], // L: Foto Tablero Inicio
      turnoExistente['Foto Exterior Inicio'], // M: Foto Exterior Inicio
      urlFotoTableroCierre, // N: Foto Tablero Cierre
      urlFotoExteriorCierre, // O: Foto Exterior Cierre (daños)
      turnoExistente['Hora Inicio'], // P: Hora Inicio
      horaCierre || '', // Q: Hora Cierre
      turnoExistente['Fecha Inicio'], // R: Fecha Inicio
      fechaCierre, // S: Fecha Cierre
      turnoExistente['Ubicación Inicio (Lat)'], // T: Ubicación Inicio (Lat)
      turnoExistente['Ubicación Inicio (Lng)'], // U: Ubicación Inicio (Lng)
      ubicacionFin?.lat || '', // V: Ubicación Cierre (Lat)
      ubicacionFin?.lng || '', // W: Ubicación Cierre (Lng)
      observaciones || '', // X: Observaciones
      'CERRADO', // Y: Estado
      turnoExistente['Timestamp Creación'], // Z: Timestamp Creación
      now, // AA: Timestamp Actualización
    ];

    // Actualizar en Google Sheets
    await updateRowById('BeeZero', id, rowValues);

    res.json({
      success: true,
      message: 'Turno cerrado exitosamente',
      data: {
        id,
        cierreCaja,
        qr,
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
 * GET /api/turnos
 * Obtener todos los turnos
 */
router.get('/', async (req, res) => {
  try {
    const rows = await getAllRows('BeeZero');
    
    if (rows.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Primera fila son los headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Convertir a objetos
    const turnos = dataRows.map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    res.json({
      success: true,
      data: turnos,
    });
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

    res.json({
      success: true,
      data: turno,
    });
  } catch (error) {
    console.error('Error obteniendo turno:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener turno',
    });
  }
});

module.exports = router;
