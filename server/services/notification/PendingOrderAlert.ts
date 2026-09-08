/**
 * File: PendingOrderAlert.ts
 * Task: US-001 / T-001
 * Date: 2026-09-08
 * Decisions: Keep alert configuration normalization and state transitions pure and unit-testable.
 */

import { formatWhatsAppPhone } from '../../utils/formatters.js';

export const PENDING_ORDER_ALERT_TEMPLATE_CODE = 'limite_solicitudes';
export const PENDING_ORDER_ALERT_TEMPLATE_LANGUAGE = 'es_AR';

export interface PendingOrderAlertSettings {
  administrativePhoneNumbers: string[];
  pendingOrderLimit: number | null;
  pendingOrderAlertActive: boolean;
}

export type PendingOrderAlertTransition = 'trigger' | 'reset' | 'none';

export class PendingOrderAlertConfigError extends Error {
  public readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'PendingOrderAlertConfigError';
  }
}

function splitPhoneNumbers(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((phone) => String(phone).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(/[\n,;]+/).map((phone) => phone.trim()).filter(Boolean);
  }

  return [];
}

export function normalizePendingOrderAlertSettings(
  settings: Record<string, unknown> = {},
  defaultCountryCode: string = '54'
): PendingOrderAlertSettings {
  const rawPhones = splitPhoneNumbers(settings.administrativePhoneNumbers);
  const rawLimit = settings.pendingOrderLimit;
  const hasPhones = rawPhones.length > 0;
  const hasLimit = rawLimit !== undefined && rawLimit !== null && String(rawLimit).trim() !== '';

  if (!hasPhones && !hasLimit) {
    return {
      administrativePhoneNumbers: [],
      pendingOrderLimit: null,
      pendingOrderAlertActive: false
    };
  }

  if (!hasPhones || !hasLimit) {
    throw new PendingOrderAlertConfigError(
      'Los telefonos administrativos y el limite de solicitudes pendientes deben configurarse juntos.'
    );
  }

  const pendingOrderLimit = Number(rawLimit);
  if (!Number.isInteger(pendingOrderLimit) || pendingOrderLimit <= 0) {
    throw new PendingOrderAlertConfigError('El limite de solicitudes pendientes debe ser un numero entero mayor a cero.');
  }

  const normalizedPhones = rawPhones.map((phone) => {
    const rawDigits = phone.replace(/\D/g, '');
    const normalized = formatWhatsAppPhone(phone, defaultCountryCode);

    if (rawDigits.length < 8 || normalized.length > 15) {
      throw new PendingOrderAlertConfigError(`El numero administrativo \"${phone}\" no tiene un formato valido.`);
    }

    return normalized;
  });

  return {
    administrativePhoneNumbers: [...new Set(normalizedPhones)],
    pendingOrderLimit,
    pendingOrderAlertActive: Boolean(settings.pendingOrderAlertActive)
  };
}

export function getPendingOrderAlertTransition(
  pendingOrderCount: number,
  settings: PendingOrderAlertSettings
): PendingOrderAlertTransition {
  if (settings.pendingOrderLimit === null || settings.administrativePhoneNumbers.length === 0) {
    return 'none';
  }

  if (pendingOrderCount > settings.pendingOrderLimit) {
    return settings.pendingOrderAlertActive ? 'none' : 'trigger';
  }

  return settings.pendingOrderAlertActive ? 'reset' : 'none';
}
