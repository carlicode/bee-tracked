/**
 * Factory de SessionStore: selecciona implementación según entorno.
 *
 * SESSION_STORE=memory   → desarrollo local (default)
 * SESSION_STORE=dynamodb → producción Lambda (requiere SESSIONS_TABLE_NAME)
 */

const { MemorySessionStore } = require('./MemorySessionStore');
const { DynamoDBSessionStore } = require('./DynamoDBSessionStore');

const STORE_TYPE = process.env.SESSION_STORE || 'memory';

function createSessionStore() {
  switch (STORE_TYPE.toLowerCase()) {
    case 'dynamodb':
      return new DynamoDBSessionStore();
    case 'memory':
    default:
      return new MemorySessionStore();
  }
}

const store = createSessionStore();

if (STORE_TYPE === 'dynamodb') {
  console.log(`📦 SessionStore: DynamoDB (${process.env.SESSIONS_TABLE_NAME || 'bee-tracked-sessions'})`);
} else {
  console.log('📦 SessionStore: Memory (desarrollo)');
}

module.exports = { store, createSessionStore, MemorySessionStore, DynamoDBSessionStore };
