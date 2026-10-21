import assert from 'node:assert/strict';
import test, { beforeEach, afterEach } from 'node:test';
import { Payment, MerchantOrder, Preference } from 'mercadopago';
import { assertCheckoutAccess, assertCheckoutPayable } from './checkoutAccess.js';
import { OrderService } from './OrderService.js';
import { PaymentService } from './PaymentService.js';
import { Order } from '../models/Order.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { auditLogService } from './AuditLogService.js';

const user = { id: 'USR-1', identifier: '12345678', role: 'paciente', tenantId: 'TEN-1' };
const order = () => ({ id: 'REC-1', tenantId: 'TEN-1', patientDni: '12345678',
  clientRequestId: 'request-1', status: 'Pendiente', paymentStatus: 'pending',
  paymentMethod: 'mp', paymentAmount: '10000', medicationText: 'test', auditLog: [] });
const originalLog = auditLogService.log;
beforeEach(() => { auditLogService.log = async () => {}; });
afterEach(() => { auditLogService.log = originalLog; });

test('checkout access rejects missing authentication, another tenant/patient and admin', () => {
  for (const actor of [undefined, { ...user, tenantId: 'TEN-2' }, { ...user, identifier: '87654321' },
    { ...user, role: 'admin' }, { ...user, role: 'unknown' }]) {
    assert.throws(() => assertCheckoutAccess(order(), actor));
  }
  assert.doesNotThrow(() => assertCheckoutAccess(order(), { ...user, identifier: '87654321', dependents: [{ dni: '12.345.678' }] }));
  assert.doesNotThrow(() => assertCheckoutAccess({ ...order(), requestedByTitularDni: '87654321' }, { ...user, identifier: '87654321' }));
});

test('only pending clinical requests with an unpaid Mercado Pago checkout are payable', () => {
  for (const status of ['En revisión', 'Solicita más información', 'Aprobada', 'Emitida', 'Enviada', 'Rechazada', 'Cancelada']) {
    assert.throws(() => assertCheckoutPayable({ ...order(), status }));
  }
  for (const paymentStatus of ['approved', 'exempt', 'refunded']) assert.throws(() => assertCheckoutPayable({ ...order(), paymentStatus }));
  for (const paymentMethod of ['transfer', 'cash_desk', 'bonificado']) assert.throws(() => assertCheckoutPayable({ ...order(), paymentMethod }));
  assert.doesNotThrow(() => assertCheckoutPayable(order()));
  assert.doesNotThrow(() => assertCheckoutPayable({ ...order(), paymentStatus: 'rejected' }));
});

test('exact lookup enforces ownership and never searches by similar content', async () => {
  const service: any = new OrderService();
  service.orderRepo = { findByClientRequestId: async (id: string) => id === 'request-1' ? order() : null };
  assert.deepEqual(await service.getCheckoutAttempt('request-1', user), { orderId: 'REC-1' });
  assert.deepEqual(await service.getCheckoutAttempt('request-unknown', user), { orderId: null });
  await assert.rejects(service.getCheckoutAttempt('request-1', { ...user, tenantId: 'TEN-2' }));
});

test('same request ID reuses the order after minutes without writing or changing clinical state', async () => {
  const existing = { ...order(), status: 'En revisión', paymentStatus: 'approved' };
  const service: any = new OrderService();
  service.orderRepo = { findByClientRequestId: async () => existing };
  const actual = await service.createOrder({ clientRequestId: 'request-1', patientDni: '12345678' }, user);
  assert.equal(actual, existing); assert.equal(actual.status, 'En revisión');
  await assert.rejects(service.createOrder({ clientRequestId: 'request-1', patientDni: '12345678', medicationText: 'edited' }, user), /datos cambiaron/);
  await assert.rejects(service.createOrder({ clientRequestId: 'request-1', patientDni: '87654321' }, user), /otro paciente/);
});

test('a deliberate new ID creates a new order even with identical content and price', async () => {
  const service: any = new OrderService(); let creates = 0;
  service.orderRepo = {
    findByClientRequestId: async () => null,
    findByTenant: async () => { throw new Error('Similarity matching is forbidden'); },
    create: async (data: any) => { creates++; return data; },
  };
  service.tenantRepo = { findById: async () => ({ pricePerPrescription: 10000 }) };
  service.refreshPendingOrderLimitAlert = async () => {};
  const result = await service.createOrder({ clientRequestId: 'request-new', patientDni: '12345678',
    medicationText: 'test', paymentMethod: 'mp', paymentAmount: '10000' }, user);
  assert.equal(result.clientRequestId, 'request-new'); assert.equal(creates, 1);
});

test('transfer replacement cannot reopen a request under medical review', async () => {
  const service: any = new OrderService();
  service.orderRepo = { findByClientRequestId: async () => ({ ...order(), status: 'En revisión' }) };
  await assert.rejects(service.createOrder({ clientRequestId: 'request-1', paymentRetryOrderId: 'REC-1',
    patientDni: '12345678', paymentMethod: 'transfer', paymentReceiptUrl: 'https://example.test/receipt' }, user), /no admite/);
});

test('already-paid checkout returns the exact order without contacting the provider', async () => {
  const service: any = new PaymentService();
  service.orderRepo = { findById: async () => ({ ...order(), status: 'Emitida', paymentStatus: 'approved' }) };
  const result = await service.createPreference('TEN-1', { orderId: 'REC-1' }, user);
  assert.equal(result.alreadyPaid, true); assert.equal(result.order.status, 'Emitida');
  await assert.rejects(service.createPreference('TEN-1', { orderId: 'REC-1' }, { ...user, identifier: '87654321' }));
});

test('provider-approved payment is persisted and blocks another checkout', async () => {
  const service: any = new PaymentService(); const stored = order(); let writes = 0;
  service.orderRepo = { findById: async () => stored, updateCheckoutPayment: async () => { writes++; return stored; } };
  service.tenantRepo = { findById: async () => ({ mpAccessToken: 'TEST-token' }) };
  service.refreshPendingOrderLimitAlert = async () => {};
  service.fetchBestPaymentForOrder = async () => ({ id: '123', external_reference: 'REC-1', status: 'approved', transaction_amount: 10000 });
  const result = await service.createPreference('TEN-1', { orderId: 'REC-1' }, user);
  assert.equal(result.alreadyPaid, true); assert.equal(writes, 1); assert.equal(stored.paymentStatus, 'approved');
});

test('provider-processing payment blocks checkout and preserves the request', async () => {
  const service: any = new PaymentService(); const stored = order();
  service.orderRepo = { findById: async () => stored, updateCheckoutPayment: async () => stored };
  service.tenantRepo = { findById: async () => ({ mpAccessToken: 'TEST-token' }) };
  service.refreshPendingOrderLimitAlert = async () => {};
  service.fetchBestPaymentForOrder = async () => ({ id: '123', external_reference: 'REC-1', status: 'in_process', transaction_amount: 10000 });
  await assert.rejects(service.createPreference('TEN-1', { orderId: 'REC-1' }, user), /pago anterior está en proceso/);
});

test('provider lookup errors fail closed before creating another preference', async () => {
  const service: any = new PaymentService();
  service.orderRepo = { findById: async () => order() };
  service.tenantRepo = { findById: async () => ({ mpAccessToken: 'TEST-token' }) };
  const search = Payment.prototype.search; const merchantSearch = MerchantOrder.prototype.search;
  Payment.prototype.search = async () => { throw new Error('provider unavailable'); };
  MerchantOrder.prototype.search = async () => ({ elements: [] }) as any;
  try {
    await assert.rejects(service.createPreference('TEN-1', { orderId: 'REC-1' }, user), /verificar el pago anterior/);
  } finally { Payment.prototype.search = search; MerchantOrder.prototype.search = merchantSearch; }
});

test('medical status changed during provider lookup blocks a new checkout', async () => {
  const service: any = new PaymentService(); let reads = 0;
  service.orderRepo = { findById: async () => ({ ...order(), status: ++reads === 1 ? 'Pendiente' : 'En revisión' }) };
  service.tenantRepo = { findById: async () => ({ mpAccessToken: 'TEST-token' }) };
  service.fetchBestPaymentForOrder = async () => null;
  await assert.rejects(service.createPreference('TEN-1', { orderId: 'REC-1' }, user), /no admite/);
});

test('concurrent clinical/payment update prevents retry reconciliation from overwriting it', async () => {
  const service: any = new PaymentService(); const stored = order();
  service.orderRepo = {
    findById: async () => ({ ...stored, auditLog: [] }),
    updateCheckoutPayment: async (_id: string, expected: any) => {
      assert.equal(expected.status, 'Pendiente');
      assert.equal(expected.paymentStatus, 'pending');
      return null;
    },
  };
  service.tenantRepo = { findById: async () => ({ mpAccessToken: 'TEST-token' }) };
  service.fetchBestPaymentForOrder = async () => ({ id: '123', external_reference: 'REC-1', status: 'approved', transaction_amount: 10000 });
  await assert.rejects(service.createPreference('TEN-1', { orderId: 'REC-1' }, user), /cambió durante la verificación/);
  assert.equal(stored.status, 'Pendiente'); assert.equal(stored.paymentStatus, 'pending');
});

test('retry reconciliation atomically guards state and appends only its own audit entry', async () => {
  const original = Order.findOneAndUpdate;
  let captured: any[] = [];
  Order.findOneAndUpdate = ((...args: any[]) => { captured = args; return Promise.resolve(null); }) as any;
  try {
    await new OrderRepository().updateCheckoutPayment('REC-1', {
      status: 'Pendiente', paymentStatus: 'pending', paymentAmount: '10000', paymentId: 'MP-1',
    }, { paymentStatus: 'approved', status: 'En revisión' }, { action: 'test', user: 'system', timestamp: '2026-10-21T00:00:00Z' });
    assert.deepEqual(captured[0], { id: 'REC-1', status: 'Pendiente', paymentStatus: 'pending', paymentId: 'MP-1', paymentAmount: '10000' });
    assert.deepEqual(captured[1].$set, { paymentStatus: 'approved', status: 'En revisión' });
    assert.equal(captured[1].$push.auditLog.$each[0].action, 'test');
    assert.equal(captured[1].$set.medicationText, undefined);
    assert.equal(captured[1].$set.auditLog, undefined);
  } finally { Order.findOneAndUpdate = original; }
});

test('eligible retry creates a preference tied to the existing order only', async () => {
  const service: any = new PaymentService();
  service.orderRepo = { findById: async () => order() };
  service.tenantRepo = { findById: async () => ({ mpAccessToken: 'TEST-token' }) };
  service.fetchBestPaymentForOrder = async () => null;
  const original = Preference.prototype.create;
  Preference.prototype.create = async ({ body }: any) => {
    assert.equal(body.external_reference, 'REC-1');
    assert.equal(body.items[0].unit_price, 10000);
    return { id: 'PREF-1', sandbox_init_point: 'https://example.test/checkout' } as any;
  };
  try {
    const result = await service.createPreference('TEN-1', { orderId: 'REC-1', origin: 'https://mireceta.online' }, user);
    assert.equal(result.orderId, 'REC-1'); assert.equal(result.preferenceId, 'PREF-1');
  } finally { Preference.prototype.create = original; }
});
