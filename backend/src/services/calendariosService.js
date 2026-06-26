const crypto = require('crypto');
const {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const config = require('../config');
const { slugUserId } = require('./dynamoUtils');
const usersProfileService = require('./usersProfileService');
const { isoWeekKey, mondayOfWeekYmd, diasDeSemana, todayYmdLaPaz } = require('../utils/weekUtils');

const dynamo = new DynamoDBClient({ region: config.dynamo.region });
const TABLE = config.dynamo.calendariosTable;

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

function userPk(userNameOrId) {
  return `USER#${slugUserId(userNameOrId)}`;
}

function mapSemana(item) {
  return {
    userId: item.userId,
    userName: item.userName,
    userType: item.userType,
    semana: item.semana,
    fechaInicioSemana: item.fechaInicioSemana,
    dias: item.dias || {},
    estado: item.estado || 'publicado',
    creadoEn: item.creadoEn,
    actualizadoEn: item.actualizadoEn,
    publicadoPor: item.publicadoPor || null,
  };
}

function mapPropuesta(item) {
  return {
    propuestaId: item.propuestaId,
    userId: item.userId,
    userName: item.userName,
    userType: item.userType,
    semana: item.semana,
    fechaInicioSemana: item.fechaInicioSemana,
    dias: item.dias || {},
    estado: item.estado,
    creadoEn: item.creadoEn,
    respondidoPor: item.respondidoPor || null,
    respondidoEn: item.respondidoEn || null,
    razonRechazo: item.razonRechazo || null,
  };
}

function normalizeDias(dias, fechaInicioSemana) {
  const fechas = diasDeSemana(fechaInicioSemana);
  const out = {};
  DIAS.forEach((nombre, i) => {
    const src = dias?.[nombre] || dias?.[fechas[i]] || {};
    out[nombre] = {
      fecha: fechas[i],
      trabaja: Boolean(src.trabaja),
      horaInicio: src.horaInicio || '',
      horaFin: src.horaFin || '',
      nota: src.nota || '',
    };
  });
  return out;
}

async function getSemanaCalendario(userNameOrId, semana) {
  const res = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: marshall({
      ':pk': userPk(userNameOrId),
      ':sk': `SEMANA#${semana}`,
    }),
    Limit: 1,
  }));
  const raw = res.Items?.[0];
  return raw ? mapSemana(unmarshall(raw)) : null;
}

async function listSemanasByUser(userNameOrId) {
  const res = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :pref)',
    ExpressionAttributeValues: marshall({
      ':pk': userPk(userNameOrId),
      ':pref': 'SEMANA#',
    }),
  }));
  return (res.Items || []).map((i) => mapSemana(unmarshall(i))).sort((a, b) => b.semana.localeCompare(a.semana));
}

async function listCalendariosSemana(semana, userType) {
  const params = {
    TableName: TABLE,
    IndexName: 'semana-index',
    KeyConditionExpression: 'semana = :s',
    ExpressionAttributeValues: marshall({ ':s': semana }),
  };
  if (userType && userType !== 'all') {
    params.FilterExpression = 'userType = :t';
    params.ExpressionAttributeValues = marshall({ ':s': semana, ':t': userType });
  }
  const res = await dynamo.send(new QueryCommand(params));
  return (res.Items || []).map((i) => mapSemana(unmarshall(i)));
}

async function saveCalendarioSemana({
  userId,
  userName,
  userType,
  semana,
  fechaInicioSemana,
  dias,
  publicadoPor,
}) {
  const inicio = fechaInicioSemana || mondayOfWeekYmd(semana.replace(/W.*/, '') + '-01') || mondayOfWeekYmd(todayYmdLaPaz());
  const sem = semana || isoWeekKey(inicio);
  const item = {
    PK: userPk(userName || userId),
    SK: `SEMANA#${sem}`,
    entityType: 'semana',
    userId: String(userId).toLowerCase(),
    userName: userName || userId,
    userType: userType || 'ecodelivery',
    semana: sem,
    fechaInicioSemana: mondayOfWeekYmd(inicio) || inicio,
    dias: normalizeDias(dias || {}, mondayOfWeekYmd(inicio) || inicio),
    estado: 'publicado',
    creadoEn: Date.now(),
    actualizadoEn: Date.now(),
    publicadoPor: publicadoPor || null,
  };
  await dynamo.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall(item, { removeUndefinedValues: true }),
  }));
  await usersProfileService.upsertProfile({ userId, userName, userType });
  return mapSemana(item);
}

async function bulkSaveSemana({ semana, fechaInicioSemana, calendarios, publicadoPor }) {
  const results = [];
  for (const cal of calendarios) {
    const saved = await saveCalendarioSemana({
      ...cal,
      semana,
      fechaInicioSemana,
      publicadoPor,
    });
    results.push(saved);
  }
  return results;
}

async function repeatFromPreviousWeek({ userId, userName, userType, targetSemana, targetInicio, sourceSemana, publicadoPor }) {
  const prev = await getSemanaCalendario(userName || userId, sourceSemana);
  if (!prev) {
    const err = new Error('No hay calendario en la semana origen');
    err.statusCode = 404;
    throw err;
  }
  return saveCalendarioSemana({
    userId,
    userName,
    userType,
    semana: targetSemana,
    fechaInicioSemana: targetInicio,
    dias: prev.dias,
    publicadoPor,
  });
}

async function createPropuesta({ userId, userName, userType, semana, fechaInicioSemana, dias }) {
  const profile = await usersProfileService.getProfile(userName || userId);
  if (!profile?.calendarioPropuestaHabilitada) {
    const err = new Error('No tienes habilitada la propuesta de calendario. Contacta a RRHH.');
    err.statusCode = 403;
    err.code = 'NOT_ENABLED';
    throw err;
  }
  const propuestaId = crypto.randomUUID();
  const inicio = fechaInicioSemana || mondayOfWeekYmd(todayYmdLaPaz());
  const sem = semana || isoWeekKey(inicio);
  const item = {
    PK: userPk(userName || userId),
    SK: `PROPUESTA#${propuestaId}`,
    entityType: 'propuesta',
    propuestaId,
    userId: String(userId).toLowerCase(),
    userName: userName || userId,
    userType: userType || 'ecodelivery',
    semana: sem,
    fechaInicioSemana: mondayOfWeekYmd(inicio) || inicio,
    dias: normalizeDias(dias || {}, mondayOfWeekYmd(inicio) || inicio),
    estado: 'pendiente',
    creadoEn: Date.now(),
  };
  await dynamo.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall(item, { removeUndefinedValues: true }),
  }));
  return mapPropuesta(item);
}

async function listPropuestasPendientes() {
  const res = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'estado-index',
    KeyConditionExpression: 'estado = :e',
    ExpressionAttributeValues: marshall({ ':e': 'pendiente' }),
  }));
  return (res.Items || [])
    .filter((i) => unmarshall(i).entityType === 'propuesta')
    .map((i) => mapPropuesta(unmarshall(i)));
}

async function respondPropuesta(propuestaId, userNameOrId, accion, respondidoPor, razon) {
  const res = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :pref)',
    ExpressionAttributeValues: marshall({
      ':pk': userPk(userNameOrId),
      ':pref': 'PROPUESTA#',
    }),
  }));
  const items = (res.Items || []).map((i) => unmarshall(i));
  const item = items.find((p) => p.propuestaId === propuestaId);
  if (!item) {
    const err = new Error('Propuesta no encontrada');
    err.statusCode = 404;
    throw err;
  }
  if (item.estado !== 'pendiente') {
    const err = new Error('La propuesta ya fue respondida');
    err.statusCode = 409;
    throw err;
  }
  const now = Date.now();
  if (accion === 'aprobar') {
    await saveCalendarioSemana({
      userId: item.userId,
      userName: item.userName,
      userType: item.userType,
      semana: item.semana,
      fechaInicioSemana: item.fechaInicioSemana,
      dias: item.dias,
      publicadoPor: respondidoPor,
    });
    await dynamo.send(new UpdateItemCommand({
      TableName: TABLE,
      Key: marshall({ PK: item.PK, SK: item.SK }),
      UpdateExpression: 'SET estado = :e, respondidoPor = :p, respondidoEn = :t',
      ExpressionAttributeValues: marshall({ ':e': 'aprobado', ':p': respondidoPor, ':t': now }),
    }));
  } else {
    await dynamo.send(new UpdateItemCommand({
      TableName: TABLE,
      Key: marshall({ PK: item.PK, SK: item.SK }),
      UpdateExpression: 'SET estado = :e, respondidoPor = :p, respondidoEn = :t, razonRechazo = :r',
      ExpressionAttributeValues: marshall({
        ':e': 'rechazado',
        ':p': respondidoPor,
        ':t': now,
        ':r': razon || '',
      }),
    }));
  }
  const updated = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: marshall({ ':pk': item.PK, ':sk': item.SK }),
    Limit: 1,
  }));
  return mapPropuesta(unmarshall(updated.Items[0]));
}

module.exports = {
  DIAS,
  getSemanaCalendario,
  listSemanasByUser,
  listCalendariosSemana,
  saveCalendarioSemana,
  bulkSaveSemana,
  repeatFromPreviousWeek,
  createPropuesta,
  listPropuestasPendientes,
  respondPropuesta,
  isoWeekKey,
  mondayOfWeekYmd,
};
