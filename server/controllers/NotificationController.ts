import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/NotificationService.js';
import { NotificationChannel } from '../services/notification/adapters/NotificationAdapter.js';
import { getTenantId } from '../utils/httpHelpers.js';

export class NotificationController {
  getConfigs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = getTenantId(req);
      const configs = await notificationService.getConfigs(tenantId);
      res.json(configs);
    } catch (err) {
      next(err);
    }
  };

  saveConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = getTenantId(req);
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
  };

  testConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = getTenantId(req);
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
  };

  getTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = getTenantId(req);
      const templates = await notificationService.getTemplates(tenantId);
      res.json(templates);
    } catch (err) {
      next(err);
    }
  };

  saveTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = getTenantId(req);
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
  };

  sendNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = getTenantId(req);
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
  };

  getLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = getTenantId(req);
      const logs = await notificationService.getLogs(tenantId);
      res.json(logs);
    } catch (err) {
      next(err);
    }
  };

  verifyWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      const rawExpected = process.env.WA_VERIFY_TOKEN || 'mireceta-wa-verify';
      const expectedToken = String(rawExpected).replace(/['"]/g, '').trim();
      const receivedToken = token ? String(token).replace(/['"]/g, '').trim() : '';

      console.log('[WhatsApp Webhook Verification]', {
        mode,
        receivedTokenLength: receivedToken.length,
        expectedTokenLength: expectedToken.length,
        match: receivedToken === expectedToken
      });

      if (mode === 'subscribe' && receivedToken === expectedToken) {
        res.status(200).send(challenge);
      } else {
        res.status(403).json({ 
          error: 'Token de verificación inválido',
          details: {
            mode,
            match: receivedToken === expectedToken
          }
        });
      }
    } catch (err) {
      next(err);
    }
  };

  handleInboundWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await notificationService.processInboundWhatsAppPayload(req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
