/**
 * Servicio de control de sesiones activas.
 * Usa un SessionStore configurable (memory | dynamodb).
 *
 * Desarroll: SESSION_STORE=memory (default)
 * Producción: SESSION_STORE=dynamodb + SESSIONS_TABLE_NAME
 */

const { store } = require('./sessionStore');

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutos

async function registerSession(userId, sessionData = {}) {
  return store.set(userId, sessionData);
}

async function touchSession(userId) {
  return store.touch(userId);
}

async function isSessionValid(userId, sessionId) {
  return store.isValid(userId, sessionId);
}

async function invalidateSession(userId) {
  return store.delete(userId);
}

async function getSession(userId) {
  return store.get(userId);
}

function getStats() {
  return store.getStats();
}

// Limpiar sesiones expiradas (solo memory; DynamoDB usa TTL nativo)
async function cleanExpiredSessions() {
  return store.cleanExpired();
}

// Intervalo de limpieza solo para memory (evitar en Lambda)
if (process.env.SESSION_STORE !== 'dynamodb') {
  setInterval(() => cleanExpiredSessions().catch(console.error), 5 * 60 * 1000);
}

module.exports = {
  registerSession,
  touchSession,
  isSessionValid,
  invalidateSession,
  getSession,
  getStats,
  cleanExpiredSessions,
  INACTIVITY_TIMEOUT,
};
