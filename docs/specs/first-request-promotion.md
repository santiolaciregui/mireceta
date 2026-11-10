# US-016 — First request promotion

Date: 2026-11-10. Implements the user-approved plan in the existing Express/Mongoose/React application. No new dependencies.

## Business rules

One consumption per patient account and tenant, for the titular or a registered dependent. Any previous positive approved/refunded payment (Mercado Pago, transfer, cash desk) in account/dependent history excludes eligibility. An administrative exemption is not a previous payment. Only manual medication items without attached photos qualify, including per-item photo URLs. A single prescription (up to two medicines) is discounted; additional prescriptions are charged normally. Discount is consumed when the request is confirmed, including when an excess balance is still unpaid. Cancellation/rejection does not restore it.

Default `firstRequestPromotionEnabled=false`. Default inclusive start `2026-11-10T03:00:00.000Z` (November 10 at midnight Argentina). Default exclusive end `2026-12-16T03:00:00.000Z`, i.e. December 15 inclusive in Argentina. Tenant administrators may turn the promotion off or configure both inclusive calendar dates (desde/hasta). Eligibility requires start <= server time < exclusive end. Reversed or empty intervals are rejected; the same calendar date for both fields represents a full day. Already confirmed discounts are retained after shutdown/expiration.

For a new request, original = ceil(manual medication count / 2) × tenant tariff. For a saved unpaid request, original = its persisted amount. Discount = min(original, current tenant prescription tariff). No clinical details are changed when applying a discount to a saved request.

## API

All routes under `/api/first-request-promotion` require authentication and send `Cache-Control: no-store`.

- `POST /quote`: accepts either `{ orderId }` or manual medication/photo data for a new draft. Returns `{ eligible, reason, endsAt, originalAmount, discount, finalAmount, applied? }`. New-draft IDs, prices and client promotion metadata are ignored. Ownership uses the persisted User, not client-supplied dependent lists.
- `POST /apply/:orderId`: accepts `{ confirmation: { originalAmount, discount, finalAmount } }`; returns the updated order. Exact amounts must match a fresh eligible quote. Uses an atomic guarded update and the permanent unique beneficiary index. Reapplying to the same order returns its existing snapshot.
- `GET /config`: tenant admin/superadmin only; returns `{ enabled, startsAt, endsAt }` without payment credentials.
- `PUT /config`: same authorization; accepts `{ enabled: boolean, startsAt: ISO date, endsAt: ISO date }`. Creation of the unique partial index must succeed before enabling. Older clients omitting startsAt preserve the existing start or its default.
- Existing `POST /api/orders` accepts optional `promotionConfirmation` with the displayed amounts. The server ignores submitted benefit metadata, recalculates, and stores the snapshot and consumption in the same insert. A lost quote or competing claim returns HTTP 409, never an automatic full-price checkout.

`Order.firstRequestBenefit` stores beneficiaryId, appliedAt, originalAmount, discount, finalAmount. A unique partial compound index on tenantId + firstRequestBenefit.beneficiaryId applies only when the beneficiary is a string. Cancelled/rejected orders remain stored, retaining their consumption. Initial creation and application ensure this index exists before saving a benefit. Activation should occur only after checking it on the target database.

Free orders use paymentStatus=exempt, paymentMethod=bonificado, amount=0 and clinical status En revisión. Partial discounts retain an unpaid balance; Checkout Pro reads only that saved amount. Reports export original price, promotional discount and consumption time separately from payment amount, and free requests remain exemptions rather than successful payments.

## Payment safety

New requests persist paymentStage=not_started. Before creating any Checkout Pro preference, an atomic snapshot claim sets checkoutEverStarted=true and paymentStage=checkout_started. A concurrent discount changes the price/status, causing a stale checkout claim to fail; a checkout claim causes the discount update to fail. Rejected or failed provider calls do not reset checkoutEverStarted.

There is no reliable link revocation mechanism implemented for historical Checkout Pro links. Therefore initiated/unknown legacy MP checkouts and transfers with receipts awaiting verification require review and cannot be automatically discounted. The application does not interpret a missing provider response as proof of non-payment. This conservative block also applies if another account request has an unresolved payment. An existing MP order is automatically eligible only when it has explicit not_started evidence and no ever-started marker. Old requests without that evidence must be reviewed; they are not retroactively marked safe.

## Client behavior

Offer appears in the patient form and patient request history. Summary shows original, discount and final amount. Free submission uses “Enviar solicitud gratis”; positive excess uses “Confirmar y continuar al pago”. Existing requests have an explicit benefit confirmation and a remainder-payment action. Photo requests explain the manual-entry requirement; attachments are never silently removed. If eligibility changes, the server rejects the previous quote; the client refreshes it and requires another confirmation. For an unsaved attempt, an exact lookup clears the obsolete payment journal while retaining its identity and clinical draft.

## Rollout

1. Deploy with the default disabled setting; existing tenant documents without the fields remain disabled.
2. Use a designated non-production database to verify the partial unique index, real parallel request claims, tenant isolation, cancellation retention and persisted quotes.
3. Verify provider sandbox behavior, old-link/receipt review blocks and both new/existing user flows.
4. After those checks, a tenant administrator may enable the promotion in payment settings, using the desired desde/hasta dates (default November 10 through December 15, inclusive).
5. Monitor promotion snapshots/order audits and amount-only provider checkouts. The administrative switch immediately prevents new claims on server evaluation. No scheduled job is required for expiration.

Local implementation does not activate or deploy the promotion and does not change live patients, requests, payment credentials or provider state.
