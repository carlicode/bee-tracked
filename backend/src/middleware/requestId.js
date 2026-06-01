const crypto = require('crypto');

/**
 * Asigna requestId único por request (trazabilidad).
 */
function requestIdMiddleware(req, res, next) {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

module.exports = requestIdMiddleware;
