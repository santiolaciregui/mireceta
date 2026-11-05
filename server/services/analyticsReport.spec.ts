/** US-015 / T-007, 2026-10-29. Independent cohort fixtures protect the meaning of conversion rates. */
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAnalyticsReport,
  calculatePeriod,
  type ReportInput,
} from "./analyticsReport.js";
import { parseReportQuery } from "./analyticsPolicy.js";
import {
  DAY,
  type AnalyticsFact,
  type AnalyticsView,
  type AnalyticsEvent,
} from "../../src/analytics/contracts.js";
const start = Date.parse("2026-10-01T03:00:00Z"),
  asOf = new Date(start + 20 * DAY);
const period = parseReportQuery({
  from: "2026-10-01",
  to: "2026-10-01",
}).periods;
function fixture(): ReportInput {
  const views: AnalyticsView[] = Array.from({ length: 10 }, (_, i) => ({
    kind: "view",
    tenantId: "T",
    environment: "development",
    visitorId: `visitor-${i}`,
    sessionId: `session-${i}`,
    pageViewId: `page-${i}`,
    pageCode: "landing",
    actorType: "patient",
    identityMode: "persistent",
    isTest: false,
    firstReceivedAt: new Date(start + i * 1000),
    lastReceivedAt: new Date(start + 60000),
    activeMs: 60000,
    lastSequence: 3,
    hasActivitySample: true,
  }));
  const events: AnalyticsEvent[] = Array.from({ length: 4 }, (_, i) => ({
    tenantId: "T",
    environment: "development",
    visitorId: `visitor-${i}`,
    sessionId: `session-${i}`,
    pageViewId: `page-${i}`,
    eventId: `event-${i}`,
    formAttemptId: `form-${i}`,
    name: "form_opened",
    sequence: 2,
    receivedAt: new Date(start + 3000 + i * 1000),
    actorType: "patient",
    isTest: false,
  }));
  const facts: AnalyticsFact[] = Array.from({ length: 3 }, (_, i) => ({
    kind: "order_fact",
    tenantId: "T",
    environment: "development",
    orderId: `order-${i}`,
    origin: "patient",
    visitorId: `visitor-${i}`,
    originSessionId: `session-${i}`,
    formAttemptId: `form-${i}`,
    createdAt: new Date(start + 10000 + i * 1000),
    approvalTimeKnown: i < 2,
    latestPaymentStatus: i < 2 ? "approved" : "pending",
    latestPaymentMethod: "mp",
    firstApprovedAt: i < 2 ? new Date(start + 20000 + i * 1000) : undefined,
    lastObservedAt: asOf,
    attribution: "linked",
  }));
  return {
    views,
    events,
    facts,
    coverage: {
      start: new Date(start - DAY),
      pauses: [],
      lastReconciledAt: asOf,
    },
    asOf,
    windowDays: 7,
  };
}
test("10 sessions, 4 openings, 3 saved and 2 paid produce 40%, 30%, 20%", () => {
  const r = calculatePeriod(fixture(), period, "P");
  assert.equal(r.metrics.visitToForm.value, 0.4);
  assert.equal(r.metrics.visitToOrder.value, 0.3);
  assert.equal(r.metrics.visitToPayment.value, 0.2);
  assert.equal(r.metrics.formToOrder.value, 0.75);
  assert.equal(r.metrics.orderToPayment.value, 2 / 3);
  assert.equal(r.metrics.activeSeconds.value, 60);
  assert.equal(r.metrics.unsubmitted.value, 1);
  assert.equal(r.coverage, "complete");
});
test("multiple paid orders in one session never overcount converted sessions", () => {
  const f = fixture();
  f.facts.push({ ...f.facts[0], orderId: "another" });
  const r = calculatePeriod(f, period, "P");
  assert.equal(r.metrics.paidSessions.value, 2);
  assert.equal(r.metrics.paidOrders.value, 3);
  assert.equal(r.metrics.visitToPayment.value, 0.2);
});
test("unknown approval time is exposed, never fabricated from current status", () => {
  const f = fixture();
  f.facts[2].latestPaymentStatus = "approved";
  const r = calculatePeriod(f, period, "P");
  assert.equal(r.metrics.visitToPayment.value, null);
  assert.equal(r.metrics.orderToPayment.value, null);
  assert.equal(r.metrics.unknownApproval.value, 1);
  assert.equal(r.metrics.orderToPayment.reason, "unknown_approval_time");
});
test("exempt, issued-but-pending, and late payments stay distinct", () => {
  const f = fixture();
  f.facts[0].latestPaymentStatus = "exempt";
  f.facts[0].firstApprovedAt = undefined;
  f.facts[1].firstApprovedAt = new Date(start + 9 * DAY);
  f.facts[2].orderStatus = "Emitida";
  const r = calculatePeriod(f, period, "P");
  assert.equal(r.metrics.paidOrders.value, 0);
  assert.equal(r.metrics.exempt.value, 1);
  assert.equal(r.metrics.chargeable.value, 2);
  assert.equal(r.metrics.businessPending.value, 1);
  assert.equal(r.metrics.latePayments.value, 1);
});
test("refund preserves a verified historical conversion", () => {
  const f = fixture();
  f.facts[0].latestPaymentStatus = "refunded";
  const r = calculatePeriod(f, period, "P");
  assert.equal(r.metrics.paidOrders.value, 2);
  assert.equal(r.metrics.businessRefunded.value, 1);
});
test("staff/test sessions and unlinked facts do not enter the patient funnel", () => {
  const f = fixture();
  f.views[0].actorType = "staff";
  f.views[1].isTest = true;
  f.facts[0].origin = "staff";
  f.facts[1].attribution = "unlinked";
  const r = calculatePeriod(f, period, "P");
  assert.equal(r.metrics.sessions.value, 8);
  assert.equal(r.metrics.attributedOrders.value, 1);
  assert.equal(r.metrics.staffSessions.value, 1);
  assert.equal(r.metrics.testSessions.value, 1);
  assert.equal(r.metrics.unlinked.value, 1);
});
test("total visitors are a union across periods, not a sum", () => {
  const f = fixture();
  f.views.push({
    ...f.views[0],
    sessionId: "next-session",
    pageViewId: "next-page",
    firstReceivedAt: new Date(start + DAY),
  });
  const ps = parseReportQuery({
    periods: JSON.stringify([
      { from: "2026-10-01", to: "2026-10-01" },
      { from: "2026-10-02", to: "2026-10-02" },
    ]),
  }).periods;
  const r = buildAnalyticsReport(f, ps);
  assert.equal(r.periods[0].metrics.visitors.value, 10);
  assert.equal(r.periods[1].metrics.visitors.value, 1);
  assert.equal(r.total.metrics.visitors.value, 10);
  assert.equal(r.total.metrics.sessions.value, 11);
  assert.equal(r.total.metrics.visitToPayment.value, 2 / 11);
});
test("no capture, pauses, zero denominator and observation windows have explicit states", () => {
  const f = fixture();
  f.coverage.start = null;
  assert.equal(calculatePeriod(f, period, "P").metrics.visitors.value, null);
  f.coverage.start = new Date(start - DAY);
  f.coverage.pauses = [{ start: new Date(start + 100) }];
  assert.equal(calculatePeriod(f, period, "P").coverage, "partial");
  f.asOf = new Date(start + DAY);
  assert(calculatePeriod(f, period, "P").inObservation);
  f.views = [];
  const r = calculatePeriod(f, period, "P");
  assert.equal(r.metrics.visitToOrder.value, null);
  assert.equal(r.metrics.visitToOrder.reason, "not_applicable");
});
test("reopen in another session does not change the originating attempt cohort", () => {
  const f = fixture();
  f.events.push({
    ...f.events[0],
    eventId: "reopened",
    sessionId: "session-4",
    receivedAt: new Date(start + 100000),
  });
  const r = calculatePeriod(f, period, "P");
  assert.equal(r.metrics.attempts.value, 4);
  assert.equal(r.metrics.openedSessions.value, 5);
  assert.equal(r.metrics.savedSessions.value, 3);
});
test("synthetic 10000-session/200000-event workload remains bounded without a database", () => {
  const f = fixture();
  f.views = Array.from({ length: 10000 }, (_, i) => ({
    ...f.views[i % 10],
    visitorId: `v${i}`,
    sessionId: `s${i}`,
    pageViewId: `p${i}`,
  }));
  f.events = Array.from({ length: 200000 }, (_, i) => ({
    ...f.events[i % 4],
    eventId: `e${i}`,
    visitorId: `v${i % 10000}`,
    sessionId: `s${i % 10000}`,
    formAttemptId: `f${i % 10000}`,
  }));
  f.facts = [];
  const r = calculatePeriod(f, period, "P");
  assert.equal(r.metrics.sessions.value, 10000);
  assert.equal(r.metrics.attempts.value, 10000);
});
