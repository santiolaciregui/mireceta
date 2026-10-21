# Diagnosing duplicate orders and delayed Mercado Pago payments

US-013, 2026-10-21. These traces become active after deploying both frontend and backend. They do not reconstruct navigation before deployment or resolve duplicate orders automatically. Existing orders, payment decisions, webhook HTTP responses and cron scheduling are unchanged.

## Where evidence lives

Use the existing MongoDB `auditlogs` collection. `ORDER_FLOW_CLIENT` stores an authenticated user's **client-reported** event, with `changes.context`. `ORDER_FLOW_SERVER` stores server observations in `changes`. Existing `ORDER_CREATE` entries include a sanitized `changes.clientReportedFlow` snapshot and the server's `clientRequestId`. The existing `timestamp` is the server receipt time; `context.clientAt` is an untrusted browser clock. Events can arrive out of order.

The browser reports form opening/navigation (`navigate`, `reload`, `back_forward`), whether a draft was loaded/missing/expired/invalid, draft storage failures, first successful draft save, explicit reset/clear reasons, checkout start/order response/redirect/failure, payment return and each bounded return-sync attempt. `host` distinguishes the canonical apex and www hosts, whose browser storage is separate. Session IDs are tab sessionStorage identifiers; form IDs identify mounted form instances. Previous attempt IDs are stored per authenticated user's browser storage and can refer to an older or different dependent's request; a link alone is not proof of duplication.

The server records create request/return/failure and reuse by request ID (including unique-index races), checkout preference creation/failure, payment lookup failures, webhook rejection/unresolved references/processing failure, unchanged/ignored reconciliation and successful/failed payment writes. Preference and payment IDs allow comparison with Mercado Pago separately. Missing-access-token is recorded only after both environment and tenant credential lookup fail. Unresolved webhooks use synthetic `tenantId: SYSTEM-PAYMENTS`, with `tenantUnresolved: true`, rather than attributing them to a real medical center. Once resolved, order events use the order's tenant.

No new telemetry includes medical contents, payer contact/identity, full URLs/query strings, raw provider errors, tokens, signatures or request header values. The authenticated audit's existing user identity remains available. Access checks for browser order references load only ownership fields and preserve tenant/patient/dependent checks.

## Read-only investigation

With authorized database access, start with the affected order and authenticated user:

```javascript
const tenant = 'TEN-0001';
const order = 'REC-EXAMPLE';
const from = ISODate('2026-10-21T00:00:00Z');
const to = ISODate('2026-10-22T00:00:00Z');
db.auditlogs.find({ tenantId: tenant, entityId: order,
  timestamp: { $gte: from, $lt: to }
}, { timestamp: 1, userId: 1, action: 1, entityId: 1, changes: 1 }).sort({ timestamp: 1 });
```

Take the form, session and client request IDs from `changes.context` or `changes.clientReportedFlow`. Search the same tenant/user/time window for those IDs, including records without `entityId` (creation and browser events can precede a server order ID):

```javascript
db.auditlogs.find({ tenantId: tenant, userId: 'USR-EXAMPLE',
  timestamp: { $gte: from, $lt: to },
  $or: [
    { 'changes.context.formId': 'FORM-EXAMPLE' },
    { 'changes.context.clientRequestId': 'REQUEST-EXAMPLE' },
    { 'changes.context.previousClientRequestId': 'REQUEST-EXAMPLE' },
    { 'changes.clientReported.clientRequestId': 'REQUEST-EXAMPLE' },
    { 'changes.clientReportedFlow.clientRequestId': 'REQUEST-EXAMPLE' }
  ]
}).sort({ timestamp: 1 });
```

Server payment events use the system identity: retrieve them by `tenantId` and `entityId`, not by the patient user ID. For an unresolved webhook, query `tenantId: SYSTEM-PAYMENTS` and `changes.providerPaymentId` using the verified provider payment ID. Always bound the time range.

A typical duplicate sequence is: first `ORDER_CREATE`, another form instance opens with `requestIdChanged: true`, a second `create_requested` and `ORDER_CREATE`. Examine draft read/reset/host/navigation events before deciding what triggered the change. A typical delayed payment sequence is `webhook_rejected` or `payment_lookup_failed`, followed by a later `payment_persisted` with source `Conciliación Programada`. A failed write has its own event and must not be read as successful persistence.

## Limits and manual validation

Telemetry is best effort: blocked storage, expired authentication, offline navigation, keepalive quotas or database failure can lose events. A missing event proves neither that an action occurred nor that it did not occur. Browser events are capped at 40 per mounted form and storage errors/first successful draft writes are deduplicated. No keystrokes or periodic visibility events are recorded. The existing audit service logs database errors and may still accept a diagnostic request without a stored record; verify the database directly before claiming persistence. No telemetry retries create or pay an order.

After deployment, use a designated test account and sandbox payment credentials: open a form, submit once, return/back/reload, and inspect correlated client/server audit records. Verify that an invalid-signature sandbox webhook is retained without signature/token data. Also check that an unavailable diagnostic endpoint leaves the existing checkout functional. No real payment, patient messaging or production write is part of automated tests. The REC-6393 / REC-9271 historical navigation remains unknown.
