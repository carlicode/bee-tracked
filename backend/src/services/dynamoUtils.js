const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const config = require('../config');

const dynamo = new DynamoDBClient({ region: config.dynamo.region });

function isTruthyEnv(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function isDynamoWriteEnabled() {
  return isTruthyEnv(process.env.DYNAMO_WRITE_ENABLED);
}

function isDynamoReadEnabled() {
  return isTruthyEnv(process.env.DYNAMO_READ_ENABLED);
}

function slugUserId(name) {
  if (!name) return 'unknown';
  return String(name)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

function normalizeEstado(estado) {
  const e = String(estado || '').toUpperCase();
  if (e === 'INICIADO' || e === 'ACTIVO' || e === 'ABIERTO') return 'activo';
  if (e === 'CERRADO' || e === 'FINALIZADO') return 'cerrado';
  return e ? e.toLowerCase() : 'desconocido';
}

function estadoToSheet(estado) {
  if (estado === 'activo') return 'INICIADO';
  if (estado === 'cerrado') return 'CERRADO';
  return String(estado || '').toUpperCase();
}

function normalizeFechaYmd(value) {
  const s = String(value || '').trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${mm}-${dd}`;
  }
  return s;
}

module.exports = {
  dynamo,
  isDynamoWriteEnabled,
  isDynamoReadEnabled,
  slugUserId,
  normalizeEstado,
  estadoToSheet,
  normalizeFechaYmd,
};
