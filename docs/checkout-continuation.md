# Exact checkout continuation (US-014)

The browser saves a small journal before posting an order: client request ID, optional server order ID and a SHA-256 digest of the submitted business data. Attachments remain in the existing draft. The journal is scoped to authenticated tenant/user, does not expire automatically and survives draft-storage failures or lost responses. Web Locks serialize creation across tabs on the same browser origin. Unavailable locking/storage stops creation with an actionable message.

An authenticated lookup resolves an uncertain creation by exact client request ID. The existing unique index handles concurrent POST retries. There is no patient/content/price similarity lookup; the former 15-second heuristic was removed. Choosing **Crear nueva solicitud** explicitly clears the local link, resets payment/order state and preserves the old request. It does not cancel anything.

On reopening, **Revisar solicitud** loads the linked request through the existing ownership-protected detail endpoint. The patient reviews its identity and state before choosing to continue payment. Reused IDs found during submission also lead to this review. Changes to the form cannot silently change the existing request. Confirmation/receipt fields use the persisted request rather than the current draft.

Checkout creation now authenticates the actor, validates ownership/tenant, permits only an unpaid/rejected Mercado Pago payment on a clinically `Pendiente` request, and checks the provider first. Already-approved payments show the existing order; processing payments and uncertain provider lookups block another checkout. The state is re-read after lookup. Reconciliation started by a checkout retry and transfer replacement use conditional atomic updates matching the observed clinical/payment state, append only their new audit entry and cannot overwrite a concurrent medical update.

## Local validation and release

Unit tests use mocked repositories, storage, locks and provider APIs; they never charge, send patient messages or mutate production. TypeScript and production build must pass. A deployment must include frontend and backend together because checkout creation now requires an auth header and the exact-request lookup endpoint.

Manual validation after deployment with a designated test account and sandbox credentials:

1. Submit once, double-click, reload and reopen: the same request ID/order must remain linked.
2. Open two tabs for the same user, submit concurrently and verify one order for that attempt.
3. Lose the POST response after the server commits; retry and verify exact-ID lookup recovers it without another order.
4. Modify medication or patient after an interrupted checkout: review the old request or explicitly create a new one; no silent update.
5. Move the order to medical review, issued, rejected or cancelled while the form is open: payment retry must be blocked and clinical state retained.
6. Make the provider report approved/processing, or fail its lookup: do not open another checkout. Verify that concurrent medical/payment writes cause the conditional update to fail safely.
7. Check titular/dependent access and another tenant/patient; unauthorized access must fail before provider calls.
8. Test blocked/quota-full storage and unsupported Web Locks: creation must stop before POST. Test explicit reset then a new legitimate request, even with the same price/content.

The journal is origin/browser-local. Other devices, private sessions, manually cleared storage, or switching between apex/www do not share it. They cannot be inferred as the same attempt; existing orders must be opened explicitly from history. This repair neither merges historical duplicates nor changes the reconciliation cron schedule. Previously issued payment links can still exist; the provider is checked before a new checkout, but this is not a guarantee against separately paying multiple already-open provider links. Full browser/provider lifecycle QA and deployed behavior remain separate from unit-test evidence.
