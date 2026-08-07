import {
  NotificationAdapter,
  NotificationChannel,
  SendNotificationPayload,
  SendNotificationResult,
  TestConnectionResult
} from './NotificationAdapter.js';

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

  private parseConfig(config: Record<string, unknown>): WhatsAppConfig {
    const phoneNumberId = String(config.phoneNumberId || '');
    const accessToken = String(config.accessToken || '');
    const businessAccountId = config.businessAccountId ? String(config.businessAccountId) : undefined;
    const defaultCountryCode = config.defaultCountryCode ? String(config.defaultCountryCode) : '54';
    const doctorInquiryTemplateCode = config.doctorInquiryTemplateCode ? String(config.doctorInquiryTemplateCode) : undefined;
    const provider = (config.provider as WhatsAppConfig['provider']) || 'meta_cloud_api';
    const webhookUrl = config.webhookUrl ? String(config.webhookUrl) : undefined;

    if (provider === 'meta_cloud_api' && (!phoneNumberId || !accessToken)) {
      throw new Error('Configuración de WhatsApp Incompleta: Phone Number ID y Access Token son requeridos.');
    }

    return { phoneNumberId, accessToken, businessAccountId, defaultCountryCode, doctorInquiryTemplateCode, provider, webhookUrl };
  }

  private formatPhoneNumber(phone: string, defaultCountryCode: string): string {
    let cleaned = phone.replace(/[^\d]/g, '');
    if (!cleaned.startsWith(defaultCountryCode) && cleaned.length <= 10) {
      cleaned = `${defaultCountryCode}${cleaned}`;
    }
    return cleaned;
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

      // Meta Cloud API Implementation
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

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waConfig.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
      });

      const responseData = await response.json();

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

      // Check Meta API status for phone number ID
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
