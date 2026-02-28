const express = require('express');
const router = express.Router();

/**
 * Placeholder para rutas de carreras
 * TODO: Implementar endpoints para registrar carreras
 */

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Carreras endpoint - Coming soon',
    data: [],
  });
});

module.exports = router;
