/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { apiFetch, apiFetchJson } from './api';

export interface PaymentConfig {
  mpAccessToken: string;
  mpPublicKey: string;
  mpEnabled: boolean;
}

export interface MercadoPagoReturnPayload {
  orderId: string;
  payment?: string | null;
  collection_id?: string | null;
  payment_id?: string | null;
  preference_id?: string | null;
}

interface PaymentReturnSyncOptions {
  attempts?: number;
  delayMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (delayMs: number) => Promise<void>;
}

export async function syncMercadoPagoReturn(
  payload: MercadoPagoReturnPayload,
  options: PaymentReturnSyncOptions = {}
): Promise<any | null> {
  const attempts = Math.min(Math.max(options.attempts || 3, 1), 5);
  const delayMs = Math.max(options.delayMs ?? 1000, 0);
  const fetchImpl = options.fetchImpl || fetch;
  const sleep = options.sleep || ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  let lastResponse: any = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl('/api/payments/sync-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Payment synchronization failed with HTTP ${response.status}.`);
      }

      lastResponse = await response.json();
      if (!lastResponse?.verificationPending) return lastResponse;
    } catch (error) {
      console.warn(`[Payment Return Sync] Attempt ${attempt} failed:`, error);
    }

    if (attempt < attempts) await sleep(delayMs * attempt);
  }

  return lastResponse;
}

/**
 * Obtiene la configuración actual de la pasarela de pago (Mercado Pago).
 */
export async function fetchPaymentConfig(): Promise<PaymentConfig> {
  return apiFetchJson<PaymentConfig>('/api/tenants/payment-config');
}

/**
 * Guarda las credenciales de Mercado Pago del tenant.
 */
export async function savePaymentConfig(data: PaymentConfig): Promise<void> {
  await apiFetch('/api/tenants/payment-config', {
    method: 'PUT',
    body: JSON.stringify({
      mpAccessToken: data.mpAccessToken.trim(),
      mpPublicKey: data.mpPublicKey.trim(),
      mpEnabled: data.mpEnabled,
    }),
  });
}
