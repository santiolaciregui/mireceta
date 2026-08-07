import { AdapterRegistry } from './notification/adapters/AdapterRegistry.js';
import { NotificationChannel, SendNotificationResult, TestConnectionResult } from './notification/adapters/NotificationAdapter.js';
import { NotificationConfigRepository } from '../repositories/NotificationConfigRepository.js';
import { NotificationTemplateRepository } from '../repositories/NotificationTemplateRepository.js';
import { NotificationLogRepository } from '../repositories/NotificationLogRepository.js';
import { OrderRepository } from '../repositories/OrderRepository.js';

export interface SendDirectNotificationDto {
  tenantId: string;
  channel: NotificationChannel;
  to: string;
  subject?: string;
  body: string;
  templateCode?: string;
  variables?: Record<string, string | number | boolean>;
}

export class NotificationService {
  private configRepo: NotificationConfigRepository;
  private templateRepo: NotificationTemplateRepository;
  private logRepo: NotificationLogRepository;
  private registry: AdapterRegistry;

  constructor() {
    this.configRepo = new NotificationConfigRepository();
    this.templateRepo = new NotificationTemplateRepository();
    this.logRepo = new NotificationLogRepository();
    this.registry = AdapterRegistry.getInstance();
  }

  public interpolateVariables(template: string, variables: Record<string, string | number | boolean> = {}): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      if (Object.prototype.hasOwnProperty.call(variables, key) && variables[key] !== undefined && variables[key] !== null) {
        return String(variables[key]);
      }
      return match;
    });
  }

  public async sendNotification(dto: SendDirectNotificationDto): Promise<SendNotificationResult> {
    const { tenantId, channel, to, variables = {} } = dto;
    let { subject, body, templateCode } = dto;

    if (templateCode) {
      const template = await this.templateRepo.findByTenantAndCode(tenantId, templateCode);
      if (template && template.isActive) {
        if (!subject && template.subject) subject = template.subject;
        body = template.body;
      }
    }

    if (!body) {
      throw new Error('El cuerpo del mensaje no puede estar vacío.');
    }

    const finalSubject = subject ? this.interpolateVariables(subject, variables) : undefined;
    const finalBody = this.interpolateVariables(body, variables);

    let configDoc = await this.configRepo.findByTenantAndChannel(tenantId, channel);
    let credentials = configDoc?.credentials || {};
    let isEnabled = configDoc ? configDoc.isEnabled : false;

    if (!isEnabled) {
      if (channel === 'whatsapp' && (process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_WEBHOOK_URL)) {
        isEnabled = true;
        credentials = {
          phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID,
          accessToken: process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN,
          defaultCountryCode: process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '54',
          provider: process.env.WHATSAPP_PROVIDER || 'meta_cloud_api',
          webhookUrl: process.env.WHATSAPP_WEBHOOK_URL
        };
      } else {
        const defaultDoc = await this.configRepo.findByTenantAndChannel('TEN-0001', channel);
        if (defaultDoc && defaultDoc.isEnabled) {
          isEnabled = true;
          credentials = defaultDoc.credentials;
        }
      }
    }

    if (!isEnabled) {
      const errorMsg = `El canal ${channel.toUpperCase()} no está configurado o está deshabilitado para el tenant ${tenantId}.`;
      await this.logRepo.createLog({
        tenantId,
        recipient: to,
        channel,
        templateCode,
        subject: finalSubject,
        body: finalBody,
        status: 'failed',
        error: errorMsg,
        variablesUsed: variables
      });
      return { success: false, error: errorMsg };
    }

    const adapter = this.registry.getAdapter(channel);
    const result = await adapter.send(
      {
        to,
        subject: finalSubject,
        body: finalBody,
        templateCode,
        variables
      },
      credentials
    );

    await this.logRepo.createLog({
      tenantId,
      recipient: to,
      channel,
      templateCode,
      subject: finalSubject,
      body: finalBody,
      status: result.success ? 'sent' : 'failed',
      messageId: result.messageId,
      error: result.error,
      variablesUsed: variables
    });

    return result;
  }

  public async testConnection(
    tenantId: string,
    channel: NotificationChannel,
    credentialsOverride?: Record<string, unknown>
  ): Promise<TestConnectionResult> {
    let credentials = credentialsOverride;

    if (!credentials) {
      const configDoc = await this.configRepo.findByTenantAndChannel(tenantId, channel);
      if (!configDoc) {
        return {
          success: false,
          message: `No existe configuración guardada para el canal ${channel.toUpperCase()}`
        };
      }
      credentials = configDoc.credentials;
    }

    const adapter = this.registry.getAdapter(channel);
    return adapter.testConnection(credentials);
  }

  public async getConfigs(tenantId: string) {
    const configs = await this.configRepo.findAllByTenant(tenantId);
    return configs.map((c) => ({
      channel: c.channel,
      isEnabled: c.isEnabled,
      credentials: this.sanitizeCredentials(c.channel, c.credentials),
      settings: c.settings,
      updatedAt: c.updatedAt
    }));
  }

  public async getConfig(tenantId: string, channel: NotificationChannel) {
    return this.configRepo.findByTenantAndChannel(tenantId, channel);
  }

  private sanitizeCredentials(channel: NotificationChannel, creds: Record<string, unknown> = {}) {
    const sanitized = { ...creds };
    if (channel === 'email' && sanitized.pass) {
      sanitized.pass = '********';
    }
    if (channel === 'whatsapp' && sanitized.accessToken) {
      const tokenStr = String(sanitized.accessToken);
      sanitized.accessToken = tokenStr.length > 8 ? `${tokenStr.substring(0, 4)}...${tokenStr.substring(tokenStr.length - 4)}` : '********';
    }
    return sanitized;
  }

  public async saveConfig(
    tenantId: string,
    channel: NotificationChannel,
    isEnabled: boolean,
    credentials: Record<string, unknown>,
    settings?: Record<string, unknown>
  ) {
    const existing = await this.configRepo.findByTenantAndChannel(tenantId, channel);
    if (existing) {
      if (channel === 'email' && credentials.pass === '********') {
        credentials.pass = existing.credentials.pass;
      }
      if (channel === 'whatsapp' && String(credentials.accessToken).includes('...')) {
        credentials.accessToken = existing.credentials.accessToken;
      }
    }

    return this.configRepo.upsertConfig(tenantId, channel, isEnabled, credentials, settings);
  }

  public async ensureDefaultTemplates(tenantId: string) {
    const existing = await this.templateRepo.findAllByTenant(tenantId);
    if (existing.length === 0) {
      await this.templateRepo.upsertTemplate(tenantId, {
        code: 'RECIPE_READY',
        name: 'Receta Médica Lista',
        channel: 'all',
        subject: 'Tu Receta Médica #{{orderId}} está lista',
        body: 'Hola {{patientName}}, el Dr. {{doctorName}} ha emitido tu receta médica. Puedes descargarla o ver el estado en: {{recipeUrl}}',
        variables: ['patientName', 'doctorName', 'orderId', 'recipeUrl'],
        isActive: true
      });

      await this.templateRepo.upsertTemplate(tenantId, {
        code: 'ORDER_CREATED',
        name: 'Solicitud de Receta Recibida',
        channel: 'all',
        subject: 'Hemos recibido tu solicitud de receta #{{orderId}}',
        body: 'Hola {{patientName}}, confirmamos la recepción de tu pedido de receta. El equipo médico revisará tu solicitud a la brevedad.',
        variables: ['patientName', 'orderId'],
        isActive: true
      });
    }
  }

  public async getTemplates(tenantId: string) {
    await this.ensureDefaultTemplates(tenantId);
    return this.templateRepo.findAllByTenant(tenantId);
  }

  public async saveTemplate(tenantId: string, templateData: any) {
    return this.templateRepo.upsertTemplate(tenantId, templateData);
  }

  public async getLogs(tenantId: string, limit: number = 50) {
    return this.logRepo.findLogsByTenant(tenantId, limit);
  }

  public async processInboundWhatsAppPayload(body: any): Promise<{ success: boolean; processedMessages: number }> {
    try {
      const entries = body?.entry || [];
      let count = 0;
      const orderRepo = new OrderRepository();

      for (const entry of entries) {
        const changes = entry?.changes || [];
        for (const change of changes) {
          const value = change?.value;
          const messages = value?.messages || [];
          const contacts = value?.contacts || [];

          for (const msg of messages) {
            const senderPhone = msg.from;
            const contactName = contacts.find((c: any) => c.wa_id === senderPhone)?.profile?.name || 'Paciente WhatsApp';
            const textContent = msg.text?.body || (msg.type === 'image' ? '[Imagen recibida por WhatsApp]' : (msg.type === 'audio' ? '[Nota de voz por WhatsApp]' : '[Mensaje de WhatsApp]'));

            const matchingOrders = await orderRepo.findByPatientPhone(senderPhone);
            if (matchingOrders.length > 0) {
              const targetOrder: any = matchingOrders[0];
              const newMessage = {
                id: msg.id || `WA-${Date.now()}`,
                sender: 'paciente',
                senderName: contactName,
                text: textContent,
                timestamp: new Date().toISOString(),
                status: 'read'
              };

              const existingMessages = targetOrder.messages || [];
              targetOrder.messages = [...existingMessages, newMessage];
              targetOrder.lastPatientWhatsAppInteractionAt = new Date().toISOString();
              await orderRepo.update(targetOrder.id, {
                messages: targetOrder.messages,
                lastPatientWhatsAppInteractionAt: targetOrder.lastPatientWhatsAppInteractionAt
              });
              count++;
            }
          }
        }
      }

      return { success: true, processedMessages: count };
    } catch (err: any) {
      console.error('Error procesando webhook de WhatsApp:', err);
      return { success: false, processedMessages: 0 };
    }
  }

  public isWithinWhatsApp24hWindow(recordWithInteraction: { lastPatientWhatsAppInteractionAt?: string } | null | undefined): boolean {
    if (!recordWithInteraction || !recordWithInteraction.lastPatientWhatsAppInteractionAt) return false;
    const lastInteraction = new Date(recordWithInteraction.lastPatientWhatsAppInteractionAt).getTime();
    if (isNaN(lastInteraction)) return false;
    const hoursDifference = (Date.now() - lastInteraction) / (1000 * 60 * 60);
    return hoursDifference < 24;
  }

  /**
   * Dispatches WhatsApp notification to patient when a doctor/collaborator sends an inquiry or reply.
   */
  public async sendDoctorInquiryWhatsApp(params: {
    tenantId: string;
    patientPhone: string;
    patientName: string;
    doctorName: string;
    orderId: string;
    messageText: string;
    interactionRecord?: { lastPatientWhatsAppInteractionAt?: string };
  }): Promise<void> {
    const { tenantId, patientPhone, patientName, doctorName, orderId, messageText, interactionRecord } = params;
    if (!patientPhone) return;

    try {
      const isWithin24h = this.isWithinWhatsApp24hWindow(interactionRecord);

      if (isWithin24h) {
        await this.sendNotification({
          tenantId,
          channel: 'whatsapp',
          to: patientPhone,
          body: `[Consulta Dr. ${doctorName} - Receta #${orderId}]\n${messageText}`
        });
      } else {
        const waConfig = await this.getConfig(tenantId, 'whatsapp');
        const templateCode = (waConfig?.credentials?.doctorInquiryTemplateCode || waConfig?.credentials?.templateCode) as string | undefined;

        await this.sendNotification({
          tenantId,
          channel: 'whatsapp',
          to: patientPhone,
          templateCode: templateCode || undefined,
          variables: templateCode ? {
            patientName,
            doctorName,
            orderId,
            messagePreview: messageText.substring(0, 60)
          } : undefined,
          body: `Hola ${patientName}, el Dr. ${doctorName} envió una consulta sobre su receta #${orderId}: "${messageText.substring(0, 80)}...". Por favor responda a este WhatsApp para continuar la conversación directa.`
        });
      }
    } catch (err) {
      console.error('Error al despachar notificación de consulta médica WhatsApp:', err);
    }
  }

  /**
   * Dispatches WhatsApp notification when an order is issued/ready with PDF link.
   */
  public async sendRecipeIssuedWhatsApp(params: {
    tenantId: string;
    patientPhone: string;
    patientName: string;
    orderId: string;
    recipeLink: string;
    interactionRecord?: { lastPatientWhatsAppInteractionAt?: string };
  }): Promise<void> {
    const { tenantId, patientPhone, patientName, orderId, recipeLink, interactionRecord } = params;
    if (!patientPhone) return;

    try {
      const isWithin24h = this.isWithinWhatsApp24hWindow(interactionRecord);

      if (isWithin24h) {
        await this.sendNotification({
          tenantId,
          channel: 'whatsapp',
          to: patientPhone,
          body: `¡Hola ${patientName}! Tu receta #${orderId} ha sido emitida exitosamente por el profesional médico.\n\nPuedes acceder y descargar tu receta en formato PDF directamente aquí:\n${recipeLink}`
        });
      } else {
        const waConfig = await this.getConfig(tenantId, 'whatsapp');
        const templateCode = (waConfig?.credentials?.issuedTemplateCode || waConfig?.credentials?.templateCode) as string | undefined;

        await this.sendNotification({
          tenantId,
          channel: 'whatsapp',
          to: patientPhone,
          templateCode: templateCode || undefined,
          variables: templateCode ? {
            patientName,
            orderId,
            recipeLink
          } : undefined,
          body: `¡Hola ${patientName}! Tu receta #${orderId} ha sido emitida por el profesional médico. Podés acceder y descargar tu archivo PDF ingresando aquí: ${recipeLink}`
        });
      }
    } catch (err) {
      console.error('Error enviando notificación de receta emitida:', err);
    }
  }
}

export const notificationService = new NotificationService();
