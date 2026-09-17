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
    assert.ok(updatedOrder.auditLog.some((e: any) => e.action === 'Pago acreditado (Mercado Pago)'));
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

test('keeps the order pending when checkout return parameters cannot be verified with Mercado Pago', async () => {
  const originalSearch = (Payment.prototype as any).search;
  const originalMerchantOrderSearch = (MerchantOrder.prototype as any).search;
  const service: any = new PaymentService();
  const order: any = {
    id: 'REC-UNVERIFIED',
    tenantId: 'TEN-123',
    patientName: 'Test',
    patientLastName: 'Patient',
    paymentMethod: 'mp',
    paymentStatus: 'pending',
    paymentId: 'MP-TEMP',
    paymentAmount: '10000',
    status: 'Pendiente',
    auditLog: [],
  };

  (Payment.prototype as any).search = async () => ({ results: [] });
  (MerchantOrder.prototype as any).search = async () => ({ elements: [] });
  service.orderRepo = {
    findById: async () => order,
    update: async () => assert.fail('An unverified return must not update the order'),
  };
  service.tenantRepo = { findById: async () => ({ mpAccessToken: 'TEST-token' }) };

  try {
    const result = await service.syncReturn('REC-UNVERIFIED', {
      payment: 'approved',
      payment_id: 'MP-TEMP',
    });

    assert.equal(result.paymentStatus, 'pending');
    assert.equal(result.verifiedWithApi, false);
    assert.equal(result.verificationPending, true);
    assert.equal(order.auditLog.length, 0);
  } finally {
    (Payment.prototype as any).search = originalSearch;
    (MerchantOrder.prototype as any).search = originalMerchantOrderSearch;
  }
});

test('does not downgrade an approved order when a late rejected webhook arrives', async () => {
  const originalGet = (Payment.prototype as any).get;
  const originalAccessToken = process.env.MP_ACCESS_TOKEN;
  const originalWebhookSecret = process.env.MP_WEBHOOK_SECRET;
  const service: any = new PaymentService();
  const order: any = {
    id: 'REC-APPROVED',
    tenantId: 'TEN-123',
    patientName: 'Test',
    patientLastName: 'Patient',
    paymentMethod: 'mp',
    paymentStatus: 'approved',
    paymentId: '100',
    paymentAmount: '10000',
    status: 'En revisión',
    auditLog: [],
  };
  let updateCalls = 0;

  process.env.MP_ACCESS_TOKEN = 'TEST-token';
  delete process.env.MP_WEBHOOK_SECRET;
  (Payment.prototype as any).get = async () => ({
    id: 101,
    status: 'rejected',
    external_reference: 'REC-APPROVED',
    transaction_amount: 10000,
  });
  service.orderRepo = {
    findById: async () => order,
    update: async () => {
      updateCalls += 1;
      return order;
    },
  };

  try {
    const result = await service.processWebhook({ type: 'payment', id: '101' }, {}, {});

    assert.equal(result.status, 'rejected');
    assert.equal(order.paymentStatus, 'approved');
    assert.equal(order.paymentId, '100');
    assert.equal(updateCalls, 0);
    assert.equal(order.auditLog.length, 0);
  } finally {
    (Payment.prototype as any).get = originalGet;
    if (originalAccessToken === undefined) delete process.env.MP_ACCESS_TOKEN;
    else process.env.MP_ACCESS_TOKEN = originalAccessToken;
    if (originalWebhookSecret === undefined) delete process.env.MP_WEBHOOK_SECRET;
    else process.env.MP_WEBHOOK_SECRET = originalWebhookSecret;
  }
});

test('requires a valid signature when MP_WEBHOOK_SECRET is configured', async () => {
  const originalWebhookSecret = process.env.MP_WEBHOOK_SECRET;
  const service = new PaymentService();
  process.env.MP_WEBHOOK_SECRET = 'webhook-secret';

  try {
    const result = await service.processWebhook({ type: 'payment', id: '123' }, {}, {});
    assert.deepEqual(result, { received: false, error: 'Firma de webhook inválida' });
  } finally {
    if (originalWebhookSecret === undefined) delete process.env.MP_WEBHOOK_SECRET;
    else process.env.MP_WEBHOOK_SECRET = originalWebhookSecret;
  }
});

test('reconciles a bounded batch of pending Mercado Pago orders', async () => {
  const service: any = new PaymentService();
  const order: any = {
    id: 'REC-CRON',
    tenantId: 'TEN-123',
    patientName: 'Test',
    patientLastName: 'Patient',
    paymentMethod: 'mp',
    paymentStatus: 'pending',
    paymentId: 'MP-TEMP',
    paymentAmount: '10000',
    status: 'Pendiente',
    auditLog: [],
  };
  service.orderRepo = {
    findPendingMercadoPago: async (limit: number) => {
      assert.equal(limit, 25);
      return [order];
    },
    update: async (_id: string, updatedOrder: any) => updatedOrder,
  };
  service.tenantRepo = { findById: async () => ({ mpAccessToken: 'TEST-token' }) };
  service.fetchBestPaymentForOrder = async () => ({
    id: 500,
    status: 'approved',
    external_reference: 'REC-CRON',
    transaction_amount: 10000,
    date_approved: '2026-09-17T10:00:00Z',
  });
  service.refreshPendingOrderLimitAlert = async () => undefined;

  const result = await service.reconcilePendingPayments(25);

  assert.deepEqual(result, { checked: 1, updated: 1, unresolved: 0, failed: 0 });
  assert.equal(order.paymentStatus, 'approved');
  assert.equal(order.paymentId, '500');
  assert.equal(order.paymentDate, '2026-09-17T10:00:00.000Z');
});
