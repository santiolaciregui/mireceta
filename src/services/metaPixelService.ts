/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const META_PIXEL_ID = '1022885407020346';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export interface PrescriptionOrderEventParams {
  orderId: string;
  value?: number | string;
  currency?: string;
  obraSocial?: string;
  deliveryMethod?: string;
}

export const ALLOWED_META_EVENTS = ['PageView', 'ViewContent'] as const;
export type AllowedMetaEvent = (typeof ALLOWED_META_EVENTS)[number];

/**
 * Safely dispatches a Meta Pixel standard event if allowed.
 */
export function trackMetaStandardEvent(
  eventName: string,
  parameters?: Record<string, unknown>
): void {
  if (!ALLOWED_META_EVENTS.includes(eventName as AllowedMetaEvent)) {
    console.info(`[Meta Pixel] Evento no permitido ignorado: "${eventName}"`);
    return;
  }

  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    try {
      if (parameters) {
        window.fbq('track', eventName, parameters);
      } else {
        window.fbq('track', eventName);
      }
    } catch (error) {
      console.warn(`[Meta Pixel] Error tracking standard event "${eventName}":`, error);
    }
  }
}

/**
 * Safely dispatches a Meta Pixel custom event if allowed.
 */
export function trackMetaCustomEvent(
  eventName: string,
  parameters?: Record<string, unknown>
): void {
  if (!ALLOWED_META_EVENTS.includes(eventName as AllowedMetaEvent)) {
    console.info(`[Meta Pixel] Evento personalizado no permitido ignorado: "${eventName}"`);
    return;
  }

  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    try {
      if (parameters) {
        window.fbq('trackCustom', eventName, parameters);
      } else {
        window.fbq('trackCustom', eventName);
      }
    } catch (error) {
      console.warn(`[Meta Pixel] Error tracking custom event "${eventName}":`, error);
    }
  }
}

/**
 * Event 1: Track Web Page View (Visitas a la Web)
 */
export function trackPageView(): void {
  trackMetaStandardEvent('PageView');
}

/**
 * Event: Track View Content
 */
export function trackViewContent(contentName?: string): void {
  trackMetaStandardEvent('ViewContent', contentName ? { content_name: contentName } : undefined);
}

/**
 * Event 2: Track Start Prescription Request (Ignorado hacia Meta por políticas de configuración)
 */
export function trackInitiatePrescription(
  source = 'website',
  estimatedValue = 10000,
  currency = 'ARS'
): void {
  // Nota: InitiateCheckout e InicioSolicitud no están en la lista blanca de eventos permitidos hacia Meta.
  trackMetaStandardEvent('InitiateCheckout', {
    content_name: 'Inicio de Solicitud',
    content_category: 'Servicio',
    currency,
    value: estimatedValue,
    source,
  });

  trackMetaCustomEvent('InicioSolicitud', {
    source,
    value: estimatedValue,
    currency,
  });
}

/**
 * Event 3: Track Complete Prescription Request (Ignorado hacia Meta por políticas de configuración)
 */
export function trackCompletePrescription(params: PrescriptionOrderEventParams): void {
  const numericValue = typeof params.value === 'string'
    ? parseFloat(params.value.replace(/[^0-9.]/g, '')) || 10000
    : (params.value ?? 10000);

  const currency = params.currency || 'ARS';

  // Nota: Purchase, CompleteRegistration, FormEnviado y SolicitudCompletada no están en la lista blanca de Meta.
  trackMetaStandardEvent('Purchase', {
    content_name: 'Servicio Digital',
    content_category: 'Servicio',
    content_type: 'product',
    order_id: params.orderId,
    value: numericValue,
    currency,
    obra_social: params.obraSocial || 'Particular',
    delivery_method: params.deliveryMethod || 'email',
  });

  trackMetaStandardEvent('CompleteRegistration', {
    content_name: 'Registro de Solicitud',
    order_id: params.orderId,
    value: numericValue,
    currency,
  });

  trackMetaCustomEvent('FormEnviado', {
    order_id: params.orderId,
    value: numericValue,
    currency,
  });

  trackMetaCustomEvent('SolicitudCompletada', {
    order_id: params.orderId,
    value: numericValue,
    currency,
    obra_social: params.obraSocial || 'Particular',
  });
}

