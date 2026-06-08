const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { registerSession, invalidateSession, isSessionValid } = require('../services/sessionManager');

const DATA_DIR = path.join(__dirname, '../..', 'data');
const CREDENTIALS_PATH =
  process.env.ECODELIVERY_CREDENTIALS_PATH ||
  path.join(DATA_DIR, 'ecodelivery-credentials.csv');
const USUARIOS_BEE_TRACKED_PATH = path.join(DATA_DIR, 'usuarios-bee-tracked.csv');

function parseCsvFile(filePath, hasRolColumn = false) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter((l) => l.length > 0);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = [];
    let inQuotes = false;
    let current = '';
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (inQuotes) {
        if (c === '"') inQuotes = false;
        else current += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') {
          parts.push(current.trim());
          current = '';
        } else current += c;
      }
    }
    parts.push(current.trim());
    if (parts.length >= 3) {
      const rol = hasRolColumn && parts.length >= 4 ? parts[3].trim() : 'Ecodelivery';
const userType =
        rol === 'Bee Zero'
          ? 'beezero'
          : rol === 'Operador'
            ? 'operador'
            : rol === 'Admin'
              ? 'admin'
              : rol === 'RRHH'
                ? 'rrhh'
                : 'ecodelivery';
      rows.push({ biker: parts[0], user: parts[1], password: parts[2], userType });
    }
  }
  return rows;
}

function loadEcodeliveryCredentials() {
  // usuarios-bee-tracked.csv tiene columna de rol → fuente principal
  const withRoles = parseCsvFile(USUARIOS_BEE_TRACKED_PATH, true);
  if (withRoles.length > 0) return withRoles;
  // fallback: ecodelivery-credentials.csv (sin columna de rol → todos ecodelivery)
  const primary = parseCsvFile(CREDENTIALS_PATH, false);
  return primary.map((r) => ({ ...r, userType: 'ecodelivery' }));
}

/**
 * POST /api/auth/login
 * Body: { user, password }
 * Valida contra ecodelivery-credentials.csv (User + Password) o usuarios demo BeeZero.
 * Retorna sessionId para control de concurrencia.
 */
router.post('/login', async (req, res) => {
  try {
    const { user, password } = req.body || {};
    if (!user || !password) {
      return res.status(400).json({
        success: false,
        error: 'Usuario y contraseña requeridos',
      });
    }

    const userTrim = String(user).trim();
    const passTrim = String(password).trim();

    // Validar contra CSV (ecodelivery-credentials o usuarios-bee-tracked como fallback)
    const credentials = loadEcodeliveryCredentials();
    const match = credentials.find(
      (r) => r.user.toLowerCase() === userTrim.toLowerCase() && r.password === passTrim
    );
    if (match) {
      const userId = match.user;
      const userType = match.userType || 'ecodelivery';
      const sessionId = await registerSession(userId, { userType, name: match.biker });
      
      return res.json({
        success: true,
        user: {
          email: `${match.user}@ecodelivery.com`,
          name: match.biker,
          driverName: match.biker,
          userType,
        },
        sessionId,
      });
    }

    // BeeZero demo (patricia, etc.)
    const u = userTrim.toLowerCase();
    if (u === 'patricia') {
      const sessionId = await registerSession('patricia', { userType: 'beezero', name: 'Patricia' });
      return res.json({
        success: true,
        user: {
          email: 'patricia@beezero.com',
          name: 'Patricia',
          driverName: 'Patricia',
          userType: 'beezero',
        },
        sessionId,
      });
    }
    if (u === 'beezero' || u === 'bee') {
      const sessionId = await registerSession(u, { userType: 'beezero', name: 'Driver BeeZero' });
      return res.json({
        success: true,
        user: {
          email: 'driver@beezero.com',
          name: 'Driver BeeZero',
          driverName: 'Driver BeeZero',
          userType: 'beezero',
        },
        sessionId,
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Usuario o contraseña incorrectos',
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({
      success: false,
      error: 'Error al validar credenciales',
    });
  }
});

/**
 * POST /api/auth/logout
 * Body: { userId } o extrae userId del token JWT
 * Invalida la sesión activa
 */
router.post('/logout', async (req, res) => {
  try {
    const userId = req.body?.userId || req.user?.username;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId requerido',
      });
    }

    await invalidateSession(userId);
    
    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente',
    });
  } catch (err) {
    console.error('Error en logout:', err);
    res.status(500).json({
      success: false,
      error: 'Error al cerrar sesión',
    });
  }
});

/**
 * GET /api/auth/session/check
 * Verifica si la sesión del usuario sigue activa (X-User-Id + X-Session-Id).
 */
router.get('/session/check', async (req, res) => {
  try {
    const userId =
      req.headers['x-user-id'] ||
      req.query.userId ||
      req.user?.username;
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;

    if (!userId || !sessionId) {
      return res.json({
        success: true,
        valid: false,
        code: 'AUTH_REQUIRED',
        error: 'Sesión inválida o expirada. Por favor inicia sesión nuevamente.',
      });
    }

    const valid = await isSessionValid(String(userId), String(sessionId));
    if (!valid) {
      return res.json({
        success: true,
        valid: false,
        code: 'SESSION_EXPIRED',
        error: 'Sesión inválida o expirada. Por favor inicia sesión nuevamente.',
      });
    }

    res.json({ success: true, valid: true });
  } catch (err) {
    console.error('Error en session/check:', err);
    res.status(500).json({
      success: false,
      valid: false,
      error: 'Error al verificar sesión',
    });
  }
});

/**
 * POST /api/auth/cognito-login
 * Body: { idToken, username, name?, userType? }
 * Registra sesión para usuario de Cognito después de login exitoso en frontend.
 * userType: 'beezero' | 'operador' | 'ecodelivery' (viene del claim cognito:groups en el frontend).
 */
router.post('/cognito-login', async (req, res) => {
  try {
    const { idToken, username, name, userType } = req.body || {};
    if (!idToken || !username) {
      return res.status(400).json({
        success: false,
        error: 'idToken y username requeridos',
      });
    }

    const allowedTypes = ['beezero', 'operador', 'ecodelivery', 'admin', 'rrhh'];
    const sessionUserType = userType && allowedTypes.includes(userType) ? userType : 'ecodelivery';

    // Registrar sesión (invalida sesiones anteriores del mismo usuario)
    const sessionId = await registerSession(username, {
      userType: sessionUserType,
      name: name || username,
      source: 'cognito',
    });
    
    res.json({
      success: true,
      sessionId,
      message: 'Sesión registrada exitosamente',
    });
  } catch (err) {
    console.error('Error en cognito-login:', err);
    res.status(500).json({
      success: false,
      error: 'Error al registrar sesión',
    });
  }
});

module.exports = router;
