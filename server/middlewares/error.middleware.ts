import { Request, Response, NextFunction } from 'express';
import { errorNotificationService } from '../services/ErrorNotificationService.js';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.status || err.statusCode || 500;
  console.error(`[Error Middleware] [${req.method} ${req.originalUrl}] - Status ${statusCode}:`, err.stack || err.message || err);

  // Dispatch email notification asynchronously for internal server errors (5xx)
  if (statusCode >= 500) {
    errorNotificationService
      .notifyProductionError({
        error: err,
        req,
        origin: 'EXPRESS_MIDDLEWARE'
      })
      .catch((emailErr) => {
        console.error('[Error Middleware] Falló el envío asíncrono de notificación por email:', emailErr);
      });
  }

  res.status(statusCode).json({
    error: err.message || 'Error interno del servidor.'
  });
};

