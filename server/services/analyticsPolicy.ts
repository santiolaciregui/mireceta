/** US-015 / T-001/T-002, 2026-10-29. Pure validation and explicitly scoped capture credentials. */
import jwt from "jsonwebtoken";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import {
  DAY,
  FORM_EVENTS,
  PAGE_CODES,
  ANALYTICS_STEPS,
  type BrowserEvent,
  type ReportPeriod,
} from "../../src/analytics/contracts.js";
export class AnalyticsError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
export interface AnalyticsConfig {
  deploymentMatches: boolean;
  enabled: boolean;
  secret: string;
  environment: string;
  hosts: Record<string, string>;
  startedAt: Date | null;
  testUsers: string[];
}
export function analyticsClientAddress(
  socketAddress: string | undefined,
  vercelAddress: string | undefined,
  env = process.env,
) {
  // Vercel overwrites this header at its trusted edge. Other deployments use the connection address.
  return env.VERCEL === "1" && vercelAddress && isIP(vercelAddress)
    ? vercelAddress
    : socketAddress || "unknown";
}
export function knownAnalyticsBot(userAgent: string) {
  return /googlebot|bingbot|duckduckbot|yandexbot|baiduspider|headlesschrome|lighthouse|oai-searchbot|gptbot/i.test(
    userAgent.slice(0, 512),
  );
}
export function analyticsConfig(env = process.env): AnalyticsConfig {
  let hosts: Record<string, string> = {};
  try {
    const value = JSON.parse(env.ANALYTICS_HOSTS || "{}");
    if (
      value &&
      !Array.isArray(value) &&
      typeof value === "object" &&
      Object.entries(value).every(([origin, tenant]) => {
        try {
          const url = new URL(origin);
          return (
            ["http:", "https:"].includes(url.protocol) &&
            url.origin === origin &&
            typeof tenant === "string" &&
            tenant.length > 0 &&
            tenant.length <= 100
          );
        } catch {
          return false;
        }
      })
    )
      hosts = value;
  } catch {
    /* Invalid configuration fails closed. */
  }
  const start = new Date(env.ANALYTICS_STARTED_AT || "");
  return {
    deploymentMatches:
      !env.VERCEL_ENV || env.VERCEL_ENV === env.ANALYTICS_ENVIRONMENT,
    enabled: env.ANALYTICS_ENABLED === "true",
    secret: env.JWT_SECRET || "",
    environment: env.ANALYTICS_ENVIRONMENT || "",
    hosts,
    startedAt: Number.isFinite(+start) ? start : null,
    testUsers: (env.ANALYTICS_TEST_USER_IDS || "").split(",").filter(Boolean),
  };
}
export function captureConfigured(c: AnalyticsConfig) {
  return (
    c.enabled &&
    c.deploymentMatches &&
    c.secret.length >= 32 &&
    ["production", "preview", "development"].includes(c.environment) &&
    !!c.startedAt
  );
}
export const isId = (v: unknown): v is string =>
  typeof v === "string" && /^[a-zA-Z0-9_-]{16,100}$/.test(v);
export function strictObject(
  value: unknown,
  allowed: readonly string[],
): Record<string, any> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !allowed.includes(k))
  )
    throw new AnalyticsError(400, "INVALID_ANALYTICS_PAYLOAD");
  return value as Record<string, any>;
}
export function resolveCaptureHost(
  c: AnalyticsConfig,
  host: string,
  origin: string,
): string {
  try {
    const u = new URL(origin);
    if (
      !["https:", "http:"].includes(u.protocol) ||
      u.origin !== origin ||
      u.host !== host.toLowerCase() ||
      typeof c.hosts[origin] !== "string"
    )
      throw new Error();
    return c.hosts[origin];
  } catch {
    throw new AnalyticsError(403, "ANALYTICS_HOST_DENIED");
  }
}
export interface CaptureScope {
  tenantId: string;
  environment: string;
  origin: string;
  visitorId: string;
  sessionId: string;
  identityMode: "persistent" | "ephemeral";
}
// Domain-separated key: a capture credential must NEVER verify as an application login JWT.
const captureKey = (c: AnalyticsConfig) =>
  createHmac("sha256", c.secret)
    .update("mireceta-analytics-capture-v1")
    .digest();
export function signCapture(scope: CaptureScope, c: AnalyticsConfig) {
  return jwt.sign(scope, captureKey(c), {
    algorithm: "HS256",
    audience: "mireceta-analytics",
    issuer: "mireceta",
    expiresIn: "24h",
  });
}
export function verifyCapture(
  token: unknown,
  c: AnalyticsConfig,
): CaptureScope {
  try {
    if (typeof token !== "string") throw new Error();
    const v = jwt.verify(token, captureKey(c), {
      algorithms: ["HS256"],
      audience: "mireceta-analytics",
      issuer: "mireceta",
    }) as CaptureScope;
    if (
      !isId(v.visitorId) ||
      !isId(v.sessionId) ||
      v.environment !== c.environment ||
      !["persistent", "ephemeral"].includes(v.identityMode)
    )
      throw new Error();
    return v;
  } catch {
    throw new AnalyticsError(401, "INVALID_ANALYTICS_TOKEN");
  }
}
export function validateEvents(body: unknown): BrowserEvent[] {
  const b = strictObject(body, ["events"]);
  if (!Array.isArray(b.events) || !b.events.length || b.events.length > 20)
    throw new AnalyticsError(400, "INVALID_ANALYTICS_BATCH");
  if (Buffer.byteLength(JSON.stringify(body)) > 32768)
    throw new AnalyticsError(413, "ANALYTICS_BATCH_TOO_LARGE");
  return b.events.map((input) => {
    const e = strictObject(input, [
      "eventId",
      "name",
      "pageViewId",
      "pageCode",
      "formAttemptId",
      "step",
      "validationCategory",
      "sequence",
      "activeMs",
    ]);
    if (
      !isId(e.eventId) ||
      !isId(e.pageViewId) ||
      !Number.isSafeInteger(e.sequence) ||
      e.sequence < 0 ||
      e.sequence > 1000000 ||
      !["page_view", "activity", ...FORM_EVENTS].includes(e.name)
    )
      throw new AnalyticsError(400, "INVALID_ANALYTICS_EVENT");
    if (e.pageCode !== undefined && !PAGE_CODES.includes(e.pageCode))
      throw new AnalyticsError(400, "INVALID_PAGE");
    if (e.name === "page_view" && !PAGE_CODES.includes(e.pageCode))
      throw new AnalyticsError(400, "INVALID_PAGE");
    if (e.step !== undefined && !ANALYTICS_STEPS.includes(e.step))
      throw new AnalyticsError(400, "INVALID_STEP");
    if (FORM_EVENTS.includes(e.name) && !isId(e.formAttemptId))
      throw new AnalyticsError(400, "INVALID_ATTEMPT");
    if (e.name === "form_step_viewed" && !ANALYTICS_STEPS.includes(e.step))
      throw new AnalyticsError(400, "INVALID_STEP");
    if (
      e.validationCategory !== undefined &&
      !["required", "format", "upload", "other"].includes(e.validationCategory)
    )
      throw new AnalyticsError(400, "INVALID_CATEGORY");
    if (
      e.name === "activity" &&
      (!Number.isSafeInteger(e.activeMs) || e.activeMs < 0 || e.activeMs > DAY)
    )
      throw new AnalyticsError(400, "INVALID_ACTIVITY");
    if (e.name !== "activity" && e.activeMs !== undefined)
      throw new AnalyticsError(400, "INVALID_ACTIVITY");
    return e as BrowserEvent;
  });
}
export function parseReportQuery(q: Record<string, unknown>): {
  periods: ReportPeriod[];
  windowDays: number;
} {
  if (
    Object.keys(q).some(
      (k) => !["from", "to", "periods", "windowDays"].includes(k),
    )
  )
    throw new AnalyticsError(400, "INVALID_REPORT_QUERY");
  let raw: unknown;
  try {
    raw = q.periods
      ? JSON.parse(String(q.periods))
      : [{ from: q.from, to: q.to }];
  } catch {
    throw new AnalyticsError(400, "INVALID_PERIODS");
  }
  if (
    (q.periods && (q.from || q.to)) ||
    !Array.isArray(raw) ||
    !raw.length ||
    raw.length > 3
  )
    throw new AnalyticsError(400, "INVALID_PERIODS");
  const date = (v: unknown) => {
    if (
      typeof v !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
      !Number.isFinite(Date.parse(`${v}T03:00:00Z`)) ||
      new Date(`${v}T03:00:00Z`).toISOString().slice(0, 10) !== v
    )
      throw new AnalyticsError(400, "INVALID_DATE");
    return Date.parse(`${v}T03:00:00Z`);
  };
  const periods = raw.map((x) => {
    const p = strictObject(x, ["from", "to", "label"]);
    const start = date(p.from),
      end = date(p.to) + DAY;
    if (end <= start || end - start > 90 * DAY)
      throw new AnalyticsError(400, "INVALID_RANGE");
    if (
      p.label !== undefined &&
      (typeof p.label !== "string" || p.label.length > 80)
    )
      throw new AnalyticsError(400, "INVALID_LABEL");
    return {
      from: p.from,
      to: p.to,
      label: p.label || `${p.from} al ${p.to}`,
      start,
      end,
    };
  });
  const sorted = [...periods].sort((a, b) => a.start - b.start);
  if (sorted.some((p, i) => i > 0 && p.start < sorted[i - 1].end))
    throw new AnalyticsError(400, "OVERLAPPING_PERIODS");
  const windowDays = q.windowDays === undefined ? 7 : Number(q.windowDays);
  if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 30)
    throw new AnalyticsError(400, "INVALID_WINDOW");
  return { periods, windowDays };
}
export function reportTenant(
  user: Record<string, unknown> | undefined,
): string {
  if (
    user?.role !== "admin" ||
    typeof user.tenantId !== "string" ||
    !user.tenantId
  )
    throw new AnalyticsError(403, "ANALYTICS_REPORT_DENIED");
  return user.tenantId;
}
