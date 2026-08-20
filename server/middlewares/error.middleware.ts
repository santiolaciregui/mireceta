import { Request, Response, NextFunction } from 'express';
import { errorNotificationService } from '../services/ErrorNotificationService.js';

/**
 * Middleware that monitors all outgoing HTTP responses and triggers email alert
 * for any non-success status code (statusCode >= 400), capturing controllers
 * that return error status codes directly without passing to next(err).
 */
export const responseErrorMonitor = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    if (res.statusCode >= 400 && !(res as any).__errorReported) {
      (res as any).__errorReported = true;
      const statusMsg = res.statusMessage || `HTTP ${res.statusCode}`;
      const err = new Error(`[Petición Fallida ${res.statusCode}] ${statusMsg} en ${req.method} ${req.originalUrl}`);

      errorNotificationService
        .notifyProductionError({
          error: err,
          req,
          origin: 'EXPRESS_MIDDLEWARE'
        })
        .catch((emailErr) => {
          console.error('[Response Monitor] Error enviando correo de alerta:', emailErr);
        });
    }
  });
  next();
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.status || err.statusCode || 500;
  console.error(`[Error Middleware] [${req.method} ${req.originalUrl}] - Status ${statusCode}:`, err.stack || err.message || err);

  // Mark as reported to prevent duplicate notification in responseErrorMonitor
  (res as any).__errorReported = true;

  // Dispatch email notification for any error code (>= 400)
  if (statusCode >= 400) {
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


