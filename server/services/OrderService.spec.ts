import assert from 'node:assert/strict';
import test from 'node:test';
import { Order } from '../models/Order.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { OrderService } from './OrderService.js';
import { auditLogService } from './AuditLogService.js';
import { notificationService } from './NotificationService.js';

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
      'recipeFiles.url',
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

test('requires a receipt before accepting a bank transfer', async () => {
  const service: any = new OrderService();
  service.orderRepo = { findByClientRequestId: async () => null };

  await assert.rejects(
    () => service.createOrder({ paymentMethod: 'transfer' }, { role: 'paciente', tenantId: 'TEN-123' }),
    /Debe adjuntar el comprobante/
  );
});

test('does not reuse an existing checkout when confirmed coverage changed', async () => {
  const service: any = new OrderService();
  const originalLog = auditLogService.log;
  let logged: any;
  auditLogService.log = async (entry: any) => { logged = entry; };
  service.orderRepo = {
    findByClientRequestId: async () => ({
      id: 'ORD-EXISTING',
      tenantId: 'TEN-123',
      obraSocial: 'PAMI (Inssjp)',
      obraSocialNumber: '105/00',
      paymentStatus: 'pending',
    }),
  };

  try {
    await assert.rejects(() => service.createOrder({
      clientRequestId: 'request-1',
      obraSocial: 'FEMEDICA - PLAN 3000',
      obraSocialNumber: '01-123',
      coverageConfirmation: {
        source: 'patient_form',
        obraSocial: 'FEMEDICA - PLAN 3000',
        obraSocialNumber: '01-123',
        confirmedAt: '2026-10-08T01:40:00.000Z',
        draftRestored: true,
      },
    }, { role: 'paciente', tenantId: 'TEN-123' }), /cobertura cambió después de crear/);
    assert.equal(logged.action, 'ORDER_COVERAGE_MISMATCH');
    assert.equal(logged.changes.persistedCoverage.obraSocial, 'PAMI (Inssjp)');
    assert.equal(logged.changes.attemptedCoverage.obraSocial, 'FEMEDICA - PLAN 3000');
  } finally {
    auditLogService.log = originalLog;
  }
});

test('records submitted, persisted and client-confirmed coverage when creating an order', async () => {
  const service: any = new OrderService();
  const originalLog = auditLogService.log;
  let logged: any;
  let persisted: any;
  service.orderRepo = {
    findByClientRequestId: async () => null,
    findByTenant: async () => [],
    create: async (order: any) => { persisted = order; return order; },
  };
  service.tenantRepo = { findById: async () => ({ pricePerPrescription: 10000 }) };
  service.refreshPendingOrderLimitAlert = async () => undefined;
  auditLogService.log = async (entry: any) => { logged = entry; };

  try {
    await service.createOrder({
      clientRequestId: 'request-2',
      patientName: 'Sara', patientLastName: 'Test', patientDni: '12345678',
      obraSocial: 'FEMEDICA - PLAN 3000', obraSocialNumber: '01-123',
      medicationItems: [{ nombreComercial: 'Medicamento', cantidadCajas: 1 }],
      paymentMethod: 'mp', paymentStatus: 'pending', paymentAmount: '10000',
      coverageConfirmation: {
        source: 'patient_form', obraSocial: 'FEMEDICA - PLAN 3000',
        obraSocialNumber: '01-123', confirmedAt: '2026-10-08T01:40:00.000Z',
        draftRestored: true,
        history: [{ event: 'draft_restored', at: '2026-10-08T01:30:00.000Z', obraSocial: 'PAMI', obraSocialNumber: '105/00' }],
      },
    }, { role: 'paciente', tenantId: 'TEN-123', identifier: '12345678', obraSocial: 'FEMEDICA - PLAN 3000' });

    assert.equal(logged.action, 'ORDER_CREATE');
    assert.equal(logged.changes.submittedCoverage.obraSocial, 'FEMEDICA - PLAN 3000');
    assert.equal(logged.changes.persistedCoverage.obraSocial, 'FEMEDICA - PLAN 3000');
    assert.equal(logged.changes.clientConfirmation.history[0].obraSocial, 'PAMI');
    assert.ok(persisted.auditLog.some((entry: any) => entry.action === 'Cobertura confirmada antes del pago'));
    assert.match(persisted.auditLog.find((entry: any) => entry.action === 'Cobertura confirmada antes del pago').notes, /draft_restored: PAMI/);
  } finally {
    auditLogService.log = originalLog;
  }
});

test('replaces a rejected Mercado Pago attempt with the submitted transfer receipt', async () => {
  const service: any = new OrderService();
  const existingOrder: any = {
    id: 'ORD-123',
    tenantId: 'TEN-123',
    paymentMethod: 'mp',
    paymentStatus: 'rejected',
    paymentId: 'MP-12345678',
    paymentAmount: '10000',
    status: 'Pendiente',
    auditLog: [],
  };
  let persistedOrder: any;
  service.orderRepo = {
    findByClientRequestId: async () => existingOrder,
    update: async (_id: string, order: any) => {
      persistedOrder = order;
      return order;
    },
  };
  service.refreshPendingOrderLimitAlert = async () => undefined;

  const result = await service.createOrder(
    {
      clientRequestId: 'request-123',
      paymentRetryOrderId: 'ORD-123',
      paymentMethod: 'transfer',
      paymentReceiptUrl: 'https://files.example.test/receipt.png',
      paymentReceiptName: 'receipt.png',
    },
    { role: 'paciente', tenantId: 'TEN-123' }
  );

  assert.equal(result, existingOrder);
  assert.equal(persistedOrder.paymentMethod, 'transfer');
  assert.equal(persistedOrder.paymentReceiptUrl, 'https://files.example.test/receipt.png');
  assert.equal(persistedOrder.paymentStatus, 'pending');
  assert.equal(persistedOrder.status, 'Pendiente');
  assert.match(persistedOrder.paymentId, /^TRANS-\d{6}$/);
  assert.equal(persistedOrder.auditLog.at(-1).action, 'Método de pago actualizado');
});

test('emits PAMI electronic prescription without invalid fileType and passes Order validation', async () => {
  const origLog = auditLogService.log;
  const origWa = notificationService.sendRecipeIssuedWhatsApp;
  const origEmail = notificationService.sendRecipeIssuedEmail;
  auditLogService.log = async () => undefined;
  notificationService.sendRecipeIssuedWhatsApp = async () => ({ success: true });
  notificationService.sendRecipeIssuedEmail = async () => ({ success: true });

  try {
    const service: any = new OrderService();
    const existingOrder: any = {
      id: 'ORD-PAMI',
      tenantId: 'TEN-123',
      patientName: 'Roberto',
      patientLastName: 'Gomez',
      patientDni: '12345678',
      patientPhone: '5491100000000',
      obraSocial: 'PAMI',
      status: 'En revisión',
      messages: [
        {
          id: 'msg-1',
          sender: 'paciente',
          senderName: 'Roberto Gomez',
          timestamp: new Date().toISOString(),
          text: 'Hola necesito la receta'
        }
      ],
      auditLog: []
    };

    let savedOrder: any;
    service.orderRepo = {
      findById: async () => existingOrder,
      update: async (_id: string, order: any) => {
        savedOrder = order;
        return order;
      }
    };
    service.patientRepo = {
      findByDni: async () => null
    };
    service.refreshPendingOrderLimitAlert = async () => undefined;
    service.notificationService = {
      sendRecipeIssuedNotification: async () => undefined
    };

    const result = await service.updateOrder(
      'ORD-PAMI',
      {
        status: 'Emitida',
        recipePdfUrl: 'PAMI',
        recipePdfName: 'receta_electronica_pami',
        doctorNotes: 'Aprobado PAMI'
      },
      { role: 'medico', name: 'Dra. Lopez', tenantId: 'TEN-123' }
    );

    assert.equal(result.status, 'Emitida');
    const lastMsg = savedOrder.messages.at(-1);
    assert.equal(lastMsg.fileType, undefined);
    assert.equal(lastMsg.fileUrl, undefined);
    assert.ok(lastMsg.text.includes('transmitida a la red de farmacias'));

    // Test Mongoose validation on the saved order
    const orderDoc = new Order({
      id: savedOrder.id,
      createdAt: new Date().toISOString(),
      medicationMethod: 'manual',
      obraSocial: savedOrder.obraSocial,
      patientName: savedOrder.patientName,
      patientLastName: savedOrder.patientLastName,
      patientDni: savedOrder.patientDni,
      status: savedOrder.status,
      messages: savedOrder.messages
    });
    const validationError = orderDoc.validateSync();
    assert.equal(validationError, undefined);
  } finally {
    auditLogService.log = origLog;
    notificationService.sendRecipeIssuedWhatsApp = origWa;
    notificationService.sendRecipeIssuedEmail = origEmail;
  }
});

test('emits standard PDF recipe with valid fileType: pdf', async () => {
  const origLog = auditLogService.log;
  const origWa = notificationService.sendRecipeIssuedWhatsApp;
  const origEmail = notificationService.sendRecipeIssuedEmail;
  auditLogService.log = async () => undefined;
  notificationService.sendRecipeIssuedWhatsApp = async () => ({ success: true });
  notificationService.sendRecipeIssuedEmail = async () => ({ success: true });

  try {
    const service: any = new OrderService();
    const existingOrder: any = {
      id: 'ORD-RCTA',
      tenantId: 'TEN-123',
      patientName: 'Maria',
      patientLastName: 'Perez',
      patientDni: '23456789',
      patientPhone: '5491100000001',
      obraSocial: 'OSDE',
      status: 'En revisión',
      messages: [],
      auditLog: []
    };

    let savedOrder: any;
    service.orderRepo = {
      findById: async () => existingOrder,
      update: async (_id: string, order: any) => {
        savedOrder = order;
        return order;
      }
    };
    service.patientRepo = {
      findByDni: async () => null
    };
    service.refreshPendingOrderLimitAlert = async () => undefined;
    service.notificationService = {
      sendRecipeIssuedNotification: async () => undefined
    };

    const result = await service.updateOrder(
      'ORD-RCTA',
      {
        status: 'Emitida',
        recipePdfUrl: 'https://example.com/receta.pdf',
        recipePdfName: 'receta_123.pdf',
        doctorNotes: 'Aprobado'
      },
      { role: 'medico', name: 'Dr. Gonzalez', tenantId: 'TEN-123' }
    );

    assert.equal(result.status, 'Emitida');
    const lastMsg = savedOrder.messages.at(-1);
    assert.equal(lastMsg.fileType, 'pdf');
    assert.equal(lastMsg.fileUrl, 'https://example.com/receta.pdf');
    assert.equal(lastMsg.fileName, 'receta_123.pdf');

    // Test Mongoose validation on standard PDF order
    const orderDoc = new Order({
      id: savedOrder.id,
      createdAt: new Date().toISOString(),
      medicationMethod: 'manual',
      obraSocial: savedOrder.obraSocial,
      patientName: savedOrder.patientName,
      patientLastName: savedOrder.patientLastName,
      patientDni: savedOrder.patientDni,
      status: savedOrder.status,
      messages: savedOrder.messages
    });
    const validationError = orderDoc.validateSync();
    assert.equal(validationError, undefined);
  } finally {
    auditLogService.log = origLog;
    notificationService.sendRecipeIssuedWhatsApp = origWa;
    notificationService.sendRecipeIssuedEmail = origEmail;
  }
});

test('persists multiple recipe files and keeps the first file in legacy fields', async () => {
  const origLog = auditLogService.log;
  auditLogService.log = async () => undefined;

  try {
    const service: any = new OrderService();
    const existingOrder: any = {
      id: 'ORD-MULTI',
      tenantId: 'TEN-123',
      patientName: 'Ana',
      patientLastName: 'Diaz',
      patientDni: '45678901',
      patientPhone: '',
      patientEmail: '',
      obraSocial: 'OSDE',
      status: 'En revisión',
      messages: [],
      auditLog: [],
    };

    let savedOrder: any;
    service.orderRepo = {
      findById: async () => existingOrder,
      update: async (_id: string, order: any) => {
        savedOrder = order;
        return order;
      },
    };
    service.patientRepo = { findByDni: async () => null };
    service.refreshPendingOrderLimitAlert = async () => undefined;

    await service.updateOrder(
      'ORD-MULTI',
      {
        status: 'Emitida',
        recipePdfUrl: 'https://files.example.test/recipe-1.pdf',
        recipePdfName: 'recipe-1.pdf',
        recipeFiles: [
          { url: 'https://files.example.test/recipe-1.pdf', name: 'recipe-1.pdf' },
          { url: 'https://files.example.test/recipe-2.pdf', name: 'recipe-2.pdf' },
        ],
      },
      { role: 'colaborador', name: 'Carla', lastName: 'Operadora', tenantId: 'TEN-123' }
    );

    assert.equal(savedOrder.recipeFiles.length, 2);
    assert.deepEqual(savedOrder.recipeFiles[1], {
      url: 'https://files.example.test/recipe-2.pdf',
      name: 'recipe-2.pdf',
    });
    assert.equal(savedOrder.recipePdfUrl, savedOrder.recipeFiles[0].url);
    assert.equal(savedOrder.recipePdfName, savedOrder.recipeFiles[0].name);
    assert.match(savedOrder.auditLog.at(-1).notes, /2 documentos/);
  } finally {
    auditLogService.log = origLog;
  }
});

test('sanitizes legacy messages with fileType: text before saving', async () => {
  const origLog = auditLogService.log;
  auditLogService.log = async () => undefined;

  try {
    const service: any = new OrderService();
    const existingOrder: any = {
      id: 'ORD-LEGACY',
      tenantId: 'TEN-123',
      patientName: 'Carlos',
      patientLastName: 'Sanz',
      patientDni: '34567890',
      status: 'Emitida',
      messages: [
        {
          id: 'msg-old',
          sender: 'medico',
          senderName: 'Dr. Test',
          timestamp: new Date().toISOString(),
          text: 'Receta emitida',
          fileType: 'text',
          fileUrl: 'PAMI',
          fileName: 'receta_electronica_pami'
        }
      ],
      auditLog: []
    };

    let savedOrder: any;
    service.orderRepo = {
      findById: async () => existingOrder,
      update: async (_id: string, order: any) => {
        savedOrder = order;
        return order;
      }
    };
    service.patientRepo = { findByDni: async () => null };
    service.refreshPendingOrderLimitAlert = async () => undefined;

    await service.updateOrder(
      'ORD-LEGACY',
      { doctorNotes: 'Nueva nota' },
      { role: 'medico', name: 'Dr. Test', tenantId: 'TEN-123' }
    );

    assert.equal(savedOrder.messages[0].fileType, undefined);
    assert.equal(savedOrder.messages[0].fileUrl, undefined);
    assert.equal(savedOrder.messages[0].fileName, undefined);
  } finally {
    auditLogService.log = origLog;
  }
});
