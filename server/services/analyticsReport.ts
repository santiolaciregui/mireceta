/** US-015 / T-005, 2026-10-29. Cohorts keep visit denominators separate from current business state. */
import {
  DAY,
  type AnalyticsView,
  type AnalyticsEvent,
  type AnalyticsFact,
  type Coverage,
  type Metric,
  type PeriodReport,
  type ReportPeriod,
} from "../../src/analytics/contracts.js";
const distinct = <T>(rows: T[], key: (r: T) => string) =>
  new Set(rows.map(key));
const metric = (value: number | null, reason?: string): Metric => ({
  value,
  ...(reason ? { reason } : {}),
});
const ratio = (n: number, d: number, unknown = false): Metric => ({
  value: unknown || !d ? null : n / d,
  numerator: n,
  denominator: d,
  ...(unknown
    ? { reason: "unknown_approval_time" }
    : !d
      ? { reason: "not_applicable" }
      : {}),
});
export interface ReportInput {
  botExclusions?: { at: Date; count: number }[];
  views: AnalyticsView[];
  events: AnalyticsEvent[];
  facts: AnalyticsFact[];
  coverage: Coverage;
  asOf: Date;
  windowDays: number;
}
/** ranges can be disjoint; totals must use unions, never sum distinct-visitor counts. */
export function calculatePeriod(
  input: ReportInput,
  ranges: ReportPeriod[],
  label: string,
): PeriodReport {
  const { views, events, facts, coverage, asOf, windowDays } = input;
  const inside = (t: Date | number) =>
    ranges.some((p) => +t >= p.start && +t < p.end);
  const sessions = new Map<string, AnalyticsView[]>();
  for (const v of views) {
    if (v.kind !== "view" || +v.firstReceivedAt > +asOf) continue;
    const group = sessions.get(v.sessionId) || [];
    group.push(v);
    sessions.set(v.sessionId, group);
  }
  const eligible = new Map<
    string,
    { start: number; end: number; views: AnalyticsView[] }
  >();
  let staffSessions = 0,
    testSessions = 0;
  for (const [id, vs] of sessions) {
    const start = vs.reduce(
      (minimum, v) => Math.min(minimum, +v.firstReceivedAt),
      Infinity,
    );
    if (!inside(start)) continue;
    if (vs.some((v) => v.isTest)) {
      testSessions++;
      continue;
    }
    if (vs.some((v) => v.actorType === "staff")) {
      staffSessions++;
      continue;
    }
    eligible.set(id, {
      start,
      end: Math.min(+asOf, start + windowDays * DAY),
      views: vs,
    });
  }
  const allEligible = [...eligible.values()];
  const cohortViews = allEligible.flatMap((s) => s.views);
  const ev = events.filter(
    (e) => !e.isTest && e.actorType !== "staff" && +e.receivedAt <= +asOf,
  );
  const firstOpening = new Map<string, AnalyticsEvent>();
  for (const e of ev)
    if (e.name === "form_opened" && e.formAttemptId) {
      const prev = firstOpening.get(e.formAttemptId);
      if (!prev || +e.receivedAt < +prev.receivedAt)
        firstOpening.set(e.formAttemptId, e);
    }
  const opened = [...firstOpening.values()].filter((e) => {
    const s = eligible.get(e.sessionId);
    return s && +e.receivedAt <= s.end;
  });
  const openedSessionIds = distinct(
    ev.filter(
      (e) =>
        e.name === "form_opened" &&
        eligible.has(e.sessionId) &&
        +e.receivedAt <= eligible.get(e.sessionId)!.end,
    ),
    (e) => e.sessionId,
  );
  const attempts = new Map(opened.map((e) => [e.formAttemptId!, e]));
  const linked = facts.filter(
    (f) =>
      f.kind === "order_fact" &&
      f.origin === "patient" &&
      !f.isTest &&
      f.attribution === "linked" &&
      !!f.formAttemptId &&
      attempts.has(f.formAttemptId) &&
      !!f.originSessionId &&
      f.originSessionId === attempts.get(f.formAttemptId)?.sessionId &&
      +f.createdAt <= eligible.get(f.originSessionId)!.end &&
      +f.createdAt >= eligible.get(f.originSessionId)!.start,
  );
  const paid = linked.filter(
    (f) =>
      f.latestPaymentStatus !== "exempt" &&
      f.firstApprovedAt &&
      +f.firstApprovedAt >= +f.createdAt &&
      +f.firstApprovedAt <= eligible.get(f.originSessionId!)!.end,
  );
  const chargeable = linked.filter((f) => f.latestPaymentStatus !== "exempt");
  const unknown = chargeable.filter(
    (f) =>
      !f.approvalTimeKnown &&
      ["approved", "refunded"].includes(f.latestPaymentStatus),
  );
  const paidSessionIds = distinct(paid, (f) => f.originSessionId!);
  const uncertainSessions = unknown.some(
    (f) => !paidSessionIds.has(f.originSessionId!),
  );
  const times = allEligible.map(
    (s) => s.views.reduce((n, v) => n + Math.max(0, v.activeMs || 0), 0) / 1000,
  );
  const visitorIds = distinct(cohortViews, (v) => v.visitorId);
  const savedAttempts = distinct(linked, (f) => f.formAttemptId!);
  const unsubmitted = opened.filter(
    (e) =>
      !savedAttempts.has(e.formAttemptId!) &&
      eligible.get(e.sessionId)!.start + windowDays * DAY <= +asOf,
  );
  const stepEvents = new Map<string, AnalyticsEvent[]>();
  for (const e of ev)
    if (e.formAttemptId && e.step) {
      const bucket = stepEvents.get(e.formAttemptId) || [];
      bucket.push(e);
      stepEvents.set(e.formAttemptId, bucket);
    }
  const lastSteps: Record<string, number> = {};
  for (const opening of unsubmitted) {
    const observed = (stepEvents.get(opening.formAttemptId!) || [])
      .filter((e) => +e.receivedAt <= eligible.get(opening.sessionId)!.end)
      .sort((a, b) => +b.receivedAt - +a.receivedAt);
    const step = observed[0]?.step || "info";
    lastSteps[step] = (lastSteps[step] || 0) + 1;
  }
  const business = facts.filter(
    (f) =>
      f.kind === "order_fact" &&
      !f.isTest &&
      inside(f.createdAt) &&
      +f.createdAt <= +asOf,
  );
  const noStart =
    !coverage.start || ranges.every((r) => r.end <= +coverage.start!);
  const partial =
    !noStart &&
    (ranges.some((r) => r.start < +coverage.start!) ||
      coverage.pauses.some((p) =>
        ranges.some((r) => +p.start < r.end && +(p.end || asOf) > r.start),
      ) ||
      coverage.reconciliationError ||
      !coverage.lastReconciledAt ||
      +asOf - +coverage.lastReconciledAt > 2 * DAY);
  const m: Record<string, Metric> = {
    startedAttempts: metric(
      distinct(
        ev.filter(
          (e) =>
            e.name === "form_started" &&
            attempts.has(e.formAttemptId!) &&
            +e.receivedAt <=
              eligible.get(attempts.get(e.formAttemptId!)!.sessionId)!.end,
        ),
        (e) => e.formAttemptId!,
      ).size,
    ),
    validationFailures: metric(
      ev.filter(
        (e) =>
          e.name === "form_validation_failed" &&
          attempts.has(e.formAttemptId!) &&
          +e.receivedAt <=
            eligible.get(attempts.get(e.formAttemptId!)!.sessionId)!.end,
      ).length,
    ),
    unpaidPending: metric(
      chargeable.filter((f) => f.latestPaymentStatus === "pending").length,
    ),
    unpaidRejected: metric(
      chargeable.filter((f) => f.latestPaymentStatus === "rejected").length,
    ),
    unpaidCancelled: metric(
      chargeable.filter(
        (f) => f.orderStatus === "Cancelada" && !f.firstApprovedAt,
      ).length,
    ),
    unpaidTransfer: metric(
      chargeable.filter(
        (f) =>
          f.latestPaymentMethod === "transfer" &&
          f.latestPaymentStatus === "pending",
      ).length,
    ),
    botRequests: metric(
      (input.botExclusions || [])
        .filter((b) => inside(b.at))
        .reduce((n, b) => n + b.count, 0),
    ),
    visitors: metric(visitorIds.size),
    sessions: metric(eligible.size),
    views: metric(cohortViews.length),
    activeSeconds: metric(
      eligible.size ? times.reduce((n, t) => n + t, 0) / eligible.size : null,
      eligible.size ? undefined : "not_applicable",
    ),
    missingSamples: metric(
      allEligible.filter((s) => !s.views.some((v) => v.hasActivitySample))
        .length,
    ),
    ephemeralVisitors: metric(
      distinct(
        cohortViews.filter((v) => v.identityMode === "ephemeral"),
        (v) => v.visitorId,
      ).size,
    ),
    under10: metric(times.filter((t) => t < 10).length),
    from10: metric(times.filter((t) => t >= 10 && t < 60).length),
    from60: metric(times.filter((t) => t >= 60 && t < 180).length),
    over180: metric(times.filter((t) => t >= 180).length),
    openedSessions: metric(openedSessionIds.size),
    attempts: metric(attempts.size),
    savedSessions: metric(distinct(linked, (f) => f.originSessionId!).size),
    savedAttempts: metric(savedAttempts.size),
    attributedOrders: metric(linked.length),
    paidSessions: metric(paidSessionIds.size),
    paidOrders: metric(paid.length),
    exempt: metric(
      linked.filter((f) => f.latestPaymentStatus === "exempt").length,
    ),
    chargeable: metric(chargeable.length),
    unknownApproval: metric(unknown.length),
    latePayments: metric(
      linked.filter(
        (f) =>
          f.firstApprovedAt &&
          +f.firstApprovedAt >
            eligible.get(f.originSessionId!)!.start + windowDays * DAY &&
          +f.firstApprovedAt <= +asOf,
      ).length,
    ),
    unsubmitted: metric(unsubmitted.length),
    visitToForm: ratio(openedSessionIds.size, eligible.size),
    visitToOrder: ratio(
      distinct(linked, (f) => f.originSessionId!).size,
      eligible.size,
    ),
    formToOrder: ratio(savedAttempts.size, attempts.size),
    visitToPayment: ratio(
      paidSessionIds.size,
      eligible.size,
      uncertainSessions,
    ),
    orderToPayment: ratio(paid.length, chargeable.length, unknown.length > 0),
    businessPatient: metric(
      business.filter((f) => f.origin === "patient").length,
    ),
    businessStaff: metric(business.filter((f) => f.origin === "staff").length),
    businessUnknownOrigin: metric(
      business.filter((f) => f.origin === "unknown").length,
    ),
    businessApproved: metric(
      business.filter((f) => f.latestPaymentStatus === "approved").length,
    ),
    businessExempt: metric(
      business.filter((f) => f.latestPaymentStatus === "exempt").length,
    ),
    businessPending: metric(
      business.filter((f) => f.latestPaymentStatus === "pending").length,
    ),
    businessRejected: metric(
      business.filter((f) => f.latestPaymentStatus === "rejected").length,
    ),
    businessRefunded: metric(
      business.filter((f) => f.latestPaymentStatus === "refunded").length,
    ),
    unlinked: metric(
      business.filter((f) => f.attribution === "unlinked").length,
    ),
    staffSessions: metric(staffSessions),
    testSessions: metric(testSessions),
  };
  for (const step of [
    "info",
    "identification",
    "medication",
    "payment",
    "confirmation",
  ]) {
    m[`step_${step}`] = metric(
      distinct(
        ev.filter(
          (e) =>
            e.step === step &&
            e.name === "form_step_viewed" &&
            attempts.has(e.formAttemptId!) &&
            +e.receivedAt <=
              eligible.get(attempts.get(e.formAttemptId!)!.sessionId)!.end,
        ),
        (e) => e.formAttemptId!,
      ).size,
    );
    m[`stopped_${step}`] = metric(lastSteps[step] || 0);
  }
  if (noStart)
    for (const k of Object.keys(m)) m[k] = metric(null, "before_capture");
  return {
    label,
    from: ranges[0].from,
    to: ranges.at(-1)!.to,
    coverage: noStart ? "unavailable" : partial ? "partial" : "complete",
    inObservation: ranges.some((r) => r.end + windowDays * DAY > +asOf),
    metrics: m,
    lastSteps,
  };
}
export function buildAnalyticsReport(
  input: ReportInput,
  periods: ReportPeriod[],
) {
  const reports = periods.map((p) => calculatePeriod(input, [p], p.label));
  const daily: PeriodReport[] = [];
  for (const p of periods)
    for (let t = p.start; t < p.end; t += DAY) {
      const date = new Date(t - 3 * 3600000).toISOString().slice(0, 10);
      daily.push(
        calculatePeriod(
          input,
          [{ from: date, to: date, label: date, start: t, end: t + DAY }],
          date,
        ),
      );
    }
  return {
    asOf: input.asOf.toISOString(),
    observationWindowDays: input.windowDays,
    timeZone: "America/Argentina/Buenos_Aires",
    captureStartedAt: input.coverage.start?.toISOString() || null,
    lastReconciledAt: input.coverage.lastReconciledAt?.toISOString() || null,
    reconciliationError: !!input.coverage.reconciliationError,
    periods: reports,
    total: calculatePeriod(input, periods, "Total"),
    daily,
  };
}
