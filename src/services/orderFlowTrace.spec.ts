/** US-013 / T-004, 2026-10-21. Exercise correlation across independent form instances. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createOrderFlowTrace } from './orderFlowTrace.js';

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

test('correlates a changed request ID with the previous submitted order after reopening', () => {
  const local = storage(); const session = storage();
  const first = createOrderFlowTrace('user', { local, session, send: () => undefined });
  first.remember('request-one', 'REC-ONE');
  const next = createOrderFlowTrace('user', { local, session, send: () => undefined });
  const context = next.snapshot('request-two');
  assert.equal(context.previousClientRequestId, 'request-one');
  assert.equal(context.previousOrderId, 'REC-ONE');
  assert.equal(context.requestIdChanged, true);
  assert.equal(context.sessionId, first.snapshot('request-one').sessionId);
  assert.notEqual(context.formId, first.snapshot('request-one').formId);
});

test('distinguishes restored requests from changed IDs and isolates different users', () => {
  const local = storage(); const session = storage();
  createOrderFlowTrace('user-a', { local, session }).remember('request-one', 'REC-ONE');
  assert.equal(createOrderFlowTrace('user-a', { local, session }).snapshot('request-one').requestIdChanged, false);
  assert.equal(createOrderFlowTrace('user-b', { local, session }).snapshot('request-two').previousOrderId, undefined);
});

test('records blocked storage without preventing checkout diagnostics', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const events: any[] = [];
  const trace = createOrderFlowTrace('user', { local: blocked, session: blocked, send: event => events.push(event) });
  trace.remember('request-one', 'REC-ONE');
  trace.storageFailure('write'); trace.storageFailure('write');
  trace.event('checkout_started', trace.snapshot('request-one'));
  assert.equal(events.length, 2);
  assert.equal(events[1].context.persisted, false);
});

test('limits browser telemetry and isolates transport failures', () => {
  let calls = 0;
  const trace = createOrderFlowTrace('user', {
    local: storage(), session: storage(), send() { calls += 1; throw new Error('offline'); },
  });
  for (let i = 0; i < 100; i++) trace.event('checkout_started');
  assert.equal(calls, 40);
});

test('emits one successful draft save per form rather than logging every keystroke', () => {
  const events: any[] = [];
  const trace = createOrderFlowTrace('user', { local: storage(), session: storage(), send: event => events.push(event) });
  trace.draftSaved(false); trace.draftSaved(true); trace.draftSaved(true);
  trace.draftLoaded('expired');
  assert.deepEqual(events.map(event => event.event), ['draft_saved', 'draft_loaded']);
  assert.equal(events[1].context.draftOutcome, 'expired');
});

test('uses authenticated keepalive transport and never sends without a token', async () => {
  const previousStorage = globalThis.localStorage;
  const previousFetch = globalThis.fetch;
  const requests: any[] = [];
  let token = '';
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => token } });
  globalThis.fetch = async (url, init) => { requests.push({ url, ...init }); return new Response(null, { status: 202 }); };
  try {
    const trace = createOrderFlowTrace('user', { local: storage(), session: storage() });
    trace.event('form_opened');
    assert.equal(requests.length, 0);
    token = 'test-auth'; trace.event('form_opened');
    assert.equal(requests[0].headers.Authorization, 'Bearer test-auth');
    assert.equal(requests[0].keepalive, true);
    assert.equal(requests[0].url, '/api/orders/flow-events');
    assert.ok(!requests[0].body.includes('test-auth'));
  } finally {
    globalThis.fetch = previousFetch;
    if (previousStorage === undefined) delete (globalThis as any).localStorage;
    else Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previousStorage });
  }
});
