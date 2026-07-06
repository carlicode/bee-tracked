/**
 * Compara turnos Ecodelivery/operadores en Google Sheet vs DynamoDB.
 * Detecta filas en Sheet sin registro correspondiente en DynamoDB.
 *
 * Uso:
 *   cd backend && node scripts/audit-sheet-vs-dynamo-turnos.js
 *   cd backend && node scripts/audit-sheet-vs-dynamo-turnos.js --days 7
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
const { getAllRows } = require('../src/services/googleSheets');
const { slugUserId } = require('../src/services/dynamoUtils');
const { normalizeFechaYmd } = require('../src/utils/dateLaPaz');

const TABLE = process.env.TURNOS_TABLE || 'bee-tracked-turnos-prod';
const SHEETS = [
  { name: 'Ecodelivery', tipo: 'ecodelivery' },
  { name: 'operadores', tipo: 'operador' },
];

function parseArgs() {
  const daysIdx = process.argv.indexOf('--days');
  const days = daysIdx >= 0 ? Number(process.argv[daysIdx + 1]) : 7;
  return { days: Number.isFinite(days) && days > 0 ? days : 7 };
}

function weekStartYmd(days) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  return start.toISOString().slice(0, 10);
}

function inRange(fechaYmd, fromYmd) {
  const f = normalizeFechaYmd(fechaYmd);
  return f >= fromYmd;
}

async function getDynamoTurno(client, usuario, turnoId) {
  const slugCandidates = [
    slugUserId(usuario),
    slugUserId(String(usuario).trim().split(/\s+/).slice(0, 2).join(' ')),
  ].filter((slug, i, arr) => slug && arr.indexOf(slug) === i);

  for (const userId of slugCandidates) {
    const res = await client.send(new GetItemCommand({
      TableName: TABLE,
      Key: {
        PK: { S: `USER#${userId}` },
        SK: { S: `TURNO#${String(turnoId)}` },
      },
    }));
    if (res.Item) return unmarshall(res.Item);
  }
  return null;
}

async function auditSheet(client, sheetName, tipo, fromYmd) {
  const rows = await getAllRows(sheetName);
  if (!rows.length) return { sheetName, tipo, checked: 0, missing: [], mismatches: [] };

  const headers = rows[0].map((h) => String(h || '').trim());
  const dataRows = rows.slice(1);

  const missing = [];
  const mismatches = [];
  let checked = 0;

  for (const row of dataRows) {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] != null ? String(row[i]) : ''; });

    const turnoId = obj.TurnoId || obj.turnoId;
    const usuario = obj.Usuario || obj.usuario || obj[' - Turnos'] || obj['- Turnos'] || '';
    const fechaInicio = normalizeFechaYmd(obj['Fecha Inicio'] || obj.fechaInicio || '');
    if (!turnoId || !usuario || !fechaInicio) continue;
    if (!inRange(fechaInicio, fromYmd)) continue;

    checked += 1;
    const dynamo = await getDynamoTurno(client, usuario, turnoId);
    const sheetEstado = (obj.Estado || obj.estado || '').toUpperCase();

    if (!dynamo) {
      missing.push({
        turnoId,
        usuario,
        fechaInicio,
        horaInicio: obj['Hora Inicio'] || '',
        estadoSheet: sheetEstado,
        tipo,
        sheet: sheetName,
      });
      continue;
    }

    const dynamoEstado = String(dynamo.estado || '').toLowerCase();
    const expectedDynamoEstado = sheetEstado === 'CERRADO' ? 'cerrado' : 'activo';
    if (dynamoEstado !== expectedDynamoEstado && sheetEstado) {
      mismatches.push({
        turnoId,
        usuario,
        fechaInicio,
        horaInicio: obj['Hora Inicio'] || '',
        estadoSheet: sheetEstado,
        estadoDynamo: dynamoEstado,
        tipo,
        sheet: sheetName,
      });
    }
  }

  return { sheetName, tipo, checked, missing, mismatches };
}

async function main() {
  const { days } = parseArgs();
  const fromYmd = weekStartYmd(days);
  const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

  console.log(`\nAuditoría Sheet vs DynamoDB (${days} días desde ${fromYmd})\n`);
  console.log(`Tabla DynamoDB: ${TABLE}\n`);

  const allMissing = [];
  const allMismatches = [];
  let totalChecked = 0;

  for (const sheet of SHEETS) {
    const result = await auditSheet(dynamo, sheet.name, sheet.tipo, fromYmd);
    totalChecked += result.checked;
    allMissing.push(...result.missing);
    allMismatches.push(...result.mismatches);

    console.log(`--- ${sheet.name} (${sheet.tipo}) ---`);
    console.log(`Turnos revisados: ${result.checked}`);
    console.log(`Sin registro en DynamoDB: ${result.missing.length}`);
    console.log(`Estado distinto Sheet/Dynamo: ${result.mismatches.length}`);
    if (result.missing.length) {
      result.missing.forEach((m) => {
        console.log(`  ✗ TurnoId ${m.turnoId} | ${m.usuario} | ${m.fechaInicio} ${m.horaInicio} | ${m.estadoSheet}`);
      });
    }
    console.log('');
  }

  console.log('=== RESUMEN ===');
  console.log(`Total turnos revisados: ${totalChecked}`);
  console.log(`En Sheet pero NO en DynamoDB: ${allMissing.length}`);
  console.log(`Estado inconsistente: ${allMismatches.length}`);

  if (allMissing.length) {
    console.log('\nCasos Sheet → DynamoDB faltante:');
    allMissing
      .sort((a, b) => `${a.fechaInicio}${a.horaInicio}`.localeCompare(`${b.fechaInicio}${b.horaInicio}`))
      .forEach((m) => {
        console.log(`- [${m.sheet}] TurnoId ${m.turnoId} | ${m.usuario} | ${m.fechaInicio} ${m.horaInicio} | ${m.estadoSheet}`);
      });
  }

  if (allMismatches.length) {
    console.log('\nCasos con estado distinto:');
    allMismatches.forEach((m) => {
      console.log(`- TurnoId ${m.turnoId} | ${m.usuario} | Sheet=${m.estadoSheet} Dynamo=${m.estadoDynamo}`);
    });
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
