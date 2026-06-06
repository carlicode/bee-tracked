const { isSessionValid, getSession, touchSession } = require('../services/sessionManager');

/**
 * Valida sesión activa (X-Session-Id + X-User-Id).
 * Expone req.authUser = { userId, userType, name }.
 */
async function sessionAuth(req, res, next) {
  try {
    const userId =
      req.headers['x-user-id'] ||
      req.user?.username ||
      req.body?.userId ||
      req.query?.userId;

    const sessionId = req.headers['x-session-id'] || req.body?.sessionId;

    if (!userId || !sessionId) {
      return res.status(401).json({
        success: false,
        error: 'Autenticación requerida',
        code: 'AUTH_REQUIRED',
      });
    }

    const valid = await isSessionValid(String(userId), String(sessionId));
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: 'Tu sesión expiró. Inicia sesión de nuevo.',
        code: 'SESSION_EXPIRED',
      });
    }

    const session = await getSession(String(userId));
    req.authUser = {
      userId: String(userId),
      userType: session?.userType || 'ecodelivery',
      name: session?.name || String(userId),
    };

    await touchSession(String(userId));
    next();
  } catch (err) {
    next(err);
  }
}

function requireRrhh(req, res, next) {
  if (req.authUser?.userType !== 'rrhh' && req.authUser?.userType !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Solo RRHH o administradores pueden acceder a este recurso',
      code: 'FORBIDDEN',
    });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.authUser?.userType !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Solo administradores',
      code: 'FORBIDDEN',
    });
  }
  next();
}

function requireAdminOrOperador(req, res, next) {
  const t = req.authUser?.userType;
  if (t !== 'admin' && t !== 'rrhh' && t !== 'operador') {
    return res.status(403).json({
      success: false,
      error: 'Acceso no autorizado',
      code: 'FORBIDDEN',
    });
  }
  next();
}

module.exports = { sessionAuth, requireRrhh, requireAdmin, requireAdminOrOperador };
