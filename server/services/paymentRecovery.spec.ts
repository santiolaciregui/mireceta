import assert from 'node:assert/strict';
import test, { beforeEach, afterEach } from 'node:test';
import crypto from 'node:crypto';
import { Payment, MerchantOrder } from 'mercadopago';
import { PaymentService } from './PaymentService.js';
import { PaymentController } from '../controllers/PaymentController.js';
import { auditLogService } from './AuditLogService.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { Order } from '../models/Order.js';

const originalLog = auditLogService.log;
beforeEach(() => { auditLogService.log = async () => {}; });
afterEach(() => { auditLogService.log = originalLog; });
const snapshot = (id = 'REC-1') => ({ id, tenantId: 'TEN-1', paymentMethod: 'mp',
  paymentStatus: 'pending', paymentId: 'MP-12345678', paymentAmount: '10000', status: 'Pendiente', auditLog: [] });
const paid = (id = 'REC-1') => ({ id: 123, external_reference: id, status: 'approved', transaction_amount: 10000,
  date_approved: '2026-11-04T12:00:00Z' });
function subject(stored = snapshot()) {
  const service: any = new PaymentService();
  const progress: { cursor?: string; summary?: any } = {};
  service.recoveryProgress = { read: async () => progress.cursor,
    save: async (cursor: string, summary: any) => { progress.cursor = cursor; progress.summary = summary; } };
  service.orderRepo = { findById: async () => structuredClone(stored),
    findPendingMercadoPago: async () => [structuredClone(stored)],
    updateCheckoutPayment: async (_id: string, _expected: any, changes: any, entry: any) => {
      Object.assign(stored, changes); stored.auditLog.push(entry); return stored;
    } };
  service.tenantRepo = { findById: async () => ({ mpAccessToken: 'TEST-fixture' }) };
  service.fetchBestPaymentForOrder = async () => paid(stored.id);
  service.refreshPendingOrderLimitAlert = async () => {};
  return { service, progress, stored };
}

test('a failed write is recovered by a later scheduled run without the patient returning', async () => {
  const { service, stored, progress } = subject();
  const save = service.orderRepo.updateCheckoutPayment;
  service.orderRepo.updateCheckoutPayment = async () => { throw new Error('Temporary database failure'); };
  assert.deepEqual(await service.reconcilePendingPayments(), { checked: 1, updated: 0, unresolved: 0, failed: 1 });
  assert.equal(stored.paymentStatus, 'pending');
  service.orderRepo.updateCheckoutPayment = save;
  assert.deepEqual(await service.reconcilePendingPayments(), { checked: 1, updated: 1, unresolved: 0, failed: 0 });
  assert.equal(stored.paymentStatus, 'approved'); assert.equal(stored.paymentId, '123');
  assert.equal(stored.status, 'En revisión'); assert.equal(stored.auditLog.length, 1);
  assert.equal(progress.cursor, 'REC-1');
  await service.reconcilePendingPayments();
  assert.equal(stored.auditLog.length, 1);
});

test('return synchronization never reports an approval that failed to persist', async () => {
  const { service, stored } = subject();
  service.orderRepo.updateCheckoutPayment = async () => { throw new Error('Temporary write failure'); };
  const result = await service.syncReturn(stored.id);
  assert.equal(result.verifiedWithApi, false); assert.equal(result.verificationPending, true);
  assert.equal(result.paymentStatus, 'pending'); assert.equal(stored.auditLog.length, 0);
});

test('null conditional updates remain retryable and do not alter the snapshot or medical state', async () => {
  const { service } = subject(); const before = snapshot();
  service.orderRepo.updateCheckoutPayment = async () => null;
  await assert.rejects(service.applyProviderPayment(before, paid(), 'Mercado Pago Webhook'), /cambió/);
  assert.deepEqual(before, snapshot());
});

test('delayed approval preserves an already emitted prescription', async () => {
  const { service, stored } = subject({ ...snapshot(), status: 'Emitida' });
  await service.reconcilePendingPayments();
  assert.equal(stored.status, 'Emitida'); assert.equal(stored.paymentStatus, 'approved');
});

test('provider absence never marks an order paid and provider failures are counted separately', async () => {
  const { service, stored } = subject();
  service.fetchBestPaymentForOrder = async () => null;
  assert.deepEqual(await service.reconcilePendingPayments(), { checked: 1, updated: 0, unresolved: 1, failed: 0 });
  service.fetchBestPaymentForOrder = async () => { throw new Error('Temporary provider failure'); };
  assert.deepEqual(await service.reconcilePendingPayments(), { checked: 1, updated: 0, unresolved: 0, failed: 1 });
  assert.equal(stored.paymentStatus, 'pending');
});

test('recovery checkpoint advances past old unpaid orders and wraps after the end', async () => {
  const { service, progress } = subject();
  const orders = ['REC-1', 'REC-2', 'REC-3'].map(snapshot);
  const visits: string[] = [];
  service.orderRepo.findPendingMercadoPago = async (limit: number, cursor?: string) =>
    orders.filter(o => !cursor || o.id > cursor).slice(0, limit);
  service.fetchBestPaymentForOrder = async (order: any) => { visits.push(order.id); return null; };
  await service.reconcilePendingPayments(2); assert.equal(progress.cursor, 'REC-2');
  await service.reconcilePendingPayments(2); assert.equal(progress.cursor, 'REC-3');
  await service.reconcilePendingPayments(2);
  assert.deepEqual(visits, ['REC-1', 'REC-2', 'REC-3', 'REC-1', 'REC-2']);
});

test('failed checkpoint persistence is visible to the scheduler', async () => {
  const { service } = subject();
  service.recoveryProgress.save = async () => { throw new Error('Checkpoint unavailable'); };
  await assert.rejects(service.reconcilePendingPayments(), /Checkpoint unavailable/);
});

test('a time-limited run checkpoints only attempted orders and resumes at the next one', async () => {
  const clock = Date.now; let now = 0;
  Date.now = () => now;
  try {
    const { service, progress } = subject(); const orders = ['REC-1', 'REC-2'].map(snapshot);
    service.orderRepo.findPendingMercadoPago = async (_limit: number, cursor?: string) => orders.filter(o => !cursor || o.id > cursor);
    service.fetchBestPaymentForOrder = async () => { now += 25000; return null; };
    assert.equal((await service.reconcilePendingPayments()).checked, 1);
    assert.equal(progress.cursor, 'REC-1');
    assert.equal((await service.reconcilePendingPayments()).checked, 1);
    assert.equal(progress.cursor, 'REC-2');
  } finally { Date.now = clock; }
});

test('payment lookup errors are not represented as an empty successful provider search', async () => {
  const search = Payment.prototype.search; const merchantSearch = MerchantOrder.prototype.search;
  Payment.prototype.search = async () => { throw Object.assign(new Error('Provider unavailable'), { status: 503 }); };
  MerchantOrder.prototype.search = async () => ({ elements: [] }) as any;
  try {
    await assert.rejects((new PaymentService() as any).fetchBestPaymentForOrder(snapshot(), 'TEST-fixture'), /verificar/);
  } finally { Payment.prototype.search = search; MerchantOrder.prototype.search = merchantSearch; }
});

test('signed webhook retries recover a failed write and do not duplicate the transition', async () => {
  const get = Payment.prototype.get;
  const envToken = process.env.MP_ACCESS_TOKEN; const envSecret = process.env.MP_WEBHOOK_SECRET;
  process.env.MP_ACCESS_TOKEN = 'TEST-fixture'; process.env.MP_WEBHOOK_SECRET = 'synthetic-secret';
  Payment.prototype.get = async () => paid() as any;
  const headers = { 'x-request-id': 'request-1', 'x-signature': 'ts=1,v1=' + crypto.createHmac('sha256', 'synthetic-secret')
    .update('id:123;request-id:request-1;ts:1;').digest('hex') };
  try {
    const { service, stored } = subject(); const save = service.orderRepo.updateCheckoutPayment;
    service.orderRepo.updateCheckoutPayment = async () => { throw new Error('Temporary write failure'); };
    const first = await service.processWebhook({ 'data.id': '123', type: 'payment' }, {}, headers);
    assert.equal(first.received, false); assert.equal(first.httpStatus, 503); assert.equal(first.retryable, true);
    assert.equal(stored.paymentStatus, 'pending');
    service.orderRepo.updateCheckoutPayment = save;
    assert.equal((await service.processWebhook({ 'data.id': '123', type: 'payment' }, {}, headers)).received, true);
    await service.processWebhook({ 'data.id': '123', type: 'payment' }, {}, headers);
    assert.equal(stored.paymentStatus, 'approved'); assert.equal(stored.auditLog.length, 1);
  } finally {
    Payment.prototype.get = get;
    if (envToken === undefined) delete process.env.MP_ACCESS_TOKEN; else process.env.MP_ACCESS_TOKEN = envToken;
    if (envSecret === undefined) delete process.env.MP_WEBHOOK_SECRET; else process.env.MP_WEBHOOK_SECRET = envSecret;
  }
});

test('the webhook controller forwards signature rejection, retryable failure and successful acknowledgments', async () => {
  const original = PaymentService.prototype.processWebhook;
  try {
    for (const code of [401, 503, 200]) {
      PaymentService.prototype.processWebhook = async () => ({ received: code === 200, httpStatus: code, retryable: code === 503 });
      const response = { code: 0, headers: {} as any, setHeader(k: string, v: string) { this.headers[k] = v; },
        status(code: number) { this.code = code; return this; }, json() {} };
      await new PaymentController().webhook({ query: {}, body: {}, headers: {} } as any, response as any, () => {});
      assert.equal(response.code, code);
      assert.equal(response.headers['Retry-After'], code === 503 ? '60' : undefined);
    }
  } finally { PaymentService.prototype.processWebhook = original; }
});

test('unexpected controller failures remain retryable without exposing the original error', async () => {
  const original = PaymentService.prototype.processWebhook;
  PaymentService.prototype.processWebhook = async () => { throw new Error('Synthetic private error'); };
  try {
    const response = { code: 0, body: null as any, setHeader() {},
      status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; } };
    await new PaymentController().webhook({ query: {}, body: {}, headers: {} } as any, response as any, () => {});
    assert.equal(response.code, 503); assert.equal(response.body.retryable, true);
    assert.equal(JSON.stringify(response.body).includes('Synthetic private'), false);
  } finally { PaymentService.prototype.processWebhook = original; }
});

test('recovery selection uses a stable bounded cursor without excluding historical pending payments', async () => {
  const original = Order.find; let filter: any; let sort: any; let limit: any;
  Order.find = ((f: any) => { filter = f; return { sort(s: any) { sort = s; return this; }, limit(l: any) { limit = l; return []; } }; }) as any;
  try {
    await new OrderRepository().findPendingMercadoPago(2, 'REC-2');
    assert.deepEqual(filter.id, { $gt: 'REC-2' }); assert.equal(filter.createdAt, undefined);
    assert.deepEqual(sort, { id: 1 }); assert.equal(limit, 2);
  } finally { Order.find = original; }
});
