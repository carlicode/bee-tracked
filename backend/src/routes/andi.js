const express = require('express');
const config = require('../config');
const { sessionAuth, requireRrhh } = require('../middleware/sessionAuth');
const { createRequestLogger } = require('../utils/logger');
const {
  listAnnouncements,
  mapAnnouncementSummary,
  softDeleteAnnouncement,
  getAnnouncementStats,
  createAnnouncement,
} = require('../services/announcementsService');
const pushService = require('../services/pushService');

const router = express.Router();

router.use(sessionAuth, requireRrhh);

/**
 * POST /api/andi/announcements
 */
router.post('/announcements', async (req, res) => {
  const log = createRequestLogger(req);

  try {
    const { userId, name } = req.authUser;
    const announcement = await createAnnouncement(req.body, userId, name);
    log.info('Anuncio creado', { announcementId: announcement.announcementId, createdBy: userId });
    pushService.notifyNewAnnouncement(announcement).catch((err) =>
      log.warn('Push anuncio falló (non-critical)', { error: err.message })
    );
    res.json({ success: true, announcement });
  } catch (err) {
    log.error('Error creando anuncio', { error: err.message });
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Error al crear anuncio',
      code: err.code,
    });
  }
});

/**
 * GET /api/andi/announcements?status=active|expired|all
 */
router.get('/announcements', async (req, res) => {
  const log = createRequestLogger(req);

  try {
    const status = req.query.status || 'all';
    const announcements = await listAnnouncements(status);

    res.json({
      success: true,
      announcements: announcements.map(mapAnnouncementSummary),
      total: announcements.length,
    });
  } catch (err) {
    log.error('Error listando anuncios', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message || 'Error al listar anuncios',
    });
  }
});

/**
 * DELETE /api/andi/announcements/:id
 */
router.delete('/announcements/:id', async (req, res) => {
  const log = createRequestLogger(req);

  try {
    const announcementId = req.params.id;
    await softDeleteAnnouncement(announcementId);
    log.info('Anuncio eliminado', { announcementId });
    res.json({ success: true });
  } catch (err) {
    log.error('Error eliminando anuncio', { error: err.message });
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Error al eliminar anuncio',
      code: err.code,
    });
  }
});

/**
 * GET /api/andi/announcements/:id/stats
 */
router.get('/announcements/:id/stats', async (req, res) => {
  const log = createRequestLogger(req);

  try {
    const stats = await getAnnouncementStats(req.params.id);
    res.json({ success: true, stats });
  } catch (err) {
    log.error('Error obteniendo stats', { error: err.message });
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Error al obtener estadísticas',
      code: err.code,
    });
  }
});

module.exports = router;
