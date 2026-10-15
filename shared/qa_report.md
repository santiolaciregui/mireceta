# QA Report: US-011 — Preserve request history and complete patient categories
**Date**: 2026-10-15
**QA Agent**: Independent Codex QA agent
**Verdict**: CONDITIONAL — acceptance criteria pass; overall coverage remains below the skill threshold.

## Summary

| Metric | Value |
|---|---|
| Unit tests total / passed / failed | 300 / 300 / 0 |
| OrderService line coverage | 75.14% |
| Overall measured line / branch / function coverage | 79.47% / 74.39% / 77.13% |
| orderInbox / orderCancellation coverage | 100% lines, branches, functions |
| Static review | PASS within the specified DELETE cancellation scope |

Coverage command: `npm run test:cov`; output: `/private/tmp/mireceta-us011-cov.log`. The Node experimental coverage report includes loaded source files and test files; it is not repository-wide coverage and does not exercise React component rendering. No production query, write, deployment, or external provider call was executed by QA.

## Results per Acceptance Criterion

| Criterion | Result | Evidence |
|---|---|---|
| DELETE cancels without removing clinical/payment/history data | PASS | Service tests preserve payment fields and prior embedded audit; repository update modifies only status, timestamp, audit. |
| Authorization, terminal protection, idempotency | PASS | Role/status matrix; tenant, owner, dependent and missing identifier tests; terminal states protected before mutation. |
| Atomic eligible-state update preserves concurrent issuance | PASS for DELETE | Repository conditional status filter and null-update race test; no full document replacement. |
| Embedded/global cancellation audit and no new refund side effect | PASS | Atomic embedded append; global audit invocation asserted; no provider operation added. Global audit retains the existing best-effort behavior. |
| Terminal destructive actions removed; retained cancellation returned to client | PASS by static review | Shared permission helper gates dashboard actions; hook merges returned order instead of deleting it. No React rendering test harness is configured. |
| Patient categories include approved and cancelled, with matching filters/counts | PASS by unit and static review | Clinical/payment category matrix; both patient views use shared helper; detail tab counts now use the same member subset as its list. |
| Patient list includes approved in active count | PASS by static review | Summary, activity filter and per-patient badge use shared category helper. |
| TypeScript/build | Main agent verification | Final TypeScript/build checks are coordinated by the main agent; QA inspected successful build log. |

## Bugs Found and Resolved During Review

- Patient detail tab counts initially used all household orders while the list applied the selected member filter. Developer corrected all tab counts and the all-tab count to use `memberOrders`.
- Defensive authorization issue: empty patient identifier could match an empty titular/order DNI. Developer added nonempty comparisons; QA added missing, empty, and punctuation-only identifier regressions.

No remaining blocking finding within the specified DELETE endpoint scope.

## Tests Reviewed / Added

- Reviewed developer cancellation service/repository tests and clinical/payment inbox category matrix.
- Added 7 role/status helper matrix tests for action availability.
- Added 6 service tests: authorization before idempotent return, own in-review cancellation, missing tenant, and 3 empty/missing identifier cases.
- No application code was changed by QA. No integration/e2e tests were added.

## Limitations and Recommendations

- Overall measured line coverage is 79.47%, below the QA skill 80% threshold. Verdict is conditional; the orchestrator decides whether to accept this preexisting broad coverage limitation. Unrelated tests were not added merely to inflate coverage.
- Legacy PUT cancellation in `updateOrder` uses a separate mutation path. This change explicitly specifies DELETE; protections reviewed here should not be described as guarantees for every historical mutation endpoint unless those routes are unified separately.
- Global audit persistence is best effort through the existing `AuditLogService`; embedded audit and cancellation status are appended together in the database update.
- React component behavior was checked statically and type/build verification is performed by the main agent. Authenticated browser and production behavior remain unverified.

## Final Verdict

**CONDITIONAL** — all 300 tests pass and the reviewed acceptance criteria are satisfied. The coverage threshold is not met, so this is not an unconditional skill-level approval.
