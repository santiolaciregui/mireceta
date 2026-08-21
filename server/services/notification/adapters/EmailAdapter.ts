import nodemailer from 'nodemailer';
import {
  NotificationAdapter,
  NotificationChannel,
  SendNotificationPayload,
  SendNotificationResult,
  TestConnectionResult
} from './NotificationAdapter.js';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName?: string;
  fromEmail?: string;
}

export class EmailAdapter implements NotificationAdapter {
  public readonly channel: NotificationChannel = 'email';

  private buildTransporter(config: Record<string, unknown>): nodemailer.Transporter {
    const emailConfig = this.parseConfig(config);

    return nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  private parseConfig(config: Record<string, unknown>): EmailConfig {
    const host = String(config.host || '');
    const port = Number(config.port || 587);
    const secure = port === 465 ? true : (port === 587 ? false : Boolean(config.secure ?? false));
    const user = String(config.user || '');
    const pass = String(config.pass || '');
    const fromName = config.fromName ? String(config.fromName) : 'Mi Receta Digital';
    const fromEmail = config.fromEmail ? String(config.fromEmail) : user;

    if (!host || !user || !pass) {
      throw new Error('Configuración de Email incompleta: host, usuario y contraseña son requeridos.');
    }

    return { host, port, secure, user, pass, fromName, fromEmail };
  }

  public async send(
    payload: SendNotificationPayload,
    config: Record<string, unknown>
  ): Promise<SendNotificationResult> {
    try {
      const emailConfig = this.parseConfig(config);
      const transporter = this.buildTransporter(config);

      const sender = emailConfig.fromName
        ? `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`
        : emailConfig.fromEmail;

      const info = await transporter.sendMail({
        from: sender,
        to: payload.to,
        subject: payload.subject || 'Notificación de Mi Receta',
        html: payload.body,
        text: payload.body.replace(/<[^>]*>?/gm, '')
      });

      return {
        success: true,
        messageId: info.messageId,
        details: { response: info.response }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al enviar email';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  public async testConnection(config: Record<string, unknown>): Promise<TestConnectionResult> {
    try {
      const transporter = this.buildTransporter(config);
      await transporter.verify();
      return {
        success: true,
        message: 'Conexión SMTP verificada exitosamente.'
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Fallo en la verificación SMTP';
      return {
        success: false,
        message: 'No se pudo conectar con el servidor SMTP.',
        error: errorMessage
      };
    }
  }
}
