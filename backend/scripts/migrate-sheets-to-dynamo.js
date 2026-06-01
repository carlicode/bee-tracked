/**
 * Migra datos históricos de Google Sheets → DynamoDB (una sola ejecución).
 *
 * Uso:
 *   cd backend && node scripts/migrate-sheets-to-dynamo.js
 *
 * Requiere: .env con credenciales Google + AWS configuradas.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { DynamoDBClient, BatchWriteItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const config = require('../src/config');
const {
  getAllRowsWithHeadersFromSpreadsheet,
  getSheetsInSpreadsheet,
} = require('../src/services/googleSheets');

const dynamo = new DynamoDBClient({ region: config.dynamo.region });

const BATCH_SIZE = 25;

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

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    const key = h != null && String(h).trim() !== '' ? String(h).trim() : `col_${i}`;
    obj[key] = row[i] != null ? String(row[i]) : '';
  });
  return obj;
}

function normalizeEstado(estado) {
  const e = String(estado || '').toUpperCase();
  if (e === 'INICIADO' || e === 'ACTIVO' || e === 'ABIERTO') return 'activo';
  if (e === 'CERRADO' || e === 'FINALIZADO') return 'cerrado';
  return e ? e.toLowerCase() : 'desconocido';
}

function parseCreatedAt(value, fallbackDate) {
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return parsed;
  const dateParsed = Date.parse(fallbackDate);
  if (!Number.isNaN(dateParsed)) return dateParsed;
  return Date.now();
}

async function batchWrite(tableName, items) {
  if (!items.length) return;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    const requestItems = {
      [tableName]: chunk.map((Item) => ({ PutRequest: { Item } })),
    };

    await dynamo.send(new BatchWriteItemCommand({ RequestItems: requestItems }));
    console.log(`  ✓ ${Math.min(i + BATCH_SIZE, items.length)}/${items.length} en ${tableName}`);
  }
}

function beezeroTurnoItem(obj) {
  const turnoId = obj.ID || obj.Id || obj.id;
  const nombre = obj.Abejita || obj.abejita || '';
  const userId = slugUserId(nombre);
  const fecha = obj['Fecha Inicio'] || obj.Fecha || '';
  const createdAt = parseCreatedAt(obj['Timestamp Creación'] || obj['Timestamp Actualización'], fecha);

  return marshall({
    PK: `USER#${userId}`,
    SK: `TURNO#${turnoId}`,
    turnoId: String(turnoId),
    userId,
    nombre,
    tipo: 'beezero',
    fecha,
    horaInicio: obj['Hora Inicio'] || '',
    horaCierre: obj['Hora Cierre'] || '',
    placa: obj['Auto (Placa)'] || obj.Auto || '',
    kmInicio: obj['Km Inicio'] || obj['Kilometraje Inicio'] || '',
    kmFin: obj['Km Cierre'] || obj['Kilometraje Cierre'] || '',
    bateriaInicio: obj['Bateria Inicio'] || '',
    bateriaCierre: obj['Bateria Cierre'] || '',
    estado: normalizeEstado(obj.Estado),
    observaciones: obj.Observaciones || '',
    createdAt,
    source: 'migration-sheets',
  }, { removeUndefinedValues: true });
}

function ecodeliveryTurnoItem(obj, headers) {
  const byIndex = (idx) => (obj[headers[idx]] != null ? String(obj[headers[idx]]) : '');

  const turnoId = obj.ID || obj.Id || byIndex(0);
  const nombre = obj.Usuario || obj.usuario || byIndex(1);
  const userId = slugUserId(nombre);
  const fecha = obj['Fecha Inicio'] || obj.fechaInicio || byIndex(2);
  const createdAt = parseCreatedAt(obj['Timestamp Creación'] || obj.timestampInicio || byIndex(6), fecha);

  return marshall({
    PK: `USER#${userId}`,
    SK: `TURNO#${turnoId}`,
    turnoId: String(turnoId),
    userId,
    nombre,
    tipo: 'ecodelivery',
    fecha,
    horaInicio: obj['Hora Inicio'] || obj.horaInicio || byIndex(3),
    horaCierre: obj['Hora Cierre'] || obj.horaCierre || byIndex(8),
    estado: normalizeEstado(obj.Estado || byIndex(14)),
    createdAt,
    source: 'migration-sheets',
  }, { removeUndefinedValues: true });
}

function carreraItem(obj, driverTab, tipo = 'beezero') {
  const carreraId = obj.CarreraId || obj.DeliveryId || obj.ID || `${driverTab}-${obj.Fecha || obj['Fecha Registro']}-${obj['Hora Inicio']}`;
  const nombre = obj.Abejita || obj.Biker || driverTab;
  const userId = slugUserId(nombre);
  const fecha = obj.Fecha || obj['Fecha Registro'] || '';
  const createdAt = parseCreatedAt(obj['Fecha creación'] || obj['Fecha creacion'] || obj['Fecha Registro'], fecha);

  return marshall({
    PK: `USER#${userId}`,
    SK: `CARRERA#${fecha}#${carreraId}`,
    carreraId: String(carreraId),
    userId,
    nombre,
    tipo,
    fecha,
    cliente: obj.Cliente || '',
    horaInicio: obj['Hora Inicio'] || '',
    horaFin: obj['Hora Fin'] || '',
    horaRegistro: obj['Hora Registro'] || '',
    lugarRecojo: obj['Lugar Recojo'] || obj['Lugar Origen'] || '',
    lugarDestino: obj['Lugar Destino'] || '',
    tiempo: obj.Tiempo || '',
    distancia: obj['Distancia (km)'] || '',
    precio: obj['Precio (Bs)'] || '',
    observaciones: obj.Observaciones || obj.Notas || '',
    foto: obj.Foto || '',
    porHora: obj['Por hora'] || obj['Por Hora'] || '',
    aCuenta: obj['A cuenta'] || '',
    pagoPorQR: obj['Pago por QR'] || '',
    fechaCreacion: obj['Fecha creación'] || obj['Fecha creacion'] || '',
    horaCreacion: obj['Hora creación'] || obj['Hora creacion'] || '',
    createdAt,
    source: 'migration-sheets',
  }, { removeUndefinedValues: true });
}

function filterDriverTabs(names) {
  return (names || []).filter((n) => {
    if (!n || typeof n !== 'string') return false;
    const lower = n.toLowerCase();
    if (lower === 'registros') return false;
    if (lower.includes('backup')) return false;
    return true;
  });
}

async function migrateTurnosBeezero() {
  console.log('\n📦 Migrando turnos BeeZero...');
  const { headers, rows } = await getAllRowsWithHeadersFromSpreadsheet(
    config.google.sheetId,
    'BeeZero',
    'A:AE'
  );

  if (!headers.length) {
    console.log('  (sin datos en hoja BeeZero)');
    return 0;
  }

  const items = rows
    .map((row) => rowToObject(headers, row))
    .filter((obj) => obj.ID || obj.Id)
    .map(beezeroTurnoItem);

  await batchWrite(config.dynamo.turnosTable, items);
  return items.length;
}

async function migrateTurnosEcodelivery() {
  console.log('\n📦 Migrando turnos EcoDelivery...');
  const { headers, rows } = await getAllRowsWithHeadersFromSpreadsheet(
    config.google.sheetId,
    'Ecodelivery',
    'A:AE'
  );

  if (!headers.length) {
    console.log('  (sin datos en hoja Ecodelivery)');
    return 0;
  }

  const items = rows
    .map((row) => rowToObject(headers, row))
    .filter((obj) => {
      const id = obj.ID || obj.Id || obj[headers[0]];
      return id !== undefined && String(id).trim() !== '';
    })
    .map((obj) => ecodeliveryTurnoItem(obj, headers));

  await batchWrite(config.dynamo.turnosTable, items);
  return items.length;
}

function detectCarreraTipo(headers) {
  const norm = (headers || []).map((h) => String(h || '').trim().toLowerCase());
  if (norm.includes('deliveryid')) return 'biker';
  return 'beezero';
}

async function migrateCarrerasFromSpreadsheet(spreadsheetId, label) {
  if (!spreadsheetId) return 0;

  console.log(`\n📦 Migrando carreras (${label})...`);
  const tabs = filterDriverTabs(await getSheetsInSpreadsheet(spreadsheetId));
  let total = 0;

  for (const tab of tabs) {
    const { headers, rows } = await getAllRowsWithHeadersFromSpreadsheet(
      spreadsheetId,
      tab,
      'A:AD'
    );
    if (!headers.length || !rows.length) continue;

    const tipo = detectCarreraTipo(headers);
    const items = rows
      .map((row) => rowToObject(headers, row))
      .filter((obj) => {
        if (tipo === 'biker') {
          return obj['Fecha Registro'] || obj.Fecha || obj.Cliente;
        }
        return obj.Fecha || obj.Cliente;
      })
      .map((obj) => carreraItem(obj, tab, tipo));

    if (items.length) {
      console.log(`  → Pestaña "${tab}" (${tipo}): ${items.length} filas`);
      await batchWrite(config.dynamo.carrerasTable, items);
      total += items.length;
    }
  }

  return total;
}

async function migrateCarreras() {
  const driversId = config.google.carrerasDriversSheetId;
  const bikersId = config.google.carreassBikersSheetId;

  let total = 0;
  total += await migrateCarrerasFromSpreadsheet(driversId, 'drivers');

  if (bikersId && bikersId !== driversId) {
    total += await migrateCarrerasFromSpreadsheet(bikersId, 'bikers');
  } else if (bikersId === driversId) {
    console.log('\nℹ️  Drivers y bikers comparten spreadsheet — una sola pasada con detección por headers');
  }

  return total;
}

async function main() {
  console.log('=== MIGRACIÓN GOOGLE SHEETS → DYNAMODB ===');
  console.log('Región:', config.dynamo.region);
  console.log('Turnos table:', config.dynamo.turnosTable);
  console.log('Carreras table:', config.dynamo.carrerasTable);

  const summary = {
    turnosBeezero: 0,
    turnosEcodelivery: 0,
    carreras: 0,
    errors: [],
  };

  try {
    summary.turnosBeezero = await migrateTurnosBeezero();
  } catch (err) {
    summary.errors.push(`turnos BeeZero: ${err.message}`);
    console.error('  ✗ Error turnos BeeZero:', err.message);
  }

  try {
    summary.turnosEcodelivery = await migrateTurnosEcodelivery();
  } catch (err) {
    summary.errors.push(`turnos EcoDelivery: ${err.message}`);
    console.error('  ✗ Error turnos EcoDelivery:', err.message);
  }

  try {
    summary.carreras = await migrateCarreras();
  } catch (err) {
    summary.errors.push(`carreras: ${err.message}`);
    console.error('  ✗ Error carreras:', err.message);
  }

  console.log('\n=== RESUMEN ===');
  console.log(`Turnos BeeZero:     ${summary.turnosBeezero}`);
  console.log(`Turnos EcoDelivery: ${summary.turnosEcodelivery}`);
  console.log(`Carreras/entregas:  ${summary.carreras}`);
  if (summary.errors.length) {
    console.log('Errores:', summary.errors.join(' | '));
    process.exitCode = 1;
  } else {
    console.log('✅ Migración completada');
  }
}

main().catch((err) => {
  console.error('Migración fallida:', err);
  process.exit(1);
});
