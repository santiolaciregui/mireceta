/** US-013 / T-001, 2026-10-21. Store bounded diagnostics, never arbitrary client payloads. */
import { auditLogService } from './AuditLogService.js';

export const CLIENT_FLOW_EVENTS = new Set([
  'form_opened', 'form_reset', 'draft_storage_failed', 'checkout_started',
  'order_created', 'checkout_redirect', 'checkout_failed', 'payment_return',
  'return_sync_result', 'return_sync_failed', 'return_sync_attempt', 'page_restored', 'draft_cleared',
  'draft_loaded', 'draft_saved',
]);

const ID = /^[A-Za-z0-9_-]{1,100}$/;
const EVENTS = /^[a-z_]{1,60}$/;
export function diagnosticId(value: unknown): string | undefined {
  return typeof value === 'string' && ID.test(value) ? value : undefined;
}

export function sanitizeFlowContext(input: unknown): Record<string, unknown> {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const result: Record<string, unknown> = {};
  for (const key of ['sessionId', 'formId', 'clientRequestId', 'previousClientRequestId', 'previousOrderId', 'orderId']) {
    const value = diagnosticId(source[key]);
    if (value) result[key] = value;
  }
  for (const key of ['draftRestored', 'persisted', 'requestIdChanged', 'verifiedWithApi', 'bfcache']) {
    if (typeof source[key] === 'boolean') result[key] = source[key];
  }
  for (const [key, allowed] of Object.entries({
    navigation: ['navigate', 'reload', 'back_forward', 'unknown'],
    storageOperation: ['read', 'write', 'remove'],
    payment: ['approved', 'pending', 'rejected', 'failure', 'cancelled', 'unknown'],
    paymentStatus: ['approved', 'pending', 'rejected', 'refunded', 'exempt'],
    failureStage: ['create_order', 'load_order', 'create_preference', 'sync_return'],
    host: ['www', 'apex', 'other'],
    reason: ['payment_return', 'form_reset', 'submitted'],
    outcome: ['verified', 'pending', 'http_error', 'network_error'],
    draftOutcome: ['restored', 'missing', 'expired', 'invalid', 'read_failed'],
  })) {
    if (allowed.includes(source[key] as string)) result[key] = source[key];
  }
  if (typeof source.httpStatus === 'number' && Number.isInteger(source.httpStatus)
      && source.httpStatus >= 100 && source.httpStatus <= 599) result.httpStatus = source.httpStatus;
  if (Number.isInteger(source.attempt) && Number(source.attempt) >= 1 && Number(source.attempt) <= 5) result.attempt = source.attempt;
  if (typeof source.clientAt === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(source.clientAt)
      && Number.isFinite(Date.parse(source.clientAt))) result.clientAt = source.clientAt.slice(0, 30);
  return result;
}

export async function writeFlowAudit(
  tenantId: string | undefined, event: string, entityId?: string,
  evidence: Record<string, unknown> = {}, currentUser?: Record<string, any>,
) {
  if (!EVENTS.test(event)) return;
  try {
    await auditLogService.log({
      tenantId: tenantId || (currentUser ? undefined : 'SYSTEM-PAYMENTS'),
      currentUser, action: 'ORDER_FLOW_SERVER', entity: 'Order', entityId,
      details: `Order/payment flow: ${event}`,
      changes: { evidenceSource: 'server', event, ...evidence },
    });
  } catch {
    console.warn('[OrderFlowAudit] Could not persist diagnostic event.');
  }
}

// Deliberately exclude provider messages/causes: they can contain credentials or payer data.
export function providerErrorEvidence(error: any) {
  const status = Number(error?.status || error?.statusCode);
  return { ...(Number.isInteger(status) && status >= 100 && status <= 599 ? { httpStatus: status } : {}) };
}
