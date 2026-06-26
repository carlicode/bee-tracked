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
const TABLE = config.dynamo.multasTable;
const USERS_TABLE = config.dynamo.usersTable;

const DEFAULT_REGLAS = {
  margenMinutos: 15,
  bloques: [
    { minMinutos: 16, maxMinutos: 30, montoBs: 20 },
    { minMinutos: 31, maxMinutos: 60, montoBs: 50 },
    { minMinutos: 61, maxMinutos: 9999, montoBs: 100 },
  ],
  tipos: {
    tardanza: true,
    ausencia: true,
    salidaTemprana: true,
  },
};

async function getReglas() {
  const res = await dynamo.send(new GetItemCommand({
    TableName: USERS_TABLE,
    Key: marshall({ PK: 'CONFIG#MULTAS', SK: 'REGLAS' }),
  }));
  if (!res.Item) return DEFAULT_REGLAS;
  const item = unmarshall(res.Item);
  return { ...DEFAULT_REGLAS, ...item.reglas };
}

async function saveReglas(reglas, updatedPor) {
  const merged = { ...DEFAULT_REGLAS, ...reglas };
  await dynamo.send(new PutItemCommand({
    TableName: USERS_TABLE,
    Item: marshall({
      PK: 'CONFIG#MULTAS',
      SK: 'REGLAS',
      reglas: merged,
      updatedPor: updatedPor || '',
      updatedEn: Date.now(),
    }),
  }));
  return merged;
}

function calcularMonto(minutosRetraso, reglas) {
  const mins = Math.max(0, Number(minutosRetraso) || 0);
  if (mins <= reglas.margenMinutos) return 0;
  for (const b of reglas.bloques || []) {
    if (mins >= b.minMinutos && mins <= b.maxMinutos) return b.montoBs;
  }
  return 0;
}

function mapMulta(item) {
  return {
    multaId: item.multaId,
    userId: item.userId,
    userName: item.userName,
    userType: item.userType,
    fecha: item.fecha,
    tipo: item.tipo,
    minutos: item.minutos,
    montoBs: item.montoBs,
    motivo: item.motivo || '',
    estado: item.estado,
    turnoId: item.turnoId || null,
    creadoEn: item.creadoEn,
    dispensadaPor: item.dispensadaPor || null,
    dispensadaEn: item.dispensadaEn || null,
    razonDispensa: item.razonDispensa || null,
  };
}

async function crearMulta({ userId, userName, userType, fecha, tipo, minutos, motivo, turnoId, montoBs }) {
  const reglas = await getReglas();
  const multaId = crypto.randomUUID();
  const monto = montoBs != null ? montoBs : calcularMonto(minutos, reglas);
  if (monto <= 0 && tipo !== 'ausencia') return null;

  const item = {
    PK: `USER#${slugUserId(userName || userId)}`,
    SK: `MULTA#${fecha}#${multaId}`,
    entityScope: 'MULTA',
    multaId,
    userId: String(userId).toLowerCase(),
    userName: userName || userId,
    userType: userType || 'ecodelivery',
    fecha,
    tipo,
    minutos: Number(minutos) || 0,
    montoBs: tipo === 'ausencia' ? (montoBs || reglas.bloques?.[reglas.bloques.length - 1]?.montoBs || 100) : monto,
    motivo: motivo || '',
    estado: 'activa',
    turnoId: turnoId || null,
    creadoEn: Date.now(),
  };
  await dynamo.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall(item, { removeUndefinedValues: true }),
  }));
  return mapMulta(item);
}

async function listMultas({ userId, fechaDesde, fechaHasta, estado }) {
  if (userId) {
    const res = await dynamo.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :pref)',
      ExpressionAttributeValues: marshall({
        ':pk': `USER#${slugUserId(userId)}`,
        ':pref': 'MULTA#',
      }),
    }));
    let items = (res.Items || []).map((i) => mapMulta(unmarshall(i)));
    if (fechaDesde) items = items.filter((m) => m.fecha >= fechaDesde);
    if (fechaHasta) items = items.filter((m) => m.fecha <= fechaHasta);
    if (estado && estado !== 'all') items = items.filter((m) => m.estado === estado);
    return items.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  const params = {
    TableName: TABLE,
    IndexName: 'fecha-index',
    KeyConditionExpression: 'entityScope = :s',
    ExpressionAttributeValues: marshall({ ':s': 'MULTA' }),
  };
  const res = await dynamo.send(new QueryCommand(params));
  let items = (res.Items || []).map((i) => mapMulta(unmarshall(i)));
  if (fechaDesde) items = items.filter((m) => m.fecha >= fechaDesde);
  if (fechaHasta) items = items.filter((m) => m.fecha <= fechaHasta);
  if (estado && estado !== 'all') items = items.filter((m) => m.estado === estado);
  return items.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

async function dispensarMulta(userNameOrId, multaId, fecha, dispensadaPor, razon) {
  const key = {
    PK: `USER#${slugUserId(userNameOrId)}`,
    SK: `MULTA#${fecha}#${multaId}`,
  };
  await dynamo.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: marshall(key),
    UpdateExpression: 'SET estado = :e, dispensadaPor = :p, dispensadaEn = :t, razonDispensa = :r',
    ExpressionAttributeValues: marshall({
      ':e': 'dispensada',
      ':p': dispensadaPor,
      ':t': Date.now(),
      ':r': razon || '',
    }),
  }));
  const res = await dynamo.send(new GetItemCommand({ TableName: TABLE, Key: marshall(key) }));
  return mapMulta(unmarshall(res.Item));
}

module.exports = {
  DEFAULT_REGLAS,
  getReglas,
  saveReglas,
  calcularMonto,
  crearMulta,
  listMultas,
  dispensarMulta,
};
