/** US-010 / T-003: Every supported request/payment pair has one operational inbox. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { MedicalOrder, OrderStatus } from '../types';
import { getOrderInbox } from './orderInbox';

const clinicalStatuses: OrderStatus[] = [
  'Pendiente', 'En revisión', 'Solicita más información', 'Aprobada',
  'Emitida', 'Enviada', 'Rechazada', 'Cancelada',
];
const paymentStatuses: MedicalOrder['paymentStatus'][] = [
  'pending', 'approved', 'exempt', 'rejected', 'refunded', undefined,
];

for (const status of clinicalStatuses) {
  for (const paymentStatus of paymentStatuses) {
    test(`routes ${status} / ${paymentStatus ?? 'missing payment'} without gaps or overlaps`, () => {
      const order = { status, paymentStatus };
      const inbox = getOrderInbox(order);
      if (status === 'Emitida' || status === 'Enviada') assert.equal(inbox, 'completed');
      else if (status === 'Rechazada' || status === 'Cancelada') assert.equal(inbox, 'closed');
      else if (paymentStatus === 'approved' || paymentStatus === 'exempt') assert.equal(inbox, 'review');
      else assert.equal(inbox, 'pending');
    });
  }
}

test('routes a historical paid pending request without mutating the persisted state', () => {
  const order = Object.freeze({ status: 'Pendiente' as const, paymentStatus: 'approved' as const });
  assert.equal(getOrderInbox(order), 'review');
  assert.equal(order.status, 'Pendiente');
});
