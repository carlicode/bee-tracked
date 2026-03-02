/**
 * Rutas para el módulo Kilometraje (Ecodelivery).
 * GET /carreras - Carreras del día del biker
 * POST /kilometraje - Registrar kilometraje a una carrera
 * GET /kilometraje - Historial de kilometraje del biker
 */
const express = require('express');
const router = express.Router();
const {
  getCarrerasDelDia,
  registrarKilometraje,
  getKilometrajesByBiker,
} = require('../services/registrosSheet');

/**
 * GET /api/ecodelivery/carreras?bikerName=X
 * Carreras del día actual (Bolivia) filtradas por biker
 */
router.get('/carreras', async (req, res) => {
  try {
    const bikerName = req.query.bikerName;
    if (!bikerName || !String(bikerName).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Query param bikerName es obligatorio',
      });
    }

    const carreras = await getCarrerasDelDia(String(bikerName).trim());
    res.json({
      success: true,
      carreras,
    });
  } catch (err) {
    console.error('Error obteniendo carreras del día:', err.message);
    if (err.message.includes('REGISTROS_SHEET_ID')) {
      return res.status(503).json({
        success: false,
        error: err.message,
      });
    }
    res.status(500).json({
      success: false,
      error: err.message || 'Error al obtener carreras',
    });
  }
});

/**
 * POST /api/ecodelivery/kilometraje
 * Body: { carreraId, bikerName, kilometraje }
 */
router.post('/kilometraje', async (req, res) => {
  try {
    const { carreraId, bikerName, kilometraje } = req.body || {};

    if (!carreraId || !bikerName || kilometraje == null) {
      return res.status(400).json({
        success: false,
        error: 'Faltan carreraId, bikerName o kilometraje',
      });
    }

    await registrarKilometraje(
      String(carreraId),
      String(bikerName).trim(),
      Number(kilometraje)
    );

    res.status(201).json({
      success: true,
      message: 'Kilometraje registrado exitosamente',
    });
  } catch (err) {
    console.error('Error registrando kilometraje:', err.message);
    if (err.message.includes('no encontrada')) {
      return res.status(404).json({
        success: false,
        error: err.message,
      });
    }
    if (err.message.includes('no pertenece')) {
      return res.status(403).json({
        success: false,
        error: err.message,
      });
    }
    if (err.message.includes('REGISTROS_SHEET_ID')) {
      return res.status(503).json({
        success: false,
        error: err.message,
      });
    }
    res.status(500).json({
      success: false,
      error: err.message || 'Error al registrar kilometraje',
    });
  }
});

/**
 * GET /api/ecodelivery/kilometraje?bikerName=X
 * Historial de registros de kilometraje del biker
 */
router.get('/kilometraje', async (req, res) => {
  try {
    const bikerName = req.query.bikerName;
    if (!bikerName || !String(bikerName).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Query param bikerName es obligatorio',
      });
    }

    const registros = await getKilometrajesByBiker(String(bikerName).trim());
    res.json({
      success: true,
      registros,
    });
  } catch (err) {
    console.error('Error obteniendo kilometrajes:', err.message);
    if (err.message.includes('REGISTROS_SHEET_ID')) {
      return res.status(503).json({
        success: false,
        error: err.message,
      });
    }
    res.status(500).json({
      success: false,
      error: err.message || 'Error al obtener kilometrajes',
    });
  }
});

module.exports = router;
