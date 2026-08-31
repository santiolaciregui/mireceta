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
  templateLanguage?: string;
  apiVersion?: string;
  provider?: 'meta_cloud_api' | 'twilio' | 'custom_webhook';
  webhookUrl?: string;
}

export class WhatsAppAdapter implements NotificationAdapter {
  public readonly channel: NotificationChannel = 'whatsapp';

  private parseConfig(config: Record<string, unknown> = {}): WhatsAppConfig {
    const phoneNumberId = String(
      config.phoneNumberId ||
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      process.env.META_PHONE_NUMBER_ID ||
      '1214061508463019'
    ).trim();

    const accessToken = String(
      config.accessToken ||
      process.env.WHATSAPP_ACCESS_TOKEN ||
      process.env.META_ACCESS_TOKEN ||
      ''
    ).trim();

    const businessAccountId = config.businessAccountId
      ? String(config.businessAccountId)
      : process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

    const defaultCountryCode = config.defaultCountryCode
      ? String(config.defaultCountryCode)
      : (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '54');

    const doctorInquiryTemplateCode = config.doctorInquiryTemplateCode
      ? String(config.doctorInquiryTemplateCode)
      : (process.env.WHATSAPP_DOCTOR_TEMPLATE_CODE || 'primer_mensaje');

    const templateLanguage = config.templateLanguage
      ? String(config.templateLanguage)
      : (process.env.WHATSAPP_TEMPLATE_LANGUAGE || (doctorInquiryTemplateCode?.includes('jaspers') ? 'en_US' : 'es_AR'));

    const apiVersion = config.apiVersion
      ? String(config.apiVersion)
      : (process.env.WHATSAPP_API_VERSION || 'v21.0');

    const provider = (config.provider as WhatsAppConfig['provider']) ||
      (process.env.WHATSAPP_PROVIDER as any) ||
      'meta_cloud_api';

    const webhookUrl = config.webhookUrl
      ? String(config.webhookUrl)
      : process.env.WHATSAPP_WEBHOOK_URL;

    return {
      phoneNumberId,
      accessToken,
      businessAccountId,
      defaultCountryCode,
      doctorInquiryTemplateCode,
      templateLanguage,
      apiVersion,
      provider,
      webhookUrl
    };
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

      if (!recipientNumber) {
        return {
          success: false,
          error: 'Número de teléfono de destino inválido o vacío.'
        };
      }

      if (waConfig.provider === 'custom_webhook' && waConfig.webhookUrl) {
        return await this.sendViaWebhook(waConfig.webhookUrl, recipientNumber, payload);
      }

      if (!waConfig.phoneNumberId || !waConfig.accessToken) {
        const errorMsg = 'WhatsApp no configurado: Falta Access Token en la configuración o variables de entorno.';
        console.warn(`[WhatsAppAdapter] ${errorMsg}`);
        return {
          success: false,
          error: errorMsg
        };
      }

      // Meta Cloud API URL
      const apiVer = waConfig.apiVersion || 'v21.0';
      const url = `https://graph.facebook.com/${apiVer}/${waConfig.phoneNumberId}/messages`;
      const languageCode = waConfig.templateLanguage || (payload.templateCode?.includes('jaspers') ? 'en_US' : 'es_AR');
      const metaTemplateName = (payload.templateCode || '').toLowerCase().replace(/_whatsapp$/, '');

      const buildTemplatePayload = (lang: string, includeButton: boolean = true) => {
        const components: any[] = [];
        if (payload.variables && Object.keys(payload.variables).length > 0) {
          components.push({
            type: 'body',
            parameters: Object.values(payload.variables).map((val) => ({
              type: 'text',
              text: String(val)
            }))
          });

          // Meta Authentication templates with OTP code button (Copy Code button)
          const codeVal = payload.variables.code;
          const isAuthTemplate = metaTemplateName.includes('password') ||
                                 metaTemplateName.includes('auth') ||
                                 metaTemplateName.includes('reseteo') ||
                                 metaTemplateName.includes('otp');
          if (includeButton && codeVal && isAuthTemplate) {
            components.push({
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [
                {
                  type: 'text',
                  text: String(codeVal)
                }
              ]
            });
          }
        }

        return {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientNumber,
          type: 'template',
          template: {
            name: metaTemplateName,
            language: { code: lang },
            ...(components.length > 0 ? { components } : {})
          }
        };
      };

      const buildDirectTextPayload = () => ({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientNumber,
        type: 'text',
        text: { preview_url: false, body: payload.body }
      });

      let bodyPayload: any = payload.templateCode
        ? buildTemplatePayload(languageCode, true)
        : buildDirectTextPayload();

      console.log(`[WhatsAppAdapter] Despachando WhatsApp a ${recipientNumber} vía Meta Cloud API (${apiVer}, Template: ${metaTemplateName || 'Texto Directo'})...`);

      let response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waConfig.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
      });

      let responseData = await response.json();

      // If template send failed, try without button parameters first (body only)
      if (!response.ok && payload.templateCode && bodyPayload?.template?.components?.some((c: any) => c.type === 'button')) {
        console.warn(`[WhatsAppAdapter] Reintentando plantilla "${metaTemplateName}" sin parámetros de botón...`);
        bodyPayload = buildTemplatePayload(languageCode, false);
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${waConfig.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bodyPayload)
        });
        responseData = await response.json();
      }

      // If template send failed with translated language error (#132001), try fallback languages (es_AR, es, en_US)
      if (!response.ok && payload.templateCode) {
        const candidateLangs = languageCode === 'es_AR'
          ? ['es', 'en_US']
          : languageCode === 'es'
          ? ['es_AR', 'en_US']
          : ['es_AR', 'es'];

        for (const fallbackLang of candidateLangs) {
          console.warn(`[WhatsAppAdapter] Reintentando plantilla "${metaTemplateName}" con idioma "${fallbackLang}"...`);
          bodyPayload = buildTemplatePayload(fallbackLang, false);
          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${waConfig.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyPayload)
          });
          responseData = await response.json();
          if (response.ok) break;
        }
      }

      // If template send still failed, retry with direct text
      if (!response.ok && payload.templateCode && payload.body) {
        console.warn(`[WhatsAppAdapter] Plantilla "${metaTemplateName}" falló (${responseData?.error?.message}). Reintentando con texto directo...`);
        bodyPayload = buildDirectTextPayload();

        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${waConfig.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bodyPayload)
        });
        responseData = await response.json();
      }

      if (!response.ok) {
        const errorMsg = responseData?.error?.message || responseData?.error?.user_msg || 'Error devuelto por WhatsApp API';
        console.error(`[WhatsAppAdapter] Error enviando WhatsApp a ${recipientNumber}:`, errorMsg);
        return {
          success: false,
          error: errorMsg,
          details: responseData
        };
      }

      const messageId = responseData?.messages?.[0]?.id || 'WA-SENT';
      console.log(`[WhatsAppAdapter] Mensaje WhatsApp enviado exitosamente a ${recipientNumber} (ID: ${messageId})`);
      return {
        success: true,
        messageId,
        details: responseData
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al enviar WhatsApp';
      console.error('[WhatsAppAdapter] Excepción al enviar WhatsApp:', errorMessage);
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

      if (!waConfig.phoneNumberId || !waConfig.accessToken) {
        return {
          success: false,
          message: 'Falta Phone Number ID o Access Token.',
          error: 'Credenciales incompletas'
        };
      }

      const apiVer = waConfig.apiVersion || 'v21.0';
      const url = `https://graph.facebook.com/${apiVer}/${waConfig.phoneNumberId}`;
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
