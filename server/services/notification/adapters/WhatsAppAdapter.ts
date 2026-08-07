import {
  NotificationAdapter,
  NotificationChannel,
  SendNotificationPayload,
  SendNotificationResult,
  TestConnectionResult
} from './NotificationAdapter.js';
import { formatWhatsAppPhone } from '../../../utils/formatters.js';

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId?: string;
  defaultCountryCode?: string;
  doctorInquiryTemplateCode?: string;
  provider?: 'meta_cloud_api' | 'twilio' | 'custom_webhook';
  webhookUrl?: string;
}

export class WhatsAppAdapter implements NotificationAdapter {
  public readonly channel: NotificationChannel = 'whatsapp';

  private parseConfig(config: Record<string, unknown> = {}): WhatsAppConfig {
    const phoneNumberId = String(config.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID || '');
    const accessToken = String(config.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '');
    const businessAccountId = config.businessAccountId ? String(config.businessAccountId) : process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    const defaultCountryCode = config.defaultCountryCode ? String(config.defaultCountryCode) : (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '54');
    const doctorInquiryTemplateCode = config.doctorInquiryTemplateCode ? String(config.doctorInquiryTemplateCode) : process.env.WHATSAPP_DOCTOR_TEMPLATE_CODE;
    const provider = (config.provider as WhatsAppConfig['provider']) || (process.env.WHATSAPP_PROVIDER as any) || 'meta_cloud_api';
    const webhookUrl = config.webhookUrl ? String(config.webhookUrl) : process.env.WHATSAPP_WEBHOOK_URL;

    if (provider === 'meta_cloud_api' && (!phoneNumberId || !accessToken)) {
      throw new Error('Configuración de WhatsApp Incompleta: Phone Number ID y Access Token son requeridos.');
    }

    return { phoneNumberId, accessToken, businessAccountId, defaultCountryCode, doctorInquiryTemplateCode, provider, webhookUrl };
  }

  public formatPhoneNumber(phone: string, defaultCountryCode: string = '54'): string {
    return formatWhatsAppPhone(phone, defaultCountryCode);
  }

  public async send(
    payload: SendNotificationPayload,
    config: Record<string, unknown>
  ): Promise<SendNotificationResult> {
    try {
      const waConfig = this.parseConfig(config);
      const recipientNumber = this.formatPhoneNumber(payload.to, waConfig.defaultCountryCode || '54');

      if (waConfig.provider === 'custom_webhook' && waConfig.webhookUrl) {
        return await this.sendViaWebhook(waConfig.webhookUrl, recipientNumber, payload);
      }

      // Meta Cloud API
      const url = `https://graph.facebook.com/v18.0/${waConfig.phoneNumberId}/messages`;
      
      const bodyPayload = payload.templateCode
        ? {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipientNumber,
            type: 'template',
            template: {
              name: payload.templateCode,
              language: { code: 'es' },
              components: payload.variables
                ? [
                    {
                      type: 'body',
                      parameters: Object.values(payload.variables).map((val) => ({
                        type: 'text',
                        text: String(val)
                      }))
                    }
                  ]
                : []
            }
          }
        : {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipientNumber,
            type: 'text',
            text: { preview_url: false, body: payload.body }
          };

      let response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waConfig.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
      });

      let responseData = await response.json();

      // If template send failed, fallback immediately to direct text
      if (!response.ok && payload.templateCode && payload.body) {
        console.warn(`[WhatsAppAdapter] Plantilla "${payload.templateCode}" falló (${responseData?.error?.message}). Reintentando con texto directo...`);
        const fallbackPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientNumber,
          type: 'text',
          text: { preview_url: false, body: payload.body }
        };

        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${waConfig.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(fallbackPayload)
        });
        responseData = await response.json();
      }

      if (!response.ok) {
        const errorMsg = responseData?.error?.message || responseData?.error?.user_msg || 'Error devuelto por WhatsApp API';
        return {
          success: false,
          error: errorMsg,
          details: responseData
        };
      }

      const messageId = responseData?.messages?.[0]?.id || 'WA-SENT';
      return {
        success: true,
        messageId,
        details: responseData
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al enviar WhatsApp';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private async sendViaWebhook(
    webhookUrl: string,
    to: string,
    payload: SendNotificationPayload
  ): Promise<SendNotificationResult> {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, body: payload.body, variables: payload.variables })
    });
    const data = await response.json();
    return {
      success: response.ok,
      messageId: data?.id || 'HOOK-SENT',
      error: response.ok ? undefined : data?.message || 'Error webhook'
    };
  }

  public async testConnection(config: Record<string, unknown>): Promise<TestConnectionResult> {
    try {
      const waConfig = this.parseConfig(config);

      if (waConfig.provider === 'custom_webhook' && waConfig.webhookUrl) {
        return { success: true, message: 'URL de Webhook configurada correctamente.' };
      }

      const url = `https://graph.facebook.com/v18.0/${waConfig.phoneNumberId}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${waConfig.accessToken}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: 'Error de verificación de WhatsApp API',
          error: data?.error?.message || 'Token o Phone Number ID inválido.'
        };
      }

      return {
        success: true,
        message: `Conexión exitosa con Meta WhatsApp API (${data.display_phone_number || data.id})`
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Fallo en la prueba de WhatsApp API';
      return {
        success: false,
        message: 'No se pudo validar las credenciales de WhatsApp.',
        error: errorMessage
      };
    }
  }
}
