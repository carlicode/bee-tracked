const crypto = require('crypto');
const {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const config = require('../config');
const logger = require('../utils/logger');
const { appendRow } = require('./googleSheets');
const emailService = require('./emailService');

const dynamo = new DynamoDBClient({ region: config.dynamo.region });

const MOTIVOS = ['Personal', 'Salud', 'Vacaciones', 'Otro'];
const TZ_LA_PAZ = 'America/La_Paz';

function todayYmd() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ_LA_PAZ });
}

function tomorrowYmd() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('en-CA', { timeZone: TZ_LA_PAZ });
}

function normalizeFecha(value) {
  const s = String(value || '').trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return s;
}

function mapPermiso(item) {
  return {
    permisoId: item.permisoId,
    userId: item.userId,
    userName: item.userName,
    userType: item.userType,
    fecha: item.fecha,
    motivo: item.motivo,
    nota: item.nota || '',
    estado: item.estado,
    creadoEn: item.creadoEn,
    respondidoPor: item.respondidoPor || null,
    respondidoEn: item.respondidoEn || null,
    razonRechazo: item.razonRechazo || null,
    comprobante: item.comprobante || null,
  };
}

async function getPermisoById(permisoId) {
  const res = await dynamo.send(
    new QueryCommand({
      TableName: config.dynamo.permisosTable,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: marshall({ ':pk': `PERMISO#${permisoId}` }),
      Limit: 1,
    })
  );
  const raw = res.Items?.[0];
  return raw ? unmarshall(raw) : null;
}

async function findExistingForUserDate(userId, fecha) {
  const res = await dynamo.send(
    new QueryCommand({
      TableName: config.dynamo.permisosTable,
      IndexName: 'userId-fecha-index',
      KeyConditionExpression: 'userId = :uid AND fecha = :fecha',
      ExpressionAttributeValues: marshall({
        ':uid': userId,
        ':fecha': fecha,
      }),
    })
  );
  return (res.Items || []).map((item) => unmarshall(item));
}

async function mirrorToSheets(row) {
  try {
    await appendRow('Permisos', row);
  } catch (err) {
    logger.warn('Sheets permiso write failed (non-critical)', { error: err.message });
  }
}

async function createPermiso({ userId, userName, userType, fecha, motivo, nota, comprobante }) {
  const fechaNorm = normalizeFecha(fecha);
  const minFecha = tomorrowYmd();

  if (!fechaNorm || fechaNorm < minFecha) {
    const err = new Error('La fecha debe ser al menos mañana');
    err.statusCode = 400;
    err.code = 'INVALID_DATE';
    throw err;
  }

  if (!MOTIVOS.includes(motivo)) {
    const err = new Error('Motivo inválido');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const existing = await findExistingForUserDate(userId, fechaNorm);
  const blocking = existing.find((p) => p.estado === 'pendiente' || p.estado === 'aprobado');
  if (blocking) {
    const err = new Error('Ya tienes un permiso pendiente o aprobado para esa fecha');
    err.statusCode = 409;
    err.code = 'DUPLICATE';
    throw err;
  }

  const permisoId = crypto.randomUUID();
  const creadoEn = Date.now();

  const item = {
    PK: `PERMISO#${permisoId}`,
    SK: fechaNorm,
    permisoId,
    userId,
    userName: userName || userId,
    userType: userType || 'beezero',
    fecha: fechaNorm,
    motivo,
    nota: nota ? String(nota).trim().slice(0, 200) : '',
    estado: 'pendiente',
    creadoEn,
  };

  if (comprobante && String(comprobante).trim()) {
    item.comprobante = String(comprobante).trim();
  }

  await dynamo.send(
    new PutItemCommand({
      TableName: config.dynamo.permisosTable,
      Item: marshall(item),
    })
  );

  await mirrorToSheets([
    permisoId,
    userId,
    item.userName,
    item.userType,
    fechaNorm,
    motivo,
    item.nota,
    'pendiente',
    new Date(creadoEn).toISOString(),
    '',
    '',
    '',
    item.comprobante || '',
  ]);

  try {
    await emailService.sendPermisoNotification({
      userName: item.userName,
      fecha: fechaNorm,
      motivo,
    });
  } catch (e) {
    logger.warn('Email permiso falló (non-critical)', {
      error: e.message,
      code: e.code,
    });
  }

  return mapPermiso(item);
}

async function listByUser(userId) {
  const res = await dynamo.send(
    new QueryCommand({
      TableName: config.dynamo.permisosTable,
      IndexName: 'userId-fecha-index',
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: marshall({ ':uid': userId }),
      ScanIndexForward: false,
    })
  );

  return (res.Items || [])
    .map((item) => mapPermiso(unmarshall(item)))
    .sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0));
}

async function listByEstado(estado) {
  const res = await dynamo.send(
    new QueryCommand({
      TableName: config.dynamo.permisosTable,
      IndexName: 'estado-fecha-index',
      KeyConditionExpression: 'estado = :estado',
      ExpressionAttributeValues: marshall({ ':estado': estado }),
      ScanIndexForward: true,
    })
  );

  return (res.Items || []).map((item) => mapPermiso(unmarshall(item)));
}

async function listForAdmin(estadoFilter) {
  if (!estadoFilter || estadoFilter === 'all') {
    const [pendiente, aprobado, rechazado] = await Promise.all([
      listByEstado('pendiente'),
      listByEstado('aprobado'),
      listByEstado('rechazado'),
    ]);
    return [...pendiente, ...aprobado, ...rechazado].sort(
      (a, b) => (b.creadoEn || 0) - (a.creadoEn || 0)
    );
  }
  return listByEstado(estadoFilter);
}

async function countPendientes() {
  const list = await listByEstado('pendiente');
  return list.length;
}

/** Permisos aprobados para una fecha (YYYY-MM-DD), vía GSI estado-fecha-index */
async function listAprobadosForFecha(fecha) {
  const fechaNorm = String(fecha || '').trim();
  if (!fechaNorm) return [];

  const res = await dynamo.send(
    new QueryCommand({
      TableName: config.dynamo.permisosTable,
      IndexName: 'estado-fecha-index',
      KeyConditionExpression: 'estado = :estado AND fecha = :fecha',
      ExpressionAttributeValues: marshall({
        ':estado': 'aprobado',
        ':fecha': fechaNorm,
      }),
    })
  );

  return (res.Items || []).map((item) => mapPermiso(unmarshall(item)));
}

async function respondPermiso(permisoId, adminUserId, accion, razon) {
  const existing = await getPermisoById(permisoId);
  if (!existing) {
    const err = new Error('Permiso no encontrado');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (existing.estado !== 'pendiente') {
    const err = new Error('Este permiso ya fue respondido');
    err.statusCode = 400;
    err.code = 'ALREADY_RESPONDED';
    throw err;
  }

  if (accion !== 'aprobar' && accion !== 'rechazar') {
    const err = new Error('Acción inválida');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const nuevoEstado = accion === 'aprobar' ? 'aprobado' : 'rechazado';
  const respondidoEn = Date.now();

  await dynamo.send(
    new UpdateItemCommand({
      TableName: config.dynamo.permisosTable,
      Key: marshall({ PK: existing.PK, SK: existing.SK }),
      UpdateExpression:
        'SET estado = :estado, respondidoPor = :por, respondidoEn = :en, razonRechazo = :razon',
      ExpressionAttributeValues: marshall({
        ':estado': nuevoEstado,
        ':por': adminUserId,
        ':en': respondidoEn,
        ':razon': accion === 'rechazar' ? String(razon || '').trim().slice(0, 200) : '',
      }),
    })
  );

  await mirrorToSheets([
    permisoId,
    existing.userId,
    existing.userName,
    existing.userType,
    existing.fecha,
    existing.motivo,
    existing.nota || '',
    nuevoEstado,
    existing.creadoEn ? new Date(existing.creadoEn).toISOString() : '',
    adminUserId,
    new Date(respondidoEn).toISOString(),
    accion === 'rechazar' ? String(razon || '').trim() : '',
  ]);

  return mapPermiso({
    ...existing,
    estado: nuevoEstado,
    respondidoPor: adminUserId,
    respondidoEn,
    razonRechazo: accion === 'rechazar' ? String(razon || '').trim() : '',
  });
}

module.exports = {
  MOTIVOS,
  tomorrowYmd,
  createPermiso,
  listByUser,
  listForAdmin,
  countPendientes,
  listAprobadosForFecha,
  respondPermiso,
};
