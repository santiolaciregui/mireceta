import { AdapterRegistry } from './notification/adapters/AdapterRegistry.js';
import { NotificationChannel, SendNotificationResult, TestConnectionResult } from './notification/adapters/NotificationAdapter.js';
import { NotificationConfigRepository } from '../repositories/NotificationConfigRepository.js';
import { NotificationTemplateRepository } from '../repositories/NotificationTemplateRepository.js';
import { NotificationLogRepository } from '../repositories/NotificationLogRepository.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { PatientRepository } from '../repositories/PatientRepository.js';
import { auditLogService } from './AuditLogService.js';
import { generatePatientId, generateMessageId } from '../utils/idGenerator.js';

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
  private orderRepo: OrderRepository;
  private patientRepo: PatientRepository;

  constructor() {
    this.configRepo = new NotificationConfigRepository();
    this.templateRepo = new NotificationTemplateRepository();
    this.logRepo = new NotificationLogRepository();
    this.orderRepo = new OrderRepository();
    this.patientRepo = new PatientRepository();
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

    // Fetch channel config from database
    let configDoc = await this.configRepo.findByTenantAndChannel(tenantId, channel);
    let credentials = (configDoc?.credentials as Record<string, unknown>) || {};
    let isEnabled = configDoc ? configDoc.isEnabled : false;

    // Fallback to default tenant TEN-0001 if specific tenant is missing or not configured
    if (!configDoc && tenantId !== 'TEN-0001') {
      const defaultDoc = await this.configRepo.findByTenantAndChannel('TEN-0001', channel);
      if (defaultDoc) {
        configDoc = defaultDoc;
        credentials = (defaultDoc.credentials as Record<string, unknown>) || {};
        isEnabled = defaultDoc.isEnabled;
      }
    }

    // Auto-merge environment variables if credentials are empty or not configured
    if (channel === 'whatsapp') {
      if (!credentials.phoneNumberId && (process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID)) {
        credentials.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID;
      }
      if (!credentials.accessToken && (process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN)) {
        credentials.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
      }
      if (!credentials.defaultCountryCode && process.env.WHATSAPP_DEFAULT_COUNTRY_CODE) {
        credentials.defaultCountryCode = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE;
      }
      if (!credentials.webhookUrl && process.env.WHATSAPP_WEBHOOK_URL) {
        credentials.webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
      }
      if (credentials.phoneNumberId || credentials.accessToken || credentials.webhookUrl) {
        isEnabled = true;
      }
    }

    if (channel === 'email') {
      if (!credentials.host && process.env.SMTP_HOST) {
        credentials.host = process.env.SMTP_HOST;
        credentials.port = process.env.SMTP_PORT || 587;
        credentials.user = process.env.SMTP_USER || '';
        credentials.pass = process.env.SMTP_PASS || '';
        isEnabled = true;
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

  /**
   * Processes inbound webhook from Meta WhatsApp Cloud API and persists incoming messages
   * into both Patient and Order chat histories.
   */
  public async processInboundWhatsAppPayload(body: any): Promise<{ success: boolean; processedMessages: number }> {
    try {
      const entries = body?.entry || [];
      let count = 0;
      const nowIso = new Date().toISOString();

      for (const entry of entries) {
        const changes = entry?.changes || [];
        for (const change of changes) {
          const value = change?.value;
          const messages = value?.messages || [];
          const contacts = value?.contacts || [];

          for (const msg of messages) {
            const senderPhone = String(msg.from || '').trim();
            if (!senderPhone) continue;

            const contactName = contacts.find((c: any) => c.wa_id === senderPhone)?.profile?.name || 'Paciente WhatsApp';
            const textContent = msg.text?.body || (msg.type === 'image' ? '[Imagen recibida por WhatsApp]' : (msg.type === 'audio' || msg.type === 'voice' ? '[Nota de voz por WhatsApp]' : (msg.type === 'document' ? `[Documento: ${msg.document?.filename || 'PDF'}]` : '[Mensaje de WhatsApp]')));

            console.log(`[WhatsApp Webhook Inbound] Mensaje recibido de ${senderPhone} (${contactName}): "${textContent}"`);

            const newMessage: any = {
              id: msg.id || generateMessageId(),
              sender: 'paciente',
              senderName: contactName,
              senderRole: 'paciente',
              text: textContent,
              timestamp: nowIso,
              status: 'delivered'
            };

            // 1. Search existing patient by phone
            const matchingPatients = await this.patientRepo.findByPhone(senderPhone);
            let targetPatient = matchingPatients.length > 0 ? matchingPatients[0] : null;

            if (targetPatient) {
              const currentMessages = Array.isArray(targetPatient.messages) ? targetPatient.messages : [];
              targetPatient.messages = [...currentMessages, newMessage];
              targetPatient.lastPatientWhatsAppInteractionAt = nowIso;
              await targetPatient.save();
            } else {
              // Create new patient record so the conversation is never lost and is immediately visible in chat history
              const patientCount = (await this.patientRepo.findByTenant('TEN-0001')).length;
              const newPatientId = generatePatientId(patientCount);

              targetPatient = await this.patientRepo.create({
                id: newPatientId,
                dni: senderPhone,
                name: contactName,
                lastName: '',
                phone: senderPhone,
                tenantId: 'TEN-0001',
                status: 'Activo',
                messages: [newMessage],
                lastPatientWhatsAppInteractionAt: nowIso
              });
            }

            // 2. Also update any active orders for this patient
            const matchingOrders = await this.orderRepo.findByPatientPhone(senderPhone);
            for (const order of matchingOrders) {
              const existingMessages = Array.isArray(order.messages) ? order.messages : [];
              order.messages = [...existingMessages, newMessage];
              order.lastPatientWhatsAppInteractionAt = nowIso;
              await this.orderRepo.update(order.id, {
                messages: order.messages,
                lastPatientWhatsAppInteractionAt: order.lastPatientWhatsAppInteractionAt
              });
            }

            // 3. Register in Audit Log
            await auditLogService.log({
              tenantId: targetPatient?.tenantId || 'TEN-0001',
              action: 'WHATSAPP_INBOUND_MESSAGE',
              entity: 'Patient',
              entityId: targetPatient?.id || senderPhone,
              details: `Mensaje de WhatsApp recibido de ${contactName} (${senderPhone}): "${textContent.substring(0, 80)}"`
            });

            count++;
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
  }): Promise<SendNotificationResult> {
    const { tenantId, patientPhone, patientName, doctorName, orderId, messageText, interactionRecord } = params;
    if (!patientPhone) {
      return { success: false, error: 'Número de teléfono no disponible para este paciente.' };
    }

    try {
      const isWithin24h = this.isWithinWhatsApp24hWindow(interactionRecord);

      if (isWithin24h) {
        return await this.sendNotification({
          tenantId,
          channel: 'whatsapp',
          to: patientPhone,
          body: `[Consulta Dr. ${doctorName} - Receta #${orderId}]\n${messageText}`
        });
      }

      const waConfig = await this.getConfig(tenantId, 'whatsapp');
      const templateCode = (waConfig?.credentials?.doctorInquiryTemplateCode || waConfig?.credentials?.templateCode) as string | undefined;

      return await this.sendNotification({
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
    } catch (err: any) {
      console.error('Error al despachar notificación de consulta médica WhatsApp:', err);
      return { success: false, error: err.message || 'Error al despachar WhatsApp' };
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
  }): Promise<SendNotificationResult> {
    const { tenantId, patientPhone, patientName, orderId, recipeLink, interactionRecord } = params;
    if (!patientPhone) {
      return { success: false, error: 'Número de teléfono no disponible para este paciente.' };
    }

    try {
      const isWithin24h = this.isWithinWhatsApp24hWindow(interactionRecord);

      if (isWithin24h) {
        return await this.sendNotification({
          tenantId,
          channel: 'whatsapp',
          to: patientPhone,
          body: `¡Hola ${patientName}! Tu receta #${orderId} ha sido emitida exitosamente por el profesional médico.\n\nPuedes acceder y descargar tu receta en formato PDF directamente aquí:\n${recipeLink}`
        });
      }

      const waConfig = await this.getConfig(tenantId, 'whatsapp');
      const templateCode = (waConfig?.credentials?.issuedTemplateCode || waConfig?.credentials?.templateCode || 'receta_emitida') as string;

      return await this.sendNotification({
        tenantId,
        channel: 'whatsapp',
        to: patientPhone,
        templateCode: templateCode || undefined,
        variables: {
          patientName,
          orderId,
          recipeLink
        },
        body: `¡Hola ${patientName}! Tu receta #${orderId} ha sido emitida por el profesional médico. Podés acceder y descargar tu archivo PDF ingresando aquí: ${recipeLink}`
      });
    } catch (err: any) {
      console.error('Error enviando notificación de receta emitida:', err);
      return { success: false, error: err.message || 'Error al despachar WhatsApp' };
    }
  }

  /**
   * Dispatches Email notification when an order is issued/ready with PDF link.
   */
  public async sendRecipeIssuedEmail(params: {
    tenantId: string;
    patientEmail: string;
    patientName: string;
    orderId: string;
    recipeLink: string;
  }): Promise<SendNotificationResult> {
    const { tenantId, patientEmail, patientName, orderId, recipeLink } = params;
    if (!patientEmail) {
      return { success: false, error: 'Correo electrónico no disponible para este paciente.' };
    }

    try {
      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
    <tr>
      <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <div style="font-size: 28px; margin-bottom: 8px;">📋</div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.025em; color: #ffffff;">Tu Receta Digital está Lista</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; color: #e0e7ff;">Mi Receta Digital • Prescripción Médica Electrónica</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 24px;">
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Hola <strong style="color: #0f172a;">${patientName}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
          El profesional médico ha completado la auditoría clínica y emitido tu receta digital oficial correspondiente a la solicitud <strong>#${orderId}</strong>.
        </p>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0; text-align: center;">
          <tr>
            <td align="center">
              <a href="${recipeLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                Descargar Receta en PDF 📄
              </a>
            </td>
          </tr>
        </table>
        <div style="background-color: #f1f5f9; border-radius: 10px; padding: 14px; margin-top: 24px; font-size: 12px; color: #64748b; line-height: 1.5;">
          <strong>¿Problemas con el botón?</strong><br/>
          También podés acceder directamente copiando y pegando el siguiente enlace en tu navegador:<br/>
          <a href="${recipeLink}" style="color: #2563eb; word-break: break-all;">${recipeLink}</a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
        Este es un mensaje automático de notificación médica. Si tienes dudas, puedes consultar en el portal de pacientes.
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();

      return await this.sendNotification({
        tenantId,
        channel: 'email',
        to: patientEmail,
        subject: `Tu receta digital #${orderId} ha sido emitida`,
        body: htmlBody
      });
    } catch (err: any) {
      console.error('Error enviando notificación de receta emitida por Email:', err);
      return { success: false, error: err.message || 'Error al despachar Email' };
    }
  }

  /**
   * Dispatches WhatsApp notification when an order is rejected, notifying the patient that
   * the clinical audit did not approve it and that support will coordinate the full refund.
   */
  public async sendRecipeRejectedWhatsApp(params: {
    tenantId: string;
    patientPhone: string;
    patientName: string;
    orderId: string;
    reason?: string;
    refundAmount?: string;
    interactionRecord?: { lastPatientWhatsAppInteractionAt?: string };
  }): Promise<SendNotificationResult> {
    const { 
      tenantId, 
      patientPhone, 
      patientName, 
      orderId, 
      reason = 'Evaluación clínica del profesional médico', 
      interactionRecord 
    } = params;

    if (!patientPhone) {
      return { success: false, error: 'Número de teléfono no disponible para este paciente.' };
    }

    try {
      const isWithin24h = this.isWithinWhatsApp24hWindow(interactionRecord);

      if (isWithin24h) {
        return await this.sendNotification({
          tenantId,
          channel: 'whatsapp',
          to: patientPhone,
          body: `Hola ${patientName}, le informamos que su solicitud de receta #${orderId} no pudo ser aprobada tras la auditoría médica.\n\nMotivo clínico: ${reason}\n\nNuestro equipo se pondrá en contacto con usted a la brevedad para coordinar la devolución total del dinero abonado.`
        });
      }

      const waConfig = await this.getConfig(tenantId, 'whatsapp');
      const templateCode = (waConfig?.credentials?.rejectedTemplateCode || waConfig?.credentials?.templateCode || 'receta_rechazada') as string;

      return await this.sendNotification({
        tenantId,
        channel: 'whatsapp',
        to: patientPhone,
        templateCode: templateCode || undefined,
        variables: {
          patientName,
          orderId,
          reason
        },
        body: `Hola ${patientName}, su solicitud #${orderId} no pudo ser aprobada (${reason}). Nos pondremos en contacto para coordinar la devolución del dinero.`
      });
    } catch (err: any) {
      console.error('Error enviando notificación de receta rechazada:', err);
      return { success: false, error: err.message || 'Error al despachar WhatsApp' };
    }
  }
}

export const notificationService = new NotificationService();

