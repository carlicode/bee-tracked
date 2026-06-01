const fs = require('fs');
const path = require('path');
const {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
} = require('@aws-sdk/client-dynamodb');
const crypto = require('crypto');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const config = require('../config');

const dynamo = new DynamoDBClient({ region: config.dynamo.region });
const USUARIOS_CSV = path.join(__dirname, '../..', 'data', 'usuarios-bee-tracked.csv');

/** Lee el CSV y devuelve array de { usuario, nombre, rol } */
function loadUsuarios() {
  if (!fs.existsSync(USUARIOS_CSV)) return [];
  const content = fs.readFileSync(USUARIOS_CSV, 'utf8');
  const lines = content.split(/\r?\n/).slice(1).filter(Boolean);
  return lines
    .map((line) => {
      const parts = line.split(',');
      return {
        nombre: (parts[0] || '').trim(),
        usuario: (parts[1] || '').trim(),
        rol: (parts[3] || '').trim(),
      };
    })
    .filter((u) => u.usuario);
}

function countAudience(audience) {
  const users = loadUsuarios();
  if (!users.length) {
    if (audience === 'beezero') return 50;
    if (audience === 'ecodelivery') return 60;
    return 110;
  }

  let beezero = 0;
  let ecodelivery = 0;

  for (const u of users) {
    if (u.rol === 'Bee Zero') beezero += 1;
    else if (u.rol === 'Ecodelivery' || u.rol === 'Operador') ecodelivery += 1;
  }

  if (audience === 'beezero') return beezero;
  if (audience === 'ecodelivery') return ecodelivery;
  return beezero + ecodelivery;
}

/** userId → nombre legible (fallback: el mismo userId) */
function resolveNombre(userId, usuarios) {
  const match = usuarios.find((u) => u.usuario.toLowerCase() === userId.toLowerCase());
  return match ? match.nombre : userId;
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

function mapAnnouncementSummary(a) {
  return {
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
  };
}

async function softDeleteAnnouncement(announcementId) {
  const listed = await listAnnouncements('all');
  const existing = listed.find((a) => a.announcementId === announcementId);
  if (!existing) {
    const err = new Error('Anuncio no encontrado');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
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

  return existing;
}

async function getAnnouncementStats(announcementId) {
  const listed = await listAnnouncements('all');
  const announcement = listed.find((a) => a.announcementId === announcementId);

  if (!announcement) {
    const err = new Error('Anuncio no encontrado');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
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
  const usuarios = loadUsuarios();
  const total = countAudience(announcement.audience);
  const read = readItems.length;
  const pending = Math.max(total - read, 0);
  const percentage = total > 0 ? Math.round((read / total) * 100) : 0;

  const readUsers = readItems.map((r) => ({
    userId: r.userId,
    nombre: resolveNombre(r.userId, usuarios),
    readAt: r.readAt || null,
  }));

  return {
    total,
    read,
    pending,
    percentage,
    pendingUsers: [],
    readUsers,
  };
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

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (startDate <= yesterday) {
    return { error: 'La fecha de inicio no puede ser anterior a hoy', code: 'INVALID_DATE' };
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

async function createAnnouncement(body, createdBy, createdByName) {
  const validation = validateAnnouncementInput(body);
  if (validation.error) {
    const err = new Error(validation.error);
    err.statusCode = 400;
    err.code = validation.code;
    throw err;
  }

  const announcementId = crypto.randomUUID();
  const createdAt = Date.now();

  const announcement = {
    PK: `ANUNCIO#${announcementId}`,
    SK: createdAt,
    announcementId,
    ...validation.data,
    status: 'active',
    createdBy,
    createdByName,
    createdAt,
  };

  await dynamo.send(
    new PutItemCommand({
      TableName: config.dynamo.anunciosTable,
      Item: marshall(announcement, { removeUndefinedValues: true }),
    })
  );

  try {
    const pushService = require('./pushService');
    await pushService.notifyNewAnnouncement({
      announcementId,
      title: validation.data.title,
      message: validation.data.message,
      audience: validation.data.audience,
      priority: validation.data.priority,
    });
  } catch (err) {
    console.warn('[push] Error enviando notificaciones:', err.message);
  }

  return {
    announcementId,
    ...validation.data,
    status: 'active',
    createdAt,
  };
}

module.exports = {
  loadUsuarios,
  countAudience,
  resolveNombre,
  listAnnouncements,
  mapAnnouncementSummary,
  softDeleteAnnouncement,
  getAnnouncementStats,
  validateAnnouncementInput,
  createAnnouncement,
};
