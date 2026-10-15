# QA Report: US-010 — Complete request inbox routing
Date: 2026-10-14
Verdict: CONDITIONAL — acceptance criteria pass; overall repository coverage remains below the guide's 80% threshold.

- All 222 unit tests pass, including 48 clinical/payment inbox combinations, immutable historical-order routing, and 40 service correction combinations.
- Inbox routing helper: 100% line, branch, and function coverage.
- Overall repository: 78.82% lines, 73.14% branches, 75.79% functions. OrderService overall: 72.36% lines; this task does not claim complete coverage of unrelated service behavior.
- TypeScript check, production build, and diff whitespace check pass. Build reports a large frontend bundle warning.
- Clinical terminal states take priority over payment state. Active failed/refunded/missing payments remain visible in pending payment. Approved/exempt active requests are visible in review even for legacy Pendiente records.
- Clinical progress and terminal states survive payment corrections. Automatic transition only changes Pendiente to En revisión and records an order audit entry. Regression tests fail on attempted payment provider operations.
- Counts, list filters, and patient-list navigation consume the same routing helper.
- No live database access, data migration, deployment, browser session, or production validation performed.

Manual production check after deployment: approve a transfer payment on a Pendiente request; verify the request moves into medical review before attaching a recipe, the audit shows the transition, and sidebar counts match. Verify a legacy paid Pendiente request, rejected payment, exempt request, and cancelled request remain accessible in their respective inboxes.
