/**
 * Script para crear un anuncio directamente en DynamoDB.
 * Uso: node backend/scripts/create-announcement.js
 */
'use strict';

const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const crypto = require('crypto');

const dynamo = new DynamoDBClient({ region: 'us-east-1' });
const TABLE = 'bee-tracked-anuncios-prod';

const ANNOUNCEMENT = {
  title: '📱 Cómo usar la app correctamente',
  message:
    'Por ahora la app tiene dos funciones: ABRIR TURNO al comenzar y CERRAR TURNO al terminar. ' +
    'Nada más. Cuando termines de usar la app, toca "Salir" (arriba a la derecha) para cerrarla correctamente. ' +
    '¡Gracias por seguir estos pasos! 🐝',
  audience: 'all',
  priority: 'important',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
};

async function main() {
  const announcementId = crypto.randomUUID();
  const createdAt = Date.now();

  const item = {
    PK: `ANUNCIO#${announcementId}`,
    SK: createdAt,
    announcementId,
    title: ANNOUNCEMENT.title,
    message: ANNOUNCEMENT.message,
    audience: ANNOUNCEMENT.audience,
    priority: ANNOUNCEMENT.priority,
    startDate: ANNOUNCEMENT.startDate,
    status: 'active',
    createdBy: 'admin',
    createdByName: 'Carla',
    createdAt,
  };

  await dynamo.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall(item, { removeUndefinedValues: true }),
  }));

  console.log(`✓ Anuncio creado: ${announcementId}`);
  console.log(`  Título: ${ANNOUNCEMENT.title}`);
  console.log(`  Audiencia: ${ANNOUNCEMENT.audience} | Prioridad: ${ANNOUNCEMENT.priority}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
