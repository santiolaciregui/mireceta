/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiFetch, apiFetchJson, getAuthHeaders } from './api';

export interface NotificationConfig {
  channel: 'email' | 'whatsapp';
  isEnabled: boolean;
  credentials: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export interface NotificationTemplate {
  _id?: string;
  code: string;
  name: string;
  channel: 'email' | 'whatsapp' | 'all';
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
}

export interface NotificationLog {
  _id: string;
  recipient: string;
  channel: 'email' | 'whatsapp';
  templateCode?: string;
  subject?: string;
  body: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  sentAt: string;
}

export interface EmailConfigData {
  isEnabled: boolean;
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export interface WhatsappConfigData {
  isEnabled: boolean;
  phoneNumberId: string;
  accessToken: string;
  defaultCountryCode: string;
  doctorInquiryTemplateCode: string;
}

export interface TestNotificationData {
  channel: 'email' | 'whatsapp';
  to: string;
  subject?: string;
  body: string;
  templateCode?: string;
  variables?: Record<string, string>;
}

/**
 * Carga configs, templates y logs desde la API de notificaciones.
 */
export async function fetchNotificationConfigs(): Promise<NotificationConfig[]> {
  return apiFetchJson<NotificationConfig[]>('/api/notifications/configs');
}

export async function fetchNotificationTemplates(): Promise<NotificationTemplate[]> {
  return apiFetchJson<NotificationTemplate[]>('/api/notifications/templates');
}

export async function fetchNotificationLogs(): Promise<NotificationLog[]> {
  return apiFetchJson<NotificationLog[]>('/api/notifications/logs');
}

/**
 * Guarda configuración SMTP de email.
 */
export async function saveEmailConfig(data: EmailConfigData): Promise<void> {
  await apiFetch('/api/notifications/configs/email', {
    method: 'PUT',
    body: JSON.stringify({
      isEnabled: data.isEnabled,
      credentials: {
        host: data.host,
        port: data.port,
        user: data.user,
        pass: data.pass,
        fromName: data.fromName,
        fromEmail: data.fromEmail,
      },
    }),
  });
}

/**
 * Guarda configuración de WhatsApp (Meta Business API).
 */
export async function saveWhatsappConfig(data: WhatsappConfigData): Promise<void> {
  await apiFetch('/api/notifications/configs/whatsapp', {
    method: 'PUT',
    body: JSON.stringify({
      isEnabled: data.isEnabled,
      credentials: {
        phoneNumberId: data.phoneNumberId,
        accessToken: data.accessToken,
        defaultCountryCode: data.defaultCountryCode,
        doctorInquiryTemplateCode: data.doctorInquiryTemplateCode,
      },
    }),
  });
}

/**
 * Prueba la conexión de un canal de notificación.
 */
export async function testNotificationConnection(
  channel: 'email' | 'whatsapp',
  credentials: Record<string, unknown>
): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch(`/api/notifications/configs/${channel}/test`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ credentials }),
  });
  return response.json();
}

/**
 * Crea o actualiza una plantilla de notificación.
 */
export async function saveNotificationTemplate(template: Partial<NotificationTemplate>): Promise<void> {
  await apiFetch('/api/notifications/templates', {
    method: 'POST',
    body: JSON.stringify(template),
  });
}

/**
 * Envía una notificación de prueba.
 */
export async function sendTestNotification(
  data: TestNotificationData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const response = await fetch('/api/notifications/send', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return response.json();
}
