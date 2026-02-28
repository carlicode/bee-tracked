/**
 * Servicio de control de sesiones activas
 * Previene múltiples sesiones simultáneas del mismo usuario
 * 
 * Producción: Usar DynamoDB o Redis
 * Desarrollo: Memoria local (se pierde al reiniciar el servidor)
 */

// Almacén de sesiones activas: Map<userId, sessionInfo>
const activeSessions = new Map();

// Expiración de sesión por inactividad (10 minutos en milisegundos)
const INACTIVITY_TIMEOUT = 10 * 60 * 1000;

/**
 * Registrar una nueva sesión
 * Si el usuario ya tiene una sesión activa, la invalida
 */
function registerSession(userId, sessionData = {}) {
  const sessionId = generateSessionId();
  const now = Date.now();

  // Si ya existe una sesión para este usuario, la marcamos como inválida
  if (activeSessions.has(userId)) {
    const oldSession = activeSessions.get(userId);
    console.log(`⚠️ Usuario ${userId} ya tenía sesión activa (${oldSession.sessionId}). Invalidando sesión anterior.`);
  }

  activeSessions.set(userId, {
    sessionId,
    userId,
    createdAt: now,
    lastActivity: now,
    ...sessionData,
  });

  console.log(`✅ Sesión registrada para usuario ${userId} (${sessionId})`);
  return sessionId;
}

/**
 * Actualizar última actividad de una sesión
 */
function touchSession(userId) {
  const session = activeSessions.get(userId);
  if (session) {
    session.lastActivity = Date.now();
    return true;
  }
  return false;
}

/**
 * Verificar si una sesión es válida
 * Retorna true si la sesión existe y no ha expirado
 */
function isSessionValid(userId, sessionId) {
  const session = activeSessions.get(userId);
  if (!session) return false;

  // Verificar que el sessionId coincida (previene sesiones antiguas)
  if (session.sessionId !== sessionId) {
    console.log(`❌ SessionId no coincide para usuario ${userId}`);
    return false;
  }

  // Verificar expiración por inactividad
  const now = Date.now();
  const inactiveDuration = now - session.lastActivity;
  if (inactiveDuration > INACTIVITY_TIMEOUT) {
    console.log(`❌ Sesión expirada por inactividad para usuario ${userId} (${Math.round(inactiveDuration / 1000)}s)`);
    activeSessions.delete(userId);
    return false;
  }

  return true;
}

/**
 * Invalidar sesión (logout)
 */
function invalidateSession(userId) {
  const deleted = activeSessions.delete(userId);
  if (deleted) {
    console.log(`🔒 Sesión invalidada para usuario ${userId}`);
  }
  return deleted;
}

/**
 * Obtener información de sesión
 */
function getSession(userId) {
  return activeSessions.get(userId);
}

/**
 * Limpiar sesiones expiradas (llamar periódicamente)
 */
function cleanExpiredSessions() {
  const now = Date.now();
  let cleaned = 0;

  for (const [userId, session] of activeSessions.entries()) {
    const inactiveDuration = now - session.lastActivity;
    if (inactiveDuration > INACTIVITY_TIMEOUT) {
      activeSessions.delete(userId);
      cleaned++;
      console.log(`🧹 Sesión expirada limpiada: ${userId}`);
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 ${cleaned} sesión(es) expirada(s) limpiada(s)`);
  }
}

/**
 * Generar ID único de sesión
 */
function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Obtener estadísticas de sesiones
 */
function getStats() {
  return {
    activeSessions: activeSessions.size,
    sessions: Array.from(activeSessions.values()).map(s => ({
      userId: s.userId,
      createdAt: new Date(s.createdAt).toISOString(),
      lastActivity: new Date(s.lastActivity).toISOString(),
      inactiveSeconds: Math.round((Date.now() - s.lastActivity) / 1000),
    })),
  };
}

// Limpiar sesiones expiradas cada 5 minutos
setInterval(cleanExpiredSessions, 5 * 60 * 1000);

module.exports = {
  registerSession,
  touchSession,
  isSessionValid,
  invalidateSession,
  getSession,
  getStats,
  INACTIVITY_TIMEOUT,
};
