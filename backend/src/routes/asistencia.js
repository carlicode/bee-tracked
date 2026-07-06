const express = require('express');
const { sessionAuth, requireRrhh } = require('../middleware/sessionAuth');
const asistenciaService = require('../services/asistenciaService');
const { createRequestLogger } = require('../utils/logger');

const router = express.Router();

router.get('/tiempo-real', sessionAuth, requireRrhh, async (req, res) => {
  const log = createRequestLogger(req);
  try {
    const fecha = String(req.query.fecha || asistenciaService.todayYmdLaPaz());
    const userType = String(req.query.userType || 'all');
    const { trabajadores, resumen } = await asistenciaService.calcularEstadoTiempoReal(fecha, userType);
    log.info('Asistencia tiempo real', { fecha, total: trabajadores.length });
    res.json({ success: true, fecha, trabajadores, resumen });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/reporte', sessionAuth, requireRrhh, async (req, res) => {
  const log = createRequestLogger(req);
  try {
    const { fechaDesde, fechaHasta, userType, generarMultas } = req.query;
    if (!fechaDesde || !fechaHasta) {
      return res.status(400).json({ success: false, error: 'Faltan fechaDesde o fechaHasta' });
    }
    const reporte = await asistenciaService.calcularAsistenciaRango({
      fechaDesde: String(fechaDesde),
      fechaHasta: String(fechaHasta),
      userType: String(userType || 'all'),
      generarMultas: generarMultas === 'true',
    });
    log.info('Reporte asistencia', { fechaDesde, fechaHasta, usuarios: reporte.length });
    res.json({ success: true, reporte });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/export', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const { fechaDesde, fechaHasta, userType } = req.query;
    if (!fechaDesde || !fechaHasta) {
      return res.status(400).json({ success: false, error: 'Faltan fechaDesde o fechaHasta' });
    }
    const reporte = await asistenciaService.calcularAsistenciaRango({
      fechaDesde: String(fechaDesde),
      fechaHasta: String(fechaHasta),
      userType: String(userType || 'all'),
      generarMultas: false,
    });
    const csv = asistenciaService.reporteToCsv(reporte);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="asistencia-${fechaDesde}_${fechaHasta}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
