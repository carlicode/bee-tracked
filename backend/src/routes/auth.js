const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { registerSession, invalidateSession } = require('../services/sessionManager');

const CREDENTIALS_PATH =
  process.env.ECODELIVERY_CREDENTIALS_PATH ||
  path.join(__dirname, '../../..', 'data', 'ecodelivery-credentials.csv');

function loadEcodeliveryCredentials() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    return [];
  }
  const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
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
        if (c === '"') {
          inQuotes = false;
        } else {
          current += c;
        }
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
      rows.push({ biker: parts[0], user: parts[1], password: parts[2] });
    }
  }
  return rows;
}

/**
 * POST /api/auth/login
 * Body: { user, password }
 * Valida contra ecodelivery-credentials.csv (User + Password) o usuarios demo BeeZero.
 * Retorna sessionId para control de concurrencia.
 */
router.post('/login', (req, res) => {
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

    // Ecodelivery: validar contra CSV
    const credentials = loadEcodeliveryCredentials();
    const match = credentials.find(
      (r) => r.user === userTrim && r.password === passTrim
    );
    if (match) {
      const userId = match.user;
      const sessionId = registerSession(userId, { userType: 'ecodelivery', name: match.biker });
      
      return res.json({
        success: true,
        user: {
          email: `${match.user}@ecodelivery.com`,
          name: match.biker,
          driverName: match.biker,
          userType: 'ecodelivery',
        },
        sessionId,
      });
    }

    // BeeZero demo (patricia, etc.)
    const u = userTrim.toLowerCase();
    if (u === 'patricia') {
      const sessionId = registerSession('patricia', { userType: 'beezero', name: 'Patricia' });
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
      const sessionId = registerSession(u, { userType: 'beezero', name: 'Driver BeeZero' });
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
router.post('/logout', (req, res) => {
  try {
    const userId = req.body?.userId || req.user?.username;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId requerido',
      });
    }

    invalidateSession(userId);
    
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
 * POST /api/auth/cognito-login
 * Body: { idToken, username, name?, userType? }
 * Registra sesión para usuario de Cognito después de login exitoso en frontend.
 * userType: 'beezero' | 'operador' | 'ecodelivery' (viene del claim cognito:groups en el frontend).
 */
router.post('/cognito-login', (req, res) => {
  try {
    const { idToken, username, name, userType } = req.body || {};
    if (!idToken || !username) {
      return res.status(400).json({
        success: false,
        error: 'idToken y username requeridos',
      });
    }

    const allowedTypes = ['beezero', 'operador', 'ecodelivery'];
    const sessionUserType = userType && allowedTypes.includes(userType) ? userType : 'ecodelivery';

    // Registrar sesión (invalida sesiones anteriores del mismo usuario)
    const sessionId = registerSession(username, {
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
