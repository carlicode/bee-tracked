const express = require('express');
const router = express.Router();
const { appendRow, updateRowById, getRowById, getAllRows } = require('../services/googleSheets');
const { uploadBeezeroPhoto, uploadBeezeroGastoPhoto } = require('../services/s3Upload');
const { resolvePhotoField } = require('../services/photoUrl');
const { saveTurnoToDynamo } = require('../services/dualWrite');
const hybridWrite = require('../services/hybridWrite');
const turnosService = require('../services/turnosService');
const { todayYmdLaPaz, normalizeFechaYmd, isFechaTurnoHoyLaPaz, laPazDateTimeToUtcMs } = require('../utils/dateLaPaz');
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
 * Columnas BeeZero (31 cols tras agregar Pagos QR):
 * A: ID | B: Timestamp Creación | C: Hora Inicio | D: Hora Cierre | E: Fecha Inicio | F: Fecha Cierre
 * G: Abejita | H: Auto (Placa) | I: Km Inicio | J: Km Cierre | K: Bateria Inicio | L: Bateria Cierre
 * M: Apertura Caja | N: Pagos QR | O: Cierre Caja | P: ID Gastos | Q: Total Gastos | R: Diferencia
 * S: Daños Auto Inicio | T: Foto Tablero Inicio | U: Foto Ext Inicio
 * V: Daños Auto Cierre | W: Foto Tablero Cierre | X: Foto Ext Cierre
 * Y: Ubic Inicio Lat | Z: Ubic Inicio Lng | AA: Ubic Cierre Lat | AB: Ubic Cierre Lng
 * AC: Observaciones | AD: Timestamp Actualización | AE: Estado
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
    if (!isFechaTurnoHoyLaPaz(fecha)) {
      // Turno de ayer que cruza la medianoche (p.ej. inicio 11:37, cierre 00:40):
      // sigue vigente/cerrable si empezó hace menos de 16h.
      const inicioMs = Date.parse(obj['Timestamp Creación'] || '')
        || laPazDateTimeToUtcMs(fecha, obj['Hora Inicio']);
      if (!Number.isFinite(inicioMs) || Date.now() - inicioMs >= turnosService.VENTANA_TURNO_ABIERTO_MS) continue;
    }
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
      '',                         // N: Pagos QR (Bs)
      '',                         // O: Cierre Caja (Bs)
      '',                         // P: ID Gastos
      '',                         // Q: Total Gastos (Bs)
      '',                         // R: Diferencia (Bs)
      danosAuto || 'ninguno',     // S: Daños Auto Inicio
      urlFotoTableroInicio,       // T: Foto Tablero Inicio
      urlFotoExteriorInicio,      // U: Foto Exterior Inicio
      '',                         // V: Daños Auto Cierre
      '',                         // W: Foto Tablero Cierre
      '',                         // X: Foto Exterior Cierre
      ubicacionInicio?.lat || '', // Y: Ubicación Inicio (Lat)
      ubicacionInicio?.lng || '', // Z: Ubicación Inicio (Lng)
      '',                         // AA: Ubicación Cierre (Lat)
      '',                         // AB: Ubicación Cierre (Lng)
      '',                         // AC: Observaciones
      now,                        // AD: Timestamp Actualización
      'INICIADO',                 // AE: Estado
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
 * Fórmula Total Final (col R "Diferencia"): Cierre - Apertura - Total Gastos + Pagos QR
 * Pagos QR también se guarda aparte en col N para detalle, pero desde 2026-07-20 ya se incluye
 * en la Diferencia final (antes se guardaba una Diferencia sin QR, distinta de lo que veía el conductor)
 */
router.post('/:id/cerrar', optionalAuth, validateSession, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      abejita,
      cierreCaja,
      pagosQR,
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

    // DynamoDB primero (fuente de verdad); Sheet como fallback si no vino `abejita`
    // o el turno no está en Dynamo (turnos viejos, o si Dynamo tuvo problemas al iniciar).
    let turnoExistente = abejita ? await turnosService.getTurnoByIdBeezero(abejita, id) : null;
    if (!turnoExistente) {
      turnoExistente = await getRowById('BeeZero', id);
    }

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

    // Total Final = Cierre - Apertura - Total Gastos + Pagos QR
    const apertura = parseFloat(turnoExistente['Apertura Caja (Bs)']) || 0;
    const cierre = parseFloat(cierreCaja) || 0;
    const pagosQRNum = parseFloat(pagosQR) || 0;
    const diferencia = cierre - apertura - totalGastos + pagosQRNum;

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
      pagosQRNum > 0 ? pagosQRNum.toFixed(2) : '',                          // N: Pagos QR (Bs)
      cierreCaja,                                                           // O: Cierre Caja (Bs)
      gastoIds.length > 0 ? gastoIds.join(', ') : '',                      // P: ID Gastos
      totalGastos.toFixed(2),                                               // Q: Total Gastos (Bs)
      diferencia.toFixed(2),                                                // R: Diferencia (Bs)
      turnoExistente['Daños Auto Inicio'],                                   // S: Daños Auto Inicio
      turnoExistente['Foto Tablero Inicio'],                                 // T: Foto Tablero Inicio
      turnoExistente['Foto Exterior Inicio'],                                // U: Foto Exterior Inicio
      danosAuto || 'ninguno',                                               // V: Daños Auto Cierre
      urlFotoTableroCierre,                                                 // W: Foto Tablero Cierre
      urlFotoExteriorCierre,                                                // X: Foto Exterior Cierre
      turnoExistente['Ubicación Inicio (Lat)'],                             // Y: Ubicación Inicio (Lat)
      turnoExistente['Ubicación Inicio (Lng)'],                             // Z: Ubicación Inicio (Lng)
      ubicacionFin?.lat || '',                                              // AA: Ubicación Cierre (Lat)
      ubicacionFin?.lng || '',                                              // AB: Ubicación Cierre (Lng)
      observaciones || '',                                                  // AC: Observaciones
      now,                                                                  // AD: Timestamp Actualización
      'CERRADO',                                                            // AE: Estado
    ];

    // DynamoDB obligatorio (fuente de verdad); Sheet best-effort (si falla, no bloquea al conductor).
    await hybridWrite.write({
      dynamo: () =>
        turnosService.putTurno({
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
          pagosQR: pagosQRNum > 0 ? pagosQRNum.toFixed(2) : '',
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
          log: turnoExistente.Log || '',
          estado: 'CERRADO',
          createdAt: Date.parse(turnoExistente['Timestamp Creación']) || Date.now(),
          updatedAt: Date.now(),
        }),
      sheets: () => updateRowById('BeeZero', id, rowValues),
      context: `turno:cerrar:beezero:${id}`,
    });

    res.json({
      success: true,
      message: 'Turno cerrado exitosamente',
      data: {
        id,
        cierreCaja,
        pagosQR: pagosQRNum > 0 ? pagosQRNum.toFixed(2) : '0',
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
 * Campos que el conductor puede corregir: SOLO datos ingresados manualmente.
 * Hora, fecha, ubicación GPS, fotos, estado y gastos NO son editables desde aquí.
 * `cierre: true` = solo corregible cuando el turno ya está CERRADO.
 */
const CAMPOS_EDITABLES = {
  aperturaCaja:      { header: 'Apertura Caja (Bs)',  num: true,  cierre: false },
  cierreCaja:        { header: 'Cierre Caja (Bs)',    num: true,  cierre: true },
  pagosQR:           { header: 'Pagos QR (Bs)',       num: true,  cierre: true },
  kilometrajeInicio: { header: 'Kilometraje Inicio',  num: true,  cierre: false },
  kilometrajeCierre: { header: 'Kilometraje Cierre',  num: true,  cierre: true },
  bateriaInicio:     { header: 'Bateria Inicio',      num: true,  cierre: false },
  bateriaCierre:     { header: 'Bateria Cierre',      num: true,  cierre: true },
  danosAutoInicio:   { header: 'Daños Auto Inicio',   num: false, cierre: false },
  danosAutoCierre:   { header: 'Daños Auto Cierre',   num: false, cierre: true },
  observaciones:     { header: 'Observaciones',       num: false, cierre: false },
};

/**
 * POST /api/turnos/:id/editar
 * Corrección de datos manuales de un turno BeeZero por el conductor.
 * Cada corrección se acumula como entrada JSON en la columna Log (Sheet col AF / attr `log` en Dynamo):
 * [{ "t": "<ISO>", "por": "<abejita>", "cambios": { "<campo>": { "de": "<antes>", "a": "<después>" } } }]
 */
router.post('/:id/editar', optionalAuth, validateSession, async (req, res) => {
  try {
    const { id } = req.params;
    const { abejita, cambios } = req.body;

    if (!cambios || typeof cambios !== 'object' || Array.isArray(cambios) || Object.keys(cambios).length === 0) {
      return res.status(400).json({ success: false, error: 'Debes enviar los cambios a aplicar' });
    }

    const prohibidos = Object.keys(cambios).filter((k) => !CAMPOS_EDITABLES[k]);
    if (prohibidos.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Campos no editables: ${prohibidos.join(', ')}. Solo se pueden corregir datos ingresados manualmente.`,
      });
    }

    // DynamoDB primero; fallback Sheet (mismo criterio que /cerrar)
    let turnoExistente = abejita ? await turnosService.getTurnoByIdBeezero(abejita, id) : null;
    if (!turnoExistente) {
      turnoExistente = await getRowById('BeeZero', id);
    }
    if (!turnoExistente) {
      return res.status(404).json({ success: false, error: 'Turno no encontrado' });
    }

    // Compatibilidad con filas viejas que usaban la columna 'Bateria'
    if (!turnoExistente['Bateria Inicio'] && turnoExistente['Bateria']) {
      turnoExistente['Bateria Inicio'] = turnoExistente['Bateria'];
    }

    const cerrado = String(turnoExistente.Estado || '').toUpperCase() === 'CERRADO';

    // Aplicar solo lo que realmente cambia (comparación numérica para montos: '60.00' == '60')
    const diff = {};
    for (const [campo, valorNuevo] of Object.entries(cambios)) {
      const def = CAMPOS_EDITABLES[campo];
      if (def.cierre && !cerrado) {
        return res.status(400).json({
          success: false,
          error: `No puedes corregir ${campo} de un turno que aún no está cerrado`,
        });
      }
      const actualStr = String(turnoExistente[def.header] ?? '');
      let nuevoStr;
      if (def.num) {
        const num = parseFloat(valorNuevo);
        if (valorNuevo == null || valorNuevo === '' || isNaN(num) || num < 0) {
          return res.status(400).json({ success: false, error: `Valor inválido para ${campo}` });
        }
        const actualNum = parseFloat(actualStr);
        if (Number.isFinite(actualNum) && actualNum === num) continue;
        nuevoStr = String(num);
      } else {
        nuevoStr = String(valorNuevo ?? '').trim().slice(0, 500);
        if (campo.startsWith('danosAuto') && nuevoStr === '') nuevoStr = 'ninguno';
        if (nuevoStr === actualStr) continue;
      }
      diff[campo] = { de: actualStr, a: nuevoStr };
      turnoExistente[def.header] = nuevoStr;
    }

    if (Object.keys(diff).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay cambios: los valores enviados son iguales a los actuales',
      });
    }

    // Recalcular Diferencia si cambió la caja (gastos no son editables desde aquí)
    if (cerrado && (diff.aperturaCaja || diff.cierreCaja || diff.pagosQR)) {
      const apertura = parseFloat(turnoExistente['Apertura Caja (Bs)']) || 0;
      const cierre = parseFloat(turnoExistente['Cierre Caja (Bs)']) || 0;
      const qr = parseFloat(turnoExistente['Pagos QR (Bs)']) || 0;
      const gastosTot = parseFloat(turnoExistente['Total Gastos (Bs)']) || 0;
      turnoExistente['Diferencia (Bs)'] = (cierre - apertura - gastosTot + qr).toFixed(2);
    }

    // Acumular la corrección en el Log
    let logEntries = [];
    try {
      const parsed = JSON.parse(turnoExistente.Log || '[]');
      if (Array.isArray(parsed)) logEntries = parsed;
    } catch {
      // Log previo corrupto: se reinicia, la edición no se pierde
    }
    logEntries.push({
      t: new Date().toISOString(),
      por: abejita || req.user?.name || req.user?.username || 'desconocido',
      cambios: diff,
    });
    const logStr = JSON.stringify(logEntries);
    turnoExistente.Log = logStr;
    turnoExistente['Timestamp Actualización'] = new Date().toISOString();

    const rowValues = turnosService.BEEZERO_HEADERS.map((h) => turnoExistente[h] ?? '');

    await hybridWrite.write({
      dynamo: () =>
        turnosService.putTurno({
          turnoId: id,
          nombre: turnoExistente.Abejita,
          tipo: 'beezero',
          fecha: turnoExistente['Fecha Inicio'],
          fechaCierre: turnoExistente['Fecha Cierre'],
          horaInicio: turnoExistente['Hora Inicio'],
          horaCierre: turnoExistente['Hora Cierre'],
          placa: turnoExistente['Auto (Placa)'],
          kmInicio: turnoExistente['Kilometraje Inicio'],
          kmFin: turnoExistente['Kilometraje Cierre'],
          bateriaInicio: turnoExistente['Bateria Inicio'],
          bateriaCierre: turnoExistente['Bateria Cierre'],
          aperturaCaja: turnoExistente['Apertura Caja (Bs)'],
          pagosQR: turnoExistente['Pagos QR (Bs)'],
          cierreCaja: turnoExistente['Cierre Caja (Bs)'],
          gastoIds: turnoExistente['ID Gastos'],
          totalGastos: turnoExistente['Total Gastos (Bs)'],
          diferencia: turnoExistente['Diferencia (Bs)'],
          danosAutoInicio: turnoExistente['Daños Auto Inicio'],
          danosAutoCierre: turnoExistente['Daños Auto Cierre'],
          fotoTableroInicio: turnoExistente['Foto Tablero Inicio'],
          fotoExteriorInicio: turnoExistente['Foto Exterior Inicio'],
          fotoTableroCierre: turnoExistente['Foto Tablero Cierre'],
          fotoExteriorCierre: turnoExistente['Foto Exterior Cierre'],
          ubicacionInicioLat: turnoExistente['Ubicación Inicio (Lat)'],
          ubicacionInicioLng: turnoExistente['Ubicación Inicio (Lng)'],
          ubicacionCierreLat: turnoExistente['Ubicación Cierre (Lat)'],
          ubicacionCierreLng: turnoExistente['Ubicación Cierre (Lng)'],
          observaciones: turnoExistente.Observaciones,
          log: logStr,
          estado: turnoExistente.Estado,
          createdAt: Date.parse(turnoExistente['Timestamp Creación']) || Date.now(),
          updatedAt: Date.now(),
        }),
      sheets: () => updateRowById('BeeZero', id, rowValues),
      context: `turno:editar:beezero:${id}`,
    });

    res.json({
      success: true,
      message: 'Corrección guardada',
      data: {
        id,
        cambios: diff,
        turno: turnoExistente,
      },
    });
  } catch (error) {
    console.error('Error editando turno:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al guardar la corrección',
    });
  }
});

/**
 * GET /api/turnos/activo?usuario=NombreAbejita
 * Turno INICIADO de hoy (DynamoDB + fallback Sheet). Evita descargar toda la hoja BeeZero.
 */
router.get('/activo', async (req, res) => {
  try {
    const usuario = String(req.query.usuario || '').trim();
    if (!usuario) {
      return res.status(400).json({ success: false, error: 'Parámetro usuario requerido' });
    }

    let row = await turnosService.getTurnoActivoBeezero(usuario);

    if (!row) {
      const rows = await getAllRows('BeeZero');
      const parts = usuario.split(/\s+/).filter(Boolean);
      const nameCandidates = [
        usuario,
        parts.slice(0, 2).join(' '),
        parts.slice(0, 3).join(' '),
      ].filter((c, i, arr) => c && arr.indexOf(c) === i);

      for (const name of nameCandidates) {
        const found = findTurnoIniciadoAbierto(rows, name);
        if (found?.row) {
          row = found.row;
          break;
        }
      }
    }

    return res.json({ success: true, data: row || null });
  } catch (error) {
    console.error('[turnos] GET /activo error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener turno activo',
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
