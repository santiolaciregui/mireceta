import express from 'express';
import { connectDB } from '../server/config/db.js';
import routes from '../server/routes/index.js';
import { errorHandler } from '../server/middlewares/error.middleware.js';

const app = express();
app.use(express.json({ limit: '50mb' }));

// Fast DB Connect Middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (e: any) {
    console.error('DB connect error:', e);
    res.status(503).json({ error: 'Error de conexión con la base de datos MongoDB Atlas. Verifique la variable MONGODB_URI en Vercel y los permisos de IP.' });
  }
});

// Mount API routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

export default app;
