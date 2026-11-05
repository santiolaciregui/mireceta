/** Diagnostic probes, 2026-10-27. These reproduce defects in the existing code.
 * All repositories, provider operations and audit writes are mocked. No database,
 * real checkout, payment, refund or notification is accessed. This is NOT a
 * passing acceptance suite for the proposed corrections.
 * Run from the repository root: node --import tsx docs/payment-checkout-audit/reproduce.mts
 */
import assert from 'node:assert/strict';
import { Payment, MerchantOrder, Preference } from 'mercadopago';
import { PaymentService } from '../../server/services/PaymentService.js';
import { PaymentController } from '../../server/controllers/PaymentController.js';
import { OrderRepository } from '../../server/repositories/OrderRepository.js';
import { auditLogService } from '../../server/services/AuditLogService.js';
import { buildMercadoPagoReconciliation, selectBestMercadoPagoPayment } from '../../server/services/mercadoPagoReconciliation.js';

const original = {
  log: auditLogService.log, fetch: globalThis.fetch,
  paymentGet: Payment.prototype.get, paymentSearch: Payment.prototype.search,
  merchantGet: MerchantOrder.prototype.get, merchantSearch: MerchantOrder.prototype.search,
  preferenceCreate: Preference.prototype.create,
  webhook: PaymentService.prototype.processWebhook,
  token: process.env.MP_ACCESS_TOKEN, secret: process.env.MP_WEBHOOK_SECRET,
  consoleLog: console.log, consoleWarn: console.warn, consoleError: console.error,
};
const observations: Record<string, unknown>[] = [];
const forbidden = async () => { throw new Error('Unmocked external operation blocked'); };
const order = (extra: Record<string, unknown> = {}) => ({
  id: 'REC-PROBE', tenantId: 'TEN-PROBE', patientDni: '00000000',
  patientName: 'Synthetic', patientLastName: 'Fixture',
  paymentMethod: 'mp', paymentStatus: 'pending', paymentAmount: '10000',
  paymentId: 'MP-PLACEHOLDER', status: 'Pendiente', auditLog: [], ...extra,
});
const payment = (extra: Record<string, unknown> = {}) => ({
  id: 10, status: 'approved', transaction_amount: 10000,
  external_reference: 'REC-PROBE', date_approved: '2026-10-27T14:00:00Z', ...extra,
});
function service(snapshot: any) {
  const result: any = new PaymentService();
  result.orderRepo = { findById: async () => snapshot, update: async () => snapshot };
  result.tenantRepo = { findById: async () => ({ mpAccessToken: 'TEST-fixture' }) };
  result.fetchBestPaymentForOrder = async () => payment();
  result.refreshPendingOrderLimitAlert = async () => {};
  return result;
}
function response() {
  return { statusCode: 0, body: null as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; } };
}
function record(id: string, observed: Record<string, unknown>) {
  observations.push({ id, result: 'defect_reproduced', ...observed });
}

try {
  globalThis.fetch = forbidden as any;
  auditLogService.log = async () => {};
  Payment.prototype.get = forbidden as any;
  Payment.prototype.search = forbidden as any;
  MerchantOrder.prototype.get = forbidden as any;
  MerchantOrder.prototype.search = forbidden as any;
  Preference.prototype.create = forbidden as any;
  delete process.env.MP_ACCESS_TOKEN;
  delete process.env.MP_WEBHOOK_SECRET;
  console.log = console.warn = console.error = () => {};

  // HTTP acknowledgment on both thrown errors and returned processing failures.
  for (const mode of ['throw', 'returned_failure', 'invalid_signature']) {
    PaymentService.prototype.processWebhook = async () => {
      if (mode === 'throw') throw new Error('Synthetic write failure');
      return { received: mode !== 'invalid_signature', error: 'Synthetic processing failure' };
    };
    const res = response();
    await new PaymentController().webhook({ query: {}, body: {}, headers: {} } as any, res as any, () => {});
    assert.equal(res.statusCode, 200);
    record('ACK-' + mode, { httpStatus: res.statusCode });
  }
  PaymentService.prototype.processWebhook = original.webhook;

  // A read of the provider is treated as successful synchronization before saving.
  {
    const snapshot = order(); const subject = service(snapshot);
    subject.orderRepo.update = async () => { throw new Error('Synthetic database write failure'); };
    const result = await subject.syncReturn(snapshot.id);
    assert.equal(result.verifiedWithApi, true);
    assert.equal(result.verificationPending, false);
    assert.equal(result.paymentStatus, 'approved');
    record('RETURN-WRITE-FAILURE', { verifiedWithApi: result.verifiedWithApi,
      verificationPending: result.verificationPending, returnedStatus: result.paymentStatus,
      persisted: false });
  }

  // A repository update returning null is also reported as persisted.
  {
    const subject = service(order()); let persistedAudit = false;
    auditLogService.log = async (entry: any) => { if (entry.changes?.event === 'payment_persisted') persistedAudit = true; };
    subject.orderRepo.update = async () => null;
    const result = await subject.applyProviderPayment(order(), payment(), 'Mercado Pago Webhook');
    assert.equal(result.updated, true); assert.equal(persistedAudit, true);
    record('NULL-WRITE', { updated: result.updated, persistedAudit, persisted: false });
    auditLogService.log = async () => {};
  }

  // A previously refunded payment is allowed to become approved again.
  {
    const decision = buildMercadoPagoReconciliation(order({ paymentStatus: 'refunded', paymentId: '10', status: 'Rechazada' }) as any, payment());
    assert.equal(decision.paymentStatus, 'approved'); assert.equal(decision.shouldPersist, true);
    record('REFUND-THEN-APPROVAL', { paymentStatus: decision.paymentStatus, shouldPersist: decision.shouldPersist });
  }

  // A refund for a different attempt overrides a valid approved payment and clinical history.
  {
    const decision = buildMercadoPagoReconciliation(order({ paymentStatus: 'approved', paymentId: '10', status: 'Emitida' }) as any,
      payment({ id: 11, status: 'refunded' }));
    assert.equal(decision.paymentStatus, 'refunded'); assert.equal(decision.orderStatus, 'Rechazada');
    record('OTHER-ATTEMPT-REFUND', { paymentStatus: decision.paymentStatus, orderStatus: decision.orderStatus, paymentId: decision.paymentId });
  }

  // Currency and environment are not part of the acceptance decision.
  {
    const decision = buildMercadoPagoReconciliation(order() as any,
      payment({ currency_id: 'USD', live_mode: false }) as any);
    assert.equal(decision.paymentStatus, 'approved');
    record('CURRENCY-ENVIRONMENT', { paymentStatus: decision.paymentStatus, checkedCurrencyOrEnvironment: false });
  }

  // No reference is accepted by the reducer itself (selector normally protects this path).
  {
    const decision = buildMercadoPagoReconciliation(order() as any,
      payment({ external_reference: null }));
    assert.equal(decision.paymentStatus, 'approved');
    record('UNREFERENCED-REDUCER', { paymentStatus: decision.paymentStatus, scope: 'defense_in_depth' });
  }

  // Use the real repository update method with a synthetic document to prove stale overwrite.
  {
    const stale = order(); const stored: any = order({ status: 'Emitida', recipePdfUrl: 'synthetic-document' });
    stored.save = async () => stored;
    const repo = new OrderRepository(); repo.findById = async () => stored;
    const subject = service(stale); subject.orderRepo = repo;
    await subject.applyProviderPayment(stale, payment(), 'Mercado Pago Webhook');
    assert.equal(stored.status, 'En revisión');
    record('CLINICAL-RACE', { statusBeforeWrite: 'Emitida', statusAfterWrite: stored.status });
  }

  // The check and creation are not serialized on the server.
  {
    const subject = service(order());
    subject.orderRepo.findById = async () => order();
    let checks = 0; let release!: () => void;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    subject.fetchBestPaymentForOrder = async () => { checks++; if (checks === 2) release(); await barrier; return null; };
    let creates = 0;
    Preference.prototype.create = async () => ({ id: 'synthetic-' + (++creates), init_point: 'https://example.invalid' }) as any;
    const user = { id: 'USR-PROBE', tenantId: 'TEN-PROBE', role: 'paciente', identifier: '00000000' };
    await Promise.all([subject.createPreference('TEN-PROBE', { orderId: 'REC-PROBE' }, user),
      subject.createPreference('TEN-PROBE', { orderId: 'REC-PROBE' }, user)]);
    assert.equal(creates, 2);
    record('CONCURRENT-PREFERENCES', { preferencesCreatedForOneOrder: creates });
    Preference.prototype.create = forbidden as any;
  }

  // Two-method purchases cannot be settled by selecting a single payment.
  {
    const selected = selectBestMercadoPagoPayment([
      payment({ id: 10, transaction_amount: 6000 }), payment({ id: 11, transaction_amount: 4000 }),
    ], 'REC-PROBE', 10000)!;
    const decision = buildMercadoPagoReconciliation(order() as any, selected);
    assert.equal(decision.reason, 'underpaid');
    record('TWO-PAYMENT-PURCHASE', { totalPaid: 10000, selectedAmount: decision.paidAmount,
      paymentStatus: decision.paymentStatus, requiresProviderFeatureVerification: true });
  }

  // A webhook chooses the first tenant's credential, regardless of the affected order.
  {
    const subject: any = new PaymentService(); let selectedWrongTenant = false;
    subject.tenantRepo = { findAll: async () => [
      { id: 'TEN-A', mpAccessToken: 'TEST-synthetic-A' }, { id: 'TEN-B', mpAccessToken: 'TEST-synthetic-B' },
    ] };
    Payment.prototype.get = async function() {
      selectedWrongTenant = (this as any).config.accessToken === 'TEST-synthetic-A';
      throw Object.assign(new Error('Synthetic wrong account'), { status: 403 });
    };
    MerchantOrder.prototype.get = async () => { throw new Error('Synthetic wrong account'); };
    const result = await subject.processWebhook({ type: 'payment', 'data.id': '123' },
      { metadata: { tenant_id: 'TEN-B' }, user_id: 2 });
    assert.equal(selectedWrongTenant, true); assert.equal(result.received, true);
    record('TENANT-CREDENTIAL', { selectedFirstTenant: selectedWrongTenant, received: result.received,
      scope: 'multiple_collectors' });
  }

  // The public sync service returns the entire order without receiving an actor.
  {
    const subject = service(order({ diagnostic: 'SYNTHETIC_PRIVATE_MARKER' }));
    subject.fetchBestPaymentForOrder = async () => null;
    const result = await subject.syncReturn('REC-PROBE');
    assert.equal(result.order.diagnostic, 'SYNTHETIC_PRIVATE_MARKER');
    record('RETURN-FULL-ORDER', { fullOrderReturnedWithoutActor: true });
  }
} finally {
  auditLogService.log = original.log; globalThis.fetch = original.fetch;
  Payment.prototype.get = original.paymentGet; Payment.prototype.search = original.paymentSearch;
  MerchantOrder.prototype.get = original.merchantGet; MerchantOrder.prototype.search = original.merchantSearch;
  Preference.prototype.create = original.preferenceCreate;
  PaymentService.prototype.processWebhook = original.webhook;
  for (const [key, value] of [['MP_ACCESS_TOKEN', original.token], ['MP_WEBHOOK_SECRET', original.secret]]) {
    if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
  }
  console.log = original.consoleLog; console.warn = original.consoleWarn; console.error = original.consoleError;
}
console.log(JSON.stringify({ probes: observations.length, observations }, null, 2));
