# US-014 — Continue the exact checkout safely
Date: 2026-10-21

Implement in the existing React/Express project, preserving previous work. This is a repair of the existing flow; generic NestJS/output scaffold does not apply. No dependencies, migrations, historical updates, cancellation, notifications, deployment or commits.

- Persist a small checkout journal, scoped to authenticated tenant/user and independent of photo drafts, before creating an order. Keep the same request ID after failures, reload and reopening. Use browser Web Locks to serialize journal creation across tabs; fail closed when storage/locking is unavailable.
- Reconcile an uncertain create response by its exact request ID through an authenticated ownership-checked endpoint. Never search for similar orders. Remove the 15-second patient/amount/content heuristic.
- Offer explicit actions to continue the linked checkout, view the order, or start a new request without modifying the previous one. Do not silently copy changed form data onto an existing order. Preserve exact journal on network failures. New request deliberately clears the journal and resets all order/payment state.
- Authenticate checkout creation; verify tenant/patient/dependent ownership, eligible order status and payment method before provider calls. Verify provider payment status before opening another checkout. Block paid, processing, medically in-progress and closed requests; display an already-paid order without starting payment.
- Test request-ID persistence, concurrent tabs, unknown response, storage/network failure, changed content, ownership and state/payment boundaries. Run tests, TypeScript and build. Report production/browser limitations honestly.

DevOps Required: NO. Review must be reported honestly; no independent reviewer is implied.
