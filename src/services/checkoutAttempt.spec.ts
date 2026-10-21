import assert from 'node:assert/strict';
import test from 'node:test';
import { checkoutFingerprint, clearCheckoutAttempt, createOrResumeCheckout, readCheckoutAttempt, type CheckoutLock } from './checkoutAttempt';

function fixture() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => { values.set(k, v); },
    removeItem: (k: string) => { values.delete(k); },
  };
  let tail = Promise.resolve();
  const lock: CheckoutLock = (_scope, work) => {
    const result = tail.then(work);
    tail = result.then(() => {}, () => {});
    return result;
  };
  return { storage, lock, values, scope: 'TEN-1:USR-1', clientRequestId: 'request-1',
    payload: { patientDni: '12345678', medicationText: 'test', paymentAmount: '10000' } };
}

test('reload and concurrent tabs retain the exact request and create one order', async () => {
  const f = fixture(); let creates = 0;
  const create = async (payload: any) => {
    assert.equal(readCheckoutAttempt(f.scope, f.storage)?.clientRequestId, payload.clientRequestId);
    creates++; return 'REC-1';
  };
  const lookup = async () => null;
  const [a, b] = await Promise.all([
    createOrResumeCheckout({ ...f, create, lookup }),
    createOrResumeCheckout({ ...f, clientRequestId: 'another-tab-id', create, lookup }),
  ]);
  assert.equal(creates, 1); assert.equal(a.orderId, b.orderId);
  assert.equal(Number(a.reused) + Number(b.reused), 1);
  assert.equal(a.clientRequestId, b.clientRequestId);
  assert.ok(['request-1', 'another-tab-id'].includes(b.clientRequestId));
  assert.ok(!JSON.stringify([...f.values.values()]).includes('12345678'));
  assert.equal(await checkoutFingerprint(f.payload), a.fingerprint);
});

test('lost create response resolves by exact request ID and never posts a second order', async () => {
  const f = fixture(); let committed: string | null = null; let creates = 0;
  const create = async () => { creates++; committed = 'REC-1'; throw new Error('response lost'); };
  await assert.rejects(createOrResumeCheckout({ ...f, create, lookup: async () => null }), /response lost/);
  const recovered = await createOrResumeCheckout({ ...f, clientRequestId: 'fresh-component-id', create,
    lookup: async request => { assert.equal(request, 'request-1'); return committed; } });
  assert.equal(recovered.orderId, 'REC-1'); assert.equal(creates, 1);
});

test('network lookup failure preserves identity and does not create or reset', async () => {
  const f = fixture(); let creates = 0;
  await assert.rejects(createOrResumeCheckout({ ...f, create: async () => { creates++; return 'REC-1'; },
    lookup: async () => { throw new Error('offline'); } }), /offline/);
  assert.equal(creates, 0); assert.equal(readCheckoutAttempt(f.scope, f.storage)?.clientRequestId, 'request-1');
});

test('changed medication or patient cannot silently reuse the linked order', async () => {
  const f = fixture(); let creates = 0;
  const create = async () => { creates++; return 'REC-1'; };
  await createOrResumeCheckout({ ...f, create, lookup: async () => null });
  for (const payload of [{ ...f.payload, medicationText: 'edited' }, { ...f.payload, patientDni: '87654321' }]) {
    await assert.rejects(createOrResumeCheckout({ ...f, payload, create }), /otros datos/);
  }
  assert.equal(creates, 1);
});

test('blocked storage or browser locking prevents creating an order', async () => {
  const f = fixture(); let creates = 0;
  const create = async () => { creates++; return 'REC-1'; };
  await assert.rejects(createOrResumeCheckout({ ...f, create, lookup: async () => null,
    storage: { ...f.storage, setItem: () => { throw new Error('quota'); } } }), /guardar/);
  await assert.rejects(createOrResumeCheckout({ ...f, create, lock: async () => { throw new Error('locking unavailable'); } }), /locking/);
  assert.equal(creates, 0);
});

test('only an explicit reset starts a new identity; tenant/user scopes remain isolated', async () => {
  const f = fixture(); let creates = 0;
  const create = async () => `REC-${++creates}`;
  await createOrResumeCheckout({ ...f, create, lookup: async () => null });
  assert.equal(readCheckoutAttempt('TEN-2:USR-1', f.storage), null);
  assert.equal(readCheckoutAttempt('TEN-1:USR-2', f.storage), null);
  await clearCheckoutAttempt(f.scope, f.storage, f.lock);
  const next = await createOrResumeCheckout({ ...f, clientRequestId: 'request-new', create, lookup: async () => null });
  assert.equal(next.clientRequestId, 'request-new'); assert.equal(creates, 2);
});

test('malformed journal fails closed instead of generating a replacement ID', () => {
  const f = fixture(); f.storage.setItem('mireceta_checkout_v1_TEN-1%3AUSR-1', '{broken');
  assert.throws(() => readCheckoutAttempt(f.scope, f.storage), /guardar/);
});
