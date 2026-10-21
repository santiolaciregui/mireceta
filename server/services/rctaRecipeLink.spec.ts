import assert from 'node:assert/strict';
import test from 'node:test';
import { Order } from '../models/Order.js';
import { OrderService } from './OrderService.js';
import { auditLogService } from './AuditLogService.js';
import { notificationService } from './NotificationService.js';
import { storageService } from './storage/StorageService.js';

const collaborator = { role: 'colaborador', name: 'Operador', tenantId: 'TEN-123' };
function setup() {
  const order: any = {
    id: 'ORD-LINK', tenantId: 'TEN-123', patientName: 'Ana', patientDni: '12345678',
    patientPhone: '5491100000001', status: 'En revisión', messages: [], auditLog: [],
  };
  const service: any = new OrderService();
  service.orderRepo = { findById: async () => order, update: async (_id: string, value: any) => value };
  service.patientRepo = { findByDni: async () => null };
  service.refreshPendingOrderLimitAlert = async () => undefined;
  service.notificationService = { sendRecipeIssuedNotification: async () => undefined };
  return { order, service };
}

test('collaborator emits and resends a long signed external link without storing or attaching a PDF', async () => {
  const originalLog = auditLogService.log;
  const originalWa = notificationService.sendRecipeIssuedWhatsApp;
  const originalSave = storageService.saveRecipePdf;
  const sentLinks: string[] = [];
  auditLogService.log = async () => undefined;
  notificationService.sendRecipeIssuedWhatsApp = async (params) => {
    sentLinks.push(params.recipeLink);
    return { success: true };
  };
  storageService.saveRecipePdf = async () => { assert.fail('Links must bypass file storage'); };
  try {
    const { order, service } = setup();
    const recipe = { url: `https://example.test/view?token=${'a'.repeat(700)}#rx`, name: 'Enlace a receta', kind: 'link' };
    const result = await service.updateOrder(order.id, { status: 'Emitida', recipeFiles: [recipe] }, collaborator);
    assert.equal(result.status, 'Emitida');
    assert.equal(result.recipePdfUrl, recipe.url);
    assert.equal(result.recipeFiles[0].kind, 'link');
    assert.equal(result.messages.at(-1).fileType, undefined);
    assert.match(result.messages.at(-1).text, /abrirla aquí/);
    assert.doesNotMatch(result.messages.at(-1).text, /PDF/);
    const doc = new Order({ recipeFiles: result.recipeFiles });
    assert.equal(doc.recipeFiles?.[0].kind, 'link');
    const resend = await service.sendRecipeLink(order.id, 'whatsapp', collaborator);
    assert.equal(resend.success, true);
    assert.equal(result.messages.at(-1).fileUrl, undefined);
    assert.match(result.messages.at(-1).text, /Abrir receta:/);
    assert.equal(sentLinks.length, 2);
    assert.ok(sentLinks.every(link => link.endsWith(`/api/orders/public/${order.id}/pdf`)));
  } finally {
    auditLogService.log = originalLog;
    notificationService.sendRecipeIssuedWhatsApp = originalWa;
    storageService.saveRecipePdf = originalSave;
  }
});

test('rejects invalid recipe links before recording status or issuing notifications', async () => {
  const { order, service } = setup();
  await assert.rejects(service.updateOrder(order.id, {
    status: 'Emitida', recipeFiles: [{ url: 'javascript:alert(1)', name: 'Rx', kind: 'link' }],
  }, collaborator), /enlace válido/);
  assert.equal(order.status, 'En revisión');
  assert.deepEqual(order.messages, []);
  assert.deepEqual(order.auditLog, []);
});
