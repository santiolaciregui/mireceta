/**
 * File: mercadoPagoReconciliation.spec.ts
 * Task: US-009 / T-001, T-005
 * Date: 2026-09-17
 * Decisions: Pure reconciliation tests cover ordering, association, amount integrity and idempotency.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMercadoPagoReconciliation,
  selectBestMercadoPagoPayment,
} from './mercadoPagoReconciliation.js';

test('selects the newest sufficient approved payment regardless of provider result order', () => {
  const selected = selectBestMercadoPagoPayment([
    { id: 1, status: 'rejected', external_reference: 'REC-1', transaction_amount: 10000, date_created: '2026-09-17T10:00:00Z' },
    { id: 2, status: 'approved', external_reference: 'REC-1', transaction_amount: 10000, date_created: '2026-09-17T10:05:00Z' },
    { id: 3, status: 'approved', external_reference: 'REC-1', transaction_amount: 10000, date_created: '2026-09-17T10:07:00Z' },
  ], 'REC-1', 10000);

  assert.equal(selected?.id, 3);
});

test('ignores payments explicitly associated with another order', () => {
  const selected = selectBestMercadoPagoPayment([
    { id: 1, status: 'approved', external_reference: 'REC-OTHER', transaction_amount: 10000 },
  ], 'REC-1', 10000);

  assert.equal(selected, null);
});

test('does not downgrade an approved order after a rejected retry', () => {
  const decision = buildMercadoPagoReconciliation({
    id: 'REC-1',
    paymentStatus: 'approved',
    paymentId: '10',
    paymentAmount: '10000',
    status: 'En revisión',
  }, {
    id: 11,
    status: 'rejected',
    external_reference: 'REC-1',
    transaction_amount: 10000,
  });

  assert.equal(decision.shouldPersist, false);
  assert.equal(decision.paymentStatus, 'approved');
  assert.equal(decision.paymentId, '10');
});

test('uses the official approval date and is idempotent for an already reconciled payment', () => {
  const decision = buildMercadoPagoReconciliation({
    id: 'REC-1',
    paymentStatus: 'approved',
    paymentId: '20',
    paymentAmount: '10000',
    paymentDate: '2026-09-17T10:00:00.000Z',
    status: 'En revisión',
  }, {
    id: 20,
    status: 'approved',
    external_reference: 'REC-1',
    transaction_amount: 10000,
    date_approved: '2026-09-17T10:00:00Z',
  });

  assert.equal(decision.shouldPersist, false);
  assert.equal(decision.paymentDate, '2026-09-17T10:00:00.000Z');
});

test('rejects an underpaid approval without changing the clinical status', () => {
  const decision = buildMercadoPagoReconciliation({
    id: 'REC-1',
    paymentStatus: 'pending',
    paymentId: 'MP-TEMP',
    paymentAmount: '10000',
    status: 'Pendiente',
  }, {
    id: 30,
    status: 'approved',
    external_reference: 'REC-1',
    transaction_amount: 9000,
  });

  assert.equal(decision.shouldPersist, true);
  assert.equal(decision.paymentStatus, 'rejected');
  assert.equal(decision.orderStatus, 'Pendiente');
  assert.equal(decision.reason, 'underpaid');
});
