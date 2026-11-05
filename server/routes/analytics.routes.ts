/** US-015 / T-002/T-006, 2026-10-29. Same-origin collection and tenant-scoped administrative reports. */
import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { Tenant } from "../models/Tenant.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import {
  analyticsConfig,
  captureConfigured,
  AnalyticsError,
  resolveCaptureHost,
  strictObject,
  isId,
  signCapture,
  verifyCapture,
  validateEvents,
  parseReportQuery,
  reportTenant,
  analyticsClientAddress,
  knownAnalyticsBot,
} from "../services/analyticsPolicy.js";
import { analyticsStore } from "../services/analyticsStore.js";
import { buildAnalyticsReport } from "../services/analyticsReport.js";
import { analyticsXlsx } from "../services/analyticsXlsx.js";
const router = Router();
function error(res: Response, e: unknown) {
  const a =
    e instanceof AnalyticsError
      ? e
      : new AnalyticsError(503, "ANALYTICS_UNAVAILABLE");
  if (a.status === 429) res.setHeader("Retry-After", "60");
  return res.status(a.status).json({ error: a.code });
}
function optionalUser(
  req: Request,
  secret: string,
): Record<string, any> | undefined {
  if (!req.headers.authorization) return;
  try {
    const raw = req.headers.authorization;
    if (!raw.startsWith("Bearer ")) throw new Error();
    const value = jwt.verify(raw.slice(7), secret, { algorithms: ["HS256"] });
    if (
      typeof value === "string" ||
      value.aud === "mireceta-analytics" ||
      typeof value.role !== "string"
    )
      throw new Error();
    return value;
  } catch {
    throw new AnalyticsError(401, "INVALID_AUTHENTICATION");
  }
}
async function prepare(req: Request) {
  const c = analyticsConfig();
  if (!captureConfigured(c))
    throw new AnalyticsError(503, "ANALYTICS_DISABLED");
  const origin = req.get("origin") || "",
    host = req.get("host") || "";
  const tenantId = resolveCaptureHost(c, host, origin);
  if (!(await Tenant.exists({ id: tenantId })))
    throw new AnalyticsError(403, "ANALYTICS_TENANT_DENIED");
  const user = optionalUser(req, c.secret);
  if (user?.tenantId && user.tenantId !== tenantId)
    throw new AnalyticsError(403, "ANALYTICS_TENANT_DENIED");
  if (Buffer.byteLength(JSON.stringify(req.body || {})) > 32768)
    throw new AnalyticsError(413, "ANALYTICS_BATCH_TOO_LARGE");
  await analyticsStore.rateLimit(
    tenantId,
    origin,
    analyticsClientAddress(
      req.socket.remoteAddress,
      req.get("x-vercel-forwarded-for"),
    ),
    req.get("x-analytics-token"),
  );
  if (knownAnalyticsBot(req.get("user-agent") || "")) {
    await analyticsStore.excludedBot(tenantId);
    throw new AnalyticsError(403, "ANALYTICS_BOT_EXCLUDED");
  }
  return { c, origin, tenantId, user };
}
router.post("/session", async (req, res) => {
  try {
    const { c, origin, tenantId } = await prepare(req);
    const b = strictObject(req.body, [
      "visitorId",
      "sessionId",
      "identityMode",
      "schemaVersion",
    ]);
    if (
      !isId(b.visitorId) ||
      !isId(b.sessionId) ||
      !["persistent", "ephemeral"].includes(b.identityMode) ||
      b.schemaVersion !== 1
    )
      throw new AnalyticsError(400, "INVALID_SESSION");
    await analyticsStore.noteCoverage(tenantId);
    const token = signCapture(
      {
        tenantId,
        environment: c.environment,
        origin,
        visitorId: b.visitorId,
        sessionId: b.sessionId,
        identityMode: b.identityMode,
      },
      c,
    );
    res.setHeader("Cache-Control", "no-store");
    res.json({ token, expiresIn: 86400 });
  } catch (e) {
    error(res, e);
  }
});
router.post("/events", async (req, res) => {
  try {
    const { c, origin, tenantId, user } = await prepare(req);
    const scope = verifyCapture(req.get("x-analytics-token"), c);
    if (scope.origin !== origin || scope.tenantId !== tenantId)
      throw new AnalyticsError(403, "ANALYTICS_SCOPE_DENIED");
    const events = validateEvents(req.body);
    const accepted = await analyticsStore.capture(scope, events, user);
    res.json({ accepted });
  } catch (e) {
    error(res, e);
  }
});
router.use(authenticateToken);
for (const path of ["/report", "/report.xlsx"])
  router.get(path, async (req, res) => {
    try {
      const c = analyticsConfig();
      if (c.secret.length < 32 || !c.environment || !c.deploymentMatches)
        throw new AnalyticsError(503, "ANALYTICS_NOT_CONFIGURED");
      const tenantId = reportTenant(req.user);
      if (!(await Tenant.exists({ id: tenantId })))
        throw new AnalyticsError(403, "ANALYTICS_TENANT_DENIED");
      const { periods, windowDays } = parseReportQuery(
        req.query as Record<string, unknown>,
      );
      const asOf = new Date();
      const from = Math.min(...periods.map((p) => p.start)),
        end = Math.min(
          +asOf,
          Math.max(...periods.map((p) => p.end)) + windowDays * 86400000,
        );
      const data = await analyticsStore.readReport(
        tenantId,
        from,
        end,
        asOf,
        periods.map((p) => ({
          start: p.start,
          end: Math.min(+asOf, p.end + windowDays * 86400000),
        })),
      );
      const report = buildAnalyticsReport(
        { ...data, asOf, windowDays },
        periods,
      );
      res.setHeader("Cache-Control", "no-store");
      if (path.endsWith(".xlsx")) {
        res.type(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="MiReceta-analitica.xlsx"',
        );
        res.send(await analyticsXlsx(report));
      } else res.json(report);
    } catch (e) {
      error(res, e);
    }
  });
export default router;
