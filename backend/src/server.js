const express = require('express');
const cors = require('cors');

// Valida env vars al arrancar
const config = require('./config');
const requestIdMiddleware = require('./middleware/requestId');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];
if (config.app.frontendUrl && !allowedOrigins.includes(config.app.frontendUrl)) {
  allowedOrigins.push(config.app.frontendUrl);
}

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestIdMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'bee-tracked API is running', requestId: req.requestId });
});

const turnosRouter = require('./routes/turnos');
const carrerasRouter = require('./routes/carreras');
const authRouter = require('./routes/auth');
const ecodeliveryRouter = require('./routes/ecodelivery');
const beezeroRouter = require('./routes/beezero');
const adminRouter = require('./routes/admin');
const adminAnunciosRouter = require('./routes/adminAnuncios');
const andiRouter = require('./routes/andi');
const announcementsRouter = require('./routes/announcements');
const pushRouter = require('./routes/push');
const permisosRouter = require('./routes/permisos');
const uploadRouter = require('./routes/upload');
const adminUsersRouter = require('./routes/adminUsers');
const { sessionAuth, requireAdmin } = require('./middleware/sessionAuth');

app.use('/api/turnos', turnosRouter);
app.use('/api/carreras', carrerasRouter);
app.use('/api/auth', authRouter);
app.use('/api/ecodelivery', ecodeliveryRouter);
app.use('/api/beezero', beezeroRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/usuarios', sessionAuth, requireAdmin, adminUsersRouter);
app.use('/api/admin/anuncios', adminAnunciosRouter);
app.use('/api/andi', andiRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/push', pushRouter);
app.use('/api/permisos', permisosRouter);
app.use('/api/upload', uploadRouter);

app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    error: err.message,
    stack: config.app.nodeEnv === 'development' ? err.stack : undefined,
  });

  res.status(err.status || err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    code: err.code,
    requestId: req.requestId,
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    requestId: req.requestId,
  });
});

app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    nodeEnv: config.app.nodeEnv,
    frontendUrl: config.app.frontendUrl,
  });
});

module.exports = app;
