/**
 * File: orderInbox.spec.ts
 * Task: US-007 / T-004
 * Date: 2026-09-16
 * Decisions: Cover chronological order, immutable input, deterministic fallbacks, and visible minutes.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatOrderCreatedAt, sortOrdersNewestFirst } from '../../../utils/orderInbox';

describe('doctor order inbox chronology', () => {
  it('sorts orders from newest to oldest by creation time', () => {
    const orders = [
      { id: 'REC-OLD', createdAt: '2026-09-16T10:00:00.000Z' },
      { id: 'REC-NEW', createdAt: '2026-09-16T14:30:00.000Z' },
      { id: 'REC-MIDDLE', createdAt: '2026-09-16T12:00:00.000Z' },
    ];

    const sorted = sortOrdersNewestFirst(orders);

    assert.deepEqual(sorted.map(order => order.id), ['REC-NEW', 'REC-MIDDLE', 'REC-OLD']);
  });

  it('does not mutate the source order array', () => {
    const orders = [
      { id: 'REC-OLD', createdAt: '2026-09-16T10:00:00.000Z' },
      { id: 'REC-NEW', createdAt: '2026-09-16T14:30:00.000Z' },
    ];

    sortOrdersNewestFirst(orders);

    assert.deepEqual(orders.map(order => order.id), ['REC-OLD', 'REC-NEW']);
  });

  it('uses the order ID for equal, missing, or invalid timestamps', () => {
    const sorted = sortOrdersNewestFirst([
      { id: 'REC-3000', createdAt: 'invalid-date' },
      { id: 'REC-1000', createdAt: undefined },
      { id: 'REC-2000', createdAt: 'invalid-date' },
    ]);

    assert.deepEqual(sorted.map(order => order.id), ['REC-1000', 'REC-2000', 'REC-3000']);
  });

  it('shows the local date with hours and minutes', () => {
    const value = new Date(2026, 8, 16, 14, 5);
    const formatted = formatOrderCreatedAt(value);

    assert.match(formatted, /16\/09\/2026/);
    assert.match(formatted, /14:05/);
  });

  it('shows a safe fallback for an invalid timestamp', () => {
    assert.equal(formatOrderCreatedAt('invalid-date'), 'Fecha no disponible');
  });
});
