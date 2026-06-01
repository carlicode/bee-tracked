const express = require('express');
const { sessionAuth } = require('../middleware/sessionAuth');
const pushService = require('../services/pushService');
const { createRequestLogger } = require('../utils/logger');

const router = express.Router();

router.get('/vapid-public-key', async (req, res) => {
  try {
    const keys = await pushService.getVapidKeys();
    if (!keys?.publicKey) {
      return res.status(503).json({ success: false, error: 'Push no configurado' });
    }
    res.json({ success: true, publicKey: keys.publicKey });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Error al obtener clave pública' });
  }
});

router.post('/subscribe', sessionAuth, async (req, res) => {
  const log = createRequestLogger(req);

  try {
    const { subscription } = req.body || {};
    if (!subscription?.endpoint) {
      return res.status(400).json({ success: false, error: 'Suscripción inválida' });
    }

    const { userId, userType } = req.authUser;
    await pushService.saveSubscription(userId, userType, subscription);

    log.info('Push subscription guardada', { userId, userType });
    res.json({ success: true });
  } catch (err) {
    log.error('Error guardando suscripción push', { error: err.message });
    res.status(500).json({ success: false, error: err.message || 'Error al suscribir' });
  }
});

router.delete('/unsubscribe', sessionAuth, async (req, res) => {
  const log = createRequestLogger(req);

  try {
    await pushService.removeSubscription(req.authUser.userId);
    log.info('Push subscription eliminada', { userId: req.authUser.userId });
    res.json({ success: true });
  } catch (err) {
    log.error('Error eliminando suscripción push', { error: err.message });
    res.status(500).json({ success: false, error: err.message || 'Error al desuscribir' });
  }
});

module.exports = router;
