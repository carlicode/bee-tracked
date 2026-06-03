const express = require('express');
const crypto = require('crypto');
const {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  GetItemCommand,
} = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const config = require('../config');
const { sessionAuth } = require('../middleware/sessionAuth');
const { createRequestLogger } = require('../utils/logger');

const router = express.Router();
const dynamo = new DynamoDBClient({ region: config.dynamo.region });

const PRIORITY_ORDER = { urgent: 0, important: 1, normal: 2 };

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function isActiveAnnouncement(item, today) {
  if (item.status !== 'active') return false;
  if (item.startDate && item.startDate > today) return false;
  if (item.endDate && item.endDate < today) return false;
  return true;
}

function matchesAudience(item, userType) {
  if (item.audience === 'all') return true;
  if (item.audience === 'beezero') return userType === 'beezero';
  if (item.audience === 'ecodelivery') {
    return userType === 'ecodelivery' || userType === 'operador';
  }
  return false;
}

async function hasUserRead(announcementId, userId) {
  const res = await dynamo.send(
    new GetItemCommand({
      TableName: config.dynamo.lecturasTable,
      Key: marshall({
        PK: `ANUNCIO#${announcementId}`,
        SK: `USER#${userId}`,
      }),
    })
  );
  return Boolean(res.Item);
}

async function fetchActiveAnnouncements() {
  const res = await dynamo.send(
    new QueryCommand({
      TableName: config.dynamo.anunciosTable,
      IndexName: 'status-startDate-index',
      KeyConditionExpression: '#status = :active',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: marshall({ ':active': 'active' }),
    })
  );
  return (res.Items || []).map((item) => unmarshall(item));
}

/**
 * GET /api/announcements/pending
 */
router.get('/pending', sessionAuth, async (req, res) => {
  const log = createRequestLogger(req);

  try {
    const today = todayStr();
    const { userId, userType } = req.authUser;

    const active = await fetchActiveAnnouncements();
    const pending = [];

    for (const item of active) {
      if (!isActiveAnnouncement(item, today)) continue;
      if (!matchesAudience(item, userType)) continue;

      const announcementId = item.announcementId || item.PK?.replace('ANUNCIO#', '');

      pending.push({
        announcementId,
        title: item.title,
        message: item.message,
        priority: item.priority || 'normal',
        startDate: item.startDate,
        endDate: item.endDate || null,
        audience: item.audience,
      });
    }

    pending.sort(
      (a, b) =>
        (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2)
    );

    log.info('Anuncios pendientes', { count: pending.length, userId });

    res.json({ success: true, announcements: pending });
  } catch (err) {
    log.error('Error obteniendo anuncios pendientes', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message || 'Error al obtener anuncios',
    });
  }
});

/**
 * POST /api/announcements/:id/read
 */
router.post('/:id/read', sessionAuth, async (req, res) => {
  const log = createRequestLogger(req);

  try {
    const announcementId = req.params.id;
    const { userId } = req.authUser;
    const readAt = Date.now();

    await dynamo.send(
      new PutItemCommand({
        TableName: config.dynamo.lecturasTable,
        Item: marshall({
          PK: `ANUNCIO#${announcementId}`,
          SK: `USER#${userId}`,
          announcementId,
          userId,
          readAt,
        }),
      })
    );

    log.info('Anuncio marcado como leído', { announcementId, userId });

    res.json({ success: true });
  } catch (err) {
    log.error('Error marcando anuncio como leído', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message || 'Error al registrar lectura',
    });
  }
});

module.exports = router;
