const crypto = require('crypto');
const {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
  GetItemCommand,
} = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const config = require('../config');
const { slugUserId } = require('./dynamoUtils');

const dynamo = new DynamoDBClient({ region: config.dynamo.region });
const TABLE = config.dynamo.extraordinariosTable;

function mapInfo(item) {
  return {
    extraId: item.extraId,
    titulo: item.titulo,
    fecha: item.fecha,
    descripcion: item.descripcion || '',
    horaInicioSugerida: item.horaInicioSugerida || '',
    horaFinSugerida: item.horaFinSugerida || '',
    estado: item.estado,
    creadoEn: item.creadoEn,
    creadoPor: item.creadoPor || null,
    cerradoEn: item.cerradoEn || null,
  };
}

function mapInscripcion(item) {
  return {
    extraId: item.extraId,
    userId: item.userId,
    userName: item.userName,
    userType: item.userType,
    horaInicio: item.horaInicio,
    horaFin: item.horaFin,
    estado: item.estado,
    creadoEn: item.creadoEn,
    respondidoPor: item.respondidoPor || null,
    respondidoEn: item.respondidoEn || null,
    razonRechazo: item.razonRechazo || null,
  };
}

async function createExtraordinario({ titulo, fecha, descripcion, horaInicioSugerida, horaFinSugerida, creadoPor }) {
  const extraId = crypto.randomUUID();
  const item = {
    PK: `EXTRA#${extraId}`,
    SK: 'INFO',
    entityType: 'info',
    extraId,
    titulo: String(titulo).trim(),
    fecha: String(fecha).trim(),
    descripcion: descripcion || '',
    horaInicioSugerida: horaInicioSugerida || '',
    horaFinSugerida: horaFinSugerida || '',
    estado: 'abierto',
    creadoEn: Date.now(),
    creadoPor: creadoPor || null,
  };
  await dynamo.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall(item, { removeUndefinedValues: true }),
  }));
  return mapInfo(item);
}

async function listExtraordinarios(estado) {
  const params = {
    TableName: TABLE,
    IndexName: 'estado-fecha-index',
    KeyConditionExpression: 'estado = :e',
    ExpressionAttributeValues: marshall({ ':e': estado || 'abierto' }),
  };
  const res = await dynamo.send(new QueryCommand(params));
  return (res.Items || [])
    .filter((i) => unmarshall(i).entityType === 'info')
    .map((i) => mapInfo(unmarshall(i)))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

async function getExtraordinario(extraId) {
  const res = await dynamo.send(new GetItemCommand({
    TableName: TABLE,
    Key: marshall({ PK: `EXTRA#${extraId}`, SK: 'INFO' }),
  }));
  return res.Item ? mapInfo(unmarshall(res.Item)) : null;
}

async function cerrarExtraordinario(extraId, cerradoPor) {
  await dynamo.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: marshall({ PK: `EXTRA#${extraId}`, SK: 'INFO' }),
    UpdateExpression: 'SET estado = :e, cerradoEn = :t, cerradoPor = :p',
    ExpressionAttributeValues: marshall({ ':e': 'cerrado', ':t': Date.now(), ':p': cerradoPor || '' }),
  }));
  return getExtraordinario(extraId);
}

async function inscribirse({ extraId, userId, userName, userType, horaInicio, horaFin }) {
  const info = await getExtraordinario(extraId);
  if (!info) {
    const err = new Error('Día extraordinario no encontrado');
    err.statusCode = 404;
    throw err;
  }
  if (info.estado !== 'abierto') {
    const err = new Error('Las inscripciones están cerradas para este día');
    err.statusCode = 400;
    throw err;
  }
  const item = {
    PK: `EXTRA#${extraId}`,
    SK: `USER#${slugUserId(userName || userId)}`,
    entityType: 'inscripcion',
    extraId,
    userId: String(userId).toLowerCase(),
    userName: userName || userId,
    userType: userType || 'ecodelivery',
    horaInicio: horaInicio || info.horaInicioSugerida,
    horaFin: horaFin || info.horaFinSugerida,
    estado: 'pendiente',
    creadoEn: Date.now(),
  };
  await dynamo.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall(item, { removeUndefinedValues: true }),
  }));
  return mapInscripcion(item);
}

async function listInscripciones(extraId) {
  const res = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :pref)',
    ExpressionAttributeValues: marshall({ ':pk': `EXTRA#${extraId}`, ':pref': 'USER#' }),
  }));
  return (res.Items || []).map((i) => mapInscripcion(unmarshall(i)));
}

async function listMisInscripciones(userNameOrId) {
  const res = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'userId-index',
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: marshall({ ':uid': String(userNameOrId).toLowerCase() }),
  }));
  return (res.Items || [])
    .filter((i) => unmarshall(i).entityType === 'inscripcion')
    .map((i) => mapInscripcion(unmarshall(i)));
}

async function respondInscripcion(extraId, userNameOrId, accion, respondidoPor, razon) {
  const key = {
    PK: `EXTRA#${extraId}`,
    SK: `USER#${slugUserId(userNameOrId)}`,
  };
  const now = Date.now();
  if (accion === 'aprobar') {
    await dynamo.send(new UpdateItemCommand({
      TableName: TABLE,
      Key: marshall(key),
      UpdateExpression: 'SET estado = :e, respondidoPor = :p, respondidoEn = :t',
      ExpressionAttributeValues: marshall({ ':e': 'aprobado', ':p': respondidoPor, ':t': now }),
    }));
  } else {
    await dynamo.send(new UpdateItemCommand({
      TableName: TABLE,
      Key: marshall(key),
      UpdateExpression: 'SET estado = :e, respondidoPor = :p, respondidoEn = :t, razonRechazo = :r',
      ExpressionAttributeValues: marshall({
        ':e': 'rechazado',
        ':p': respondidoPor,
        ':t': now,
        ':r': razon || '',
      }),
    }));
  }
  const res = await dynamo.send(new GetItemCommand({ TableName: TABLE, Key: marshall(key) }));
  return mapInscripcion(unmarshall(res.Item));
}

module.exports = {
  createExtraordinario,
  listExtraordinarios,
  getExtraordinario,
  cerrarExtraordinario,
  inscribirse,
  listInscripciones,
  listMisInscripciones,
  respondInscripcion,
};
