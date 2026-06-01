const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');

require('./src/config');
const requestIdMiddleware = require('./src/middleware/requestId');
const logger = require('./src/utils/logger');

const app = express();

app.use(cors({
  origin: true,
  credentials: false,
}));
app.use(express.json({ limit: '10mb' }));
app.use(requestIdMiddleware);

const authRouter = require('./src/routes/auth');
const turnosRouter = require('./src/routes/turnos');
const ecodeliveryRouter = require('./src/routes/ecodelivery');
const beezeroRouter = require('./src/routes/beezero');
const adminRouter = require('./src/routes/admin');
const adminAnunciosRouter = require('./src/routes/adminAnuncios');
const andiRouter = require('./src/routes/andi');
const announcementsRouter = require('./src/routes/announcements');

app.use('/api/auth', authRouter);
app.use('/api/turnos', turnosRouter);
app.use('/api/ecodelivery', ecodeliveryRouter);
app.use('/api/beezero', beezeroRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/anuncios', adminAnunciosRouter);
app.use('/api/andi', andiRouter);
app.use('/api/announcements', announcementsRouter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running', requestId: req.requestId });
});

app.get('/', (req, res) => {
  res.json({ message: 'BeeTracked API', requestId: req.requestId });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    error: err.message,
  });
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    requestId: req.requestId,
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', requestId: req.requestId });
});

// Wrapper: API Gateway puede incluir el stage en el path (ej. /prod/api/...)
// Strip stage para que Express reciba /api/...
const slsHandler = serverless(app);
module.exports.handler = async (event, context) => {
  const stage = event?.requestContext?.stage;
  if (stage) {
    if (event.path?.startsWith(`/${stage}/`)) {
      event.path = event.path.slice(stage.length + 1) || '/';
    }
    if (event.version === '2.0' && event.rawPath?.startsWith(`/${stage}/`)) {
      event.rawPath = event.rawPath.slice(stage.length + 1) || '/';
    }
  }
  return slsHandler(event, context);
};
