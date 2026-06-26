const express = require('express');
const { sessionAuth, requireRrhh } = require('../middleware/sessionAuth');
const calendariosService = require('../services/calendariosService');
const usersProfileService = require('../services/usersProfileService');
const { isoWeekKey, mondayOfWeekYmd } = require('../utils/weekUtils');
const { createRequestLogger } = require('../utils/logger');

const router = express.Router();

router.get('/mi-calendario', sessionAuth, async (req, res) => {
  try {
    const { semana } = req.query;
    const { userId, name } = req.authUser;
    if (semana) {
      const cal = await calendariosService.getSemanaCalendario(name, String(semana));
      return res.json({ success: true, calendario: cal });
    }
    const list = await calendariosService.listSemanasByUser(name);
    res.json({ success: true, calendarios: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/propuesta', sessionAuth, async (req, res) => {
  const log = createRequestLogger(req);
  try {
    const { semana, fechaInicioSemana, dias } = req.body || {};
    const { userId, userType, name } = req.authUser;
    const propuesta = await calendariosService.createPropuesta({
      userId,
      userName: name,
      userType,
      semana,
      fechaInicioSemana,
      dias,
    });
    log.info('Propuesta calendario', { propuestaId: propuesta.propuestaId });
    res.json({ success: true, propuesta });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
      code: err.code,
    });
  }
});

router.get('/admin/semana', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const semana = String(req.query.semana || '');
    const userType = String(req.query.userType || 'all');
    if (!semana) {
      return res.status(400).json({ success: false, error: 'Falta parámetro semana' });
    }
    const calendarios = await calendariosService.listCalendariosSemana(semana, userType);
    res.json({ success: true, calendarios });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/semana', sessionAuth, requireRrhh, async (req, res) => {
  const log = createRequestLogger(req);
  try {
    const { semana, fechaInicioSemana, calendarios } = req.body || {};
    if (!semana || !Array.isArray(calendarios)) {
      return res.status(400).json({ success: false, error: 'Faltan semana o calendarios' });
    }
    const saved = await calendariosService.bulkSaveSemana({
      semana,
      fechaInicioSemana,
      calendarios,
      publicadoPor: req.authUser.userId,
    });
    log.info('Calendarios publicados', { semana, count: saved.length });
    res.json({ success: true, calendarios: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/repetir', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const { userId, userName, userType, targetSemana, targetInicio, sourceSemana } = req.body || {};
    const cal = await calendariosService.repeatFromPreviousWeek({
      userId,
      userName,
      userType,
      targetSemana,
      targetInicio,
      sourceSemana,
      publicadoPor: req.authUser.userId,
    });
    res.json({ success: true, calendario: cal });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

router.get('/admin/propuestas', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const propuestas = await calendariosService.listPropuestasPendientes();
    res.json({ success: true, propuestas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/propuestas/:propuestaId/responder', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const { userName, accion, razon } = req.body || {};
    const propuesta = await calendariosService.respondPropuesta(
      req.params.propuestaId,
      userName,
      accion,
      req.authUser.userId,
      razon
    );
    res.json({ success: true, propuesta });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
});

router.patch('/admin/perfil/:userId/propuesta', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const { habilitada } = req.body || {};
    const perfil = await usersProfileService.setCalendarioPropuestaHabilitada(
      req.params.userId,
      Boolean(habilitada),
      req.authUser.userId
    );
    res.json({ success: true, perfil });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/utils/semana-actual', sessionAuth, async (req, res) => {
  const hoy = req.query.fecha || new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
  res.json({
    success: true,
    semana: isoWeekKey(String(hoy)),
    fechaInicioSemana: mondayOfWeekYmd(String(hoy)),
    dias: calendariosService.DIAS,
  });
});

module.exports = router;
