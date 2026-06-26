const express = require('express');
const { sessionAuth, requireRrhh } = require('../middleware/sessionAuth');
const asistenciaService = require('../services/asistenciaService');
const { createRequestLogger } = require('../utils/logger');

const router = express.Router();

router.get('/reporte', sessionAuth, requireRrhh, async (req, res) => {
  const log = createRequestLogger(req);
  try {
    const semana = String(req.query.semana || '');
    const userType = String(req.query.userType || 'all');
    const generarMultas = req.query.generarMultas === 'true';
    if (!semana) {
      return res.status(400).json({ success: false, error: 'Falta parámetro semana' });
    }
    const reporte = await asistenciaService.calcularAsistenciaSemana({
      semana,
      userType,
      generarMultas,
    });
    log.info('Reporte asistencia', { semana, usuarios: reporte.length });
    res.json({ success: true, reporte });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/export', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const semana = String(req.query.semana || '');
    const userType = String(req.query.userType || 'all');
    if (!semana) {
      return res.status(400).json({ success: false, error: 'Falta parámetro semana' });
    }
    const reporte = await asistenciaService.calcularAsistenciaSemana({ semana, userType, generarMultas: false });
    const csv = asistenciaService.reporteToCsv(reporte);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="asistencia-${semana}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
