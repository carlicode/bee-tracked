const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Routes
const authRouter = require('./src/routes/auth');
const turnosRouter = require('./src/routes/turnos');
const ecodeliveryRouter = require('./src/routes/ecodelivery');
const beezeroRouter = require('./src/routes/beezero');

app.use('/api/auth', authRouter);
app.use('/api/turnos', turnosRouter);
app.use('/api/ecodelivery', ecodeliveryRouter);
app.use('/api/beezero', beezeroRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// Root
app.get('/', (req, res) => {
  res.json({ message: 'BeeTracked API' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Export for Lambda
module.exports.handler = serverless(app);
