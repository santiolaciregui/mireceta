# US-011 — Preserve request history and complete patient categories
Date: 2026-10-15

Fix the existing application. No dependencies, migrations, production writes, recovery of deleted records, or deployment.

Acceptance criteria:
- The existing DELETE order endpoint cancels eligible active requests without removing documents, files, payments, or audit history. Return the retained order so the client updates it instead of filtering it out.
- Issued, sent, rejected requests cannot be deleted/cancelled by this operation. Already cancelled requests are idempotent. Patients may cancel only their own/dependent pending or in-review requests; staff with existing clinical permissions may cancel active requests within their tenant. Administrators retain read-only clinical permissions.
- Cancellation updates atomically only if the request remains in an eligible state; preserve concurrent issuance. Log cancellation in embedded and global audit. Do not call payment/refund providers as a new side effect; communicate that payment handling is separate.
- Remove destructive UI actions for terminal requests. Cancellation copy explains that the request remains in history.
- Patient status and patient detail categories share a pure category helper: active requests (including Aprobada) in process, Emitida/Enviada completed, Rechazada/Cancelada closed. Filters and counts agree.
- Fix the patient list active request count to include Aprobada. Keep existing tenant and person/search boundaries; do not broaden access.
- Regression tests cover the clinical/payment matrix, cancellation persistence, authorization, idempotency, terminal protection and races; TypeScript checks and build pass.

Tasks: T-001 history-preserving cancellation; T-002 consistent categories and UI; T-003 local QA.
DevOps Required: NO.
