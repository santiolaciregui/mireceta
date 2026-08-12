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
