const express = require('express');
const { sessionAuth, requireRrhh } = require('../middleware/sessionAuth');
const extraordinariosService = require('../services/extraordinariosService');
const { createRequestLogger } = require('../utils/logger');

const router = express.Router();

router.get('/abiertos', sessionAuth, async (req, res) => {
  try {
    const list = await extraordinariosService.listExtraordinarios('abierto');
    res.json({ success: true, extraordinarios: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/mis-inscripciones', sessionAuth, async (req, res) => {
  try {
    const list = await extraordinariosService.listMisInscripciones(req.authUser.userId);
    res.json({ success: true, inscripciones: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:extraId/inscribirse', sessionAuth, async (req, res) => {
  const log = createRequestLogger(req);
  try {
    const { horaInicio, horaFin } = req.body || {};
    const { userId, userType, name } = req.authUser;
    const inscripcion = await extraordinariosService.inscribirse({
      extraId: req.params.extraId,
      userId,
      userName: name,
      userType,
      horaInicio,
      horaFin,
    });
    log.info('Inscripción extraordinario', { extraId: req.params.extraId, userId });
    res.json({ success: true, inscripcion });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

router.get('/admin', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const estado = String(req.query.estado || 'all');
    let list = [];
    if (estado === 'all') {
      const ab = await extraordinariosService.listExtraordinarios('abierto');
      const ce = await extraordinariosService.listExtraordinarios('cerrado');
      list = [...ab, ...ce];
    } else {
      list = await extraordinariosService.listExtraordinarios(estado);
    }
    res.json({ success: true, extraordinarios: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin', sessionAuth, requireRrhh, async (req, res) => {
  const log = createRequestLogger(req);
  try {
    const { titulo, fecha, descripcion, horaInicioSugerida, horaFinSugerida } = req.body || {};
    if (!titulo || !fecha) {
      return res.status(400).json({ success: false, error: 'Faltan titulo o fecha' });
    }
    const extra = await extraordinariosService.createExtraordinario({
      titulo,
      fecha,
      descripcion,
      horaInicioSugerida,
      horaFinSugerida,
      creadoPor: req.authUser.userId,
    });
    log.info('Extraordinario creado', { extraId: extra.extraId });
    res.json({ success: true, extraordinario: extra });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/:extraId/cerrar', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const extra = await extraordinariosService.cerrarExtraordinario(
      req.params.extraId,
      req.authUser.userId
    );
    res.json({ success: true, extraordinario: extra });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/admin/:extraId/inscripciones', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const inscripciones = await extraordinariosService.listInscripciones(req.params.extraId);
    res.json({ success: true, inscripciones });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/:extraId/inscripciones/responder', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const { userName, accion, razon } = req.body || {};
    const inscripcion = await extraordinariosService.respondInscripcion(
      req.params.extraId,
      userName,
      accion,
      req.authUser.userId,
      razon
    );
    res.json({ success: true, inscripcion });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

module.exports = router;
