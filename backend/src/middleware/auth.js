const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const COGNITO_REGION = process.env.COGNITO_REGION || 'us-east-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || '';

// Cliente JWKS para validar tokens de Cognito
let client = null;
if (COGNITO_USER_POOL_ID) {
  const jwksUrl = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
  client = jwksClient({ jwksUri: jwksUrl });
}

/**
 * Obtener la clave pública para validar el JWT
 */
function getKey(header, callback) {
  if (!client) {
    return callback(new Error('JWKS client not configured'));
  }
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

/**
 * Middleware para validar JWT de Cognito
 * Extrae el token del header Authorization: Bearer <token>
 * Si el token es válido, agrega req.user con la info del usuario
 * Si no hay token o no es válido, continúa sin req.user (las rutas deciden si requieren auth)
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  // Si es el token demo (modo dev sin backend), permitirlo
  if (token === 'demo-token') {
    return next();
  }

  // Validar JWT de Cognito
  if (!client || !COGNITO_USER_POOL_ID) {
    // Si no está configurado Cognito en el backend, aceptar el token sin validar (modo dev)
    console.warn('⚠️ Cognito no configurado en backend, aceptando token sin validar');
    return next();
  }

  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      console.error('❌ Token inválido:', err.message);
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado',
      });
    }

    // Validar que el token sea de nuestro User Pool
    if (decoded.iss !== `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`) {
      return res.status(401).json({
        success: false,
        error: 'Token no pertenece a este User Pool',
      });
    }

    // Token válido: agregar info del usuario al request
    req.user = {
      sub: decoded.sub,
      username: decoded['cognito:username'],
      email: decoded.email,
      name: decoded.name,
    };

    next();
  });
}

/**
 * Middleware para rutas que REQUIEREN autenticación
 */
function requireAuth(req, res, next) {
  optionalAuth(req, res, (err) => {
    if (err) return next(err);
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Autenticación requerida',
      });
    }
    next();
  });
}

module.exports = {
  optionalAuth,
  requireAuth,
};
