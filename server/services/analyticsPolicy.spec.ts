/** US-015 / T-007, 2026-10-29. Capture and report trust boundaries require no database. */
import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import {
  analyticsConfig,
  captureConfigured,
  resolveCaptureHost,
  signCapture,
  verifyCapture,
  validateEvents,
  parseReportQuery,
  reportTenant,
  strictObject,
  analyticsClientAddress,
  knownAnalyticsBot,
  type CaptureScope,
} from "./analyticsPolicy.js";
const id = "12345678-1234-1234-1234-123456789012";
const c = analyticsConfig({
  ANALYTICS_ENABLED: "true",
  ANALYTICS_ENVIRONMENT: "development",
  ANALYTICS_STARTED_AT: "2026-10-29T00:00:00Z",
  JWT_SECRET: "x".repeat(40),
  ANALYTICS_HOSTS: '{"http://localhost:3000":"TEN-0001"}',
});
test("analytics fails closed with disabled, incomplete or invalid configuration", () => {
  assert(captureConfigured(c));
  assert(!captureConfigured({ ...c, enabled: false }));
  assert(!captureConfigured({ ...c, secret: "short" }));
  assert(!captureConfigured({ ...c, startedAt: null }));
  assert(!captureConfigured({ ...c, environment: "anything" }));
  assert.deepEqual(analyticsConfig({ ANALYTICS_HOSTS: "invalid" }).hosts, {});
});
test("capture host requires matching origin, exact allowlist and no tenant fallback", () => {
  assert.equal(
    resolveCaptureHost(c, "localhost:3000", "http://localhost:3000"),
    "TEN-0001",
  );
  for (const [host, origin] of [
    ["attacker.test", "http://localhost:3000"],
    ["localhost:3000", "https://attacker.test"],
    ["localhost:3000", ""],
    ["localhost:3000", "http://localhost:3000/path"],
  ])
    assert.throws(() => resolveCaptureHost(c, host, origin));
});
test("capture tokens cannot cross environments, credentials or scopes", () => {
  const s: CaptureScope = {
    tenantId: "TEN-0001",
    environment: "development",
    origin: "http://localhost:3000",
    visitorId: id,
    sessionId: id,
    identityMode: "persistent",
  };
  const token = signCapture(s, c);
  assert.equal(verifyCapture(token, c).sessionId, id);
  assert.throws(() =>
    verifyCapture(token, { ...c, environment: "production" }),
  );
  assert.throws(() => verifyCapture(token, { ...c, secret: "y".repeat(40) }));
  assert.throws(() => verifyCapture(undefined, c));
});
test("public capture credentials cannot authenticate to existing business APIs", () => {
  const token = signCapture(
    {
      tenantId: "TEN-0001",
      environment: "development",
      origin: "http://localhost:3000",
      visitorId: id,
      sessionId: id,
      identityMode: "persistent",
    },
    c,
  );
  assert.throws(() => jwt.verify(token, c.secret));
});
test("event allowlist rejects medical content, authority fields and malformed events", () => {
  const event = {
    eventId: id,
    pageViewId: id,
    name: "page_view",
    pageCode: "landing",
    sequence: 1,
  };
  assert.equal(validateEvents({ events: [event] }).length, 1);
  for (const extra of [
    { patientDni: "12345678" },
    { paymentStatus: "approved" },
    { tenantId: "OTHER" },
    { actorType: "patient" },
    { url: "https://example.test/?token=secret" },
    { arbitrary: "data" },
  ])
    assert.throws(() => validateEvents({ events: [{ ...event, ...extra }] }));
  for (const changed of [
    { name: "payment_state_recorded" },
    { name: "activity", activeMs: -1 },
    { sequence: 1.5 },
    { pageCode: "diagnosis" },
    { pageViewId: "short" },
    { name: "form_opened" },
  ])
    assert.throws(() => validateEvents({ events: [{ ...event, ...changed }] }));
  assert.throws(() => validateEvents({ events: Array(21).fill(event) }));
  assert.throws(() => strictObject([], []));
});
test("bounded form events and activity accept only their specific fields", () => {
  const e = { eventId: id, pageViewId: id, sequence: 2 };
  assert.equal(
    validateEvents({ events: [{ ...e, name: "activity", activeMs: 30000 }] })
      .length,
    1,
  );
  assert.equal(
    validateEvents({
      events: [
        {
          ...e,
          name: "form_step_viewed",
          step: "medication",
          formAttemptId: id,
        },
      ],
    }).length,
    1,
  );
  assert.throws(() =>
    validateEvents({
      events: [
        {
          ...e,
          name: "form_step_viewed",
          step: "free-text",
          formAttemptId: id,
        },
      ],
    }),
  );
  assert.throws(() =>
    validateEvents({
      events: [
        {
          ...e,
          name: "form_opened",
          formAttemptId: id,
          validationCategory: "drug_name",
        },
      ],
    }),
  );
});
test("Argentina boundaries include October 13 UTC-late orders and reject overlapping/invalid ranges", () => {
  const q = parseReportQuery({ from: "2026-09-16", to: "2026-10-13" });
  assert(Date.parse("2026-10-14T00:08:00Z") < q.periods[0].end);
  assert.equal(q.periods[0].end, Date.parse("2026-10-14T03:00:00Z"));
  assert.equal(q.windowDays, 7);
  for (const query of [
    { from: "2026-02-30", to: "2026-03-01" },
    { from: "2026-10-01", to: "2026-09-01" },
    { from: "2026-01-01", to: "2026-10-01" },
    { from: "2026-10-01", to: "2026-10-01", windowDays: 0 },
    { periods: "bad" },
    { from: "2026-01-01", to: "2026-01-01", tenantId: "OTHER" },
    {
      periods: JSON.stringify([
        { from: "2026-10-01", to: "2026-10-03" },
        { from: "2026-10-03", to: "2026-10-05" },
      ]),
    },
  ])
    assert.throws(() => parseReportQuery(query));
});
test("only tenant-scoped admins can read analytics; missing tenant never grants global access", () => {
  assert.equal(
    reportTenant({ role: "admin", tenantId: "TEN-0001" }),
    "TEN-0001",
  );
  for (const role of [
    "paciente",
    "colaborador",
    "medico",
    "superadmin",
    undefined,
  ])
    assert.throws(() => reportTenant({ role, tenantId: "TEN-0001" }));
  assert.throws(() => reportTenant({ role: "admin" }));
  assert.throws(() => reportTenant(undefined));
});
test("only a trusted Vercel runtime may use its validated edge address header", () => {
  assert.equal(
    analyticsClientAddress("127.0.0.1", "192.0.2.1", {}),
    "127.0.0.1",
  );
  assert.equal(
    analyticsClientAddress("127.0.0.1", "192.0.2.1", { VERCEL: "1" }),
    "192.0.2.1",
  );
  assert.equal(
    analyticsClientAddress("127.0.0.1", "forged, 192.0.2.1", { VERCEL: "1" }),
    "127.0.0.1",
  );
  assert(knownAnalyticsBot("Mozilla/5.0 Googlebot"));
  assert(!knownAnalyticsBot("Mozilla/5.0 Safari"));
});
test("a preview deployment cannot capture production events even with a copied flag", () => {
  const env = {
    ANALYTICS_ENABLED: "true",
    ANALYTICS_ENVIRONMENT: "production",
    VERCEL_ENV: "preview",
    ANALYTICS_STARTED_AT: "2026-01-01T00:00:00Z",
    JWT_SECRET: "x".repeat(40),
  };
  assert(!captureConfigured(analyticsConfig(env)));
});
