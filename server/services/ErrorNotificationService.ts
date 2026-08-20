import nodemailer from 'nodemailer';
import { Request } from 'express';
import { config } from '../config/env.js';

export interface ErrorContext {
  error: Error | any;
  req?: Request;
  origin?: 'EXPRESS_MIDDLEWARE' | 'UNCAUGHT_EXCEPTION' | 'UNHANDLED_REJECTION';
}

export class ErrorNotificationService {
  private static instance: ErrorNotificationService;
  private recentAlerts: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): ErrorNotificationService {
    if (!ErrorNotificationService.instance) {
      ErrorNotificationService.instance = new ErrorNotificationService();
    }
    return ErrorNotificationService.instance;
  }

  /**
   * Sanitizes object to redact sensitive keys like passwords or tokens.
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    const sensitiveKeys = ['password', 'pass', 'token', 'authorization', 'secret', 'creditcard', 'cvv', 'jwt'];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
        sanitized[key] = '[REDACTADO]';
      } else if (value && typeof value === 'object') {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Computes a unique signature for the error to avoid email spamming.
   */
  private getErrorHash(error: any, req?: Request): string {
    const message = error?.message || String(error);
    const stackFirstLine = error?.stack ? error.stack.split('\n')[1] || '' : '';
    const path = req ? `${req.method}:${req.originalUrl || req.url}` : 'PROCESS';
    return `${path}::${message}::${stackFirstLine.trim()}`;
  }

  /**
   * Checks if an error with the same signature was reported recently (within throttle window).
   */
  private isThrottled(errorHash: string): boolean {
    const now = Date.now();
    const lastReported = this.recentAlerts.get(errorHash);
    const throttleMs = config.ERROR_ALERT_THROTTLE_MINUTES * 60 * 1000;

    if (lastReported && now - lastReported < throttleMs) {
      return true;
    }

    this.recentAlerts.set(errorHash, now);
    // Cleanup old entries (older than 1 hour) to avoid memory leaks
    if (this.recentAlerts.size > 200) {
      for (const [hash, time] of this.recentAlerts.entries()) {
        if (now - time > 60 * 60 * 1000) {
          this.recentAlerts.delete(hash);
        }
      }
    }

    return false;
  }

  /**
   * Generates HTML email content for the error alert.
   */
  private buildHtmlTemplate(context: ErrorContext): string {
    const { error, req, origin = 'EXPRESS_MIDDLEWARE' } = context;
    const errorMessage = error?.message || String(error || 'Error Desconocido');
    const stackTrace = error?.stack || 'No stack trace disponible.';
    const timestamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    const environment = process.env.NODE_ENV || 'production';

    const method = req?.method || 'N/A';
    const path = req?.originalUrl || req?.url || 'N/A';
    const clientIp = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Desconocida') : 'N/A';
    const user = (req as any)?.user ? JSON.stringify((req as any).user) : 'No autenticado / N/A';

    const queryParams = req?.query && Object.keys(req.query).length > 0
      ? JSON.stringify(this.sanitizeData(req.query), null, 2)
      : 'Ninguno';

    const requestBody = req?.body && Object.keys(req.body).length > 0
      ? JSON.stringify(this.sanitizeData(req.body), null, 2)
      : 'Ninguno';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta de Error en Producción</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 24px; color: #1f2937;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
    <tr>
      <td style="background-color: #dc2626; padding: 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em;">
          🚨 ALERTA DE ERROR EN PRODUCCIÓN
        </h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">
          Mi Receta Digital • Origen: ${origin}
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding: 24px;">
        <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #991b1b; border-bottom: 2px solid #fee2e2; padding-bottom: 8px;">
          Resumen del Error
        </h2>
        <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 14px; margin-bottom: 20px;">
          <tr>
            <td width="30%" style="font-weight: bold; color: #4b5563;">Mensaje:</td>
            <td style="color: #dc2626; font-weight: bold;">${errorMessage}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #4b5563;">Fecha/Hora:</td>
            <td>${timestamp} (ART)</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #4b5563;">Entorno:</td>
            <td><span style="background: #e5e7eb; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${environment}</span></td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #4b5563;">Endpoint / Ruta:</td>
            <td><strong style="color: #111827;">${method} ${path}</strong></td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #4b5563;">IP del Cliente:</td>
            <td>${clientIp}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #4b5563;">Usuario:</td>
            <td><span style="font-family: monospace; font-size: 12px;">${user}</span></td>
          </tr>
        </table>

        <h2 style="font-size: 16px; margin: 20px 0 12px 0; color: #1f2937; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">
          Detalles de la Petición HTTP
        </h2>
        <div style="margin-bottom: 12px;">
          <strong style="font-size: 13px; color: #4b5563;">Query Parameters:</strong>
          <pre style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 10px; border-radius: 6px; font-size: 12px; overflow-x: auto; font-family: monospace; margin-top: 4px;">${queryParams}</pre>
        </div>
        <div style="margin-bottom: 20px;">
          <strong style="font-size: 13px; color: #4b5563;">Request Body (Sanitizado):</strong>
          <pre style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 10px; border-radius: 6px; font-size: 12px; overflow-x: auto; font-family: monospace; margin-top: 4px;">${requestBody}</pre>
        </div>

        <h2 style="font-size: 16px; margin: 20px 0 12px 0; color: #1f2937; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">
          Stack Trace
        </h2>
        <pre style="background: #1e1e1e; color: #f8f8f2; padding: 16px; border-radius: 8px; font-size: 12px; line-height: 1.5; overflow-x: auto; font-family: 'Courier New', Courier, monospace;">${stackTrace}</pre>
      </td>
    </tr>

    <tr>
      <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280;">
        Notificación generada automáticamente por el Middleware de Monitoreo de Mi Receta Digital.
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Main entry point to send production error alert email.
   * Runs asynchronously without throwing to protect application runtime.
   */
  public async notifyProductionError(context: ErrorContext): Promise<void> {
    try {
      if (!config.ENABLE_ERROR_ALERTS) {
        return;
      }

      const recipient = config.ADMIN_EMAIL || 'santi.olaciregui13@gmail.com';

      const errorHash = this.getErrorHash(context.error, context.req);
      if (this.isThrottled(errorHash)) {
        console.log(`[ErrorNotificationService] Alerta omitida por tasa límite (throttled): ${errorHash}`);
        return;
      }

      let smtpHost = config.SMTP_HOST;
      let smtpPort = config.SMTP_PORT;
      let smtpSecure = config.SMTP_SECURE;
      let smtpUser = config.SMTP_USER;
      let smtpPass = config.SMTP_PASS;
      let senderEmail = config.SMTP_USER;

      // Check DB config if available for TEN-0001
      try {
        const { NotificationConfigRepository } = await import('../repositories/NotificationConfigRepository.js');
        const configRepo = new NotificationConfigRepository();
        const dbConfig = await configRepo.findByTenantAndChannel('TEN-0001', 'email');
        if (dbConfig && dbConfig.isEnabled && dbConfig.credentials) {
          const creds = dbConfig.credentials as Record<string, unknown>;
          if (creds.host && creds.user && creds.pass) {
            smtpHost = String(creds.host);
            smtpPort = Number(creds.port || 587);
            smtpSecure = Boolean(creds.secure ?? (smtpPort === 465));
            smtpUser = String(creds.user);
            smtpPass = String(creds.pass);
            senderEmail = String(creds.fromEmail || creds.user);
          }
        }
      } catch {
        // Fallback to env config if DB lookup fails
      }

      if (!smtpHost || !smtpUser || !smtpPass) {
        console.warn('[ErrorNotificationService] No hay configuración SMTP completa para enviar alertas.');
        return;
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const errorMessage = context.error?.message || String(context.error || 'Error Desconocido');
      const path = context.req ? `${context.req.method} ${context.req.originalUrl || context.req.url}` : 'Fallo Proceso Node';
      const subject = `🚨 [ERROR PROD] ${errorMessage.substring(0, 60)} (${path})`;

      const htmlBody = this.buildHtmlTemplate(context);

      const mailOptions = {
        from: `"Alertas Mi Receta" <${senderEmail}>`,
        to: recipient,
        subject,
        html: htmlBody,
        text: `ERROR EN PRODUCCIÓN: ${errorMessage}\nRuta: ${path}\n\nStack:\n${context.error?.stack || ''}`
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[ErrorNotificationService] Alerta de error enviada desde <${senderEmail}> hacia <${recipient}>. ID: ${info.messageId}`);
    } catch (err: any) {
      console.error('[ErrorNotificationService] Error al intentar enviar el correo de alerta de producción:', err?.message || err);
    }
  }

}

export const errorNotificationService = ErrorNotificationService.getInstance();
