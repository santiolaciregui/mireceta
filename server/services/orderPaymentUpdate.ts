/**
 * File: orderPaymentUpdate.ts
 * Task: US-004 / T-001
 * Date: 2026-09-16
 * Decisions: Payment corrections are normalized locally and never trigger provider operations.
 */

export const PAYMENT_INFORMATION_FIELDS = [
  'paymentMethod',
  'paymentAmount',
  'paymentStatus',
  'paymentId',
  'paymentDate',
] as const;

export type PaymentInformationField = (typeof PAYMENT_INFORMATION_FIELDS)[number];

export interface PaymentInformationUpdate {
  paymentMethod?: 'mp' | 'transfer' | 'cash_desk' | 'bonificado';
  paymentAmount?: string;
  paymentStatus?: 'approved' | 'pending' | 'rejected' | 'refunded' | 'exempt';
  paymentId?: string;
  paymentDate?: string;
}

const PAYMENT_METHODS = new Set(['mp', 'transfer', 'cash_desk', 'bonificado']);
const PAYMENT_STATUSES = new Set(['approved', 'pending', 'rejected', 'refunded', 'exempt']);

export function hasPaymentInformationUpdate(updateData: Record<string, unknown>): boolean {
  return PAYMENT_INFORMATION_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(updateData, field));
}

export function normalizePaymentInformationUpdate(
  updateData: Record<string, unknown>,
  currentPayment: PaymentInformationUpdate
): PaymentInformationUpdate {
  const normalized: PaymentInformationUpdate = {};

  if (Object.prototype.hasOwnProperty.call(updateData, 'paymentMethod')) {
    const paymentMethod = String(updateData.paymentMethod || '').trim();
    if (!PAYMENT_METHODS.has(paymentMethod)) {
      throw new Error('El método de pago informado no es válido.');
    }
    normalized.paymentMethod = paymentMethod as PaymentInformationUpdate['paymentMethod'];
  }

  if (Object.prototype.hasOwnProperty.call(updateData, 'paymentStatus')) {
    const paymentStatus = String(updateData.paymentStatus || '').trim();
    if (!PAYMENT_STATUSES.has(paymentStatus)) {
      throw new Error('El estado de pago informado no es válido.');
    }
    normalized.paymentStatus = paymentStatus as PaymentInformationUpdate['paymentStatus'];
  }

  if (Object.prototype.hasOwnProperty.call(updateData, 'paymentAmount')) {
    const rawAmount = String(updateData.paymentAmount ?? '').trim();
    const amount = Number(rawAmount);
    if (!rawAmount || !Number.isFinite(amount) || amount < 0) {
      throw new Error('El monto del pago debe ser un número mayor o igual a cero.');
    }
    normalized.paymentAmount = String(amount);
  }

  if (Object.prototype.hasOwnProperty.call(updateData, 'paymentId')) {
    normalized.paymentId = String(updateData.paymentId ?? '').trim();
  }

  if (Object.prototype.hasOwnProperty.call(updateData, 'paymentDate')) {
    const rawDate = String(updateData.paymentDate ?? '').trim();
    if (!rawDate) {
      normalized.paymentDate = '';
    } else {
      const parsedDate = new Date(rawDate);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error('La fecha de pago informada no es válida.');
      }
      normalized.paymentDate = parsedDate.toISOString();
    }
  }

  const resultingMethod = normalized.paymentMethod ?? currentPayment.paymentMethod;
  const resultingStatus = normalized.paymentStatus ?? currentPayment.paymentStatus;
  const resultingAmount = normalized.paymentAmount ?? currentPayment.paymentAmount;
  const isExempt = resultingMethod === 'bonificado' || resultingStatus === 'exempt' || Number(resultingAmount) === 0;

  if (isExempt) {
    normalized.paymentMethod = 'bonificado';
    normalized.paymentStatus = 'exempt';
    normalized.paymentAmount = '0';
  }

  return normalized;
}
