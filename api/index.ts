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
  } catch (e) {
    console.error('DB connect warning:', e);
  }
  next();
});

// Mount API routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

export default app;
