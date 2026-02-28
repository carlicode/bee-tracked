const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares: permitir frontend en desarrollo (5173, 3000, etc.)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];
if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, true); // en desarrollo aceptar cualquier origin
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Para las fotos en base64 (temporal)
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'bee-tracked API is running' });
});

// Routes
const turnosRouter = require('./routes/turnos');
const carrerasRouter = require('./routes/carreras');
const authRouter = require('./routes/auth');
const ecodeliveryRouter = require('./routes/ecodelivery');
const beezeroRouter = require('./routes/beezero');

app.use('/api/turnos', turnosRouter);
app.use('/api/carreras', carrerasRouter);
app.use('/api/auth', authRouter);
app.use('/api/ecodelivery', ecodeliveryRouter);
app.use('/api/beezero', beezeroRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

module.exports = app;
