/**
 * Almacén de sesiones en memoria.
 * Uso: desarrollo local, single-instance.
 * No persiste entre reinicios ni entre instancias Lambda.
 */

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos

class MemorySessionStore {
  constructor(options = {}) {
    this.sessions = new Map();
    this.inactivityTimeout = options.inactivityTimeout ?? INACTIVITY_TIMEOUT_MS;
  }

  async set(userId, sessionData) {
    const sessionId = this._generateId();
    const now = Date.now();

    if (this.sessions.has(userId)) {
      const old = this.sessions.get(userId);
      console.log(`⚠️ Usuario ${userId} ya tenía sesión (${old.sessionId}). Invalidando.`);
    }

    this.sessions.set(userId, {
      sessionId,
      userId,
      createdAt: now,
      lastActivity: now,
      ...sessionData,
    });

    console.log(`✅ Sesión registrada (memory): ${userId} (${sessionId})`);
    return sessionId;
  }

  async get(userId) {
    return this.sessions.get(userId) ?? null;
  }

  async touch(userId) {
    const session = this.sessions.get(userId);
    if (!session) return false;
    session.lastActivity = Date.now();
    return true;
  }

  async delete(userId) {
    const deleted = this.sessions.delete(userId);
    if (deleted) console.log(`🔒 Sesión invalidada (memory): ${userId}`);
    return deleted;
  }

  async isValid(userId, sessionId) {
    const session = this.sessions.get(userId);
    if (!session) return false;

    if (session.sessionId !== sessionId) {
      console.log(`❌ SessionId no coincide para usuario ${userId}`);
      return false;
    }

    const inactiveMs = Date.now() - session.lastActivity;
    if (inactiveMs > this.inactivityTimeout) {
      console.log(`❌ Sesión expirada por inactividad: ${userId} (${Math.round(inactiveMs / 1000)}s)`);
      this.sessions.delete(userId);
      return false;
    }

    return true;
  }

  async cleanExpired() {
    const now = Date.now();
    let cleaned = 0;
    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.inactivityTimeout) {
        this.sessions.delete(userId);
        cleaned++;
      }
    }
    if (cleaned > 0) console.log(`🧹 ${cleaned} sesión(es) expirada(s) limpiada(s) (memory)`);
    return cleaned;
  }

  getStats() {
    return {
      type: 'memory',
      count: this.sessions.size,
      sessions: Array.from(this.sessions.values()).map((s) => ({
        userId: s.userId,
        createdAt: new Date(s.createdAt).toISOString(),
        lastActivity: new Date(s.lastActivity).toISOString(),
      })),
    };
  }

  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}

module.exports = { MemorySessionStore };
