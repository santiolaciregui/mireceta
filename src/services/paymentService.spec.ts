/**
 * File: paymentService.spec.ts
 * Task: US-009 / T-004, T-005
 * Date: 2026-09-17
 * Decisions: Return synchronization retries only bounded transient/pending responses.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { syncMercadoPagoReturn } from './paymentService.js';

test('retries a pending Mercado Pago return until the provider verifies it', async () => {
  let calls = 0;
  const result = await syncMercadoPagoReturn({ orderId: 'REC-1', payment: 'approved' }, {
    attempts: 3,
    delayMs: 0,
    sleep: async () => undefined,
    fetchImpl: async () => {
      calls += 1;
      return new Response(JSON.stringify(
        calls === 1
          ? { verificationPending: true, paymentStatus: 'pending' }
          : { verificationPending: false, paymentStatus: 'approved' }
      ), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });

  assert.equal(calls, 2);
  assert.equal(result.paymentStatus, 'approved');
});

test('stops after the configured attempts while preserving the pending response', async () => {
  let calls = 0;
  const result = await syncMercadoPagoReturn({ orderId: 'REC-2', payment: 'approved' }, {
    attempts: 2,
    delayMs: 0,
    sleep: async () => undefined,
    fetchImpl: async () => {
      calls += 1;
      return new Response(JSON.stringify({ verificationPending: true, paymentStatus: 'pending' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  assert.equal(calls, 2);
  assert.equal(result.paymentStatus, 'pending');
});

test('reports bounded HTTP and network failures before a verified return', async () => {
  const events: any[] = [];
  let calls = 0;
  const result = await syncMercadoPagoReturn({ orderId: 'REC-1' }, {
    attempts: 3, sleep: async () => undefined,
    onAttempt: event => events.push(event),
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) throw new Error('offline');
      if (calls === 2) return new Response('{}', { status: 503 });
      return new Response(JSON.stringify({ verifiedWithApi: true, verificationPending: false }));
    },
  });
  assert.equal(result.verifiedWithApi, true);
  assert.deepEqual(events.map(event => event.outcome), ['network_error', 'http_error', 'verified']);
  assert.equal(events[1].httpStatus, 503);
  assert.equal(events[2].attempt, 3);
});

test('diagnostic callback failures do not change return synchronization', async () => {
  const result = await syncMercadoPagoReturn({ orderId: 'REC-1' }, {
    onAttempt: () => { throw new Error('diagnostics unavailable'); },
    fetchImpl: async () => new Response(JSON.stringify({ verificationPending: false, paymentStatus: 'approved' })),
  });
  assert.equal(result.paymentStatus, 'approved');
});
