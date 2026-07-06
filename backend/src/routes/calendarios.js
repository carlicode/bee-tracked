const express = require('express');
const { sessionAuth, requireRrhh } = require('../middleware/sessionAuth');
const calendariosService = require('../services/calendariosService');
const { createRequestLogger } = require('../utils/logger');

const router = express.Router();

router.get('/mi-estado', sessionAuth, async (req, res) => {
  try {
    const estado = await calendariosService.getWorkerEstado(req.authUser.name);
    res.json({ success: true, ...estado });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/enviar', sessionAuth, async (req, res) => {
  const log = createRequestLogger(req);
  try {
    const { dias, fechaDesde, fechaHasta } = req.body || {};
    const { userId, userType, name } = req.authUser;
    const horario = await calendariosService.submitHorario({
      userId,
      userName: name,
      userType,
      dias,
      fechaDesde,
      fechaHasta,
    });
    log.info('Horario enviado', { horarioId: horario.horarioId, userId });
    res.json({ success: true, horario });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      code: err.code,
    });
  }
});

router.get('/mi-historial', sessionAuth, async (req, res) => {
  try {
    const historial = await calendariosService.listHorariosUser(req.authUser.name);
    res.json({ success: true, historial });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/admin/ventanas', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const ventanas = await calendariosService.listVentanasAbiertas();
    res.json({ success: true, ventanas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/admin/pendientes', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const horarios = await calendariosService.listByEstado('enviado');
    res.json({ success: true, horarios });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/admin/activos', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const horarios = await calendariosService.listByEstado('activo');
    res.json({ success: true, horarios });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/admin/visual', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    if (!fechaDesde || !fechaHasta) {
      return res.status(400).json({ success: false, error: 'Faltan fechaDesde o fechaHasta' });
    }
    const calendario = await calendariosService.getCalendarioVisual(
      String(fechaDesde),
      String(fechaHasta)
    );
    res.json({ success: true, calendario });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

router.post('/admin/habilitar', sessionAuth, requireRrhh, async (req, res) => {
  const log = createRequestLogger(req);
  try {
    const { userId, userName, userType, fechaDesde, fechaHasta, baseHorarioId } = req.body || {};
    if (!userName || !fechaDesde || !fechaHasta) {
      return res.status(400).json({ success: false, error: 'Faltan userName, fechaDesde o fechaHasta' });
    }
    const hab = await calendariosService.habilitarWorker({
      userId: userId || userName,
      userName,
      userType,
      fechaDesde,
      fechaHasta,
      habilitadoPor: req.authUser.userId,
      baseHorarioId,
    });
    log.info('Ventana habilitada', { userName, fechaDesde, fechaHasta });
    res.json({ success: true, habilitacion: hab });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

router.post('/admin/rehabilitar', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const { userId, userName, userType } = req.body || {};
    if (!userName) {
      return res.status(400).json({ success: false, error: 'Falta userName' });
    }
    const hab = await calendariosService.rehabilitarWorker({
      userId: userId || userName,
      userName,
      userType,
      habilitadoPor: req.authUser.userId,
    });
    res.json({ success: true, habilitacion: hab });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

router.put('/admin/editar/:userName/:horarioId', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const { dias, marcarActivo } = req.body || {};
    const horario = await calendariosService.editarHorario(
      req.params.userName,
      req.params.horarioId,
      dias,
      req.authUser.userId,
      marcarActivo !== false
    );
    res.json({ success: true, horario });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

router.get('/admin/usuario/:userName', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const historial = await calendariosService.listHorariosUser(req.params.userName);
    const habilitacion = await calendariosService.getHabilitacion(req.params.userName);
    res.json({ success: true, historial, habilitacion });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
