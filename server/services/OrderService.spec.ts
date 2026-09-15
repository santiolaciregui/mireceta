import assert from 'node:assert/strict';
import test from 'node:test';
import { Order } from '../models/Order.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { OrderService } from './OrderService.js';

test('builds a lightweight database projection that removes binary order fields', async () => {
  const originalAggregate = (Order as any).aggregate;
  let capturedPipeline: any[] = [];
  (Order as any).aggregate = async (pipeline: any[]) => {
    capturedPipeline = pipeline;
    return [];
  };

  try {
    const repository = new OrderRepository();
    await repository.findSummariesByTenant('TEN-123');

    assert.deepEqual(capturedPipeline[0], { $match: { tenantId: 'TEN-123' } });
    assert.deepEqual(capturedPipeline[1], { $sort: { createdAt: -1 } });
    assert.equal(capturedPipeline[2].$set._isSummary, true);
    assert.deepEqual(capturedPipeline[3].$unset, [
      'medicationPhotos.url',
      'medicationPhotoUrl',
      'paymentReceiptUrl',
      'messages.fileUrl',
    ]);
  } finally {
    (Order as any).aggregate = originalAggregate;
  }
});

test('uses the lightweight tenant query when order summaries are requested', async () => {
  const service: any = new OrderService();
  let fullQueryCalled = false;
  service.orderRepo = {
    findSummariesByTenant: async (tenantId: string) => {
      assert.equal(tenantId, 'TEN-123');
      return [{ id: 'ORD-1', _isSummary: true }];
    },
    findByTenant: async () => {
      fullQueryCalled = true;
      return [];
    },
  };

  const result = await service.getOrdersForUser(
    { role: 'medico', tenantId: 'TEN-123' },
    true
  );

  assert.equal(fullQueryCalled, false);
  assert.deepEqual(result, [{ id: 'ORD-1', _isSummary: true }]);
});

test('keeps patient and dependent filtering when order summaries are requested', async () => {
  const service: any = new OrderService();
  service.orderRepo = {
    findSummariesByPatientDnis: async (tenantId: string, dnis: string[]) => {
      assert.equal(tenantId, 'TEN-123');
      assert.ok(dnis.includes('12345678'));
      assert.ok(dnis.includes('87654321'));
      return [
        { id: 'ORD-TITULAR', patientDni: '12.345.678', _isSummary: true },
        { id: 'ORD-DEPENDENT', patientDni: '87.654.321', _isSummary: true },
        { id: 'ORD-OTHER', patientDni: '11.111.111', _isSummary: true },
      ];
    },
  };

  const result = await service.getOrdersForUser(
    {
      role: 'paciente',
      tenantId: 'TEN-123',
      identifier: '12.345.678',
      dependents: [{ dni: '87.654.321' }],
    },
    true
  );

  assert.deepEqual(result.map((order: any) => order.id), ['ORD-TITULAR', 'ORD-DEPENDENT']);
});

test('rejects loading order details from another tenant', async () => {
  const service: any = new OrderService();
  service.orderRepo = {
    findById: async () => ({ id: 'ORD-1', tenantId: 'TEN-OTHER', patientDni: '12345678' }),
  };

  await assert.rejects(
    () => service.getOrderForUser('ORD-1', { role: 'medico', tenantId: 'TEN-123' }),
    /Acceso no autorizado/
  );
});

test('allows a patient to load details for a registered dependent', async () => {
  const service: any = new OrderService();
  const order = { id: 'ORD-1', tenantId: 'TEN-123', patientDni: '87.654.321' };
  service.orderRepo = { findById: async () => order };

  const result = await service.getOrderForUser('ORD-1', {
    role: 'paciente',
    tenantId: 'TEN-123',
    identifier: '12.345.678',
    dependents: [{ identifier: '87.654.321' }],
  });

  assert.equal(result, order);
});
