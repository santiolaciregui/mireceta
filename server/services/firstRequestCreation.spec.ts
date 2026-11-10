/** US-016, 2026-11-10: validates the existing creation workflow with mocked storage. */
import assert from 'node:assert/strict';
import test, { beforeEach, afterEach } from 'node:test';
import { OrderService } from './OrderService.js';
import { FirstRequestPromotionService } from './FirstRequestPromotionService.js';
import { notificationService } from './NotificationService.js';
import { auditLogService } from './AuditLogService.js';
const actor = { id: 'USR-1', role: 'paciente', tenantId: 'TEN-1', identifier: '12345678' };
const benefit = { beneficiaryId: actor.id, appliedAt: '2026-11-10T12:00:00Z', originalAmount: 10000, discount: 10000, finalAmount: 0 };
const original = { prepare: FirstRequestPromotionService.prototype.prepare, log: auditLogService.log, notify: notificationService.sendNewOrderSecretaryWhatsApp };
beforeEach(() => { auditLogService.log = async () => {}; notificationService.sendNewOrderSecretaryWhatsApp = async () => undefined as any; });
afterEach(() => { FirstRequestPromotionService.prototype.prepare = original.prepare; auditLogService.log = original.log; notificationService.sendNewOrderSecretaryWhatsApp = original.notify; });
function service() {
  const s: any = new OrderService(); s.tenantRepo = { findById: async () => ({ pricePerPrescription: 10000 }) }; s.refreshPendingOrderLimitAlert = async () => {};
  s.orderRepo = { findByClientRequestId: async () => null, create: async (data: any) => data };
  return s as OrderService;
}
const draft = () => ({ clientRequestId: 'new-attempt', patientDni: actor.identifier, patientName: 'Test', patientLastName: 'Patient', obraSocial: 'Particular', medicationMethod: 'manual', medicationItems: [{ nombreComercial: 'test' }], paymentMethod: 'mp', promotionConfirmation: { originalAmount: 10000, discount: 10000, finalAmount: 0 } });
test('creates a free request in review with a server-only snapshot, never an approved payment', async () => {
  FirstRequestPromotionService.prototype.prepare = async (_user, data, _confirmation) => { assert.equal(data.patientDni, actor.identifier); assert.equal(data.id, undefined); return benefit; };
  const result = await service().createOrder({ ...draft(), firstRequestBenefit: { beneficiaryId: 'forged' }, paymentStatus: 'approved', tenantId: 'TEN-OTHER' }, actor);
  assert.equal(result.tenantId, 'TEN-1'); assert.deepEqual(result.firstRequestBenefit, benefit);
  assert.equal(result.paymentAmount, '0'); assert.equal(result.paymentStatus, 'exempt'); assert.equal(result.paymentMethod, 'bonificado'); assert.equal(result.status, 'En revisión');
  assert.ok(result.auditLog.some((entry: any) => entry.action === 'Primera solicitud bonificada'));
});
test('a partially bonified request charges the stored remainder', async () => {
  FirstRequestPromotionService.prototype.prepare = async () => ({ ...benefit, originalAmount: 20000, finalAmount: 10000 });
  const result = await service().createOrder({ ...draft(), medicationItems: [{}, {}, {}] }, actor);
  assert.equal(result.paymentAmount, '10000'); assert.equal(result.paymentStatus, 'pending'); assert.equal(result.status, 'Pendiente');
});
test('cannot forge a manual exemption or reuse client-supplied promotion metadata', async () => {
  await assert.rejects(service().createOrder({ ...draft(), promotionConfirmation: undefined, paymentMethod: 'bonificado' }, actor), /Método de pago/);
  const result = await service().createOrder({ ...draft(), promotionConfirmation: undefined, firstRequestBenefit: benefit, paymentStatus: 'approved' }, actor);
  assert.equal(result.firstRequestBenefit, undefined); assert.equal(result.paymentAmount, '10000'); assert.equal(result.paymentStatus, 'pending');
});
test('a unique-benefit collision returns a conflict and never retries at full price', async () => {
  FirstRequestPromotionService.prototype.prepare = async () => benefit;
  const s: any = service(); let writes = 0;
  s.orderRepo.create = async () => { writes++; throw Object.assign(new Error('duplicate'), { code: 11000 }); };
  await assert.rejects(s.createOrder(draft(), actor), { status: 409 }); assert.equal(writes, 1);
});
test('failed quote confirmation prevents creating the request', async () => {
  FirstRequestPromotionService.prototype.prepare = async () => { throw Object.assign(new Error('price changed'), { status: 409 }); };
  const s: any = service(); s.orderRepo.create = async () => { throw new Error('must never save'); };
  await assert.rejects(s.createOrder(draft(), actor), /price changed/);
});
