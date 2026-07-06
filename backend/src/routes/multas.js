const express = require('express');
const { sessionAuth, requireRrhh } = require('../middleware/sessionAuth');
const multasService = require('../services/multasService');
const { createRequestLogger } = require('../utils/logger');

const router = express.Router();

router.get('/mis-multas', sessionAuth, async (req, res) => {
  try {
    const multas = await multasService.listMultas({
      userId: req.authUser.userId,
      estado: 'activa',
    });
    res.json({ success: true, multas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/admin', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const { userId, fechaDesde, fechaHasta, estado } = req.query;
    const multas = await multasService.listMultas({
      userId: userId ? String(userId) : undefined,
      fechaDesde: fechaDesde ? String(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? String(fechaHasta) : undefined,
      estado: estado ? String(estado) : 'all',
    });
    res.json({ success: true, multas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/admin/reglas', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const reglas = await multasService.getReglas();
    res.json({ success: true, reglas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/admin/reglas', sessionAuth, requireRrhh, async (req, res) => {
  const log = createRequestLogger(req);
  try {
    const reglas = await multasService.saveReglas(req.body?.reglas || req.body, req.authUser.userId);
    log.info('Reglas multas actualizadas');
    res.json({ success: true, reglas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/admin/:userId/:fecha/:multaId/dispensar', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const { razon } = req.body || {};
    const multa = await multasService.dispensarMulta(
      req.params.userId,
      req.params.multaId,
      req.params.fecha,
      req.authUser.userId,
      razon
    );
    res.json({ success: true, multa });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
