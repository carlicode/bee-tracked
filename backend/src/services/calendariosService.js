const crypto = require('crypto');
const {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
  GetItemCommand,
  DeleteItemCommand,
} = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const config = require('../config');
const { slugUserId } = require('./dynamoUtils');
const { fechasEnRango, normalizeYmd, diffDaysInclusive } = require('../utils/weekUtils');

const dynamo = new DynamoDBClient({ region: config.dynamo.region });
const TABLE = config.dynamo.calendariosTable;
const MAX_DIAS = 35;

function userPk(userNameOrId) {
  return `USER#${slugUserId(userNameOrId)}`;
}

function deriveHorasFromTurnos(turnos) {
  if (!turnos || turnos.length === 0) return { horaInicio: '', horaFin: '' };
  return {
    horaInicio: turnos[0].inicio,
    horaFin: turnos[turnos.length - 1].fin,
  };
}

function normalizeTurnos(src) {
  if (Array.isArray(src.turnos) && src.turnos.length > 0) {
    return src.turnos
      .filter((t) => t && t.inicio && t.fin)
      .map((t) => ({
        inicio: t.inicio,
        fin: t.fin,
      }));
  }
  if (src.trabaja && src.horaInicio && src.horaFin) {
    return [{ inicio: src.horaInicio, fin: src.horaFin }];
  }
  return [];
}

function normalizeDiaFromStorage(dia) {
  if (!dia) return dia;
  const turnos = normalizeTurnos(dia);
  const { horaInicio, horaFin } = deriveHorasFromTurnos(turnos);
  return {
    ...dia,
    trabaja: turnos.length > 0,
    turnos,
    horaInicio: turnos.length > 0 ? horaInicio : '',
    horaFin: turnos.length > 0 ? horaFin : '',
  };
}

function mapHorario(item) {
  const rawDias = item.dias || {};
  const dias = {};
  for (const [fecha, d] of Object.entries(rawDias)) {
    dias[fecha] = normalizeDiaFromStorage(d);
  }
  return {
    horarioId: item.horarioId,
    userId: item.userId,
    userName: item.userName,
    userType: item.userType,
    fechaDesde: item.fechaDesde,
    fechaHasta: item.fechaHasta,
    dias,
    estado: item.estado,
    version: item.version || 1,
    enviadoPor: item.enviadoPor || null,
    enviadoEn: item.enviadoEn,
    editadoPor: item.editadoPor || null,
    editadoEn: item.editadoEn || null,
  };
}

function mapHabilitacion(item) {
  if (!item) return null;
  return {
    habilitada: Boolean(item.habilitada),
    fechaDesde: item.fechaDesde,
    fechaHasta: item.fechaHasta,
    habilitadoPor: item.habilitadoPor || null,
    habilitadoEn: item.habilitadoEn || null,
    baseHorarioId: item.baseHorarioId || null,
  };
}

function normalizeDiasPorFecha(dias, fechaDesde, fechaHasta) {
  const fechas = fechasEnRango(fechaDesde, fechaHasta, MAX_DIAS);
  const out = {};
  for (const fecha of fechas) {
    const src = dias?.[fecha] || {};
    const turnos = normalizeTurnos(src);
    const { horaInicio, horaFin } = deriveHorasFromTurnos(turnos);
    out[fecha] = {
      fecha,
      trabaja: turnos.length > 0,
      turnos,
      horaInicio: turnos.length > 0 ? horaInicio : '',
      horaFin: turnos.length > 0 ? horaFin : '',
    };
  }
  return out;
}

async function getHabilitacion(userNameOrId) {
  const res = await dynamo.send(new GetItemCommand({
    TableName: TABLE,
    Key: marshall({ PK: userPk(userNameOrId), SK: 'HABILITACION' }),
  }));
  return res.Item ? mapHabilitacion(unmarshall(res.Item)) : null;
}

async function getHorarioById(userNameOrId, horarioId) {
  const res = await dynamo.send(new GetItemCommand({
    TableName: TABLE,
    Key: marshall({ PK: userPk(userNameOrId), SK: `HORARIO#${horarioId}` }),
  }));
  return res.Item ? mapHorario(unmarshall(res.Item)) : null;
}

async function listHorariosUser(userNameOrId) {
  const res = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :pref)',
    ExpressionAttributeValues: marshall({ ':pk': userPk(userNameOrId), ':pref': 'HORARIO#' }),
  }));
  return (res.Items || [])
    .map((i) => mapHorario(unmarshall(i)))
    .sort((a, b) => (b.enviadoEn || 0) - (a.enviadoEn || 0));
}

async function getUltimoHorario(userNameOrId) {
  const list = await listHorariosUser(userNameOrId);
  return list.find((h) => h.estado === 'activo') || list[0] || null;
}

async function listByEstado(estado) {
  const res = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'estado-enviadoEn-index',
    KeyConditionExpression: 'estado = :e',
    ExpressionAttributeValues: marshall({ ':e': estado }),
    ScanIndexForward: false,
  }));
  return (res.Items || [])
    .filter((i) => unmarshall(i).entityType === 'horario')
    .map((i) => mapHorario(unmarshall(i)));
}

async function listVentanasAbiertas() {
  const res = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :pref)',
    ExpressionAttributeValues: marshall({ ':pk': 'ADMIN#VENTANAS', ':pref': 'USER#' }),
  }));
  return (res.Items || []).map((i) => unmarshall(i));
}

async function habilitarWorker({
  userId,
  userName,
  userType,
  fechaDesde,
  fechaHasta,
  habilitadoPor,
  baseHorarioId,
}) {
  const desde = normalizeYmd(fechaDesde);
  const hasta = normalizeYmd(fechaHasta);
  if (!desde || !hasta || hasta < desde) {
    const err = new Error('Rango de fechas inválido');
    err.statusCode = 400;
    throw err;
  }
  if (diffDaysInclusive(desde, hasta) > MAX_DIAS) {
    const err = new Error(`El rango no puede superar ${MAX_DIAS} días`);
    err.statusCode = 400;
    throw err;
  }

  let baseId = baseHorarioId || null;
  if (!baseId) {
    const ultimo = await getUltimoHorario(userName || userId);
    if (ultimo) baseId = ultimo.horarioId;
  }

  const now = Date.now();
  const habItem = {
    PK: userPk(userName || userId),
    SK: 'HABILITACION',
    entityType: 'habilitacion',
    habilitada: true,
    userId: String(userId).toLowerCase(),
    userName: userName || userId,
    userType: userType || 'ecodelivery',
    fechaDesde: desde,
    fechaHasta: hasta,
    habilitadoPor: habilitadoPor || null,
    habilitadoEn: now,
    baseHorarioId: baseId,
  };

  const ventanaItem = {
    PK: 'ADMIN#VENTANAS',
    SK: userPk(userName || userId),
    entityType: 'ventana',
    userId: habItem.userId,
    userName: habItem.userName,
    userType: habItem.userType,
    fechaDesde: desde,
    fechaHasta: hasta,
    habilitadoEn: now,
    baseHorarioId: baseId,
  };

  await dynamo.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall(habItem, { removeUndefinedValues: true }),
  }));
  await dynamo.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall(ventanaItem, { removeUndefinedValues: true }),
  }));

  return mapHabilitacion(habItem);
}

async function cerrarVentana(userNameOrId) {
  await dynamo.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: marshall({ PK: userPk(userNameOrId), SK: 'HABILITACION' }),
    UpdateExpression: 'SET habilitada = :f',
    ExpressionAttributeValues: marshall({ ':f': false }),
  }));
  await dynamo.send(new DeleteItemCommand({
    TableName: TABLE,
    Key: marshall({ PK: 'ADMIN#VENTANAS', SK: userPk(userNameOrId) }),
  }));
}

async function submitHorario({ userId, userName, userType, dias, fechaDesde, fechaHasta }) {
  const hab = await getHabilitacion(userName || userId);
  if (!hab?.habilitada) {
    const err = new Error('No tienes una ventana habilitada para enviar horario');
    err.statusCode = 403;
    err.code = 'NOT_ENABLED';
    throw err;
  }

  const desde = normalizeYmd(fechaDesde || hab.fechaDesde);
  const hasta = normalizeYmd(fechaHasta || hab.fechaHasta);
  if (desde !== hab.fechaDesde || hasta !== hab.fechaHasta) {
    const err = new Error('Debes cubrir exactamente el rango habilitado por admin');
    err.statusCode = 400;
    throw err;
  }

  const horarioId = crypto.randomUUID();
  const now = Date.now();
  const item = {
    PK: userPk(userName || userId),
    SK: `HORARIO#${horarioId}`,
    entityType: 'horario',
    horarioId,
    userId: String(userId).toLowerCase(),
    userName: userName || userId,
    userType: userType || 'ecodelivery',
    fechaDesde: desde,
    fechaHasta: hasta,
    dias: normalizeDiasPorFecha(dias, desde, hasta),
    estado: 'enviado',
    version: 1,
    enviadoPor: 'worker',
    enviadoEn: now,
  };

  await dynamo.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall(item, { removeUndefinedValues: true }),
  }));
  await cerrarVentana(userName || userId);

  return mapHorario(item);
}

async function editarHorario(userNameOrId, horarioId, dias, editadoPor, marcarActivo = true) {
  const existing = await getHorarioById(userNameOrId, horarioId);
  if (!existing) {
    const err = new Error('Horario no encontrado');
    err.statusCode = 404;
    throw err;
  }

  const now = Date.now();
  const item = {
    PK: userPk(userNameOrId),
    SK: `HORARIO#${horarioId}`,
    entityType: 'horario',
    horarioId,
    userId: existing.userId,
    userName: existing.userName,
    userType: existing.userType,
    fechaDesde: existing.fechaDesde,
    fechaHasta: existing.fechaHasta,
    dias: normalizeDiasPorFecha(dias, existing.fechaDesde, existing.fechaHasta),
    estado: marcarActivo ? 'activo' : existing.estado,
    version: (existing.version || 1) + 1,
    enviadoPor: existing.enviadoPor,
    enviadoEn: existing.enviadoEn,
    editadoPor: editadoPor || null,
    editadoEn: now,
  };

  await dynamo.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall(item, { removeUndefinedValues: true }),
  }));

  return mapHorario(item);
}

async function rehabilitarWorker({ userId, userName, userType, habilitadoPor }) {
  const ultimo = await getUltimoHorario(userName || userId);
  if (!ultimo) {
    const err = new Error('No hay horario previo para usar como base');
    err.statusCode = 400;
    throw err;
  }
  return habilitarWorker({
    userId,
    userName,
    userType,
    fechaDesde: ultimo.fechaDesde,
    fechaHasta: ultimo.fechaHasta,
    habilitadoPor,
    baseHorarioId: ultimo.horarioId,
  });
}

async function getWorkerEstado(userNameOrId) {
  const hab = await getHabilitacion(userNameOrId);
  const historial = await listHorariosUser(userNameOrId);
  const activo = historial.find((h) => h.estado === 'activo') || null;
  const ultimo = historial[0] || null;

  let baseParaFormulario = null;
  if (hab?.habilitada) {
    if (hab.baseHorarioId) {
      baseParaFormulario = await getHorarioById(userNameOrId, hab.baseHorarioId);
    } else if (ultimo) {
      baseParaFormulario = ultimo;
    }
  }

  return {
    habilitacion: hab,
    puedeEnviar: Boolean(hab?.habilitada),
    horarioActivo: activo,
    ultimoHorario: ultimo,
    baseParaFormulario,
    historial,
  };
}

/** Horario vigente para una fecha (activo > enviado que cubra la fecha) */
async function getDiaHorario(userNameOrId, fechaYmd) {
  const fecha = normalizeYmd(fechaYmd);
  const list = await listHorariosUser(userNameOrId);
  const candidatos = list.filter(
    (h) => (h.estado === 'activo' || h.estado === 'enviado') && fecha >= h.fechaDesde && fecha <= h.fechaHasta
  );
  const h = candidatos.find((x) => x.estado === 'activo') || candidatos[0];
  if (!h) return null;
  const dia = h.dias?.[fecha];
  if (!dia) return null;
  return { ...dia, horarioId: h.horarioId, userName: h.userName, userType: h.userType, userId: h.userId };
}

async function getCalendarioVisual(fechaDesde, fechaHasta) {
  const fechas = fechasEnRango(fechaDesde, fechaHasta, MAX_DIAS);
  const activos = await listByEstado('activo');
  const enviados = await listByEstado('enviado');
  const all = [...activos];
  for (const e of enviados) {
    if (!all.some((a) => a.userId === e.userId && a.fechaDesde === e.fechaDesde)) {
      all.push(e);
    }
  }

  const rows = all.map((h) => {
    const celdas = {};
    for (const f of fechas) {
      if (f < h.fechaDesde || f > h.fechaHasta) {
        celdas[f] = { tipo: 'fuera_rango' };
      } else {
        const d = h.dias?.[f];
        celdas[f] = d?.trabaja
          ? { tipo: 'trabaja', horaInicio: d.horaInicio, horaFin: d.horaFin }
          : { tipo: 'libre' };
      }
    }
    return {
      userId: h.userId,
      userName: h.userName,
      userType: h.userType,
      horarioId: h.horarioId,
      estado: h.estado,
      celdas,
    };
  });

  return { fechas, rows };
}

module.exports = {
  MAX_DIAS,
  getHabilitacion,
  getHorarioById,
  listHorariosUser,
  getUltimoHorario,
  listByEstado,
  listVentanasAbiertas,
  habilitarWorker,
  cerrarVentana,
  submitHorario,
  editarHorario,
  rehabilitarWorker,
  getWorkerEstado,
  getDiaHorario,
  getCalendarioVisual,
  fechasEnRango,
  normalizeDiasPorFecha,
};
