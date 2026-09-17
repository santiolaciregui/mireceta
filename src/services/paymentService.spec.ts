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
