const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
} = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const config = require('../config');
const { sessionAuth, requireRrhh } = require('../middleware/sessionAuth');
const { createRequestLogger } = require('../utils/logger');

const router = express.Router();
const dynamo = new DynamoDBClient({ region: config.dynamo.region });

const USUARIOS_CSV = path.join(__dirname, '../..', 'data', 'usuarios-bee-tracked.csv');

function countAudience(audience) {
  if (!fs.existsSync(USUARIOS_CSV)) {
    if (audience === 'beezero') return 50;
    if (audience === 'ecodelivery') return 60;
    return 110;
  }

  const content = fs.readFileSync(USUARIOS_CSV, 'utf8');
  const lines = content.split(/\r?\n/).slice(1).filter(Boolean);

  let beezero = 0;
  let ecodelivery = 0;

  for (const line of lines) {
    const parts = line.split(',');
    const rol = (parts[3] || '').trim();
    if (rol === 'Bee Zero') beezero += 1;
    else if (rol === 'Ecodelivery' || rol === 'Operador') ecodelivery += 1;
  }

  if (audience === 'beezero') return beezero;
  if (audience === 'ecodelivery') return ecodelivery;
  return beezero + ecodelivery;
}

function validateAnnouncementInput(body) {
  const { title, message, startDate, endDate, audience, priority } = body || {};

  if (!title || !message || !startDate || !audience || !priority) {
    return { error: 'Faltan campos requeridos' };
  }
  if (String(title).length > 100) {
    return { error: 'El título no puede superar 100 caracteres', code: 'VALIDATION_ERROR' };
  }
  if (String(message).length > 500) {
    return { error: 'El mensaje no puede superar 500 caracteres', code: 'VALIDATION_ERROR' };
  }
  if (!['all', 'beezero', 'ecodelivery'].includes(audience)) {
    return { error: 'Audiencia inválida', code: 'VALIDATION_ERROR' };
  }
  if (!['normal', 'important', 'urgent'].includes(priority)) {
    return { error: 'Prioridad inválida', code: 'VALIDATION_ERROR' };
  }

  const today = new Date().toISOString().split('T')[0];
  if (startDate < today) {
    return { error: 'La fecha de inicio no puede ser pasada', code: 'INVALID_DATE' };
  }
  if (endDate && endDate < startDate) {
    return { error: 'La fecha fin debe ser posterior al inicio', code: 'INVALID_DATE' };
  }

  return {
    data: {
      title: String(title).trim(),
      message: String(message).trim(),
      startDate,
      endDate: endDate || null,
      audience,
      priority,
    },
  };
}

async function listAnnouncements(statusFilter) {
  if (statusFilter && statusFilter !== 'all') {
    const res = await dynamo.send(
      new QueryCommand({
        TableName: config.dynamo.anunciosTable,
        IndexName: 'status-startDate-index',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: marshall({ ':status': statusFilter }),
        ScanIndexForward: false,
      })
    );
    return (res.Items || []).map((item) => unmarshall(item));
  }

  const res = await dynamo.send(
    new ScanCommand({
      TableName: config.dynamo.anunciosTable,
      Limit: 200,
    })
  );

  return (res.Items || [])
    .map((item) => unmarshall(item))
    .filter((item) => item.status !== 'deleted')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

router.use(sessionAuth, requireRrhh);

/**
 * POST /api/andi/announcements
 */
router.post('/announcements', async (req, res) => {
  const log = createRequestLogger(req);

  try {
    const validation = validateAnnouncementInput(req.body);
    if (validation.error) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        code: validation.code,
      });
    }

    const announcementId = crypto.randomUUID();
    const createdAt = Date.now();
    const { userId, name } = req.authUser;

    const announcement = {
      PK: `ANUNCIO#${announcementId}`,
      SK: createdAt,
      announcementId,
      ...validation.data,
      status: 'active',
      createdBy: userId,
      createdByName: name,
      createdAt,
    };

    await dynamo.send(
      new PutItemCommand({
        TableName: config.dynamo.anunciosTable,
        Item: marshall(announcement, { removeUndefinedValues: true }),
      })
    );

    log.info('Anuncio creado', { announcementId, createdBy: userId });

    res.json({
      success: true,
      announcement: {
        announcementId,
        ...validation.data,
        status: 'active',
        createdAt,
      },
    });
  } catch (err) {
    log.error('Error creando anuncio', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message || 'Error al crear anuncio',
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
      announcements: announcements.map((a) => ({
        announcementId: a.announcementId,
        title: a.title,
        message: a.message,
        startDate: a.startDate,
        endDate: a.endDate,
        audience: a.audience,
        priority: a.priority,
        status: a.status,
        createdAt: a.createdAt,
        createdByName: a.createdByName,
      })),
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

    const listed = await listAnnouncements('all');
    const existing = listed.find((a) => a.announcementId === announcementId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Anuncio no encontrado',
        code: 'NOT_FOUND',
      });
    }

    await dynamo.send(
      new UpdateItemCommand({
        TableName: config.dynamo.anunciosTable,
        Key: marshall({ PK: existing.PK, SK: existing.SK }),
        UpdateExpression: 'SET #status = :deleted',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: marshall({ ':deleted': 'deleted' }),
      })
    );

    log.info('Anuncio eliminado', { announcementId });

    res.json({ success: true });
  } catch (err) {
    log.error('Error eliminando anuncio', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message || 'Error al eliminar anuncio',
    });
  }
});

/**
 * GET /api/andi/announcements/:id/stats
 */
router.get('/announcements/:id/stats', async (req, res) => {
  const log = createRequestLogger(req);

  try {
    const announcementId = req.params.id;
    const listed = await listAnnouncements('all');
    const announcement = listed.find((a) => a.announcementId === announcementId);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: 'Anuncio no encontrado',
        code: 'NOT_FOUND',
      });
    }

    const readsRes = await dynamo.send(
      new QueryCommand({
        TableName: config.dynamo.lecturasTable,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: marshall({
          ':pk': `ANUNCIO#${announcementId}`,
        }),
      })
    );

    const readItems = (readsRes.Items || []).map((item) => unmarshall(item));
    const total = countAudience(announcement.audience);
    const read = readItems.length;
    const pending = Math.max(total - read, 0);
    const percentage = total > 0 ? Math.round((read / total) * 100) : 0;

    res.json({
      success: true,
      stats: {
        total,
        read,
        pending,
        percentage,
        pendingUsers: [],
        readUsers: readItems.map((r) => r.userId),
      },
    });
  } catch (err) {
    log.error('Error obteniendo stats', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message || 'Error al obtener estadísticas',
    });
  }
});

module.exports = router;
