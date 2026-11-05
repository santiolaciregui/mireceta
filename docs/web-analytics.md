# First-party web analytics (US-015)

Implemented on 2026-10-29 in the existing React/Vite, Express and MongoDB application. Capture is disabled by default. No existing orders, audits, patients, users or tenant records are migrated or backfilled.

## What is measured

- Estimated browsers, tab sessions, logical page views and observed active time.
- Unique logical form attempts, actual wizard steps, generic validation failures, completed clinical-data steps, submission attempts and checkout redirects.
- Server-confirmed order creation and current payment facts. Browser redirects or payment-return parameters cannot record an approval.
- A seven-day conversion window by default, with configurable windows from 1 to 30 days. Exemptions, staff, test traffic, unknown approval dates, late approvals and unattributed orders remain distinct.
- An admin report for up to three non-overlapping periods and a real `.xlsx` export with `Resumen` and `Detalle diario`.

Visitors are estimated browsers, not people. Sessions are per tab, with a 30-minute inactivity boundary. Active time excludes hidden, unfocused and idle pages. Sampling has up to five seconds of transition uncertainty. Cross-device recognition, fingerprinting, recordings, medical data and campaign attribution are not collected. The capture token and a visitor/session identifier cannot authenticate to any existing business API: capture credentials use a domain-separated signing key.

The new collections are `analyticsviews`, `analyticsevents` and `analyticsorderfacts`. Explicit partial indexes are created only for these collections when capture is enabled. Technical quota, coverage and reconciliation documents have separate discriminators and do not count as visits or orders. No TTL, deletion or purge is configured.

## Configuration

Use the real, explicitly configured application `JWT_SECRET` (at least 32 characters). Do not inadvertently rotate an existing authentication secret as part of enabling analytics. The analytics code rejects the application's legacy fallback rather than inheriting it.

| Variable | Meaning |
|---|---|
| `ANALYTICS_ENABLED` | Backend capture flag, default `false`. |
| `VITE_ANALYTICS_ENABLED` | Build-time frontend flag, default `false`. Rebuild after changing it. |
| `ANALYTICS_ENVIRONMENT` | `production`, `preview` or `development`. Must match `VERCEL_ENV` on Vercel. |
| `ANALYTICS_HOSTS` | JSON mapping of exact origins to existing tenant IDs. No wildcards or default-tenant fallback. |
| `ANALYTICS_STARTED_AT` | Explicit UTC activation timestamp, not a historical date used to pretend earlier capture existed. |
| `ANALYTICS_TEST_USER_IDS` | Comma-separated, explicitly designated test user IDs; never accepted from public request bodies. |

Example for an isolated development environment, replacing the tenant and timestamp intentionally:

```dotenv
ANALYTICS_ENABLED=true
VITE_ANALYTICS_ENABLED=true
ANALYTICS_ENVIRONMENT=development
ANALYTICS_HOSTS={"http://localhost:3000":"TEN-0001"}
ANALYTICS_STARTED_AT=2026-10-29T21:00:00.000Z
```

Production origins must be listed independently. `https://mireceta.online` and `https://www.mireceta.online` are separate browser origins. This implementation does not change their redirects or share browser storage across them.

**Local database boundary:** the existing `server.ts` startup runs `runTenantMigration`. Do not start `npm run dev` against a production `.env` for QA. Use an isolated local database/environment, or a frontend-only Vite fixture that cannot reach production APIs. Automated analytics tests use injected clocks/transports and in-memory repositories, not a live database.

## API and permissions

- `POST /api/analytics/session`: verified same-origin host + optional existing login JWT; issues a capture token. Unknown hosts and tenants fail closed.
- `POST /api/analytics/events`: requires `X-Analytics-Token`; browser events only. At most 20 events or 32 KiB, strict field allowlist and persisted deduplication.
- `GET /api/analytics/report` and `/api/analytics/report.xlsx`: authenticated `admin` with an explicit valid tenant. No implicit global access or arbitrary tenant query parameter. Other roles, including unscoped superadmins, are denied.

Query either `from=YYYY-MM-DD&to=YYYY-MM-DD`, or `periods=<URL-encoded JSON array of {from,to,label}>`. Add `windowDays=7` if needed. Each range is at most 90 days. Dates are inclusive in `America/Argentina/Buenos_Aires`; the backend uses exclusive UTC upper bounds. Query work is bounded to the requested ranges plus their observation windows, rather than all time between disjoint ranges. Oversized/time-limited reports fail explicitly instead of truncating counts.

Public collection is rate-limited to 120 requests/minute/token and 240/minute/address with persisted atomic counters. On a trusted Vercel runtime, use the platform-sanitized `x-vercel-forwarded-for`; elsewhere use the connection address. Raw addresses and User-Agent strings are not stored. Known crawler User-Agents are excluded on a best-effort basis and only aggregate exclusion counts are retained. This does not guarantee bot detection. See [Vercel request header documentation](https://vercel.com/docs/headers/request-headers).

The workbook is generated server-side with [ExcelJS 4.4.0](https://github.com/exceljs/exceljs), under its MIT license. It is not a renamed CSV and has no dependency on the Codex authoring runtime. The npm lockfile is included for reproducible installation.

## Reliability and interpretation

Browser transport keeps a bounded in-memory queue, batches events, retries failed batches twice with the same IDs and compacts accumulated activity counters. Repeated heartbeats apply a maximum, not an additive increment. Missing page registration is replayed idempotently before later events so a temporary capture outage does not permanently orphan the current page. No clinical drafts or checkout locks are reused as a telemetry queue.

Order/payment hooks only run after persistence. They reread the canonical order and give analytics a 500 ms response budget. Analytics failures do not convert business success into an error. An exact, ownership-checked attribution context may remain pending until its browser opening event arrives. No relation is inferred from a patient's name, DNI, amount or similarity.

The existing authenticated payment cron also runs isolated analytics reconciliation, with a 1.5-second response budget. It processes at most 200 orders per batch, persists its cursor after each completed fact, and starts another complete pass after reaching its fixed cycle upper bound. Serverless suspension may defer unfinished work to a later run. A growing backlog can take multiple daily runs. The report exposes completed-cycle time and errors; absent or older-than-two-day reconciliation makes coverage partial. No durable cross-collection transaction or total capture guarantee is claimed.

Approved status recovered without reliable approval timing is explicitly unknown for temporal conversion, not fabricated from `Order.paymentDate`. Exemptions are not payments; issuance is not payment confirmation. A later refund preserves the observed first approval and appears separately in current-state counts.

Known backend flag pauses are recorded when maintenance observes them, and resume closes the recorded interval. An outage or frontend-only disable shorter than the observation interval can remain undetected. Browser blockers, storage failures, network loss and closed tabs can also lose events. `complete` in the JSON means no known coverage gap, not proof that every real visitor was measured. No historical `asOf` reconstruction is provided for mutable activity snapshots.

The Excel download makes a new query using the last submitted filters; its timestamp can differ from the on-screen report. Business-volume rows use order creation date and current state at query time. Conversion rows use a session cohort and its observation window. Never divide one population by the other's denominator. Total visitor counts use unions; total conversion rates use aggregate numerators/denominators.

## Verification and rollout checklist

1. Run `npm test`, `npm run test:cov`, `npm run lint`, `npm run build` and `git diff --check`.
2. On an isolated environment, verify visible/hidden/focused/idle time; reload/back/bfcache; two tabs; blocked storage; network failures; repeated form steps; exact checkout continuation and explicit new request.
3. Verify unauthenticated, patient, staff and cross-tenant report denial; forged business events; capture-token use against ordinary authenticated APIs; preview/production isolation.
4. Use designated test accounts and sandbox provider credentials. Verify MP approval from the server, pending transfer, exemption, refund, unknown approval timing, delayed telemetry and reconciliation recovery.
5. Open the actual tenant-admin navigation, query three periods, reopen the downloaded Excel and compare numerator/denominator fields with the JSON. Check desktop and mobile layouts.
6. Only after an authorized deployment, set exact production origins, environment and activation timestamp; enable both flags together and verify persisted documents plus a tenant-scoped report. That verification has not been performed by local unit/browser checks.
7. To disable capture, turn off both flags and rebuild the frontend. Keep existing collections and report access. Do not purge history or change payment routing as rollback.

Retention is deliberately not automatic. Any purge, aggregation/archival policy, historical import or production activation is a separate operational change.
