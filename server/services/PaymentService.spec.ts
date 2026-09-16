import assert from 'node:assert/strict';
import test from 'node:test';
import { Payment, MerchantOrder } from 'mercadopago';
import { PaymentService } from './PaymentService.js';

test('refunds an approved Checkout payment that belongs to the order', async () => {
  const originalGet = (Payment.prototype as any).get;
  const originalFetch = globalThis.fetch;
  const service: any = new PaymentService();

  (Payment.prototype as any).get = async () => ({
    status: 'approved',
    external_reference: 'ORD-123',
    transaction_amount: 10000,
  });
  service.tenantRepo = { findById: async () => ({ mpAccessToken: 'TEST-token' }) };
  globalThis.fetch = async (url, init) => {
    assert.match(String(url), /\/v1\/payments\/123456\/refunds$/);
    assert.equal(init?.method, 'POST');
    assert.equal(init?.headers?.['X-Idempotency-Key'].length, 64);
    return new Response(JSON.stringify({ id: 987654 }), { status: 201 });
  };

  try {
    const result = await service.refundApprovedCheckoutPayment({
      id: 'ORD-123',
      tenantId: 'TEN-123',
      paymentMethod: 'mp',
      paymentStatus: 'approved',
      paymentId: '123456',
      paymentAmount: '10000',
    });

    assert.deepEqual(result, { refunded: true, refundId: '987654' });
  } finally {
    (Payment.prototype as any).get = originalGet;
    globalThis.fetch = originalFetch;
  }
});

test('does not attempt an API refund for a bank transfer', async () => {
  const service = new PaymentService();

  const result = await service.refundApprovedCheckoutPayment({
    id: 'ORD-123',
    paymentMethod: 'transfer',
    paymentStatus: 'approved',
    paymentId: 'TRANS-123',
    paymentAmount: '10000',
  });

  assert.deepEqual(result, {
    refunded: false,
    reason: 'El pago no fue realizado mediante Mercado Pago Checkout.',
  });
});

test('synchronizes a pending order with a temporary payment ID by external reference', async () => {
  const originalSearch = (Payment.prototype as any).search;
  const service: any = new PaymentService();
  const order: any = {
    id: 'ORD-456',
    tenantId: 'TEN-123',
    patientName: 'Cesar',
    patientLastName: 'Elorriaga',
    paymentStatus: 'pending',
    paymentId: 'MP-12345678',
    paymentAmount: '10000',
    status: 'Pendiente',
    auditLog: [],
  };

  (Payment.prototype as any).search = async ({ options }: any) => {
    assert.equal(options.external_reference, 'ORD-456');
    return { results: [{ id: 654321, status: 'approved', transaction_amount: 10000 }] };
  };
  service.orderRepo = {
    findById: async () => order,
    update: async (_id: string, updatedOrder: any) => updatedOrder,
  };
  service.tenantRepo = { findById: async () => ({ mpAccessToken: 'TEST-token' }) };
  service.refreshPendingOrderLimitAlert = async () => undefined;

  try {
    const result = await service.getPaymentStatus('ORD-456');

    assert.equal(result.paymentStatus, 'approved');
    assert.equal(result.paymentId, '654321');
    assert.equal(result.status, 'En revisión');
  } finally {
    (Payment.prototype as any).search = originalSearch;
  }
});

test('keeps an emitted recipe emitted when synchronizing its late payment', async () => {
  const originalSearch = (Payment.prototype as any).search;
  const service: any = new PaymentService();
  const order: any = {
    id: 'ORD-789',
    tenantId: 'TEN-123',
    patientName: 'Cesar',
    patientLastName: 'Elorriaga',
    paymentStatus: 'pending',
    paymentId: 'MP-87654321',
    paymentAmount: '10000',
    status: 'Emitida',
    auditLog: [],
  };

  (Payment.prototype as any).search = async () => ({
    results: [{ id: 987654, status: 'approved', transaction_amount: 10000 }],
  });
  service.orderRepo = {
    findById: async () => order,
    update: async (_id: string, updatedOrder: any) => updatedOrder,
  };
  service.tenantRepo = { findById: async () => ({ mpAccessToken: 'TEST-token' }) };
  service.refreshPendingOrderLimitAlert = async () => undefined;

  try {
    const result = await service.getPaymentStatus('ORD-789');

    assert.equal(result.paymentStatus, 'approved');
    assert.equal(result.status, 'Emitida');
  } finally {
    (Payment.prototype as any).search = originalSearch;
  }
});

test('keeps the clinical request open when Mercado Pago rejects a payment', async () => {
  const originalSearch = (Payment.prototype as any).search;
  const service: any = new PaymentService();
  const order: any = {
    id: 'ORD-REJECTED',
    tenantId: 'TEN-123',
    patientName: 'Cesar',
    patientLastName: 'Elorriaga',
    paymentStatus: 'pending',
    paymentId: 'MP-12345678',
    paymentAmount: '10000',
    status: 'Pendiente',
    auditLog: [],
  };

  (Payment.prototype as any).search = async () => ({
    results: [{ id: 123456, status: 'rejected', transaction_amount: 10000 }],
  });
  service.orderRepo = {
    findById: async () => order,
    update: async (_id: string, updatedOrder: any) => updatedOrder,
  };
  service.tenantRepo = { findById: async () => ({ mpAccessToken: 'TEST-token' }) };
  service.refreshPendingOrderLimitAlert = async () => undefined;

  try {
    const result = await service.getPaymentStatus('ORD-REJECTED');

    assert.equal(result.paymentStatus, 'rejected');
    assert.equal(result.status, 'Pendiente');
  } finally {
    (Payment.prototype as any).search = originalSearch;
  }
});

test('processes merchant_order webhook and prioritizes approved payment when earlier attempt was rejected', async () => {
  const originalMerchantOrderGet = (MerchantOrder.prototype as any).get;
  const service: any = new PaymentService();
  const order: any = {
    id: 'REC-1431',
    tenantId: 'TEN-123',
    patientName: 'Silvia',
    patientLastName: 'Fuhr',
    paymentStatus: 'pending',
    paymentId: 'MP-12743518',
    paymentAmount: '10000',
    status: 'Pendiente',
    auditLog: [],
  };

  (MerchantOrder.prototype as any).get = async ({ merchantOrderId }: any) => {
    assert.equal(merchantOrderId, '44487570489');
    return {
      id: 44487570489,
      status: 'closed',
      order_status: 'paid',
      external_reference: 'REC-1431',
      payments: [
        {
          id: 178318357921,
          status: 'rejected',
          transaction_amount: 10000,
          date_created: '2026-09-16T09:51:50.000Z',
        },
        {
          id: 178318740803,
          status: 'approved',
          transaction_amount: 10000,
          date_created: '2026-09-16T09:53:16.000Z',
        },
      ],
    };
  };

  let updatedOrder: any = null;
  service.orderRepo = {
    findById: async (id: string) => (id === 'REC-1431' ? order : null),
    update: async (_id: string, updateData: any) => {
      updatedOrder = updateData;
      return updateData;
    },
  };
  service.tenantRepo = {
    findAll: async () => [{ id: 'TEN-123', mpAccessToken: 'TEST-token' }],
  };
  service.refreshPendingOrderLimitAlert = async () => undefined;

  try {
    const result = await service.processWebhook(
      { topic: 'merchant_order', id: '44487570489' },
      {},
      {}
    );

    assert.equal(result.received, true);
    assert.equal(result.paymentId, 178318740803);
    assert.equal(result.status, 'approved');
    assert.equal(result.orderId, 'REC-1431');
    assert.equal(updatedOrder.paymentStatus, 'approved');
    assert.equal(updatedOrder.paymentId, '178318740803');
    assert.equal(updatedOrder.status, 'En revisión');
    assert.ok(updatedOrder.auditLog.some((e: any) => e.action === 'Mercado Pago Webhook: approved'));
  } finally {
    (MerchantOrder.prototype as any).get = originalMerchantOrderGet;
  }
});

test('synchronizes a pending order prioritizing the approved payment over earlier rejected attempts', async () => {
  const originalSearch = (Payment.prototype as any).search;
  const service: any = new PaymentService();
  const order: any = {
    id: 'REC-1431',
    tenantId: 'TEN-123',
    patientName: 'Silvia',
    patientLastName: 'Fuhr',
    paymentStatus: 'pending',
    paymentId: 'MP-12743518',
    paymentAmount: '10000',
    status: 'Pendiente',
    auditLog: [],
  };

  (Payment.prototype as any).search = async ({ options }: any) => {
    assert.equal(options.external_reference, 'REC-1431');
    return {
      // In Mercado Pago, results are sorted chronologically ascending by default
      results: [
        { id: 178318357921, status: 'rejected', transaction_amount: 10000, date_created: '2026-09-16T09:51:50.000Z' },
        { id: 178318740803, status: 'approved', transaction_amount: 10000, date_created: '2026-09-16T09:53:16.000Z' },
      ],
    };
  };
  service.orderRepo = {
    findById: async () => order,
    update: async (_id: string, updated: any) => updated,
  };
  service.tenantRepo = { findById: async () => ({ mpAccessToken: 'TEST-token' }) };
  service.refreshPendingOrderLimitAlert = async () => undefined;

  try {
    const result = await service.getPaymentStatus('REC-1431');

    assert.equal(result.paymentStatus, 'approved');
    assert.equal(result.paymentId, '178318740803');
    assert.equal(result.status, 'En revisión');
  } finally {
    (Payment.prototype as any).search = originalSearch;
  }
});

