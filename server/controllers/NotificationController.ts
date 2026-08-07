import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/NotificationService.js';
import { NotificationChannel } from '../services/notification/adapters/NotificationAdapter.js';

const notificationService = new NotificationService();

export class NotificationController {
  private getTenantId(req: Request): string {
    return (req.user as any)?.tenantId || 'TEN-0001';
  }

  async getConfigs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = this.getTenantId(req);
      const configs = await notificationService.getConfigs(tenantId);
      res.json(configs);
    } catch (err) {
      next(err);
    }
  }

  async saveConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = this.getTenantId(req);
      const channel = req.params.channel as NotificationChannel;
      const { isEnabled, credentials, settings } = req.body;

      if (!['email', 'whatsapp'].includes(channel)) {
        res.status(400).json({ error: 'Canal no válido. Debe ser email o whatsapp.' });
        return;
      }

      const result = await notificationService.saveConfig(tenantId, channel, Boolean(isEnabled), credentials || {}, settings);
      res.json({ success: true, message: `Configuración para ${channel.toUpperCase()} guardada exitosamente.`, data: result });
    } catch (err) {
      next(err);
    }
  }

  async testConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = this.getTenantId(req);
      const channel = req.params.channel as NotificationChannel;
      const { credentials } = req.body;

      if (!['email', 'whatsapp'].includes(channel)) {
        res.status(400).json({ error: 'Canal no válido. Debe ser email o whatsapp.' });
        return;
      }

      const result = await notificationService.testConnection(tenantId, channel, credentials);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = this.getTenantId(req);
      const templates = await notificationService.getTemplates(tenantId);
      res.json(templates);
    } catch (err) {
      next(err);
    }
  }

  async saveTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = this.getTenantId(req);
      const templateData = req.body;

      if (!templateData.code || !templateData.name || !templateData.body) {
        res.status(400).json({ error: 'El código, nombre y cuerpo de la plantilla son requeridos.' });
        return;
      }

      const saved = await notificationService.saveTemplate(tenantId, templateData);
      res.json({ success: true, template: saved });
    } catch (err) {
      next(err);
    }
  }

  async sendNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = this.getTenantId(req);
      const { channel, to, subject, body, templateCode, variables } = req.body;

      if (!channel || !to) {
        res.status(400).json({ error: 'El canal (email/whatsapp) y el destinatario (to) son requeridos.' });
        return;
      }

      const result = await notificationService.sendNotification({
        tenantId,
        channel,
        to,
        subject,
        body,
        templateCode,
        variables
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = this.getTenantId(req);
      const logs = await notificationService.getLogs(tenantId);
      res.json(logs);
    } catch (err) {
      next(err);
    }
  }

  async verifyWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      const expectedToken = process.env.WA_VERIFY_TOKEN || 'mireceta-wa-verify';

      if (mode === 'subscribe' && token === expectedToken) {
        res.status(200).send(challenge);
      } else {
        res.status(403).json({ error: 'Token de verificación inválido' });
      }
    } catch (err) {
      next(err);
    }
  }

  async handleInboundWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.processInboundWhatsAppPayload(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
