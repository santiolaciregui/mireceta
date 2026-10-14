import assert from 'node:assert/strict';
import test from 'node:test';
import { describeInboundWhatsAppMessage } from './InboundWhatsAppMessage.js';
import { NotificationService } from '../NotificationService.js';
import { auditLogService } from '../AuditLogService.js';
import { Patient } from '../../models/Patient.js';
import { Order } from '../../models/Order.js';

test('preserves emojis in text, including combined emoji sequences', () => {
  const text = 'Gracias ❤️ 👍🏽 👨‍👩‍👧‍👦';
  assert.equal(describeInboundWhatsAppMessage({ type: 'text', text: { body: text } }).text, text);
});

test('distinguishes a reaction, its removal, and a malformed reaction', () => {
  const reaction = describeInboundWhatsAppMessage({
    type: 'reaction', reaction: { emoji: '❤️', message_id: 'wamid.original' }
  });
  assert.equal(reaction.text, 'Reaccionó con ❤️');
  assert.deepEqual(reaction.diagnostics.reaction, { emoji: '❤️', messageId: 'wamid.original' });
  assert.equal(describeInboundWhatsAppMessage({ type: 'reaction', reaction: { emoji: '' } }).text, 'Retiró su reacción');
  const malformed = describeInboundWhatsAppMessage({ type: 'reaction' });
  assert.equal(malformed.diagnostics.fallbackReason, 'missing_reaction_emoji');
  assert.doesNotMatch(malformed.text, /Retiró/);
});

test('reads button and interactive reply text', () => {
  assert.equal(describeInboundWhatsAppMessage({ type: 'button', button: { text: 'Confirmar ✅' } }).text, 'Confirmar ✅');
  assert.equal(describeInboundWhatsAppMessage({ type: 'interactive', interactive: { button_reply: { title: 'Sí' } } }).text, 'Sí');
  assert.equal(describeInboundWhatsAppMessage({ type: 'interactive', interactive: { list_reply: { title: 'Consulta' } } }).text, 'Consulta');
});

test('identifies unsupported content and keeps provider error codes without copying the payload', () => {
  const message = {
    id: 'wamid.unknown', type: 'unknown', timestamp: '1791979774',
    errors: [{ code: 131051, title: 'Unsupported message' }],
    secret: 'must not be persisted'
  };
  const result = describeInboundWhatsAppMessage(message);
  assert.equal(result.text, '[Mensaje de WhatsApp no interpretado: unknown]');
  assert.equal(result.diagnostics.messageId, message.id);
  assert.equal(result.diagnostics.providerTimestamp, message.timestamp);
  assert.deepEqual(result.diagnostics.errorCodes, [131051]);
  assert.ok(result.diagnostics.payloadFields.includes('secret'));
  assert.ok(!JSON.stringify(result.diagnostics).includes('must not be persisted'));
  assert.equal(describeInboundWhatsAppMessage({}).diagnostics.type, 'unknown');
  assert.equal(describeInboundWhatsAppMessage({ type: 'text' }).diagnostics.fallbackReason, 'unsupported_or_missing_content');
});

test('keeps media labels and captions unchanged', () => {
  assert.equal(describeInboundWhatsAppMessage({ type: 'image' }, '[Imagen recibida por WhatsApp]').text, '[Imagen recibida por WhatsApp]');
  assert.equal(describeInboundWhatsAppMessage({ type: 'image' }, '[Imagen]', 'Mi archivo 📄').text, 'Mi archivo 📄');
});

test('webhook persists readable events in patient/order histories and diagnostic data in audit', async (t) => {
  const service = new NotificationService() as any;
  const patient = { id: 'PAT-TEST', tenantId: 'TEN-TEST', messages: [] as any[], save: async () => {} };
  const order = { id: 'REC-TEST', messages: [] as any[] };
  const audits: any[] = [];
  const warnings: any[] = [];
  t.mock.method(auditLogService, 'log', async (event: any) => { audits.push(event); });
  t.mock.method(console, 'warn', (...args: any[]) => { warnings.push(args); });
  service.patientRepo = { findByPhone: async () => [patient] };
  service.orderRepo = { findByPatientPhone: async () => [order], update: async () => {} };
  service.downloadInboundWhatsAppMedia = async () => null;
  const messages = [
    { id: 'wamid.reaction', type: 'reaction', timestamp: '1791979774', reaction: { emoji: '👍🏽', message_id: 'wamid.original' } },
    { id: 'wamid.removed', type: 'reaction', reaction: { emoji: '', message_id: 'wamid.original' } },
    { id: 'wamid.future', type: 'future_type', errors: [{ code: 131051 }] },
    { id: 'wamid.image', type: 'image', image: { id: 'media-id' } }
  ].map(message => ({ ...message, from: '5491100000000' }));

  const result = await service.processInboundWhatsAppPayload({ entry: [{ changes: [{ value: { messages } }] }] });
  assert.deepEqual(result, { success: true, processedMessages: 4 });
  assert.deepEqual(patient.messages.map(m => m.text), [
    'Reaccionó con 👍🏽', 'Retiró su reacción',
    '[Mensaje de WhatsApp no interpretado: future_type]', '[Imagen recibida por WhatsApp]'
  ]);
  assert.deepEqual(order.messages, patient.messages);
  assert.equal(audits.length, 4);
  assert.equal(audits[0].changes.inboundWhatsApp.reaction.messageId, 'wamid.original');
  assert.equal(audits[0].changes.inboundWhatsApp.providerTimestamp, '1791979774');
  assert.equal(audits[2].changes.inboundWhatsApp.type, 'future_type');
  assert.deepEqual(audits[2].changes.inboundWhatsApp.errorCodes, [131051]);
  assert.equal(audits[3].changes.inboundWhatsApp.media.downloadStatus, 'unavailable');
  assert.equal(warnings.length, 2);

  // Existing schemas must preserve the rendered event without a migration.
  for (const Model of [Patient, Order]) {
    const doc = new Model({ messages: patient.messages });
    assert.deepEqual(doc.toObject().messages.map((m: any) => m.text), patient.messages.map(m => m.text));
  }
});
