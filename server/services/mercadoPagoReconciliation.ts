/**
 * File: mercadoPagoReconciliation.ts
 * Task: US-009 / T-001
 * Date: 2026-09-17
 * Decisions: Mercado Pago is the source of truth; approved payments win over failed retries,
 * and terminal local states cannot be downgraded by stale provider events.
 */

export type LocalPaymentStatus = 'approved' | 'pending' | 'rejected' | 'refunded' | 'exempt';

export interface MercadoPagoPaymentLike {
  id?: string | number;
  status?: string;
  external_reference?: string | null;
  metadata?: { order_id?: string | null } | null;
  transaction_amount?: number | string | null;
  total_paid_amount?: number | string | null;
  date_created?: string | null;
  date_approved?: string | null;
  date_last_updated?: string | null;
}

export interface PaymentOrderSnapshot {
  id: string;
  paymentStatus: LocalPaymentStatus;
  paymentId?: string;
  paymentAmount?: string | number;
  paymentDate?: string;
  status: string;
}

export interface PaymentReconciliationDecision {
  shouldPersist: boolean;
  paymentStatus: LocalPaymentStatus;
  paymentId?: string;
  paymentDate?: string;
  orderStatus: string;
  providerStatus: string;
  paidAmount: number;
  reason: 'approved' | 'underpaid' | 'rejected' | 'pending' | 'refunded' | 'ignored' | 'unmatched';
}

function paymentTimestamp(payment: MercadoPagoPaymentLike): number {
  const rawDate = payment.date_approved || payment.date_last_updated || payment.date_created || '';
  const timestamp = Date.parse(rawDate);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function paymentAmount(payment: MercadoPagoPaymentLike): number {
  return Number(payment.transaction_amount ?? payment.total_paid_amount ?? 0) || 0;
}

function paymentReference(payment: MercadoPagoPaymentLike): string | null {
  const value = payment.external_reference ?? payment.metadata?.order_id;
  return value == null || value === '' ? null : String(value);
}

function statusPriority(payment: MercadoPagoPaymentLike, expectedAmount: number): number {
  const status = String(payment.status || '').toLowerCase();
  const amount = paymentAmount(payment);
  if (status === 'approved' && (expectedAmount <= 0 || amount >= expectedAmount)) return 0;
  if (status === 'approved') return 1;
  if (status === 'refunded' || status === 'charged_back') return 2;
  if (status === 'pending' || status === 'in_process' || status === 'in_mediation') return 3;
  if (status === 'rejected' || status === 'cancelled') return 4;
  return 5;
}

export function selectBestMercadoPagoPayment(
  payments: MercadoPagoPaymentLike[] | null | undefined,
  orderId: string,
  expectedAmount = 0,
  allowUnreferenced = false
): MercadoPagoPaymentLike | null {
  if (!Array.isArray(payments) || payments.length === 0) return null;

  const candidates = payments.filter((payment) => {
    const reference = paymentReference(payment);
    return reference === orderId || (allowUnreferenced && reference === null);
  });

  if (candidates.length === 0) return null;

  return [...candidates].sort((left, right) => {
    const priorityDifference = statusPriority(left, expectedAmount) - statusPriority(right, expectedAmount);
    if (priorityDifference !== 0) return priorityDifference;
    return paymentTimestamp(right) - paymentTimestamp(left);
  })[0];
}

function officialPaymentDate(payment: MercadoPagoPaymentLike, fallbackDate: string): string {
  const candidate = payment.date_approved || payment.date_last_updated || payment.date_created;
  if (!candidate) return fallbackDate;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? fallbackDate : date.toISOString();
}

export function buildMercadoPagoReconciliation(
  order: PaymentOrderSnapshot,
  payment: MercadoPagoPaymentLike,
  fallbackDate = new Date().toISOString()
): PaymentReconciliationDecision {
  const providerStatus = String(payment.status || '').toLowerCase();
  const paidAmount = paymentAmount(payment);
  const expectedAmount = Number(order.paymentAmount) || 0;
  const reference = paymentReference(payment);
  const officialId = payment.id == null ? order.paymentId : String(payment.id);
  const paymentDate = officialPaymentDate(payment, fallbackDate);
  const protectedStatus = order.paymentStatus === 'approved' || order.paymentStatus === 'refunded';

  const base = {
    paymentStatus: order.paymentStatus,
    paymentId: order.paymentId,
    paymentDate: order.paymentDate,
    orderStatus: order.status,
    providerStatus,
    paidAmount,
  };

  if (reference !== null && reference !== order.id) {
    return { ...base, shouldPersist: false, reason: 'unmatched' };
  }

  let nextPaymentStatus = order.paymentStatus;
  let nextOrderStatus = order.status;
  let reason: PaymentReconciliationDecision['reason'] = 'ignored';

  if (providerStatus === 'approved') {
    if (expectedAmount > 0 && paidAmount < expectedAmount) {
      if (!protectedStatus) nextPaymentStatus = 'rejected';
      reason = protectedStatus ? 'ignored' : 'underpaid';
    } else {
      nextPaymentStatus = 'approved';
      if (order.status === 'Pendiente' || order.status === 'Pendiente de Pago') {
        nextOrderStatus = 'En revisión';
      }
      reason = 'approved';
    }
  } else if (providerStatus === 'refunded' || providerStatus === 'charged_back') {
    nextPaymentStatus = 'refunded';
    nextOrderStatus = 'Rechazada';
    reason = 'refunded';
  } else if (providerStatus === 'rejected' || providerStatus === 'cancelled') {
    if (!protectedStatus) nextPaymentStatus = 'rejected';
    reason = protectedStatus ? 'ignored' : 'rejected';
  } else if (providerStatus === 'pending' || providerStatus === 'in_process' || providerStatus === 'in_mediation') {
    if (!protectedStatus) nextPaymentStatus = 'pending';
    reason = protectedStatus ? 'ignored' : 'pending';
  }

  if (reason === 'ignored') {
    return { ...base, shouldPersist: false, reason };
  }

  const shouldPersist =
    nextPaymentStatus !== order.paymentStatus ||
    nextOrderStatus !== order.status ||
    officialId !== order.paymentId;

  return {
    shouldPersist,
    paymentStatus: nextPaymentStatus,
    paymentId: officialId,
    paymentDate,
    orderStatus: nextOrderStatus,
    providerStatus,
    paidAmount,
    reason,
  };
}
