const { PutItemCommand, QueryCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const config = require('../config');
const { dynamo, slugUserId, normalizeFechaYmd } = require('./dynamoUtils');

const DRIVER_HEADERS = [
  'CarreraId', 'Abejita', 'Fecha', 'Cliente', 'Hora Inicio', 'Hora Fin',
  'Lugar Recojo', 'Lugar Destino', 'Tiempo', 'Distancia (km)', 'Precio (Bs)',
  'Observaciones', 'Foto', 'Fecha creación', 'Hora creación', 'Por hora', 'A cuenta', 'Pago por QR',
];

const BIKER_HEADERS = [
  'DeliveryId', 'Biker', 'Fecha Registro', 'Hora Registro', 'Cliente', 'Lugar Origen',
  'Hora Inicio', 'Lugar Destino', 'Hora Fin', 'Distancia (km)', 'Por Hora', 'Notas', 'Foto',
];

function buildCarreraItem(data) {
  const userId = slugUserId(data.nombre);
  const carreraId = String(data.carreraId);
  const fecha = normalizeFechaYmd(data.fecha || data.fechaRegistro || '');
  const createdAt = data.createdAt != null ? Number(data.createdAt) : Date.now();

  return {
    PK: `USER#${userId}`,
    SK: `CARRERA#${fecha}#${carreraId}`,
    carreraId,
    userId,
    nombre: data.nombre || '',
    tipo: data.tipo || 'beezero',
    fecha,
    cliente: data.cliente || '',
    horaInicio: data.horaInicio || '',
    horaFin: data.horaFin || '',
    horaRegistro: data.horaRegistro || '',
    lugarRecojo: data.lugarRecojo || '',
    lugarDestino: data.lugarDestino || '',
    tiempo: data.tiempo != null ? String(data.tiempo) : '',
    distancia: data.distancia != null ? String(data.distancia) : '',
    precio: data.precio != null ? String(data.precio) : '',
    observaciones: data.observaciones || data.notas || '',
    foto: data.foto || '',
    porHora: data.porHora != null ? String(data.porHora) : '',
    aCuenta: data.aCuenta != null ? String(data.aCuenta) : '',
    pagoPorQR: data.pagoPorQR != null ? String(data.pagoPorQR) : '',
    fechaCreacion: data.fechaCreacion || '',
    horaCreacion: data.horaCreacion || '',
    createdAt,
    source: data.source || 'app',
  };
}

function driverToAdminRow(item) {
  return {
    CarreraId: item.carreraId,
    Abejita: item.nombre || '',
    Fecha: item.fecha || '',
    Cliente: item.cliente || '',
    'Hora Inicio': item.horaInicio || '',
    'Hora Fin': item.horaFin || '',
    'Lugar Recojo': item.lugarRecojo || '',
    'Lugar Destino': item.lugarDestino || '',
    Tiempo: item.tiempo || '',
    'Distancia (km)': item.distancia || '',
    'Precio (Bs)': item.precio || '',
    Observaciones: item.observaciones || '',
    Foto: item.foto || '',
    'Fecha creación': item.fechaCreacion || '',
    'Hora creación': item.horaCreacion || '',
    'Por hora': item.porHora || '',
    'A cuenta': item.aCuenta || '',
    'Pago por QR': item.pagoPorQR || '',
  };
}

function bikerToAdminRow(item) {
  return {
    DeliveryId: item.carreraId,
    Biker: item.nombre || '',
    'Fecha Registro': item.fecha || '',
    'Hora Registro': item.horaRegistro || '',
    Cliente: item.cliente || '',
    'Lugar Origen': item.lugarRecojo || '',
    'Hora Inicio': item.horaInicio || '',
    'Lugar Destino': item.lugarDestino || '',
    'Hora Fin': item.horaFin || '',
    'Distancia (km)': item.distancia || '',
    'Por Hora': item.porHora || '',
    Notas: item.observaciones || '',
    Foto: item.foto || '',
  };
}

function inDateRange(fechaStr, from, to) {
  if (!from && !to) return true;
  const d = normalizeFechaYmd(fechaStr);
  if (!d) return true;
  if (from && d < normalizeFechaYmd(from)) return false;
  if (to && d > normalizeFechaYmd(to)) return false;
  return true;
}

async function putCarrera(data) {
  const item = buildCarreraItem(data);
  await dynamo.send(
    new PutItemCommand({
      TableName: config.dynamo.carrerasTable,
      Item: marshall(item, { removeUndefinedValues: true }),
    })
  );
  return item;
}

async function listTabs(tipo) {
  const names = new Set();
  let lastKey;

  do {
    const res = await dynamo.send(
      new ScanCommand({
        TableName: config.dynamo.carrerasTable,
        FilterExpression: 'tipo = :tipo',
        ExpressionAttributeValues: marshall({ ':tipo': tipo }),
        ProjectionExpression: 'nombre',
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of res.Items || []) {
      const row = unmarshall(item);
      if (row.nombre) names.add(row.nombre);
    }
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'));
}

async function listCarrerasByTab(tab, tipo, from, to) {
  const userId = slugUserId(tab);
  const items = [];
  let lastKey;

  do {
    const res = await dynamo.send(
      new QueryCommand({
        TableName: config.dynamo.carrerasTable,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: marshall({
          ':pk': `USER#${userId}`,
          ':sk': 'CARRERA#',
        }),
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...(res.Items || []).map((item) => unmarshall(item)));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  const filtered = items
    .filter((item) => item.tipo === tipo)
    .filter((item) => inDateRange(item.fecha, from, to))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (tipo === 'biker') {
    return {
      headers: BIKER_HEADERS,
      rows: filtered.map(bikerToAdminRow),
    };
  }

  return {
    headers: DRIVER_HEADERS,
    rows: filtered.map(driverToAdminRow),
  };
}

module.exports = {
  putCarrera,
  listTabs,
  listCarrerasByTab,
  buildCarreraItem,
  DRIVER_HEADERS,
  BIKER_HEADERS,
};
