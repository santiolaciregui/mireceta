import express from 'express';
import { connectDB } from '../server/config/db.js';
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

// Fast DB Connect Middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (e: any) {
    console.error('DB connect error:', e);
    return res.status(503).json({ error: 'Error de conexión con la base de datos MongoDB Atlas. Verifique la variable MONGODB_URI en Vercel y los permisos de IP en Network Access (0.0.0.0/0).' });
  }
});

// Mount API routes both on /api and / to handle Vercel rewrites gracefully
app.use('/api', routes);
app.use('/', routes);

// Global Error Handler
app.use(errorHandler);

export default app;
