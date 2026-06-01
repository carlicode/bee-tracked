const { PutItemCommand, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const config = require('../config');
const {
  dynamo,
  slugUserId,
  normalizeEstado,
  estadoToSheet,
  normalizeFechaYmd,
} = require('./dynamoUtils');

const BEEZERO_HEADERS = [
  'ID', 'Timestamp Creación', 'Hora Inicio', 'Hora Cierre', 'Fecha Inicio', 'Fecha Cierre',
  'Abejita', 'Auto (Placa)', 'Kilometraje Inicio', 'Kilometraje Cierre', 'Bateria Inicio',
  'Bateria Cierre', 'Apertura Caja (Bs)', 'Cierre Caja (Bs)', 'ID Gastos', 'Total Gastos (Bs)',
  'Diferencia (Bs)', 'Daños Auto Inicio', 'Foto Tablero Inicio', 'Foto Exterior Inicio',
  'Daños Auto Cierre', 'Foto Tablero Cierre', 'Foto Exterior Cierre',
  'Ubicación Inicio (Lat)', 'Ubicación Inicio (Lng)', 'Ubicación Cierre (Lat)',
  'Ubicación Cierre (Lng)', 'Observaciones', 'Timestamp Actualización', 'Estado',
];

const ECODELIVERY_HEADERS = [
  'TurnoId', 'Usuario', 'Fecha Inicio', 'Hora Inicio', 'Lat Inicio', 'Lng Inicio',
  'Timestamp Inicio', 'Foto Inicio', 'Fecha Cierre', 'Hora Cierre', 'Lat Cierre', 'Lng Cierre',
  'Timestamp Cierre', 'Foto Cierre', 'Estado', 'Timestamp Creación', 'Timestamp Actualización',
];

function buildTurnoItem(data) {
  const userId = slugUserId(data.nombre);
  const turnoId = String(data.turnoId);
  const tipo = data.tipo;
  const fecha = normalizeFechaYmd(data.fecha || data.fechaInicio || '');
  const estado = normalizeEstado(data.estado);
  const createdAt = data.createdAt != null ? Number(data.createdAt) : Date.now();

  return {
    PK: `USER#${userId}`,
    SK: `TURNO#${turnoId}`,
    turnoId,
    userId,
    nombre: data.nombre || '',
    tipo,
    fecha,
    fechaCierre: normalizeFechaYmd(data.fechaCierre || ''),
    horaInicio: data.horaInicio || '',
    horaCierre: data.horaCierre || '',
    placa: data.placa || '',
    kmInicio: data.kmInicio != null ? String(data.kmInicio) : '',
    kmFin: data.kmFin != null ? String(data.kmFin) : '',
    bateriaInicio: data.bateriaInicio != null ? String(data.bateriaInicio) : '',
    bateriaCierre: data.bateriaCierre != null ? String(data.bateriaCierre) : '',
    aperturaCaja: data.aperturaCaja != null ? String(data.aperturaCaja) : '',
    cierreCaja: data.cierreCaja != null ? String(data.cierreCaja) : '',
    totalGastos: data.totalGastos != null ? String(data.totalGastos) : '',
    diferencia: data.diferencia != null ? String(data.diferencia) : '',
    gastoIds: data.gastoIds || '',
    danosAutoInicio: data.danosAutoInicio || '',
    danosAutoCierre: data.danosAutoCierre || '',
    fotoTableroInicio: data.fotoTableroInicio || '',
    fotoExteriorInicio: data.fotoExteriorInicio || '',
    fotoTableroCierre: data.fotoTableroCierre || '',
    fotoExteriorCierre: data.fotoExteriorCierre || '',
    ubicacionInicioLat: data.ubicacionInicioLat != null ? String(data.ubicacionInicioLat) : '',
    ubicacionInicioLng: data.ubicacionInicioLng != null ? String(data.ubicacionInicioLng) : '',
    ubicacionCierreLat: data.ubicacionCierreLat != null ? String(data.ubicacionCierreLat) : '',
    ubicacionCierreLng: data.ubicacionCierreLng != null ? String(data.ubicacionCierreLng) : '',
    latInicio: data.latInicio != null ? String(data.latInicio) : '',
    lngInicio: data.lngInicio != null ? String(data.lngInicio) : '',
    latCierre: data.latCierre != null ? String(data.latCierre) : '',
    lngCierre: data.lngCierre != null ? String(data.lngCierre) : '',
    timestampInicio: data.timestampInicio != null ? String(data.timestampInicio) : '',
    timestampCierre: data.timestampCierre != null ? String(data.timestampCierre) : '',
    fotoInicio: data.fotoInicio || '',
    fotoCierre: data.fotoCierre || '',
    observaciones: data.observaciones || '',
    estado,
    createdAt,
    updatedAt: data.updatedAt != null ? Number(data.updatedAt) : createdAt,
    source: data.source || 'app',
  };
}

function beezeroToAdminRow(item) {
  const tsCreate = item.createdAt ? new Date(item.createdAt).toISOString() : '';
  const tsUpdate = item.updatedAt ? new Date(item.updatedAt).toISOString() : tsCreate;
  return {
    ID: item.turnoId,
    'Timestamp Creación': tsCreate,
    'Hora Inicio': item.horaInicio || '',
    'Hora Cierre': item.horaCierre || '',
    'Fecha Inicio': item.fecha || '',
    'Fecha Cierre': item.fechaCierre || '',
    Abejita: item.nombre || '',
    'Auto (Placa)': item.placa || '',
    'Kilometraje Inicio': item.kmInicio || '',
    'Kilometraje Cierre': item.kmFin || '',
    'Bateria Inicio': item.bateriaInicio || '',
    'Bateria Cierre': item.bateriaCierre || '',
    'Apertura Caja (Bs)': item.aperturaCaja || '',
    'Cierre Caja (Bs)': item.cierreCaja || '',
    'ID Gastos': item.gastoIds || '',
    'Total Gastos (Bs)': item.totalGastos || '',
    'Diferencia (Bs)': item.diferencia || '',
    'Daños Auto Inicio': item.danosAutoInicio || '',
    'Foto Tablero Inicio': item.fotoTableroInicio || '',
    'Foto Exterior Inicio': item.fotoExteriorInicio || '',
    'Daños Auto Cierre': item.danosAutoCierre || '',
    'Foto Tablero Cierre': item.fotoTableroCierre || '',
    'Foto Exterior Cierre': item.fotoExteriorCierre || '',
    'Ubicación Inicio (Lat)': item.ubicacionInicioLat || '',
    'Ubicación Inicio (Lng)': item.ubicacionInicioLng || '',
    'Ubicación Cierre (Lat)': item.ubicacionCierreLat || '',
    'Ubicación Cierre (Lng)': item.ubicacionCierreLng || '',
    Observaciones: item.observaciones || '',
    'Timestamp Actualización': tsUpdate,
    Estado: estadoToSheet(item.estado),
  };
}

function ecodeliveryToAdminRow(item) {
  const tsCreate = item.createdAt ? new Date(item.createdAt).toISOString() : '';
  const tsUpdate = item.updatedAt ? new Date(item.updatedAt).toISOString() : tsCreate;
  return {
    TurnoId: item.turnoId,
    Usuario: item.nombre || '',
    'Fecha Inicio': item.fecha || '',
    'Hora Inicio': item.horaInicio || '',
    'Lat Inicio': item.latInicio || '',
    'Lng Inicio': item.lngInicio || '',
    'Timestamp Inicio': item.timestampInicio || '',
    'Foto Inicio': item.fotoInicio || '',
    'Fecha Cierre': item.fechaCierre || '',
    'Hora Cierre': item.horaCierre || '',
    'Lat Cierre': item.latCierre || '',
    'Lng Cierre': item.lngCierre || '',
    'Timestamp Cierre': item.timestampCierre || '',
    'Foto Cierre': item.fotoCierre || '',
    Estado: estadoToSheet(item.estado),
    'Timestamp Creación': tsCreate,
    'Timestamp Actualización': tsUpdate,
  };
}

async function putTurno(data) {
  const item = buildTurnoItem(data);
  await dynamo.send(
    new PutItemCommand({
      TableName: config.dynamo.turnosTable,
      Item: marshall(item, { removeUndefinedValues: true }),
    })
  );
  return item;
}

async function getTurno(userIdOrName, turnoId) {
  const userId = userIdOrName.includes('-') && !userIdOrName.includes(' ')
    ? userIdOrName
    : slugUserId(userIdOrName);

  const res = await dynamo.send(
    new QueryCommand({
      TableName: config.dynamo.turnosTable,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: marshall({
        ':pk': `USER#${userId}`,
        ':sk': `TURNO#${turnoId}`,
      }),
      Limit: 1,
    })
  );

  const raw = res.Items?.[0];
  return raw ? unmarshall(raw) : null;
}

async function listTurnosForAdmin(tipo) {
  const items = [];
  let lastKey;

  do {
    const res = await dynamo.send(
      new QueryCommand({
        TableName: config.dynamo.turnosTable,
        IndexName: 'tipo-fecha-index',
        KeyConditionExpression: 'tipo = :tipo',
        ExpressionAttributeValues: marshall({ ':tipo': tipo }),
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...(res.Items || []).map((item) => unmarshall(item)));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (tipo === 'beezero') {
    return {
      headers: BEEZERO_HEADERS,
      turnos: items.map(beezeroToAdminRow),
    };
  }

  return {
    headers: ECODELIVERY_HEADERS,
    turnos: items.map(ecodeliveryToAdminRow),
  };
}

module.exports = {
  putTurno,
  getTurno,
  listTurnosForAdmin,
  buildTurnoItem,
};
