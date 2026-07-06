/**
 * Rutas de admin para el módulo Kilometraje.
 * Requiere sesión de admin (middleware ya aplicado en server.js/lambda.js).
 *
 * GET  /api/admin/kilometraje/registros   → entradas con km llenado (tab Kilometraje)
 * GET  /api/admin/kilometraje/pendientes  → carreras SIN km (tab Registros)
 * GET  /api/admin/kilometraje/export.csv  → descarga CSV con todos los datos
 */
const express = require('express');
const router = express.Router();
const { sessionAuth, requireAdmin } = require('../middleware/sessionAuth');
const {
  getAllKilometrajes,
  getRegistrosSinKm,
} = require('../services/registrosSheet');

router.use(sessionAuth, requireAdmin);

/**
 * GET /api/admin/kilometraje/registros
 * Query: bikerName?, from? (YYYY-MM-DD), to? (YYYY-MM-DD)
 */
router.get('/registros', async (req, res) => {
  try {
    const { bikerName, from, to } = req.query;
    const registros = await getAllKilometrajes({ bikerName, from, to });
    res.json({ success: true, registros });
  } catch (err) {
    console.error('[adminKilometraje] Error /registros:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/kilometraje/pendientes
 * Query: bikerName?, from? (YYYY-MM-DD), to? (YYYY-MM-DD)
 */
router.get('/pendientes', async (req, res) => {
  try {
    const { bikerName, from, to } = req.query;
    const pendientes = await getRegistrosSinKm({ bikerName, from, to });
    res.json({ success: true, pendientes });
  } catch (err) {
    console.error('[adminKilometraje] Error /pendientes:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/kilometraje/export.csv
 * Query: bikerName?, from?, to?, tab? ('registros' | 'pendientes', default 'registros')
 * Descarga un CSV con los datos filtrados.
 */
router.get('/export.csv', async (req, res) => {
  try {
    const { bikerName, from, to, tab } = req.query;
    const filters = { bikerName, from, to };

    let rows;
    let filename;
    if (tab === 'pendientes') {
      rows = await getRegistrosSinKm(filters);
      filename = 'km-pendientes.csv';
    } else {
      rows = await getAllKilometrajes(filters);
      filename = 'km-registros.csv';
    }

    if (rows.length === 0) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send('Sin datos\n');
    }

    const headers = Object.keys(rows[0]).filter((k) => k !== 'id' || true);
    const escape = (v) => {
      const s = String(v ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csvLines = [
      headers.map(escape).join(','),
      ...rows.map((r) => headers.map((h) => escape(r[h] ?? '')).join(',')),
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvLines.join('\n'));
  } catch (err) {
    console.error('[adminKilometraje] Error /export.csv:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
