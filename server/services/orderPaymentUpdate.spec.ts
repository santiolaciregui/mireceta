/**
 * File: orderPaymentUpdate.spec.ts
 * Task: US-004 / T-005
 * Date: 2026-09-16
 * Decisions: Tests exercise pure validation plus the service authorization and audit boundary.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { auditLogService } from './AuditLogService.js';
import { OrderService } from './OrderService.js';
import {
  hasPaymentInformationUpdate,
  normalizePaymentInformationUpdate,
} from './orderPaymentUpdate.js';

test('detects payment information fields without matching unrelated updates', () => {
  assert.equal(hasPaymentInformationUpdate({ paymentAmount: '12000' }), true);
  assert.equal(hasPaymentInformationUpdate({ doctorNotes: 'Checked' }), false);
});

test('normalizes an exempt correction to a bonified zero-amount payment', () => {
  const result = normalizePaymentInformationUpdate(
    { paymentStatus: 'exempt', paymentAmount: '9000' },
    { paymentMethod: 'mp', paymentAmount: '9000', paymentStatus: 'pending' }
  );

  assert.deepEqual(result, {
    paymentStatus: 'exempt',
    paymentAmount: '0',
    paymentMethod: 'bonificado',
  });
});

test('rejects invalid payment amounts and dates', () => {
  assert.throws(
    () => normalizePaymentInformationUpdate({ paymentAmount: '-1' }, {}),
    /mayor o igual a cero/
  );
  assert.throws(
    () => normalizePaymentInformationUpdate({ paymentDate: 'not-a-date' }, {}),
    /fecha de pago informada no es válida/
  );
});

test('rejects payment corrections from non-collaborators', async () => {
  const service: any = new OrderService();
  service.orderRepo = {
    findById: async () => ({
      id: 'ORD-1',
      tenantId: 'TEN-123',
      paymentMethod: 'mp',
      paymentAmount: '10000',
      paymentStatus: 'pending',
      status: 'Pendiente',
    }),
  };

  await assert.rejects(
    () => service.updateOrder(
      'ORD-1',
      { paymentAmount: '12000' },
      { id: 'MED-1', role: 'medico', name: 'Ana', lastName: 'Médica', tenantId: 'TEN-123' }
    ),
    /Solo los colaboradores/
  );
});

test('persists and audits a collaborator payment correction without provider calls', async () => {
  const service: any = new OrderService();
  const order: any = {
    id: 'ORD-2',
    tenantId: 'TEN-123',
    patientName: 'Paciente',
    patientLastName: 'Prueba',
    paymentMethod: 'mp',
    paymentAmount: '10000',
    paymentStatus: 'pending',
    paymentId: 'MP-OLD',
    paymentDate: '',
    status: 'Pendiente',
    auditLog: [],
  };
  let persisted: any;
  let globalAudit: any;
  const originalAuditLog = auditLogService.log;

  service.orderRepo = {
    findById: async () => order,
    update: async (_id: string, value: any) => {
      persisted = value;
      return value;
    },
  };
  service.refreshPendingOrderLimitAlert = async () => undefined;
  auditLogService.log = async (entry: any) => {
    globalAudit = entry;
  };

  try {
    const result = await service.updateOrder(
      'ORD-2',
      {
        paymentMethod: 'transfer',
        paymentAmount: '12500',
        paymentStatus: 'approved',
        paymentId: 'TR-123',
        paymentDate: '2026-09-16T12:30',
      },
      { id: 'COL-1', role: 'colaborador', name: 'Carla', lastName: 'Operadora', tenantId: 'TEN-123' }
    );

    assert.equal(result, persisted);
    assert.equal(persisted.paymentMethod, 'transfer');
    assert.equal(persisted.paymentAmount, '12500');
    assert.equal(persisted.paymentStatus, 'approved');
    assert.equal(persisted.paymentId, 'TR-123');
    assert.equal(persisted.paymentDate, '2026-09-16T15:30:00.000Z');
    assert.equal(persisted.auditLog.at(-1).action, 'Información de pago actualizada');
    assert.equal(globalAudit.action, 'ORDER_PAYMENT_UPDATE');
  } finally {
    auditLogService.log = originalAuditLog;
  }
});
