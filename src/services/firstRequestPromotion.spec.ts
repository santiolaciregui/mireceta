/** US-016: client requests are authenticated and never silently replace a failed discount with a charge. */
import assert from 'node:assert/strict';
import test, { beforeEach, afterEach } from 'node:test';
import { quotePromotion, applyPromotion } from './firstRequestPromotion';
const originalFetch = globalThis.fetch;
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const quote = { eligible: true, reason: '', endsAt: '2026-12-16T03:00:00Z', originalAmount: 20000, discount: 10000, finalAmount: 10000 };
beforeEach(() => { Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'test-token' } }); });
afterEach(() => { globalThis.fetch = originalFetch; if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage); else delete (globalThis as any).localStorage; });
test('queries the server with authentication and without caching eligibility', async () => {
  const data = { medicationMethod: 'manual', medicationItems: [{ nombreComercial: 'Synthetic medicine' }] };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/first-request-promotion/quote'); assert.equal(options.method, 'POST'); assert.equal(options.cache, 'no-store');
    assert.equal((options.headers as any).Authorization, 'Bearer test-token'); assert.deepEqual(JSON.parse(String(options.body)), data);
    return new Response(JSON.stringify(quote));
  };
  assert.deepEqual(await quotePromotion(data), quote);
});
test('resumes only the selected exact request ID instead of guessing a similar request', async () => {
  globalThis.fetch = async (_url, options) => {
    assert.deepEqual(JSON.parse(String(options.body)), { orderId: 'REC-SELECTED' });
    return new Response(JSON.stringify(quote));
  };
  await quotePromotion({ orderId: 'REC-SELECTED' });
});
test('confirms precisely the displayed amounts for an existing request', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/first-request-promotion/apply/REC%2F1');
    assert.equal(options.method, 'POST'); assert.equal((options.headers as any).Authorization, 'Bearer test-token');
    assert.deepEqual(JSON.parse(String(options.body)), { confirmation: quote });
    return new Response(JSON.stringify({ id: 'REC/1', paymentAmount: '10000' }));
  };
  assert.equal((await applyPromotion('REC/1', quote)).paymentAmount, '10000');
});
test('a changed quote or concurrent claim is surfaced once, without full-price fallback', async () => {
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++; assert.equal(url, '/api/first-request-promotion/apply/REC-1');
    return new Response(JSON.stringify({ error: 'El arancel cambió. Confirmá nuevamente.' }), { status: 409 });
  };
  await assert.rejects(applyPromotion('REC-1', quote), /El arancel cambió/); assert.equal(calls, 1);
});
test('network failure does not fabricate a successful quote or start a payment', async () => {
  let calls = 0; globalThis.fetch = async () => { calls++; throw new Error('offline'); };
  await assert.rejects(quotePromotion({ orderId: 'REC-1' }), /offline/); assert.equal(calls, 1);
});
test('authentication failure remains an error instead of granting a free request', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Sesión vencida.' }), { status: 401 });
  await assert.rejects(quotePromotion({ orderId: 'REC-1' }), /Sesión vencida/);
});
