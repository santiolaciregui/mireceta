# US-015 — Local validation

Date: 2026-10-29. Result: local checks passed. This is not an independent QA approval or production certification.

| Check | Result |
|---|---|
| Baseline before implementation | 447 tests passed |
| Final `npm run test:cov` | 489 passed, 0 failed |
| New analytics tests | 42 |
| Node overall reported line coverage | 85.20% (includes test files) |
| `npm run lint` | Passed (TypeScript) |
| `npm run build` | Passed; bundle-size warning remains visible |
| `git diff --check` | Passed |

## Verified automatically

Strict payload validation, host/tenant matching, environment isolation, capture-token separation from ordinary login JWTs, tenant-admin report policy, date boundaries, persistent quotas, page/event deduplication, activity maximums and out-of-order samples, storage failures, retry IDs, inactivity session renewal, recovery after an initial registration failure, exact-attempt attribution including delayed openings, coverage pause/resume, new-collection indexes, reconstruction checkpoints and degraded reconciliation state.

Cohort fixtures verify that 10 sessions, 4 with openings, 3 with saved orders and 2 with paid orders yield 40%, 30% and 20%. Reopening the same attempt in another session increases sessions with an opening without increasing unique attempts. Union totals, exemptions, refunds, late approvals, unknown approval times, staff/test exclusions, zero denominators and unavailable capture periods are covered. A synthetic 10,000-session/200,000-event fixture runs without a database.

The generated XLSX is reopened with ExcelJS to check the actual OOXML container, two sheets, typed dates, missing-value labels and absence of raw visitor/order/patient identifiers. This is separate from the browser download control.

## Browser verification

The actual `AnalyticsView` component was served by standalone Vite in a local HTML fixture. Fetch was replaced inside that fixture with synthetic aggregate responses and a block on other network calls. The business server and its startup migrations were not started.

- Desktop: empty state, filters, query action, resulting values/percentages, coverage/observation labels and export control were inspected.
- Mobile: explicit 390 × 844 viewport; form controls remained usable. The measured document scroll width equaled its client width (375 px); the 640 px table stayed within its own horizontal scrolling container.
- Argentina timestamps were checked after explicitly selecting a 24-hour clock: 20:00 UTC rendered 17:00, and 03:00 UTC rendered 00:00.
- The temporary viewport override was reset after verification.

This fixture check does not establish real JWT authentication, admin navigation integration, live MongoDB persistence, provider callbacks or actual browser download delivery.

## Still requires an isolated/live environment

Verify actual API persistence and partial-index creation on a designated test database; real multi-tab/back/bfcache and blocked-storage behavior; the tenant-admin navigation with a valid login; provider sandbox approvals/refunds and transfer validation; the existing cron under actual serverless execution; and an actual end-to-end Excel download against the API. No production writes, real payments, patient messages, activation, deployment, commit or push were performed in this implementation task.

Capture is off by default. Activation requires the explicit environment variables and deployment procedure in `web-analytics.md`. Known pauses can only be recorded when maintenance observes them; short outages and client losses can remain undetected. The counters do not promise complete visitor coverage or historical session reconstruction.
