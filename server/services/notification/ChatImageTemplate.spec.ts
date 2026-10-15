/** US-012 / T-003, 2026-10-15: Exercise dispatch with mocked HTTP and repositories. */
import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { NotificationService } from '../NotificationService.js';

const image = { dataUrl: 'data:image/jpeg;base64,dGVzdA==', fileType: 'image' as const, fileName: 'photo.jpg', mimeType: 'image/png' };
const inquiry = { tenantId: 'TEN-TEST', patientPhone: '5491112345678', patientName: 'Test', doctorName: 'Doctor', orderId: 'REC-TEST', messageText: 'Adjunto la imagen solicitada.', media: image };

function setup(t: TestContext, options: { uploadFailure?: boolean; sendFailure?: boolean; credentials?: Record<string, string> } = {}) {
  const service = new NotificationService();
  const config = { isEnabled: true, credentials: { accessToken: 'test-token', phoneNumberId: 'test-phone-id', doctorInquiryTemplateCode: 'consulta_medica', ...options.credentials } };
  const logs: any[] = [];
  Object.assign(service, {
    configRepo: { findByTenantAndChannel: async () => config },
    templateRepo: { findByTenantAndCode: async () => null },
    logRepo: { createLog: async (log: unknown) => { logs.push(log); } },
  });
  const messages: any[] = [];
  const uploads: FormData[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    if (url.endsWith('/media')) {
      uploads.push(init.body as FormData);
      return Response.json(options.uploadFailure ? { error: { message: 'Upload rejected' } } : { id: 'uploaded-photo-id' }, { status: options.uploadFailure ? 400 : 200 });
    }
    assert.ok(url.endsWith('/messages'), 'Unexpected HTTP request');
    messages.push(JSON.parse(String(init.body)));
    return Response.json(options.sendFailure ? { error: { message: 'Template rejected' } } : { messages: [{ id: 'wamid.mock' }] }, { status: options.sendFailure ? 400 : 200 });
  });
  return { service, uploads, messages, logs };
}

test('closed window sends the approved image header and one body parameter', async t => {
  const { service, uploads, messages, logs } = setup(t);
  const result = await service.sendDoctorInquiryWhatsApp(inquiry);
  assert.equal(result.success, true);
  assert.equal(uploads.length, 1);
  assert.equal((uploads[0].get('file') as Blob).type, 'image/jpeg');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].type, 'template');
  assert.deepEqual(messages[0].template, {
    name: 'consulta_medica_imagen', language: { code: 'es_AR' },
    components: [
      { type: 'header', parameters: [{ type: 'image', image: { id: 'uploaded-photo-id' } }] },
      { type: 'body', parameters: [{ type: 'text', text: inquiry.messageText }] },
    ],
  });
  assert.equal(logs[0].status, 'sent');
});

test('expired window uses the image template with configured name and language', async t => {
  const { service, messages } = setup(t, { credentials: { doctorInquiryImageTemplateCode: 'custom_image', doctorInquiryImageTemplateLanguage: 'es' } });
  await service.sendDoctorInquiryWhatsApp({ ...inquiry, interactionRecord: { lastPatientWhatsAppInteractionAt: new Date(Date.now() - 25 * 3600000).toISOString() } });
  assert.equal(messages[0].template.name, 'custom_image');
  assert.equal(messages[0].template.language.code, 'es');
});

test('open window keeps direct image delivery', async t => {
  const { service, messages } = setup(t);
  assert.equal((await service.sendDoctorInquiryWhatsApp({ ...inquiry, interactionRecord: { lastPatientWhatsAppInteractionAt: new Date().toISOString() } })).success, true);
  assert.equal(messages[0].type, 'image');
  assert.deepEqual(messages[0].image, { id: 'uploaded-photo-id', caption: inquiry.messageText });
});

test('text-only inquiries keep the existing template without an image header', async t => {
  const { service, uploads, messages } = setup(t);
  await service.sendDoctorInquiryWhatsApp({ ...inquiry, media: undefined });
  assert.equal(uploads.length, 0);
  assert.equal(messages[0].template.name, 'consulta_medica');
  assert.equal(messages[0].template.components.length, 1);
  assert.equal(messages[0].template.components[0].type, 'body');
});

test('upload failure does not send a text replacement', async t => {
  const { service, messages } = setup(t, { uploadFailure: true });
  const result = await service.sendDoctorInquiryWhatsApp(inquiry);
  assert.equal(result.success, false);
  assert.equal(result.error, 'Upload rejected');
  assert.equal(messages.length, 0);
});

test('template rejection returns failure without direct-text or language fallback', async t => {
  const { service, messages, logs } = setup(t, { sendFailure: true });
  const result = await service.sendDoctorInquiryWhatsApp(inquiry);
  assert.equal(result.success, false);
  assert.equal(result.error, 'Template rejected');
  assert.equal(messages.length, 1);
  assert.equal(logs[0].status, 'failed');
});

test('invalid attachments and unsupported media fail without a misleading template', async t => {
  const { service, uploads, messages } = setup(t);
  assert.equal((await service.sendDoctorInquiryWhatsApp({ ...inquiry, media: { ...image, dataUrl: 'invalid' } })).success, false);
  assert.equal((await service.sendDoctorInquiryWhatsApp({ ...inquiry, media: { ...image, fileType: 'document' } })).success, false);
  assert.equal(uploads.length, 0);
  assert.equal(messages.length, 0);
});

test('network errors return dispatch failure without a text replacement', async t => {
  const { service, messages } = setup(t);
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Network unavailable'); });
  const result = await service.sendDoctorInquiryWhatsApp(inquiry);
  assert.equal(result.success, false);
  assert.equal(result.error, 'Network unavailable');
  assert.equal(messages.length, 0);
});
