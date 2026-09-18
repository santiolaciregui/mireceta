import express from 'express';
import { connectDB, getDBState } from '../server/config/db.js';
import routes from '../server/routes/index.js';
import { errorHandler } from '../server/middlewares/error.middleware.js';

const app = express();
app.use(express.json({ limit: '50mb' }));

// CORS & Preflight handler for Vercel
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Lightweight health endpoint that does not depend on a successful DB connection.
app.get(['/health', '/api/health'], (_req, res) => {
  const db = getDBState();
  res.status(db.readyState === 1 ? 200 : 503).json({
    status: db.readyState === 1 ? 'ok' : 'degraded',
    database: db.status,
  });
});

// Database connection middleware.
// Fail fast with a retryable 503 instead of leaving the request hanging on a long socket timeout.
app.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (e: any) {
    console.error('DB connect error:', {
      name: e?.name,
      message: e?.message,
      database: getDBState().status,
    });
    res.setHeader('Retry-After', '5');
    return res.status(503).json({
      error: 'La base de datos no está disponible temporalmente.',
      code: 'DATABASE_UNAVAILABLE',
      retryable: true,
    });
  }
});

// Mount API routes both on /api and / to handle Vercel rewrites gracefully
app.use('/api', routes);
app.use('/', routes);

// Global Error Handler
app.use(errorHandler);

export default app;
