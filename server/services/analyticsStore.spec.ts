/** US-015 / T-007, 2026-10-29. Native Mongo operations are exercised against a deterministic in-memory double. */
import test from "node:test";
import assert from "node:assert/strict";
import { AnalyticsStore } from "./analyticsStore.js";
import { Order } from "../models/Order.js";
import { AuditLog } from "../models/AuditLog.js";
import {
  signCapture,
  analyticsConfig,
  type CaptureScope,
} from "./analyticsPolicy.js";
class MemoryCollection {
  indexes: unknown[] = [];
  async createIndex(keys: unknown, options?: unknown) {
    this.indexes.push({ keys, options });
    return "index";
  }
  docs: Record<string, any>[] = [];
  writes = 0;
  fail = false;
  match(d: Record<string, any>, q: Record<string, any>) {
    return Object.entries(q).every(([k, v]) =>
      typeof v === "object" && v !== null && "$ne" in v
        ? d[k] !== v.$ne
        : d[k] === v,
    );
  }
  async findOne(q: Record<string, any>) {
    return this.docs.find((d) => this.match(d, q)) || null;
  }
  async updateOne(
    q: Record<string, any>,
    u: Record<string, any>,
    options?: { upsert?: boolean },
  ) {
    if (this.fail) throw new Error("Unavailable");
    this.writes++;
    let d = await this.findOne(q);
    if (!d && options?.upsert) {
      d = { ...q, ...u.$setOnInsert };
      this.docs.push(d);
    }
    if (!d) return;
    Object.assign(d, u.$set);
    for (const [k, v] of Object.entries(u.$max || {}))
      if (d[k] === undefined || Number(d[k]) < Number(v)) d[k] = v;
    for (const [k, v] of Object.entries(u.$min || {}))
      if (d[k] === undefined || Number(d[k]) > Number(v)) d[k] = v;
    for (const [k, v] of Object.entries(u.$inc || {}))
      d[k] = (d[k] || 0) + Number(v);
  }
  async updateMany(q: Record<string, any>, u: Record<string, any>) {
    for (const d of this.docs.filter((d) => this.match(d, q)))
      Object.assign(d, u.$set);
  }
  async findOneAndUpdate(
    q: Record<string, any>,
    u: Record<string, any>,
    options?: { upsert?: boolean },
  ) {
    await this.updateOne(q, u, options);
    return this.findOne(q);
  }
}
const configuredEnv = () => {
  const prev = { ...process.env };
  Object.assign(process.env, {
    ANALYTICS_ENABLED: "true",
    ANALYTICS_ENVIRONMENT: "development",
    ANALYTICS_STARTED_AT: "2026-01-01T00:00:00Z",
    JWT_SECRET: "x".repeat(40),
    ANALYTICS_HOSTS: '{"http://localhost:3000":"T"}',
  });
  return () => {
    process.env = prev;
  };
};
const queryResult = (value: unknown) => ({
  select() {
    return this;
  },
  sort() {
    return this;
  },
  limit() {
    return this;
  },
  lean() {
    return this;
  },
  maxTimeMS() {
    return Promise.resolve(value);
  },
});
test("a delayed opening links only a pending exact-attempt fact created by the server", async () => {
  const restore = configuredEnv();
  try {
    const f = fixture();
    f.facts.docs.push({
      kind: "order_fact",
      tenantId: "T",
      environment: "development",
      orderId: "REC-TEST",
      origin: "patient",
      attribution: "unlinked",
    });
    const token = signCapture(scope, analyticsConfig());
    await f.store.associate(
      { id: "REC-TEST", tenantId: "T" },
      { token, formAttemptId: attempt },
      { role: "paciente", tenantId: "T" },
    );
    assert.equal(f.facts.docs[0].attribution, "unlinked");
    assert.equal(f.facts.docs[0].formAttemptId, attempt);
    await f.store.capture(scope, [
      {
        eventId: "page-event-123456789012",
        pageViewId: page,
        name: "page_view",
        pageCode: "patient_form",
        sequence: 1,
      },
      {
        eventId: "open-event-123456789012",
        pageViewId: page,
        name: "form_opened",
        formAttemptId: attempt,
        sequence: 2,
      },
    ]);
    assert.equal(f.facts.docs[0].attribution, "linked");
    assert.equal(f.facts.docs[0].originSessionId, sid);
  } finally {
    restore();
  }
});
const sid = "session-1234567890123456",
  vid = "visitor-1234567890123456",
  page = "page-1234567890123456",
  attempt = "attempt-1234567890123456";
const scope: CaptureScope = {
  tenantId: "T",
  environment: "development",
  origin: "http://localhost:3000",
  visitorId: vid,
  sessionId: sid,
  identityMode: "persistent",
};
function fixture() {
  const views = new MemoryCollection(),
    events = new MemoryCollection(),
    facts = new MemoryCollection();
  const store = new AnalyticsStore();
  store.ensureIndexes = async () => {};
  store.views = () => views as any;
  store.events = () => events as any;
  store.facts = () => facts as any;
  store.noteCoverage = async () => {};
  return { store, views, events, facts };
}
test("capture deduplicates page views and accumulated time, including out-of-order samples", async () => {
  const f = fixture();
  const now = new Date();
  const view = {
    eventId: "view-event-123456789012",
    name: "page_view" as const,
    pageViewId: page,
    pageCode: "landing" as const,
    sequence: 1,
  };
  await f.store.capture(scope, [view], undefined, now);
  await f.store.capture(scope, [view], undefined, now);
  assert.equal(f.views.docs.length, 1);
  const activity = {
    eventId: "activity-123456789012",
    name: "activity" as const,
    pageViewId: page,
    activeMs: 30000,
    sequence: 3,
  };
  await f.store.capture(scope, [activity], undefined, new Date(+now + 30000));
  await f.store.capture(
    scope,
    [activity, { ...activity, activeMs: 10000, sequence: 2 }],
    undefined,
    new Date(+now + 40000),
  );
  assert.equal(f.views.docs[0].activeMs, 30000);
  assert.equal(f.views.docs[0].lastSequence, 3);
});
test("capture rejects a different visitor reusing another page ID and propagates persistence errors", async () => {
  const f = fixture();
  const e = {
    eventId: "view-event-123456789012",
    name: "page_view" as const,
    pageViewId: page,
    pageCode: "landing" as const,
    sequence: 1,
  };
  await f.store.capture(scope, [e]);
  await assert.rejects(
    f.store.capture({ ...scope, visitorId: "other-visitor-1234567890" }, [e]),
  );
  f.views.fail = true;
  await assert.rejects(f.store.capture(scope, [e]));
});
test("opening uniqueness is attempt plus session, and personal data never enters the persisted payload", async () => {
  const f = fixture();
  await f.store.capture(scope, [
    {
      eventId: "view-event-123456789012",
      name: "page_view",
      pageViewId: page,
      pageCode: "patient_form",
      sequence: 1,
    },
  ]);
  const e = {
    eventId: "opening-123456789012",
    name: "form_opened" as const,
    pageViewId: page,
    formAttemptId: attempt,
    sequence: 2,
  };
  await f.store.capture(scope, [
    e,
    { ...e, eventId: "other-event-123456789012" },
  ]);
  assert.equal(f.events.docs.length, 1);
  const text = JSON.stringify(f.events.docs);
  for (const field of [
    "patientDni",
    "medication",
    "phone",
    "email",
    "Authorization",
  ])
    assert(!text.includes(field));
});
test("staff classification covers earlier public views and survives later public batches", async () => {
  const f = fixture();
  const e = {
    eventId: "view-event-123456789012",
    name: "page_view" as const,
    pageViewId: page,
    pageCode: "landing" as const,
    sequence: 1,
  };
  await f.store.capture(scope, [e]);
  await f.store.capture(scope, [e], { role: "colaborador", id: "user" });
  await f.store.capture(scope, [e]);
  assert.equal(f.views.docs[0].actorType, "staff");
});
test("distributed quota uses persisted atomic counters and does not save raw addresses", async () => {
  const f = fixture();
  for (let i = 0; i < 120; i++)
    await f.store.rateLimit(
      "T",
      "http://localhost:3000",
      "192.0.2.1",
      "same-token",
    );
  await assert.rejects(
    f.store.rateLimit("T", "http://localhost:3000", "192.0.2.1", "same-token"),
  );
  assert(!JSON.stringify(f.views.docs).includes("192.0.2.1"));
  const second = new AnalyticsStore();
  second.ensureIndexes = async () => {};
  second.views = () => f.views as any;
  await assert.rejects(
    second.rateLimit("T", "http://localhost:3000", "192.0.2.1", "same-token"),
  );
});
test("order facts stay idempotent and preserve approval through refund without using paymentDate", async () => {
  const prev = { ...process.env };
  try {
    Object.assign(process.env, {
      ANALYTICS_ENABLED: "true",
      ANALYTICS_ENVIRONMENT: "development",
      ANALYTICS_STARTED_AT: "2026-01-01T00:00:00Z",
      JWT_SECRET: "x".repeat(40),
    });
    const f = fixture();
    const order = {
      id: "REC-TEST",
      tenantId: "T",
      createdAt: "2026-10-01T00:00:00Z",
      paymentStatus: "pending",
      paymentMethod: "mp",
      status: "Emitida",
      paymentDate: "2026-10-01T00:00:00Z",
      auditLog: [],
    };
    await f.store.observe(order, { origin: "patient" });
    assert.equal(f.facts.docs[0].approvalTimeKnown, false);
    assert.equal(f.facts.docs[0].firstApprovedAt, undefined);
    const paidAt = new Date("2026-10-02T00:00:00Z");
    await f.store.observe(
      { ...order, paymentStatus: "approved" },
      { approvedAt: paidAt, source: "provider_verified" },
    );
    await f.store.observe({ ...order, paymentStatus: "refunded" });
    assert.equal(f.facts.docs.length, 1);
    assert.equal(+f.facts.docs[0].firstApprovedAt, +paidAt);
    assert.equal(f.facts.docs[0].latestPaymentStatus, "refunded");
    assert.equal(f.facts.docs[0].attribution, "unlinked");
    assert(!JSON.stringify(f.facts.docs).includes("paymentDate"));
  } finally {
    process.env = prev;
  }
});
test("only new collections receive cached explicit indexes", async () => {
  const f = fixture(),
    store = new AnalyticsStore();
  store.views = () => f.views as any;
  store.events = () => f.events as any;
  store.facts = () => f.facts as any;
  await Promise.all([store.ensureIndexes(), store.ensureIndexes()]);
  const all = [...f.views.indexes, ...f.events.indexes, ...f.facts.indexes];
  assert.equal(all.length, 11);
  assert(!JSON.stringify(all).includes("expireAfterSeconds"));
});
test("capture activation, known pause and resume preserve coverage history", async () => {
  const restore = configuredEnv();
  try {
    const f = fixture();
    f.store.noteCoverage = AnalyticsStore.prototype.noteCoverage.bind(f.store);
    await f.store.noteCoverage("T", new Date("2026-10-01T00:00:00Z"));
    assert((await f.store.coverage("T")).start);
    process.env.ANALYTICS_ENABLED = "false";
    await f.store.noteCoverage("T", new Date("2026-10-02T00:00:00Z"));
    assert.equal((await f.store.coverage("T")).pauses.length, 1);
    process.env.ANALYTICS_ENABLED = "true";
    await f.store.noteCoverage("T", new Date("2026-10-03T00:00:00Z"));
    const coverage = await f.store.coverage("T");
    assert.equal(coverage.pauses.length, 1);
    assert.equal(+coverage.pauses[0].end!, Date.parse("2026-10-03T00:00:00Z"));
  } finally {
    restore();
  }
});
test("attribution requires the exact tenant and visitor and never changes an already linked fact", async () => {
  const restore = configuredEnv();
  try {
    const f = fixture();
    const c = analyticsConfig();
    f.events.docs.push({
      tenantId: "T",
      environment: c.environment,
      name: "form_opened",
      formAttemptId: attempt,
      sessionId: sid,
      visitorId: vid,
      actorType: "patient",
      isTest: false,
    });
    f.facts.docs.push({
      kind: "order_fact",
      tenantId: "T",
      environment: c.environment,
      orderId: "REC-TEST",
      attribution: "unlinked",
    });
    const token = signCapture(scope, c);
    await f.store.associate(
      { id: "REC-TEST", tenantId: "OTHER" },
      { token, formAttemptId: attempt },
      { role: "paciente", tenantId: "T" },
    );
    assert.equal(f.facts.docs[0].attribution, "unlinked");
    await f.store.associate(
      { id: "REC-TEST", tenantId: "T" },
      { token, formAttemptId: attempt },
      { role: "paciente", tenantId: "T" },
    );
    assert.equal(f.facts.docs[0].attribution, "linked");
    assert.equal(f.facts.docs[0].originSessionId, sid);
    const writes = f.facts.writes;
    await f.store.associate(
      { id: "REC-TEST", tenantId: "T" },
      { token, formAttemptId: attempt },
      { role: "colaborador", tenantId: "T" },
    );
    assert.equal(f.facts.writes, writes);
  } finally {
    restore();
  }
});
test("reconciliation reconstructs only verifiable order state and advances its checkpoint after writes", async () => {
  const restore = configuredEnv(),
    oldFind = Order.find,
    oldAudit = AuditLog.findOne;
  try {
    const f = fixture();
    const order = {
      id: "REC-TEST",
      tenantId: "T",
      createdAt: "2026-10-01T00:00:00Z",
      paymentStatus: "approved",
      paymentMethod: "mp",
      status: "Emitida",
      auditLog: [],
    };
    Order.find = (() => queryResult([order])) as any;
    AuditLog.findOne = (() => queryResult({ userRole: "paciente" })) as any;
    await f.store.reconcile();
    const fact = f.facts.docs.find((d) => d.kind === "order_fact");
    assert.equal(fact?.latestPaymentStatus, "approved");
    assert.equal(fact?.approvalTimeKnown, false);
    assert.equal(fact?.attribution, "unlinked");
    assert.equal(fact?.origin, "patient");
    const cp = f.facts.docs.find((d) => d.kind === "checkpoint");
    assert(cp?.lastCompletedAt);
    assert.equal(cp?.cursorDate, null);
  } finally {
    Order.find = oldFind;
    AuditLog.findOne = oldAudit;
    restore();
  }
});
test("reconciliation failure records degraded state without modifying any business document", async () => {
  const restore = configuredEnv(),
    oldFind = Order.find;
  try {
    const f = fixture();
    Order.find = (() => {
      throw new Error("Read unavailable");
    }) as any;
    const original = console.warn;
    console.warn = () => {};
    try {
      await f.store.reconcile();
    } finally {
      console.warn = original;
    }
    assert.equal(
      f.facts.docs.find((d) => d.kind === "checkpoint")?.error,
      true,
    );
    assert.equal(f.facts.docs.filter((d) => d.kind === "order_fact").length, 0);
  } finally {
    Order.find = oldFind;
    restore();
  }
});
