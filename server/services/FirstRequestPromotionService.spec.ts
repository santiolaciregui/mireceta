/** US-016, 2026-11-10: mocks isolate database/provider effects; no real patients or payments. */
import assert from 'node:assert/strict';
import test, { beforeEach, afterEach } from 'node:test';
import { FirstRequestPromotionService, ensurePromotionIndex } from './FirstRequestPromotionService.js';
import { Order } from '../models/Order.js';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { PROMOTION_START, PROMOTION_END } from '../../src/types/firstRequestPromotion.js';
const account = { id: 'USR-1', role: 'paciente', identifier: '12345678', tenantId: 'TEN-1', dependents: [{ dni: '87654321' }] };
const config = { firstRequestPromotionEnabled: true, firstRequestPromotionEndsAt: '2099-12-16T03:00:00Z', pricePerPrescription: 10000 };
const draft = { medicationMethod: 'manual', medicationItems: [{ nombreComercial: 'Medicine' }] };
const unpaid = () => ({ ...draft, id: 'REC-1', tenantId: 'TEN-1', patientDni: '12345678', paymentAmount: '10000', paymentMethod: 'mp', paymentStatus: 'pending', paymentStage: 'not_started', status: 'Pendiente' });
const originals = { user: User.findOne, tenant: Tenant.findOne, exists: Order.exists, update: Order.findOneAndUpdate, index: Order.collection.createIndex, tenantUpdate: Tenant.findOneAndUpdate };
let history: any[]; let used: boolean; let tenant: any;
beforeEach(() => {
  history = []; used = false; tenant = { ...config };
  User.findOne = (() => ({ lean: async () => account })) as any;
  Tenant.findOne = (() => ({ lean: async () => tenant })) as any;
  Order.exists = (async () => used ? { _id: 'used' } : null) as any;
  Order.collection.createIndex = (async () => 'one_first_request_benefit') as any;
});
afterEach(() => { User.findOne = originals.user; Tenant.findOne = originals.tenant; Order.exists = originals.exists; Order.findOneAndUpdate = originals.update; Order.collection.createIndex = originals.index; Tenant.findOneAndUpdate = originals.tenantUpdate; });
function service() {
  const s: any = new FirstRequestPromotionService();
  s.repo = { findByPatientDnis: async (tenantId: string, dnis: string[]) => { assert.equal(tenantId, 'TEN-1'); assert.deepEqual(dnis, ['12345678', '87654321']); return history; }, findById: async () => unpaid() };
  return s as FirstRequestPromotionService;
}
test('new and existing unpaid accounts receive quotes using authoritative user data', async () => {
  const s = service();
  assert.equal((await s.quote(account, draft)).finalAmount, 0);
  history = [{ ...unpaid(), id: 'old' }];
  assert.equal((await s.quote(account, { orderId: 'REC-1' })).eligible, true);
});
test('ignores client price, ID and forged benefit in a new quote', async () => {
  const q = await service().quote(account, { ...draft, id: 'fake', paymentAmount: '1', firstRequestBenefit: { discount: 999999 } });
  assert.equal(q.originalAmount, 10000); assert.equal(q.discount, 10000);
});
test('rejects unrelated patients and permits registered dependents', async () => {
  await assert.rejects(service().quote(account, { ...draft, patientDni: '99999999' }), { status: 403 });
  assert.equal((await service().quote(account, { ...draft, patientDni: '87.654.321' })).eligible, true);
});
test('requires authenticated patient identity and matching tenant', async () => {
  for (const actor of [undefined, { ...account, role: 'admin' }, { ...account, tenantId: 'TEN-OTHER' }]) await assert.rejects(service().quote(actor, draft), { status: 403 });
});
test('paid/refunded titular or dependent history blocks every payment method', async () => {
  for (const paymentMethod of ['mp', 'transfer', 'cash_desk']) for (const paymentStatus of ['approved', 'refunded']) {
    history = [{ ...unpaid(), patientDni: '87654321', paymentMethod, paymentStatus }];
    assert.equal((await service().quote(account, draft)).eligible, false);
  }
});
test('administrative exemption does not exclude a never-paying account', async () => {
  history = [{ ...unpaid(), paymentStatus: 'exempt', paymentMethod: 'bonificado', paymentAmount: '0' }];
  assert.equal((await service().quote(account, draft)).eligible, true);
});
test('past cancellation/rejection does not restore the consumed benefit', async () => {
  used = true;
  for (const status of ['Cancelada', 'Rechazada']) {
    history = [{ ...unpaid(), status }]; assert.equal((await service().quote(account, draft)).eligible, false);
  }
});
test('blocks legacy external links and receipts pending verification on any account order', async () => {
  for (const payment of [{ paymentMethod: 'mp', paymentStage: undefined }, { paymentMethod: 'mp', checkoutEverStarted: true }, { paymentMethod: 'transfer', paymentReceiptUrl: 'receipt' }]) {
    history = [{ ...unpaid(), ...payment }];
    const q = await service().quote(account, draft); assert.equal(q.eligible, false); assert.match(q.reason, /revisión/);
  }
});
test('existing request ownership is enforced', async () => {
  const s: any = service(); s.repo.findById = async () => ({ ...unpaid(), patientDni: '99999999' });
  await assert.rejects(s.quote(account, { orderId: 'REC-1' }), /autorizado/);
});
test('applied snapshot is idempotent after expiration and manual shutdown', async () => {
  tenant.firstRequestPromotionEnabled = false;
  tenant.firstRequestPromotionEndsAt = '2020-01-01T00:00:00Z';
  const firstRequestBenefit = { beneficiaryId: account.id, appliedAt: '2026-11-10T12:00:00Z', originalAmount: 10000, discount: 10000, finalAmount: 0 };
  const s: any = service(); s.repo.findById = async () => ({ ...unpaid(), status: 'Cancelada', firstRequestBenefit });
  const q = await s.quote(account, { orderId: 'REC-1' }); assert.equal(q.applied, true); assert.equal(q.finalAmount, 0);
  const result = await s.apply(account, 'REC-1', {}); assert.deepEqual(result.firstRequestBenefit, firstRequestBenefit);
});
test('an unpaid request is discounted and consumed with one guarded atomic write', async () => {
  const s = service(); const quote = await s.quote(account, { orderId: 'REC-1' }); let writes = 0;
  Order.findOneAndUpdate = (async (filter: any, update: any) => {
    writes++;
    assert.equal(filter.paymentStage, 'not_started'); assert.equal(filter.paymentAmount, '10000');
    assert.equal(filter.checkoutEverStarted.$ne, true); assert.equal(filter.firstRequestBenefit.$exists, false);
    assert.equal(update.$set.firstRequestBenefit.beneficiaryId, 'USR-1'); assert.equal(update.$set.paymentAmount, '0');
    assert.equal(update.$set.paymentStatus, 'exempt'); assert.equal(update.$set.status, 'En revisión');
    assert.equal(update.$set.medicationItems, undefined); assert.match(update.$push.auditLog.notes, /no es un pago/);
    return { ...unpaid(), ...update.$set };
  }) as any;
  const result = await s.apply(account, 'REC-1', quote); assert.equal(result.paymentStatus, 'exempt'); assert.equal(writes, 1);
});
test('concurrent checkout or state change prevents consuming the benefit', async () => {
  const s = service(); const quote = await s.quote(account, { orderId: 'REC-1' });
  Order.findOneAndUpdate = (async () => null) as any;
  await assert.rejects(s.apply(account, 'REC-1', quote), { status: 409 });
});
test('unique beneficiary constraint rejects a second order without charging full price', async () => {
  const s = service(); const quote = await s.quote(account, { orderId: 'REC-1' });
  Order.findOneAndUpdate = (async () => { throw Object.assign(new Error('duplicate'), { code: 11000 }); }) as any;
  await assert.rejects(s.apply(account, 'REC-1', quote), { status: 409 });
});
test('activation creates the unique partial index before enabling the promotion', async () => {
  let captured: any[] = [];
  Order.collection.createIndex = (async (...args: any[]) => { captured = args; return 'one_first_request_benefit'; }) as any;
  await ensurePromotionIndex();
  assert.equal(captured[1].unique, true); assert.deepEqual(captured[0], { tenantId: 1, 'firstRequestBenefit.beneficiaryId': 1 });
  assert.deepEqual(captured[1].partialFilterExpression, { 'firstRequestBenefit.beneficiaryId': { $type: 'string' } });
  const schemaIndex = Order.schema.indexes().find(([, options]) => options.name === 'one_first_request_benefit'); assert.ok(schemaIndex);
});
test('only tenant administrators can read or change configuration', async () => {
  await assert.rejects(service().config(account), { status: 403 });
  await assert.rejects(service().config({ ...account, role: 'medico' }, { enabled: true, startsAt: PROMOTION_START, endsAt: PROMOTION_END }), { status: 403 });
  await assert.rejects(service().config({ ...account, role: 'admin' }, { enabled: 'true', endsAt: 'invalid' }), { status: 400 });
});
test('configuration is off by default and never leaks payment credentials', async () => {
  tenant = {};
  assert.deepEqual(await service().config({ ...account, role: 'admin' }), { enabled: false, startsAt: PROMOTION_START, endsAt: PROMOTION_END });
});
test('checkout claim atomically prevents a stale full-price preference after promotion', async () => {
  let args: any[] = [];
  Order.findOneAndUpdate = ((...a: any[]) => { args = a; return Promise.resolve(null); }) as any;
  const result = await new OrderRepository().markCheckoutStarted(unpaid() as any);
  assert.equal(result, null); assert.equal(args[0].paymentAmount, '10000'); assert.equal(args[1].$set.checkoutEverStarted, true);
});
test('two concurrent submissions can consume the benefit in only one order', async () => {
  const s: any = service();
  s.repo.findById = async (id: string) => ({ ...unpaid(), id });
  const q = await s.quote(account, { orderId: 'REC-1' });
  let winner = '';
  Order.findOneAndUpdate = (async (filter: any, update: any) => {
    if (winner) throw Object.assign(new Error('unique constraint'), { code: 11000 });
    winner = filter.id;
    return { ...unpaid(), id: filter.id, ...update.$set };
  }) as any;
  const results = await Promise.allSettled([s.apply(account, 'REC-1', q), s.apply(account, 'REC-2', q)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter(r => r.status === 'rejected').length, 1);
});
test('a changed tenant price requires another explicit confirmation', async () => {
  const s = service(); const q = await s.quote(account, draft);
  tenant.pricePerPrescription = 15000;
  await assert.rejects(s.prepare(account, draft, q), { status: 409 });
});
test('a disabled promotion never consumes a previously displayed quote', async () => {
  const s = service(); const q = await s.quote(account, { orderId: 'REC-1' });
  tenant.firstRequestPromotionEnabled = false;
  await assert.rejects(s.apply(account, 'REC-1', q), { status: 409 });
});
test('partial discount preserves the medical data and persisted original price', async () => {
  const s: any = service();
  s.repo.findById = async () => ({ ...unpaid(), paymentAmount: '24000', medicationItems: [{}, {}, {}] });
  const q = await s.quote(account, { orderId: 'REC-1' });
  Order.findOneAndUpdate = (async (_filter: any, update: any) => {
    assert.equal(update.$set.firstRequestBenefit.originalAmount, 24000);
    assert.equal(update.$set.paymentAmount, '14000'); assert.equal(update.$set.paymentStatus, undefined);
    assert.equal(update.$set.medicationItems, undefined); assert.equal(update.$set.medicationText, undefined);
    return { ...unpaid(), ...update.$set };
  }) as any;
  const result = await s.apply(account, 'REC-1', q); assert.equal(result.paymentAmount, '14000');
});
test('enabling the promotion verifies uniqueness before persisting only this tenant configuration', async () => {
  const events: string[] = [];
  Order.collection.createIndex = (async () => { events.push('index'); return 'one_first_request_benefit'; }) as any;
  Tenant.findOneAndUpdate = (async (filter: any, update: any) => {
    events.push('enable'); assert.deepEqual(filter, { id: 'TEN-1' });
    assert.deepEqual(update.$set, { firstRequestPromotionEnabled: true, firstRequestPromotionStartsAt: PROMOTION_START, firstRequestPromotionEndsAt: PROMOTION_END });
    tenant = { ...tenant, ...update.$set }; return tenant;
  }) as any;
  assert.deepEqual(await service().config({ ...account, role: 'admin' }, { enabled: true, startsAt: PROMOTION_START, endsAt: PROMOTION_END }), { enabled: true, startsAt: PROMOTION_START, endsAt: PROMOTION_END });
  assert.deepEqual(events, ['index', 'enable']);
});
test('a failed uniqueness check prevents activation rather than enabling an unsafe promotion', async () => {
  let writes = 0;
  Order.collection.createIndex = (async () => { throw new Error('index unavailable'); }) as any;
  Tenant.findOneAndUpdate = (async () => { writes++; return tenant; }) as any;
  await assert.rejects(service().config({ ...account, role: 'admin' }, { enabled: true, startsAt: PROMOTION_START, endsAt: PROMOTION_END }), /index unavailable/);
  assert.equal(writes, 0);
});
test('manual shutdown remains possible even if index maintenance is unavailable', async () => {
  let indexCalls = 0;
  Order.collection.createIndex = (async () => { indexCalls++; throw new Error('index unavailable'); }) as any;
  Tenant.findOneAndUpdate = (async (_filter: any, update: any) => { tenant = { ...tenant, ...update.$set }; return tenant; }) as any;
  const result = await service().config({ ...account, role: 'admin' }, { enabled: false, startsAt: PROMOTION_START, endsAt: PROMOTION_END });
  assert.equal(result.enabled, false); assert.equal(indexCalls, 0);
});
test('deleted accounts and accounts no longer registered as patients cannot claim the benefit', async () => {
  for (const persisted of [null, { ...account, role: 'medico' }]) {
    User.findOne = (() => ({ lean: async () => persisted })) as any;
    await assert.rejects(service().quote(account, draft), { status: 403 });
  }
});
test('another tenant cannot apply a benefit to an existing request', async () => {
  const s: any = service(); s.repo.findById = async () => ({ ...unpaid(), tenantId: 'TEN-OTHER' });
  await assert.rejects(s.apply(account, 'REC-1', {}), /autorizado/);
});
test('missing requests and clinically progressed requests cannot consume the benefit', async () => {
  const s: any = service(); let writes = 0;
  Order.findOneAndUpdate = (async () => { writes++; throw new Error('must not write'); }) as any;
  s.repo.findById = async () => null;
  await assert.rejects(s.quote(account, { orderId: 'REC-1' }), { status: 409 });
  await assert.rejects(s.apply(account, 'REC-1', {}), { status: 409 });
  for (const status of ['En revisión', 'Emitida', 'Rechazada', 'Cancelada']) {
    s.repo.findById = async () => ({ ...unpaid(), status });
    const q = await s.quote(account, { orderId: 'REC-1' }); assert.equal(q.eligible, false);
    await assert.rejects(s.apply(account, 'REC-1', q), { status: 409 });
  }
  assert.equal(writes, 0);
});
test('two retries of the same request recover the same consumption snapshot', async () => {
  const s: any = service(); const q = await s.quote(account, { orderId: 'REC-1' });
  let latest: any = unpaid(); let reads = 0;
  s.repo.findById = async () => ++reads <= 2 ? unpaid() : latest;
  Order.findOneAndUpdate = (async (_filter: any, update: any) => { latest = { ...unpaid(), ...update.$set }; return null; }) as any;
  const result = await s.apply(account, 'REC-1', q);
  assert.equal(result.firstRequestBenefit.beneficiaryId, account.id); assert.equal(result.paymentAmount, '0');
});
test('storage failure is surfaced without claiming successful consumption', async () => {
  const s = service(); const q = await s.quote(account, { orderId: 'REC-1' });
  Order.findOneAndUpdate = (async () => { throw new Error('write unavailable'); }) as any;
  await assert.rejects(s.apply(account, 'REC-1', q), /write unavailable/);
});
test('an unstarted transfer without a receipt can use the benefit and pay only the excess online', async () => {
  const s: any = service();
  s.repo.findById = async () => ({ ...unpaid(), paymentMethod: 'transfer', paymentAmount: '20000', medicationItems: [{}, {}, {}] });
  const q = await s.quote(account, { orderId: 'REC-1' }); assert.equal(q.eligible, true);
  Order.findOneAndUpdate = (async (_filter: any, update: any) => {
    assert.equal(update.$set.paymentMethod, 'mp'); assert.equal(update.$set.paymentStage, 'not_started');
    assert.equal(update.$set.paymentAmount, '10000');
    return { ...unpaid(), ...update.$set };
  }) as any;
  const result = await s.apply(account, 'REC-1', q); assert.equal(result.paymentAmount, '10000');
});
test('rejects reversed dates before creating the index or changing tenant settings', async () => {
  let writes = 0;
  Tenant.findOneAndUpdate = (async () => { writes++; return tenant; }) as any;
  for (const startsAt of ['invalid', PROMOTION_END, '2027-01-01T03:00:00Z']) {
    await assert.rejects(service().config({ ...account, role: 'admin' }, { enabled: true, startsAt, endsAt: PROMOTION_END }), { status: 400 });
  }
  assert.equal(writes, 0);
});
test('saving a future start date schedules the promotion and persists both boundaries', async () => {
  const startsAt = '2026-12-01T03:00:00.000Z';
  Tenant.findOneAndUpdate = (async (_filter: any, update: any) => {
    assert.equal(update.$set.firstRequestPromotionStartsAt, startsAt);
    assert.equal(update.$set.firstRequestPromotionEndsAt, PROMOTION_END);
    tenant = { ...tenant, ...update.$set }; return tenant;
  }) as any;
  const result = await service().config({ ...account, role: 'admin' }, { enabled: true, startsAt, endsAt: PROMOTION_END });
  assert.equal(result.startsAt, startsAt); assert.equal(result.endsAt, PROMOTION_END);
  assert.equal((await service().quote(account, draft)).startsAt, startsAt);
});
test('an older client omitting the start date preserves the configured start', async () => {
  tenant.firstRequestPromotionStartsAt = '2026-12-01T03:00:00.000Z';
  Tenant.findOneAndUpdate = (async (_filter: any, update: any) => {
    assert.equal(update.$set.firstRequestPromotionStartsAt, tenant.firstRequestPromotionStartsAt);
    tenant = { ...tenant, ...update.$set }; return tenant;
  }) as any;
  const result = await service().config({ ...account, role: 'admin' }, { enabled: false, endsAt: PROMOTION_END });
  assert.equal(result.startsAt, '2026-12-01T03:00:00.000Z');
});
