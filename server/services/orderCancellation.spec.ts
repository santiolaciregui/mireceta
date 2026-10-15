/** US-011: cancellation keeps the request, payments and history available. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { Order } from '../models/Order.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { OrderService } from './OrderService.js';
import { auditLogService } from './AuditLogService.js';

const operator = { role: 'colaborador', tenantId: 'TEN-1', name: 'Operator', lastName: 'One' };

async function fixture(run: (context: any) => Promise<void>, overrides: Record<string, unknown> = {}) {
  const service: any = new OrderService();
  const order = {
    id: 'REC-1', tenantId: 'TEN-1', patientDni: '12345678', status: 'Pendiente',
    paymentStatus: 'approved', paymentId: 'PAY-1', recipeFiles: [],
    auditLog: [{ action: 'Creada', user: 'Patient', timestamp: '2026-10-01' }], ...overrides,
  };
  let calls = 0;
  let audit: any;
  service.orderRepo = {
    findById: async () => order,
    delete: () => { throw new Error('Must never delete requests'); },
    cancelIfActive: async (id: string, statuses: string[], entry: any) => {
      calls++;
      assert.equal(id, order.id);
      assert.ok(statuses.includes(order.status));
      return { ...order, status: 'Cancelada', auditLog: [...order.auditLog, entry] };
    },
  };
  service.paymentService = { refundApprovedCheckoutPayment: () => { throw new Error('Unexpected provider operation'); } };
  service.refreshPendingOrderLimitAlert = async () => {};
  const original = auditLogService.log;
  auditLogService.log = async (params: any) => { audit = params; };
  try { await run({ service, order, calls: () => calls, audit: () => audit }); }
  finally { auditLogService.log = original; }
}

for (const status of ['Pendiente', 'En revisión', 'Aprobada', 'Solicita más información']) {
  test(`cancels ${status} without deleting its history or changing payment`, async () => {
    await fixture(async ({ service, order, calls, audit }) => {
      const result = await service.deleteOrder(order.id, operator);
      assert.equal(result.success, true);
      assert.equal(calls(), 1);
      assert.equal(result.order.status, 'Cancelada');
      assert.equal(result.order.paymentStatus, 'approved');
      assert.equal(result.order.paymentId, 'PAY-1');
      assert.equal(result.order.auditLog.length, 2);
      assert.equal(result.order.auditLog[0].action, 'Creada');
      assert.equal(result.order.auditLog[1].action, 'Cancelada');
      assert.equal(audit().action, 'ORDER_CANCEL');
      assert.deepEqual(audit().changes.status, { from: status, to: 'Cancelada' });
    }, { status });
  });
}
for (const status of ['Emitida', 'Enviada', 'Rechazada']) {
  test(`preserves ${status} against a direct DELETE request`, async () => {
    await fixture(async ({ service, order, calls }) => {
      await assert.rejects(service.deleteOrder(order.id, operator), /no admite cancelación/);
      assert.equal(calls(), 0);
    }, { status });
  });
}

test('is idempotent for an already cancelled request', async () => {
  await fixture(async ({ service, order, calls, audit }) => {
    const result = await service.deleteOrder(order.id, operator);
    assert.equal(result.order, order);
    assert.equal(calls(), 0);
    assert.equal(audit(), undefined);
  }, { status: 'Cancelada' });
});

for (const user of [
  { ...operator, tenantId: 'TEN-OTHER' },
  { ...operator, role: 'admin' },
  { ...operator, role: 'unknown' },
  { ...operator, role: 'paciente', identifier: '99999999' },
]) {
  test(`rejects cancellation by unauthorized ${user.role} / ${user.tenantId}`, async () => {
    await fixture(async ({ service, order, calls }) => {
      await assert.rejects(service.deleteOrder(order.id, user), /permiso/);
      assert.equal(calls(), 0);
    });
  });
}

test('permits a patient to cancel a dependent request identified by identifier', async () => {
  await fixture(async ({ service, order }) => {
    const result = await service.deleteOrder(order.id, {
      ...operator, role: 'paciente', identifier: '99999999', dependents: [{ identifier: '12.345.678' }],
    });
    assert.equal(result.order.status, 'Cancelada');
  });
});

test('prevents patient cancellation after clinical approval', async () => {
  await fixture(async ({ service, order, calls }) => {
    await assert.rejects(service.deleteOrder(order.id, {
      ...operator, role: 'paciente', identifier: order.patientDni,
    }), /no admite cancelación/);
    assert.equal(calls(), 0);
  }, { status: 'Aprobada' });
});

test('does not overwrite a request issued concurrently', async () => {
  await fixture(async ({ service, order, audit }) => {
    service.orderRepo.cancelIfActive = async () => null;
    await assert.rejects(service.deleteOrder(order.id, operator), /cambió de estado/);
    assert.equal(audit(), undefined);
  });
});

test('returns not found without attempting cancellation', async () => {
  await fixture(async ({ service, calls }) => {
    service.orderRepo.findById = async () => null;
    await assert.rejects(service.deleteOrder('MISSING', operator), /no encontrada/);
    assert.equal(calls(), 0);
  });
});

test('authorizes patients before returning an already cancelled request', async () => {
  await fixture(async ({ service, order, calls }) => {
    await assert.rejects(service.deleteOrder(order.id, {
      ...operator, role: 'paciente', identifier: '99999999',
    }), /permiso/);
    assert.equal(calls(), 0);
  }, { status: 'Cancelada' });
});

test('permits a patient to cancel their own in-review request', async () => {
  await fixture(async ({ service, order }) => {
    const result = await service.deleteOrder(order.id, {
      ...operator, role: 'paciente', identifier: '12.345.678',
    });
    assert.equal(result.order.status, 'Cancelada');
  }, { status: 'En revisión' });
});

test('rejects an authenticated operator without a tenant against another tenant', async () => {
  await fixture(async ({ service, order, calls }) => {
    await assert.rejects(service.deleteOrder(order.id, { ...operator, tenantId: undefined }), /otro centro/);
    assert.equal(calls(), 0);
  });
});

for (const identifier of [undefined, '', ' . ']) {
  test(`does not authorize an empty patient identifier (${String(identifier)}) against missing owner fields`, async () => {
    await fixture(async ({ service, order, calls }) => {
      await assert.rejects(service.deleteOrder(order.id, {
        ...operator, role: 'paciente', identifier,
      }), /permiso/);
      assert.equal(calls(), 0);
    }, { patientDni: '', requestedByTitularDni: '' });
  });
}

test('repository atomically restricts cancellation to active states and appends audit', async () => {
  const original = Order.findOneAndUpdate;
  const entry = { action: 'Cancelada', user: 'Operator', timestamp: '2026-10-15T12:00:00Z' };
  (Order as any).findOneAndUpdate = async (filter: any, update: any, options: any) => {
    assert.deepEqual(filter, { id: 'REC-1', status: { $in: ['Pendiente'] } });
    assert.deepEqual(update, {
      $set: { status: 'Cancelada', updatedAt: entry.timestamp },
      $push: { auditLog: { $each: [entry] } },
    });
    assert.deepEqual(options, { new: true, runValidators: true });
    return { id: 'REC-1', status: 'Cancelada' };
  };
  try { assert.equal((await new OrderRepository().cancelIfActive('REC-1', ['Pendiente'], entry))?.status, 'Cancelada'); }
  finally { Order.findOneAndUpdate = original; }
});
