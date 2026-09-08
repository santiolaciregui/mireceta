/**
 * File: PendingOrderAlert.spec.ts
 * Task: US-001 / T-005
 * Date: 2026-09-08
 * Decisions: Use the Node test runner already available in the project runtime.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getPendingOrderAlertTransition,
  normalizePendingOrderAlertSettings,
  PendingOrderAlertConfigError
} from './PendingOrderAlert.js';
import { WhatsAppAdapter } from './adapters/WhatsAppAdapter.js';

test('normalizes and deduplicates administrative phone numbers', () => {
  const settings = normalizePendingOrderAlertSettings({
    administrativePhoneNumbers: ['+54 9 11 2345-6789', '011 15-2345-6789', '+54 9 11 2345-6789'],
    pendingOrderLimit: '10'
  });

  assert.deepEqual(settings.administrativePhoneNumbers, ['5491123456789']);
  assert.equal(settings.pendingOrderLimit, 10);
  assert.equal(settings.pendingOrderAlertActive, false);
});

test('allows both fields to be empty to disable the alert', () => {
  assert.deepEqual(normalizePendingOrderAlertSettings({}), {
    administrativePhoneNumbers: [],
    pendingOrderLimit: null,
    pendingOrderAlertActive: false
  });
});

test('rejects a partial alert configuration', () => {
  assert.throws(
    () => normalizePendingOrderAlertSettings({ pendingOrderLimit: 5 }),
    PendingOrderAlertConfigError
  );
});

test('rejects invalid limits and phone numbers', () => {
  assert.throws(
    () => normalizePendingOrderAlertSettings({ administrativePhoneNumbers: ['1123456789'], pendingOrderLimit: 0 }),
    PendingOrderAlertConfigError
  );
  assert.throws(
    () => normalizePendingOrderAlertSettings({ administrativePhoneNumbers: ['123'], pendingOrderLimit: 5 }),
    PendingOrderAlertConfigError
  );
});

test('triggers once above the limit and resets at or below the limit', () => {
  const base = {
    administrativePhoneNumbers: ['5491123456789'],
    pendingOrderLimit: 10,
    pendingOrderAlertActive: false
  };

  assert.equal(getPendingOrderAlertTransition(10, base), 'none');
  assert.equal(getPendingOrderAlertTransition(11, base), 'trigger');
  assert.equal(getPendingOrderAlertTransition(12, { ...base, pendingOrderAlertActive: true }), 'none');
  assert.equal(getPendingOrderAlertTransition(10, { ...base, pendingOrderAlertActive: true }), 'reset');
});

test('sends the required Meta template with the exact es_AR language', async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | undefined;

  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ messages: [{ id: 'wamid.test' }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    const adapter = new WhatsAppAdapter();
    const result = await adapter.send(
      {
        to: '+54 9 11 2345-6789',
        body: 'Fallback audit body',
        templateCode: 'limite_solicitudes',
        templateLanguage: 'es_AR',
        strictTemplate: true
      },
      {
        phoneNumberId: '123456789',
        accessToken: 'test-token',
        defaultCountryCode: '54'
      }
    );

    assert.equal(result.success, true);
    assert.deepEqual(requestBody, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '5491123456789',
      type: 'template',
      template: {
        name: 'limite_solicitudes',
        language: { code: 'es_AR' }
      }
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('does not fall back to another language or direct text for the strict alert template', async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;

  globalThis.fetch = async () => {
    requests += 1;
    return new Response(JSON.stringify({ error: { message: 'Template unavailable' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    const adapter = new WhatsAppAdapter();
    const result = await adapter.send(
      {
        to: '+54 9 11 2345-6789',
        body: 'Fallback audit body',
        templateCode: 'limite_solicitudes',
        templateLanguage: 'es_AR',
        strictTemplate: true
      },
      { phoneNumberId: '123456789', accessToken: 'test-token' }
    );

    assert.equal(result.success, false);
    assert.equal(requests, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
