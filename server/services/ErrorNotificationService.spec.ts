import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { errorHandler, responseErrorMonitor } from '../middlewares/error.middleware.js';
import { errorNotificationService } from './ErrorNotificationService.js';

const testSecret = 'unit-test-auth-alert-secret';

function createRequest(token?: string) {
  return {
    method: 'GET', originalUrl: '/api/orders',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as Request;
}

function createResponse() {
  return Object.assign(new EventEmitter(), {
    locals: {}, statusCode: 200, statusMessage: '', body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; this.emit('finish'); return this; },
  });
}

const invalidTokens: [string, () => string][] = [
  ['expired', () => jwt.sign({ id: 'test' }, testSecret, { expiresIn: -1 })],
  ['not active yet', () => jwt.sign({ id: 'test' }, testSecret, { notBefore: 60 })],
  ['malformed', () => 'not-a-jwt'],
  ['invalid payload', () => 'e30.invalid.signature'],
  ['wrong signature', () => jwt.sign({ id: 'test' }, 'another-test-secret')],
  ['unsigned', () => jwt.sign({ id: 'test' }, '', { algorithm: 'none' })],
  ['invalid expiration', () => jwt.sign('{"exp":"invalid"}', testSecret)],
];

for (const [name, makeToken] of invalidTokens) {
  test(`does not alert for a ${name} token while preserving the 403 response`, (t) => {
    const originalSecret = config.JWT_SECRET;
    config.JWT_SECRET = testSecret;
    t.after(() => { config.JWT_SECRET = originalSecret; });
    const notify = t.mock.method(errorNotificationService, 'notifyProductionError', async () => {});
    const req = createRequest(makeToken());
    const response = createResponse();
    const res = response as unknown as Response;
    responseErrorMonitor(req, res, () => {});
    authenticateToken(req, res, () => assert.fail('Invalid token must not authenticate'));
    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.body, { error: 'Token inválido o expirado.' });
    assert.equal(notify.mock.callCount(), 0);
  });
}

test('continues to authenticate a valid token without an alert', (t) => {
  const originalSecret = config.JWT_SECRET;
  config.JWT_SECRET = testSecret;
  t.after(() => { config.JWT_SECRET = originalSecret; });
  const notify = t.mock.method(errorNotificationService, 'notifyProductionError', async () => {});
  const req = createRequest(jwt.sign({ id: 'test' }, testSecret));
  const response = createResponse();
  const res = response as unknown as Response;
  let authenticated = false;
  responseErrorMonitor(req, res, () => {});
  authenticateToken(req, res, () => { authenticated = true; res.json({ ok: true }); });
  assert.equal(authenticated, true);
  assert.equal(req.user.id, 'test');
  assert.equal(notify.mock.callCount(), 0);
});

test('continues to alert for a missing verification key', (t) => {
  const originalSecret = config.JWT_SECRET;
  config.JWT_SECRET = '';
  t.after(() => { config.JWT_SECRET = originalSecret; });
  const notify = t.mock.method(errorNotificationService, 'notifyProductionError', async () => {});
  const req = createRequest(jwt.sign({ id: 'test' }, testSecret));
  const response = createResponse();
  const res = response as unknown as Response;
  responseErrorMonitor(req, res, () => {});
  authenticateToken(req, res, () => assert.fail('Missing key must not authenticate'));
  assert.equal(response.statusCode, 403);
  assert.equal(notify.mock.callCount(), 1);
});

test('preserves the missing-token 401 alert', (t) => {
  const notify = t.mock.method(errorNotificationService, 'notifyProductionError', async () => {});
  const req = createRequest();
  const response = createResponse();
  const res = response as unknown as Response;
  responseErrorMonitor(req, res, () => {});
  authenticateToken(req, res, () => assert.fail('Missing token must not authenticate'));
  assert.equal(response.statusCode, 401);
  assert.equal(notify.mock.callCount(), 1);
});

for (const status of [403, 404, 500]) {
  test(`continues to alert for an unrelated HTTP ${status}`, (t) => {
    const notify = t.mock.method(errorNotificationService, 'notifyProductionError', async () => {});
    const req = createRequest();
    const response = createResponse();
    const res = response as unknown as Response;
    responseErrorMonitor(req, res, () => {});
    res.status(status).json({ error: 'Unrelated failure' });
    assert.equal(notify.mock.callCount(), 1);
  });
}

test('does not suppress a 500 even when token validation was marked', (t) => {
  const notify = t.mock.method(errorNotificationService, 'notifyProductionError', async () => {});
  const req = createRequest();
  const res = createResponse() as unknown as Response;
  res.locals.invalidAuthToken = true;
  responseErrorMonitor(req, res, () => {});
  res.status(500).json({ error: 'Unexpected failure' });
  assert.equal(notify.mock.callCount(), 1);
});

test('continues to alert once for a 403 passed to the error handler', (t) => {
  const notify = t.mock.method(errorNotificationService, 'notifyProductionError', async () => {});
  t.mock.method(console, 'error', () => {});
  const req = createRequest();
  const res = createResponse() as unknown as Response;
  responseErrorMonitor(req, res, () => {});
  errorHandler(Object.assign(new Error('Permission denied'), { status: 403 }), req, res, () => {});
  assert.equal(res.statusCode, 403);
  assert.equal(notify.mock.callCount(), 1);
});
