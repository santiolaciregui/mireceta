/** US-015 / T-002, 2026-10-29. Enforce the collector limit before the application's larger clinical-file parser. */
import { json, type ErrorRequestHandler, type Express } from "express";
export function mountAnalyticsBodyLimit(app: Express) {
  const error: ErrorRequestHandler = (err, _req, res, _next) => {
    const large = err?.type === "entity.too.large";
    res
      .status(large ? 413 : 400)
      .json({
        error: large
          ? "ANALYTICS_BATCH_TOO_LARGE"
          : "INVALID_ANALYTICS_PAYLOAD",
      });
  };
  app.use(
    [
      "/api/analytics/session",
      "/api/analytics/events",
      "/analytics/session",
      "/analytics/events",
    ],
    json({ limit: 32768 }),
    error,
  );
}
