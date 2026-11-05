/** US-015 / T-001/T-002/T-004, 2026-10-29. Native collections never initialize or migrate existing models. */
import mongoose from "mongoose";
import { createHmac, createHash } from "node:crypto";
import { Order } from "../models/Order.js";
import { AuditLog } from "../models/AuditLog.js";
import {
  analyticsConfig,
  AnalyticsError,
  captureConfigured,
  verifyCapture,
  strictObject,
  isId,
  type CaptureScope,
} from "./analyticsPolicy.js";
import type {
  AnalyticsFact,
  AnalyticsView,
  AnalyticsEvent,
  BrowserEvent,
  Coverage,
  ActorType,
} from "../../src/analytics/contracts.js";

const scopeFilter = (tenantId: string, environment: string) => ({
  tenantId,
  environment,
});
const actor = (user?: Record<string, any>): ActorType =>
  !user ? "public" : user.role === "paciente" ? "patient" : "staff";
export class AnalyticsStore {
  private indexPromise: Promise<unknown> | undefined;
  private collection(name: string) {
    if (!mongoose.connection.db)
      throw new AnalyticsError(503, "ANALYTICS_STORAGE_UNAVAILABLE");
    return mongoose.connection.db.collection(name);
  }
  views() {
    return this.collection("analyticsviews");
  }
  events() {
    return this.collection("analyticsevents");
  }
  facts() {
    return this.collection("analyticsorderfacts");
  }
  async ensureIndexes() {
    if (!this.indexPromise)
      this.indexPromise = Promise.all([
        this.views().createIndex(
          { tenantId: 1, environment: 1, pageViewId: 1 },
          { unique: true, partialFilterExpression: { kind: "view" } },
        ),
        this.views().createIndex(
          { kind: 1, limitKey: 1, minuteBucket: 1 },
          { unique: true, partialFilterExpression: { kind: "rate_limit" } },
        ),
        this.views().createIndex({
          tenantId: 1,
          environment: 1,
          sessionId: 1,
          firstReceivedAt: 1,
        }),
        this.views().createIndex({
          tenantId: 1,
          environment: 1,
          firstReceivedAt: 1,
        }),
        this.events().createIndex(
          { tenantId: 1, environment: 1, eventId: 1 },
          { unique: true },
        ),
        this.events().createIndex({
          tenantId: 1,
          environment: 1,
          receivedAt: 1,
          name: 1,
        }),
        this.events().createIndex({
          tenantId: 1,
          environment: 1,
          formAttemptId: 1,
          receivedAt: 1,
        }),
        this.facts().createIndex(
          { tenantId: 1, environment: 1, orderId: 1 },
          { unique: true, partialFilterExpression: { kind: "order_fact" } },
        ),
        this.facts().createIndex(
          { tenantId: 1, environment: 1, kind: 1, key: 1 },
          {
            unique: true,
            partialFilterExpression: {
              kind: { $in: ["coverage", "checkpoint"] },
            },
          },
        ),
        this.facts().createIndex({ tenantId: 1, environment: 1, createdAt: 1 }),
        this.facts().createIndex({
          tenantId: 1,
          environment: 1,
          originSessionId: 1,
        }),
      ]).catch((e) => {
        this.indexPromise = undefined;
        throw e;
      });
    await this.indexPromise;
  }
  async rateLimit(
    tenantId: string,
    origin: string,
    ip: string,
    token?: string,
    now = new Date(),
  ) {
    await this.ensureIndexes();
    const c = analyticsConfig();
    const minuteBucket = Math.floor(+now / 60000);
    const daily = now.toISOString().slice(0, 10);
    const ipHash = createHmac("sha256", c.secret)
      .update(`${daily}:${origin}:${ip}`)
      .digest("hex");
    for (const [limitKey, limit] of [
      [`ip:${tenantId}:${ipHash}`, 240],
      ...(token
        ? [[`token:${createHash("sha256").update(token).digest("hex")}`, 120]]
        : []),
    ] as [string, number][]) {
      const value = await this.views().findOneAndUpdate(
        { kind: "rate_limit", limitKey, minuteBucket },
        { $inc: { count: 1 }, $setOnInsert: { createdAt: now } },
        { upsert: true, returnDocument: "after" },
      );
      if ((value?.count || 0) > limit)
        throw new AnalyticsError(429, "ANALYTICS_RATE_LIMIT");
    }
  }
  async coverage(tenantId: string): Promise<Coverage> {
    const c = analyticsConfig(),
      base = scopeFilter(tenantId, c.environment);
    const doc = await this.facts().findOne({
      ...base,
      kind: "coverage",
      key: "capture",
    });
    const check = await this.facts().findOne({
      ...base,
      kind: "checkpoint",
      key: "reconciliation",
    });
    return {
      start: doc?.startedAt || null,
      pauses: [
        ...(doc?.pauses || []),
        ...(doc?.pausedAt ? [{ start: doc.pausedAt }] : []),
      ],
      lastReconciledAt: check?.lastCompletedAt,
      reconciliationError: !!check?.error,
    };
  }
  async noteCoverage(tenantId: string, now = new Date()) {
    const c = analyticsConfig();
    await this.ensureIndexes();
    const filter = {
      ...scopeFilter(tenantId, c.environment),
      kind: "coverage",
      key: "capture",
    };
    await this.facts().updateOne(
      filter,
      {
        $setOnInsert: { startedAt: c.startedAt, pauses: [], schemaVersion: 1 },
      },
      { upsert: true },
    );
    if (!c.enabled) {
      const prior = await this.facts().findOne(filter);
      if (!prior?.pausedAt)
        await this.facts().updateOne(filter, { $set: { pausedAt: now } });
    } else {
      const prior = await this.facts().findOne(filter);
      if (prior?.pausedAt)
        await this.facts().updateOne(
          { ...filter, pausedAt: prior.pausedAt },
          {
            $set: {
              pauses: [
                ...(prior.pauses || []),
                { start: prior.pausedAt, end: now },
              ],
              pausedAt: null,
            },
          },
        );
    }
  }
  async capture(
    scope: CaptureScope,
    events: BrowserEvent[],
    user?: Record<string, any>,
    now = new Date(),
  ) {
    const c = analyticsConfig();
    await this.noteCoverage(scope.tenantId, now);
    const base = scopeFilter(scope.tenantId, scope.environment),
      actorType = actor(user),
      isTest = !!user && c.testUsers.includes(user.id);
    // A session marker protects the whole cohort even if earlier public batches arrive late.
    const previousMarker = await this.events().findOne({
      ...base,
      eventId: `classification-${scope.sessionId}`,
    });
    if (actorType === "staff" || isTest)
      await this.events().updateOne(
        { ...base, eventId: `classification-${scope.sessionId}` },
        {
          $set: {
            name: "session_classification",
            sessionId: scope.sessionId,
            actorType:
              previousMarker?.actorType === "staff" ? "staff" : actorType,
            isTest: !!previousMarker?.isTest || isTest,
            receivedAt: now,
            schemaVersion: 1,
          },
        },
        { upsert: true },
      );
    const marker = await this.events().findOne({
      ...base,
      eventId: `classification-${scope.sessionId}`,
    });
    const finalActor = marker?.actorType === "staff" ? "staff" : actorType,
      finalTest = !!marker?.isTest || isTest;
    for (const e of events) {
      const filter = { ...base, kind: "view", pageViewId: e.pageViewId };
      if (e.name === "page_view") {
        const existing = await this.views().findOne(filter);
        if (
          existing &&
          (existing.sessionId !== scope.sessionId ||
            existing.visitorId !== scope.visitorId)
        )
          throw new AnalyticsError(403, "ANALYTICS_VIEW_SCOPE_DENIED");
        await this.views().updateOne(
          filter,
          {
            $setOnInsert: {
              ...base,
              visitorId: scope.visitorId,
              sessionId: scope.sessionId,
              identityMode: scope.identityMode,
              kind: "view",
              pageViewId: e.pageViewId,
              pageCode: e.pageCode,
              firstReceivedAt: now,
              activeMs: 0,
              lastSequence: 0,
              hasActivitySample: false,
              schemaVersion: 1,
            },
            $set: {
              lastReceivedAt: now,
              actorType: finalActor,
              isTest: finalTest,
            },
          },
          { upsert: true },
        );
      } else if (e.name === "activity") {
        const view = await this.views().findOne({
          ...filter,
          sessionId: scope.sessionId,
          visitorId: scope.visitorId,
        });
        if (!view) throw new AnalyticsError(400, "ANALYTICS_VIEW_NOT_FOUND");
        const activeMs = Math.min(
          e.activeMs!,
          Math.max(0, +now - +view.firstReceivedAt) + 5000,
        );
        await this.views().updateOne(
          { ...filter, sessionId: scope.sessionId },
          {
            $max: { activeMs, lastSequence: e.sequence, lastReceivedAt: now },
            $set: { hasActivitySample: true },
          },
        );
      } else {
        const view = await this.views().findOne({
          ...filter,
          sessionId: scope.sessionId,
          visitorId: scope.visitorId,
        });
        if (!view) throw new AnalyticsError(400, "ANALYTICS_VIEW_NOT_FOUND");
        const dedupe =
          e.name === "form_opened"
            ? `opened-${e.formAttemptId}-${scope.sessionId}`
            : e.name === "form_started"
              ? `started-${e.formAttemptId}`
              : e.eventId;
        await this.events().updateOne(
          { ...base, eventId: dedupe },
          {
            $setOnInsert: {
              ...e,
              eventId: dedupe,
              ...base,
              visitorId: scope.visitorId,
              sessionId: scope.sessionId,
              receivedAt: now,
              actorType: finalActor,
              isTest: finalTest,
              schemaVersion: 1,
            },
          },
          { upsert: true },
        );
      }
    }
    if (finalActor !== "staff" && !finalTest) {
      for (const attempt of new Set(
        events
          .filter((e) => e.name === "form_opened")
          .map((e) => e.formAttemptId),
      )) {
        const opening = await this.events().findOne(
          {
            ...base,
            name: "form_opened",
            formAttemptId: attempt,
            visitorId: scope.visitorId,
            actorType: { $ne: "staff" },
            isTest: false,
          },
          { sort: { receivedAt: 1 } },
        );
        if (opening)
          await this.facts().updateMany(
            {
              ...base,
              kind: "order_fact",
              origin: "patient",
              formAttemptId: attempt,
              visitorId: scope.visitorId,
              attribution: "unlinked",
            },
            {
              $set: {
                originSessionId: opening.sessionId,
                attribution: "linked",
              },
            },
          );
      }
    }
    if (finalActor === "staff" || finalTest) {
      await this.views().updateMany(
        { ...base, kind: "view", sessionId: scope.sessionId },
        { $set: { actorType: finalActor, isTest: finalTest } },
      );
      await this.events().updateMany(
        { ...base, sessionId: scope.sessionId },
        { $set: { actorType: finalActor, isTest: finalTest } },
      );
    }
    return events.map((e) => e.eventId);
  }
  async associate(
    order: Record<string, any>,
    context: unknown,
    user?: Record<string, any>,
  ) {
    if (!captureConfigured(analyticsConfig()) || !context) return;
    try {
      const ctx = strictObject(context, ["token", "formAttemptId"]);
      if (!isId(ctx.formAttemptId)) return;
      const scope = verifyCapture(ctx.token, analyticsConfig());
      if (
        scope.tenantId !== order.tenantId ||
        user?.role !== "paciente" ||
        (user.tenantId && user.tenantId !== order.tenantId)
      )
        return;
      // The caller has already performed the normal exact-order ownership checks.
      const opening = await this.events().findOne(
        {
          ...scopeFilter(order.tenantId, scope.environment),
          name: "form_opened",
          formAttemptId: ctx.formAttemptId,
          actorType: { $ne: "staff" },
          isTest: false,
        },
        { sort: { receivedAt: 1 } },
      );
      if (!opening) {
        await this.facts().updateOne(
          {
            ...scopeFilter(order.tenantId, scope.environment),
            kind: "order_fact",
            orderId: order.id,
            attribution: "unlinked",
          },
          {
            $set: {
              formAttemptId: ctx.formAttemptId,
              visitorId: scope.visitorId,
            },
          },
        );
        return;
      }
      if (opening.visitorId !== scope.visitorId) return;
      await this.facts().updateOne(
        {
          ...scopeFilter(order.tenantId, scope.environment),
          kind: "order_fact",
          orderId: order.id,
          attribution: "unlinked",
        },
        {
          $set: {
            formAttemptId: ctx.formAttemptId,
            visitorId: opening.visitorId,
            originSessionId: opening.sessionId,
            attribution: "linked",
          },
        },
      );
    } catch {
      console.warn("[Analytics] Association unavailable.");
    }
  }
  async observe(
    order: Record<string, any>,
    options: {
      origin?: "patient" | "staff" | "unknown";
      approvedAt?: Date;
      source?: string;
      isTest?: boolean;
    } = {},
  ) {
    const c = analyticsConfig();
    if (!captureConfigured(c) || !order?.tenantId || !order?.id) return;
    const createdAt = new Date(order.createdAt);
    if (!Number.isFinite(+createdAt) || +createdAt < +c.startedAt!) return;
    await this.ensureIndexes();
    const now = new Date();
    const filter = {
      ...scopeFilter(order.tenantId, c.environment),
      kind: "order_fact",
      orderId: order.id,
    };
    const prior = await this.facts().findOne(filter);
    const origin =
      options.origin ||
      prior?.origin ||
      (order.createdByOperatorId ? "staff" : "unknown");
    const approval = (order.auditLog || [])
      .filter((e: any) =>
        /^(Pago aprobado|Pago acreditado \(Mercado Pago(?: API)?\)|Sync Pago Mercado Pago: approved)$/.test(
          e.action || "",
        ),
      )
      .map((e: any) => new Date(e.timestamp))
      .filter(
        (d: Date) => Number.isFinite(+d) && +d >= +createdAt && +d <= +now,
      )
      .sort((a: Date, b: Date) => +a - +b)[0];
    const firstApprovedAt =
      prior?.firstApprovedAt || options.approvedAt || approval;
    const update: Record<string, unknown> = {
      origin,
      latestPaymentStatus: order.paymentStatus,
      latestPaymentMethod: order.paymentMethod || "",
      orderStatus: order.status,
      lastObservedAt: now,
      approvalTimeKnown: !!firstApprovedAt,
      isTest: !!options.isTest || !!prior?.isTest,
    };
    if (firstApprovedAt) {
      update.approvalSource =
        prior?.approvalSource || options.source || "created_approved";
    }
    if (prior?.latestPaymentStatus !== order.paymentStatus)
      update.lastPaymentRecordedAt = now;
    await this.facts().updateOne(
      filter,
      {
        $setOnInsert: { createdAt, attribution: "unlinked", schemaVersion: 1 },
        $set: update,
        ...(firstApprovedAt ? { $min: { firstApprovedAt } } : {}),
      },
      { upsert: true },
    );
  }
  async excludedBot(tenantId: string, now = new Date()) {
    const c = analyticsConfig();
    await this.noteCoverage(tenantId, now);
    const day = new Date(+now - 3 * 3600000).toISOString().slice(0, 10);
    await this.facts().updateOne(
      {
        ...scopeFilter(tenantId, c.environment),
        kind: "coverage",
        key: `bot-excluded:${day}`,
      },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          dayStart: new Date(`${day}T03:00:00Z`),
          schemaVersion: 1,
        },
      },
      { upsert: true },
    );
  }
  async readReport(
    tenantId: string,
    start: number,
    end: number,
    asOf: Date,
    windows: { start: number; end: number }[] = [{ start, end }],
  ) {
    const c = analyticsConfig(),
      base = scopeFilter(tenantId, c.environment);
    const cap = 250001;
    const timeFilter = (field: string, pad = 0) => ({
      $or: windows.map((w) => ({
        [field]: {
          $gte: new Date(w.start - pad),
          $lt: new Date(w.end),
          $lte: asOf,
        },
      })),
    });
    const views = await this.views()
      .find(
        {
          ...base,
          kind: "view",
          ...timeFilter("firstReceivedAt", 30 * 60000),
        },
        { maxTimeMS: 10000 },
      )
      .limit(cap)
      .toArray();
    // Earliest view of a session is authoritative, including sessions that straddle the lower cutoff.
    const sessionIds = [
      ...new Set(
        views
          .filter(
            (v) => +v.firstReceivedAt >= start && +v.firstReceivedAt < end,
          )
          .map((v) => v.sessionId),
      ),
    ];
    const sessionViews = sessionIds.length
      ? await this.views()
          .find(
            {
              ...base,
              kind: "view",
              sessionId: { $in: sessionIds },
              firstReceivedAt: { $lte: asOf },
            },
            { maxTimeMS: 10000 },
          )
          .limit(cap)
          .toArray()
      : [];
    const events = await this.events()
      .find(
        {
          ...base,
          ...timeFilter("receivedAt"),
        },
        { maxTimeMS: 10000 },
      )
      .limit(cap)
      .toArray();
    const attempts = [
      ...new Set(
        events
          .filter((e) => e.name === "form_opened")
          .map((e) => e.formAttemptId),
      ),
    ];
    const firstOpenings = attempts.length
      ? await this.events()
          .aggregate(
            [
              {
                $match: {
                  ...base,
                  name: "form_opened",
                  formAttemptId: { $in: attempts },
                },
              },
              { $sort: { receivedAt: 1 } },
              {
                $group: { _id: "$formAttemptId", first: { $first: "$$ROOT" } },
              },
              { $replaceRoot: { newRoot: "$first" } },
              { $limit: cap },
            ],
            { maxTimeMS: 10000 },
          )
          .toArray()
      : [];
    const facts = await this.facts()
      .find(
        {
          ...base,
          kind: "order_fact",
          ...timeFilter("createdAt"),
        },
        { maxTimeMS: 10000 },
      )
      .limit(cap)
      .toArray();
    if ([views, sessionViews, events, facts].some((rows) => rows.length >= cap))
      throw new AnalyticsError(413, "ANALYTICS_REPORT_TOO_LARGE");
    // Apply staff markers to views even when classification occurred after the initial page_view.
    const staff = new Set(
      events.filter((e) => e.actorType === "staff").map((e) => e.sessionId),
    );
    const tests = new Set(
      events.filter((e) => e.isTest).map((e) => e.sessionId),
    );
    const botExclusions = await this.facts()
      .find(
        { ...base, kind: "coverage", ...timeFilter("dayStart") },
        { maxTimeMS: 10000 },
      )
      .limit(401)
      .toArray();
    if (botExclusions.length >= 401)
      throw new AnalyticsError(413, "ANALYTICS_REPORT_TOO_LARGE");
    return {
      botExclusions: botExclusions.map((d) => ({
        at: d.dayStart as Date,
        count: Number(d.count) || 0,
      })),
      views: sessionViews.map((v) => ({
        ...v,
        actorType: staff.has(v.sessionId) ? "staff" : v.actorType,
        isTest: tests.has(v.sessionId) || v.isTest,
      })) as unknown as AnalyticsView[],
      events: [...firstOpenings, ...events] as unknown as AnalyticsEvent[],
      facts: facts as unknown as AnalyticsFact[],
      coverage: await this.coverage(tenantId),
    };
  }
  async reconcile() {
    const c = analyticsConfig();
    if (!captureConfigured(c)) {
      if (c.secret.length >= 32 && c.startedAt && c.environment)
        for (const tenantId of [...new Set(Object.values(c.hosts))])
          await this.noteCoverage(tenantId);
      return;
    }
    await this.ensureIndexes();
    for (const tenantId of [...new Set(Object.values(c.hosts))]) {
      await this.noteCoverage(tenantId);
      const filter = {
        ...scopeFilter(tenantId, c.environment),
        kind: "checkpoint",
        key: "reconciliation",
      };
      try {
        const cp = await this.facts().findOne(filter);
        const upper = cp?.upper || new Date();
        const range: any = {
          tenantId,
          createdAt: {
            $gte: c.startedAt!.toISOString(),
            $lte: new Date(upper).toISOString(),
          },
        };
        if (cp?.cursorDate)
          range.$or = [
            { createdAt: { $gt: cp.cursorDate } },
            { createdAt: cp.cursorDate, id: { $gt: cp.cursorId } },
          ];
        const orders = await Order.find(range)
          .select(
            "id tenantId createdAt paymentStatus paymentMethod status createdByOperatorId auditLog.action auditLog.timestamp",
          )
          .sort({ createdAt: 1, id: 1 })
          .limit(200)
          .lean()
          .maxTimeMS(10000);
        for (const order of orders) {
          const creation = await AuditLog.findOne({
            tenantId,
            entityId: order.id,
            action: "ORDER_CREATE",
          })
            .select("userRole")
            .lean()
            .maxTimeMS(10000);
          await this.observe(order, {
            origin:
              creation?.userRole === "paciente"
                ? "patient"
                : creation?.userRole
                  ? "staff"
                  : "unknown",
          });
          // Persist progress only AFTER this fact, so a serverless freeze cannot starve later batches.
          await this.facts().updateOne(
            filter,
            {
              $set: {
                cursorDate: order.createdAt,
                cursorId: order.id,
                upper,
                checkedAt: new Date(),
              },
            },
            { upsert: true },
          );
        }
        const tail = orders.at(-1);
        const complete = orders.length < 200;
        await this.facts().updateOne(
          filter,
          {
            $set: {
              error: false,
              checkedAt: new Date(),
              ...(complete
                ? {
                    lastCompletedAt: new Date(),
                    cursorDate: null,
                    cursorId: null,
                    upper: null,
                  }
                : { cursorDate: tail!.createdAt, cursorId: tail!.id, upper }),
            },
          },
          { upsert: true },
        );
      } catch {
        await this.facts().updateOne(
          filter,
          { $set: { error: true, checkedAt: new Date() } },
          { upsert: true },
        );
        console.warn("[Analytics] Reconciliation unavailable.");
      }
    }
  }
}
export const analyticsStore = new AnalyticsStore();
export async function runAnalyticsMaintenance() {
  const work = analyticsStore.reconcile().catch(() => {
    console.warn("[Analytics] Reconciliation unavailable.");
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      work,
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, 1500);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
export async function observeAnalyticsOrder(
  order: Record<string, any>,
  options: Parameters<AnalyticsStore["observe"]>[1] = {},
  context?: unknown,
  user?: Record<string, any>,
) {
  if (!captureConfigured(analyticsConfig())) return;
  const work = (async () => {
    try {
      const canonical = await Order.findOne({
        id: order.id,
        tenantId: order.tenantId,
      })
        .select(
          "id tenantId createdAt paymentStatus paymentMethod status createdByOperatorId auditLog.action auditLog.timestamp",
        )
        .lean()
        .maxTimeMS(400);
      if (!canonical) return;
      await analyticsStore.observe(canonical, {
        ...options,
        ...(user
          ? { isTest: analyticsConfig().testUsers.includes(user.id) }
          : {}),
      });
      await analyticsStore.associate(canonical, context, user);
    } catch {
      console.warn("[Analytics] Business fact unavailable.");
    }
  })();
  // The collector must never consume the business request's full serverless timeout.
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      work,
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, 500);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
