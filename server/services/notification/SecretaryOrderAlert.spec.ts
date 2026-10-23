import assert from 'node:assert/strict';
import test from 'node:test';
import { NotificationService } from '../NotificationService.js';
import { WhatsAppAdapter } from './adapters/WhatsAppAdapter.js';

test('secretary alert configuration, parameterless payload and failures', async () => {
  const keys = ['SECRETARY_WHATSAPP_NUMBER', 'SECRETARY_WHATSAPP_TEMPLATE', 'SECRETARY_WHATSAPP_TEMPLATE_LANGUAGE'];
  const original = keys.map(key => process.env[key]);
  const service = new NotificationService();
  const requests: any[] = [];
  service.sendNotification = async dto => { requests.push(dto); return { success: true }; };
  try {
    for (const key of keys) delete process.env[key];
    await service.sendNewOrderSecretaryWhatsApp('TEN-1');
    assert.equal(requests.length, 0);
    process.env.SECRETARY_WHATSAPP_NUMBER = '123';
    await service.sendNewOrderSecretaryWhatsApp('TEN-1');
    assert.equal(requests.length, 0);

    process.env.SECRETARY_WHATSAPP_NUMBER = '+54 9 2926 52-1232';
    await service.sendNewOrderSecretaryWhatsApp('TEN-1');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].to, '5492926521232');
    assert.equal(requests[0].tenantId, 'TEN-1');
    assert.equal(requests[0].templateCode, 'nueva_solicitud_receta');
    assert.equal(requests[0].templateLanguage, 'es_AR');
    assert.equal(requests[0].strictTemplate, true);
    assert.equal(requests[0].variables, undefined);

    process.env.SECRETARY_WHATSAPP_TEMPLATE = 'otra_plantilla';
    process.env.SECRETARY_WHATSAPP_TEMPLATE_LANGUAGE = 'es';
    await service.sendNewOrderSecretaryWhatsApp('TEN-1');
    assert.equal(requests[1].templateCode, 'otra_plantilla');
    assert.equal(requests[1].templateLanguage, 'es');

    service.sendNotification = async () => ({ success: false, error: 'Provider rejected' });
    await assert.doesNotReject(() => service.sendNewOrderSecretaryWhatsApp('TEN-1'));
    service.sendNotification = async () => { throw new Error('Network unavailable'); };
    await assert.doesNotReject(() => service.sendNewOrderSecretaryWhatsApp('TEN-1'));
  } finally {
    keys.forEach((key, index) => {
      if (original[index] === undefined) delete process.env[key];
      else process.env[key] = original[index];
    });
  }
});

test('Meta receives a parameterless template and never falls back to text', async () => {
  const originalFetch = globalThis.fetch;
  const bodies: any[] = [];
  globalThis.fetch = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ error: { message: 'Unavailable template' } }), { status: 400 });
  };
  try {
    const result = await new WhatsAppAdapter().send({
      to: '5492926521232', body: 'Nueva solicitud',
      templateCode: 'nueva_solicitud_receta', templateLanguage: 'es_AR', strictTemplate: true,
    }, { phoneNumberId: 'test', accessToken: 'test' });
    assert.equal(result.success, false);
    assert.equal(bodies.length, 1);
    assert.deepEqual(bodies[0].template, { name: 'nueva_solicitud_receta', language: { code: 'es_AR' } });
    assert.equal(bodies[0].type, 'template');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
