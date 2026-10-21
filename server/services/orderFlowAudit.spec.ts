/** US-013 / T-004, 2026-10-21. Validate redaction, tenant boundaries and failure isolation. */
import assert from 'node:assert/strict';
import test, { beforeEach, afterEach } from 'node:test';
import { sanitizeFlowContext, writeFlowAudit, providerErrorEvidence } from './orderFlowAudit.js';
import { auditLogService } from './AuditLogService.js';
import { OrderController } from '../controllers/OrderController.js';
import { OrderService } from './OrderService.js';

const originalLog = auditLogService.log;
const originalGetOrder = OrderService.prototype.getOrderForUser;
let logs: any[];
beforeEach(() => { logs = []; auditLogService.log = async entry => { logs.push(entry); }; });
afterEach(() => { auditLogService.log = originalLog; OrderService.prototype.getOrderForUser = originalGetOrder; });

test('retains only bounded flow metadata and drops sensitive/arbitrary fields', () => {
  assert.deepEqual(sanitizeFlowContext({
    clientRequestId: 'request-1', formId: 'form-1', orderId: 'REC-1', previousOrderId: 'REC-0',
    navigation: 'reload', requestIdChanged: true, httpStatus: 503, attempt: 2,
    clientAt: '2026-10-21T13:00:00.000Z', patientDni: '12345678',
    token: 'secret', url: 'https://example.com/?token=secret', medications: ['private'],
    unknown: 'private', sessionId: 'x'.repeat(101), failureStage: 'Bearer secret',
  }), {
    formId: 'form-1', clientRequestId: 'request-1', previousOrderId: 'REC-0', orderId: 'REC-1',
    requestIdChanged: true, navigation: 'reload', httpStatus: 503, attempt: 2, clientAt: '2026-10-21T13:00:00.000Z',
  });
  assert.deepEqual(sanitizeFlowContext({ orderId: {}, httpStatus: 999, attempt: 100, navigation: 'bad', clientAt: 'invalid' }), {});
  assert.deepEqual(sanitizeFlowContext(null), {});
});

test('provider failures expose HTTP status without messages, causes or credentials', () => {
  assert.deepEqual(providerErrorEvidence({ status: 401, message: 'Bearer secret', cause: { email: 'private' } }), { httpStatus: 401 });
  assert.deepEqual(providerErrorEvidence({ status: 'bad' }), {});
});

function response() {
  return { statusCode: 0, body: null as any, status(code: number) { this.statusCode = code; return this; }, json(body: any) { this.body = body; return this; } };
}

test('binds browser events to the authenticated user and verifies both order references', async () => {
  const currentUser = { id: 'USR-1', tenantId: 'TEN-1', role: 'paciente' };
  const checked: string[] = [];
  OrderService.prototype.getOrderForUser = async (id, user, accessOnly) => {
    assert.equal(accessOnly, true);
    assert.equal(user, currentUser); checked.push(id); return {} as any;
  };
  const res = response();
  await new OrderController().recordFlowEvent({
    user: currentUser, body: { event: 'checkout_started', tenantId: 'TEN-OTHER', context: {
      orderId: 'REC-1', previousOrderId: 'REC-0', clientRequestId: 'request-1', token: 'secret',
    } },
  } as any, res as any);
  assert.equal(res.statusCode, 202);
  assert.deepEqual(checked, ['REC-1', 'REC-0']);
  assert.equal(logs[0].currentUser, currentUser);
  assert.equal(logs[0].changes.evidenceSource, 'client_reported');
  assert.equal(logs[0].changes.context.token, undefined);
  assert.equal(logs[0].tenantId, undefined);
});

test('rejects inaccessible order references without writing an audit event', async () => {
  OrderService.prototype.getOrderForUser = async () => { throw new Error('Access denied'); };
  const res = response();
  await new OrderController().recordFlowEvent({ user: { id: 'USR-1' }, body: {
    event: 'checkout_started', context: { previousOrderId: 'REC-OTHER' },
  } } as any, res as any);
  assert.equal(res.statusCode, 403);
  assert.equal(logs.length, 0);
});

test('rejects arbitrary audit actions and unauthenticated events', async () => {
  const controller = new OrderController();
  const bad = response();
  await controller.recordFlowEvent({ body: { event: 'ORDER_CANCEL' } } as any, bad as any);
  assert.equal(bad.statusCode, 400);
  const anonymous = response();
  await controller.recordFlowEvent({ body: { event: 'form_opened' } } as any, anonymous as any);
  assert.equal(anonymous.statusCode, 401);
  assert.equal(logs.length, 0);
});

test('audit failures do not escape into order/payment operations', async () => {
  auditLogService.log = async () => { throw new Error('database unavailable'); };
  await assert.doesNotReject(() => writeFlowAudit('TEN-1', 'payment_persisted', 'REC-1', { reason: 'approved' }));
});

test('access checks avoid loading clinical attachments while preserving patient ownership', async () => {
  const service: any = new OrderService();
  service.orderRepo = {
    findAccessSnapshot: async () => ({ id: 'REC-1', tenantId: 'TEN-1', patientDni: '12345678' }),
    findById: async () => { throw new Error('Full order must not be loaded'); },
  };
  const user = { id: 'USR-1', role: 'paciente', tenantId: 'TEN-1', identifier: '12345678' };
  assert.equal((await service.getOrderForUser('REC-1', user, true)).id, 'REC-1');
  await assert.rejects(() => service.getOrderForUser('REC-1', { ...user, identifier: '87654321' }, true), /Acceso no autorizado/);
  await assert.rejects(() => service.getOrderForUser('REC-1', { ...user, tenantId: 'TEN-OTHER' }, true), /Acceso no autorizado/);
});
