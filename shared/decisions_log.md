# Decisions Log

| Timestamp | Agent | Decision | Notes |
|---|---|---|---|
| 2026-09-08T10:30:00-03:00 | PM | Roadmap + specs completed for Mi Receta alerts | 1 milestone, 1 story; DevOps Required: NO |
| 2026-09-08T11:00:00-03:00 | Developer | Implemented tasks T-001 through T-005 | Reused tenant notification settings; exact Meta template and language; alert lifecycle prevents repeats; included Mercado Pago transitions |
| 2026-09-08T11:20:00-03:00 | QA | Approved US-001 | 7/7 tests passed; 80.74% overall tested-file line coverage; typecheck and production build passed |
| 2026-09-15T14:48:06-03:00 | PM | Added US-002 specification for horizontal mobile loading methods | 1 incremental story; DevOps Required: NO; user-approved mockup |
| 2026-09-15T14:50:00-03:00 | Developer | Implemented tasks T-001 through T-003 for US-002 | Three-column mobile selector with compact labels and preserved desktop layout; lint, build and 26 tests passed |
| 2026-09-15T14:52:00-03:00 | QA | Approved US-002 | Static responsive review, diff check, typecheck, production build and 26/26 existing tests passed; frontend coverage tooling is not configured |
| 2026-09-16T00:00:00-03:00 | PM | Added US-003 specification for PAMI pricing correction | 1 incremental story; DevOps Required: NO; PAMI follows the standard insurance pricing path |
| 2026-09-16T00:10:00-03:00 | Developer | Implemented tasks T-001 through T-004 for US-003 | Removed PAMI-only exemption from backend, checkout and payment views; added pricing regression tests; lint, build and 37 tests passed |
| 2026-09-16T00:20:00-03:00 | QA | Approved US-003 | PAMI, IOMA and explicit bonification tests passed; pricing service line coverage 90.36%; lint, build and static PAMI exemption scan passed |
| 2026-09-16T12:00:00-03:00 | PM | Added US-004 specification for collaborator payment editing | 1 incremental story; DevOps Required: NO; provider operations and receipt replacement are out of scope |
| 2026-09-16T12:20:00-03:00 | Developer | Implemented tasks T-001 through T-005 for US-004 | Added collaborator-only inline editing, backend normalization and audit logging; 45 tests, typecheck and production build passed |
| 2026-09-16T12:35:00-03:00 | QA | Approved US-004 | 45/45 tests passed; payment validation module has 98.92% line coverage; typecheck, build and diff check passed |
| 2026-09-16T12:40:00-03:00 | Cost Controller | Completed US-004 cost review | Estimated cost ~$0.14; budget status green; DevOps not used |
| 2026-09-16T13:00:00-03:00 | PM | Added US-005 specification for a right-side medication cart | 1 incremental story; responsive two-column desktop layout; DevOps Required: NO |
| 2026-09-16T13:15:00-03:00 | Developer | Implemented tasks T-001 through T-003 for US-005 | Desktop two-column layout with sticky cart; mobile guided order is load, review cart, continue; existing handlers and IDs preserved |
| 2026-09-16T13:25:00-03:00 | QA | Approved US-005 | 45/45 tests, coverage, typecheck, production build and diff check passed; authenticated visual QA remains external |
| 2026-09-16T13:30:00-03:00 | Cost Controller | Completed US-005 cost review | Estimated incremental cost ~$0.09; budget status green; DevOps not used |
| 2026-09-16T14:00:00-03:00 | PM | Added US-006 specification for chronological conversation ordering | 1 incremental story; effective activity unifies messages, WhatsApp interaction and request creation; DevOps Required: NO |
| 2026-09-16T14:15:00-03:00 | Developer | Implemented tasks T-001 through T-005 for US-006 | Shared timestamp utility; backend and both inbox modes now sort by effective latest activity; 49 tests, typecheck, build and diff check passed |
| 2026-09-16T14:25:00-03:00 | QA | Approved US-006 | 49/49 tests passed; ordering utility has 100% line/function coverage; typecheck, production build and diff check passed |
| 2026-09-16T14:30:00-03:00 | Cost Controller | Completed US-006 cost review | Estimated incremental cost ~$0.12; budget status green; DevOps not used |
| 2026-09-16T15:00:00-03:00 | PM | Added US-007 specification for chronological order inboxes | 1 incremental story; newest created order first with visible time; DevOps Required: NO |
| 2026-09-16T15:10:00-03:00 | Developer | Implemented tasks T-001 through T-004 for US-007 | Shared immutable inbox ordering and date-time formatting utility; all DoctorDashboard filters reuse the corrected list |
| 2026-09-16T15:20:00-03:00 | QA | Approved US-007 | 54/54 tests passed; order inbox utility has 100% coverage; typecheck, build and diff check passed |
| 2026-09-16T15:25:00-03:00 | Cost Controller | Completed US-007 cost review | Estimated incremental cost ~$0.10; budget status green; DevOps not used |
| 2026-09-17T00:00:00-03:00 | PM | Added US-008 specification for multiple recipes per request | Incremental story with legacy compatibility and per-file downloads; DevOps Required: NO |
| 2026-09-17T00:20:00-03:00 | Developer | Implemented tasks T-001 through T-005 for US-008 | Multiple accumulated uploads, legacy-compatible persistence, indexed public downloads, patient actions and regression tests |
| 2026-09-17T00:35:00-03:00 | QA | Approved US-008 | 77/77 tests, typecheck, production build and diff check passed; new normalization modules have 94-100% line coverage |
| 2026-09-17T00:40:00-03:00 | Cost Controller | Completed US-008 cost review | Estimated cost ~$0.25; budget status green; DevOps not used |
| 2026-09-17T10:20:00-03:00 | PM | Added US-009 specification for resilient Mercado Pago synchronization | Provider-verified, idempotent transitions; existing records remain untouched |
| 2026-09-17T10:24:00-03:00 | DevOps | Added production scheduling configuration for US-009 | Daily Vercel cron plus documented `MP_WEBHOOK_SECRET` and `CRON_SECRET`; no deployment or real secrets |
| 2026-09-17T10:34:00-03:00 | Developer | Implemented tasks T-001 through T-005 for US-009 | Shared reconciliation policy, webhook/return/manual/cron paths, bounded frontend retries and regression tests |
| 2026-09-17T10:40:00-03:00 | QA | Approved US-009 | 88/88 tests passed; reconciliation module 96.47% line coverage; typecheck, build and diff check passed |
| 2026-09-17T10:42:00-03:00 | Cost Controller | Completed US-009 cost review | Estimated cost ~$0.23; budget status green; deployment and live provider verification remain pending |
