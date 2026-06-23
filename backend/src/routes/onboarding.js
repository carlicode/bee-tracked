const express = require('express');
const { sessionAuth, requireAdmin } = require('../middleware/sessionAuth');
const { createRequestLogger } = require('../utils/logger');
const {
  getOnboardingStatus,
  completeOnboarding,
  listOnboardingWithUsers,
  resetOnboarding,
  resetAllOnboarding,
} = require('../services/onboardingService');

const userRouter = express.Router();
const adminRouter = express.Router();

userRouter.use(sessionAuth);

/**
 * GET /api/onboarding/status
 */
userRouter.get('/status', async (req, res) => {
  const log = createRequestLogger(req);

  try {
    const { userId } = req.authUser;
    const status = await getOnboardingStatus(userId);
    res.json({ success: true, ...status });
  } catch (err) {
    log.error('Error obteniendo onboarding status', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message || 'Error al obtener estado de onboarding',
    });
  }
});

/**
 * POST /api/onboarding/complete
 */
userRouter.post('/complete', async (req, res) => {
  const log = createRequestLogger(req);

  try {
    const { userId, userType } = req.authUser;
    const type = req.body?.userType || userType || 'beezero';
    const record = await completeOnboarding(userId, type);
    log.info('Onboarding completado', { userId, userType: type });
    res.json({ success: true, record });
  } catch (err) {
    log.error('Error completando onboarding', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message || 'Error al registrar onboarding',
    });
  }
});

adminRouter.use(sessionAuth, requireAdmin);

/**
 * GET /api/admin/onboarding
 */
adminRouter.get('/', async (req, res) => {
  const log = createRequestLogger(req);

  try {
    const users = await listOnboardingWithUsers();
    res.json({ success: true, users });
  } catch (err) {
    log.error('Error listando onboarding (admin)', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message || 'Error al listar onboarding',
    });
  }
});

/**
 * DELETE /api/admin/onboarding
 * body: { userType?: 'beezero' | 'ecodelivery' | 'operador' }
 */
adminRouter.delete('/', async (req, res) => {
  const log = createRequestLogger(req);

  try {
    const { userType } = req.body || {};
    const result = await resetAllOnboarding(userType || null);
    log.info('Onboarding reset masivo (admin)', { userType: userType || 'all', ...result });
    res.json({ success: true, ...result });
  } catch (err) {
    log.error('Error reset masivo onboarding (admin)', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message || 'Error al resetear onboarding',
    });
  }
});

/**
 * DELETE /api/admin/onboarding/:userId
 */
adminRouter.delete('/:userId', async (req, res) => {
  const log = createRequestLogger(req);

  try {
    await resetOnboarding(req.params.userId);
    log.info('Onboarding reseteado (admin)', { userId: req.params.userId });
    res.json({ success: true });
  } catch (err) {
    log.error('Error reseteando onboarding (admin)', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message || 'Error al resetear onboarding',
    });
  }
});

module.exports = { userRouter, adminRouter };
