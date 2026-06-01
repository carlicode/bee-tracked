/**
 * Logger estructurado JSON para CloudWatch / consola local.
 */

function formatLog(level, msg, meta = {}) {
  return JSON.stringify({
    level,
    msg,
    timestamp: new Date().toISOString(),
    ...meta,
  });
}

function info(msg, meta) {
  console.log(formatLog('info', msg, meta));
}

function warn(msg, meta) {
  console.warn(formatLog('warn', msg, meta));
}

function error(msg, meta) {
  console.error(formatLog('error', msg, meta));
}

/**
 * @param {import('express').Request} req
 * @returns {{ info: Function, warn: Function, error: Function }}
 */
function createRequestLogger(req) {
  const base = {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    userId: req.user?.username || req.user?.id || req.body?.userId || undefined,
  };

  return {
    info: (msg, meta = {}) => info(msg, { ...base, ...meta }),
    warn: (msg, meta = {}) => warn(msg, { ...base, ...meta }),
    error: (msg, meta = {}) => error(msg, { ...base, ...meta }),
  };
}

module.exports = {
  info,
  warn,
  error,
  createRequestLogger,
};
