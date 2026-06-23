/**
 * Script para cerrar todos los turnos activos en DynamoDB.
 * Uso: node backend/scripts/close-all-active-turnos.js
 */
'use strict';

const { DynamoDBClient, ScanCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const dynamo = new DynamoDBClient({ region: 'us-east-1' });
const TABLE = 'bee-tracked-turnos-prod';

async function scanActiveTurnos() {
  const items = [];
  let lastKey;
  do {
    const res = await dynamo.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: '#estado = :activo',
      ExpressionAttributeNames: { '#estado': 'estado' },
      ExpressionAttributeValues: marshall({ ':activo': 'activo' }),
      ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
    }));
    (res.Items || []).forEach((i) => items.push(unmarshall(i)));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function closeTurno(turno) {
  const now = new Date();
  const horaCierre = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const fechaCierre = now.toISOString().split('T')[0];

  await dynamo.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: marshall({ PK: turno.PK, SK: turno.SK }),
    UpdateExpression: 'SET #estado = :cerrado, horaCierre = :hc, fechaCierre = :fc, updatedAt = :ua',
    ExpressionAttributeNames: { '#estado': 'estado' },
    ExpressionAttributeValues: marshall({
      ':cerrado': 'cerrado',
      ':hc': horaCierre,
      ':fc': fechaCierre,
      ':ua': Date.now(),
    }),
  }));
}

async function main() {
  console.log('Escaneando turnos activos en', TABLE);
  const activos = await scanActiveTurnos();
  if (!activos.length) {
    console.log('No hay turnos activos. Nada que hacer.');
    return;
  }

  console.log(`Encontrados ${activos.length} turno(s) activo(s):`);
  activos.forEach((t) => console.log(` - ${t.PK} / ${t.SK} → ${t.nombreUsuario || '(sin nombre)'}`));

  for (const turno of activos) {
    await closeTurno(turno);
    console.log(`✓ Cerrado: ${turno.PK} / ${turno.SK}`);
  }
  console.log('Listo. Todos los turnos activos fueron cerrados.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
