const express = require('express');
const { sessionAuth, requireRrhh } = require('../middleware/sessionAuth');
const permisosService = require('../services/permisosService');
const pushService = require('../services/pushService');
const { createRequestLogger } = require('../utils/logger');

const router = express.Router();

router.post('/solicitar', sessionAuth, async (req, res) => {
  const log = createRequestLogger(req);

  try {
    const { fecha, motivo, nota } = req.body || {};
    if (!fecha || !motivo) {
      return res.status(400).json({
        success: false,
        error: 'Faltan fecha o motivo',
        code: 'VALIDATION_ERROR',
      });
    }

    const { userId, userType, name } = req.authUser;
    const permiso = await permisosService.createPermiso({
      userId,
      userName: name,
      userType,
      fecha,
      motivo,
      nota,
    });

    log.info('Permiso solicitado', { permisoId: permiso.permisoId, userId });
    res.json({ success: true, permiso });
  } catch (err) {
    log.error('Error solicitando permiso', { error: err.message });
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Error al solicitar permiso',
      code: err.code,
    });
  }
});

router.get('/mis-permisos', sessionAuth, async (req, res) => {
  const log = createRequestLogger(req);

  try {
    const permisos = await permisosService.listByUser(req.authUser.userId);
    res.json({ success: true, permisos });
  } catch (err) {
    log.error('Error listando permisos del usuario', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message || 'Error al listar permisos',
    });
  }
});

router.get('/pendientes/count', sessionAuth, requireRrhh, async (req, res) => {
  try {
    const count = await permisosService.countPendientes();
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || 'Error al contar permisos',
    });
  }
});

router.get('/admin', sessionAuth, requireRrhh, async (req, res) => {
  const log = createRequestLogger(req);

  try {
    const estado = String(req.query.estado || 'pendiente').toLowerCase();
    const valid = ['all', 'pendiente', 'aprobado', 'rechazado'];
    if (!valid.includes(estado)) {
      return res.status(400).json({
        success: false,
        error: 'Estado inválido',
        code: 'VALIDATION_ERROR',
      });
    }

    const permisos = await permisosService.listForAdmin(estado);
    res.json({ success: true, permisos });
  } catch (err) {
    log.error('Error listando permisos admin', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message || 'Error al listar permisos',
    });
  }
});

router.post('/:permisoId/responder', sessionAuth, requireRrhh, async (req, res) => {
  const log = createRequestLogger(req);

  try {
    const { accion, razon } = req.body || {};
    if (!accion) {
      return res.status(400).json({
        success: false,
        error: 'Falta acción (aprobar o rechazar)',
        code: 'VALIDATION_ERROR',
      });
    }

    const permiso = await permisosService.respondPermiso(
      req.params.permisoId,
      req.authUser.userId,
      accion,
      razon
    );

    log.info('Permiso respondido', {
      permisoId: permiso.permisoId,
      accion,
      admin: req.authUser.userId,
    });

    const isAprobado = accion === 'aprobar';
    const razonTexto = String(razon || '').trim();
    const basePath =
      permiso.userType === 'beezero' ? 'beezero' : 'ecodelivery';
    pushService
      .sendToUser(permiso.userId, {
        title: isAprobado ? 'Permiso aprobado' : 'Permiso rechazado',
        body: isAprobado
          ? `Tu día libre del ${permiso.fecha} fue aprobado.`
          : `Tu solicitud del ${permiso.fecha} fue rechazada.${razonTexto ? ` Motivo: ${razonTexto}` : ''}`,
        url: `/${basePath}/solicitar-permiso`,
      })
      .catch((err) =>
        log.warn('Push permiso falló (non-critical)', { error: err.message })
      );

    res.json({ success: true, permiso });
  } catch (err) {
    log.error('Error respondiendo permiso', { error: err.message });
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Error al responder permiso',
      code: err.code,
    });
  }
});

module.exports = router;
