# US-016 — Local validation

Date: 2026-11-10. Local verification; not an independent QA approval or production certification.

| Check | Result |
|---|---|
| Existing suite after initial implementation | 502/502 passed |
| Final unit suite with coverage | 580/580 passed, 0 failed |
| Promotion tests added since the 502-test baseline | 78 |
| FirstRequestPromotionService line coverage | 100% |
| Pure promotion policy line coverage | 100% |
| Overall Node line coverage | 86.45% (includes test files) |
| TypeScript (`npm run lint`) | Passed |
| Production build (`npm run build`) | Passed; existing bundle-size warning remains |
| Diff whitespace check | Passed |

## Verified by unit tests

Counts 1–5, tenant-specific prices, frozen existing arancel, discount clamping, expiry exactly at Argentina midnight on December 16, default/manual shutdown, no photo/mixed/per-item-photo loading, positive approved/refunded payments through every method, titular/dependent history, administrative exemptions, authoritative account and tenant authorization, invalid/client-forged amounts, already used benefits after cancellation/rejection, idempotent applied snapshots after expiry/shutdown, atomic snapshot guards, index schema, two concurrent mocked applications, unique collisions, partial balances, fail-closed quote changes, client-forged metadata/status, creation failure without consumption, and provider checkout claim guards.

Existing provider tests were updated to acknowledge the new durable checkout claim. They continue to verify exact-order ownership, pending/approved provider state, provider lookup failures and persisted-amount checkout.

## Extended regression suite after removing the promotional banner

28 additional tests were added to the 541-test implementation suite. `npm test` and `npm run test:cov` now automatically include the common React presentation tests, without additional dependencies.

- The actual `FirstRequestPromotionSummary` view is rendered with React server rendering: no banner during data entry, neutral payment summary, original/discount/total, zero vs positive balance, free-submit vs remainder-payment actions, no repeated claim after application, loading/errors without misleading amounts, and photo/manual-entry restrictions. Summary view line/branch coverage: 100%/100%.
- The client API tests check authenticated uncached quotes, exact request IDs, explicit displayed-amount confirmation, session failures, network failures and HTTP 409 without automatic full-price fallback.
- Additional backend tests check activation order (unique index before enabling), refusal to activate after index failure, shutdown even when index maintenance is unavailable, deleted/changed-role accounts, tenant ownership, missing/progressed requests, idempotent race recovery, storage errors and unstarted transfers with excess balances.
- Provider unit tests verify that a concurrent discount prevents preference creation and that Checkout Pro receives only the persisted discounted amount, ignoring a client-supplied original price.

These are isolated unit tests. React markup tests do not exercise browser lifecycle/effects or real clicks. Provider/database mocks do not prove real external payments or MongoDB contention.

## Browser check

A temporary standalone Vite fixture rendered the actual PatientForm, FirstRequestPromotion and administrative config components with synthetic responses. The business server was not started. No live DB, credentials, notifications, patient data or payments were used.

- New-request form: manual medicines added through the UI; 2 medicines displayed original $10,000, discount $10,000 and total $0, with an enabled “Enviar solicitud gratis” button.
- Positive balance: 3-medicine preview displayed original $20,000, discount $10,000 and total $10,000.
- Photo toggle removed the offer and showed the manual-entry requirement.
- Existing request: explicit confirmation persisted the synthetic benefit; a blocked synthetic gateway showed the error and retained a “Continuar pago del excedente” action.
- Admin: inclusive date displayed December 15, 2026. Unchecking and saving displayed the confirmation and removed a refreshed new offer.
- Mobile: explicit 390×844 browser override; measured clientWidth=375 and scrollWidth=375, no horizontal document overflow. Temporary override reset and fixture removed after verification.
- Historical screenshots from the initial implementation: `outputs/promotion-validation/free-request-desktop.png` and `free-request-mobile.png`. They predate the user-requested banner removal; the current neutral view is covered by the regression suite above.

## Pending before activation

Use an isolated database to verify actual unique-index creation, concurrent MongoDB writes and historical data eligibility. Run the real server with test authentication and a provider sandbox to verify persisted discounted Checkout Pro amounts, provider callbacks, and manual review for historical links/transfer receipts. These checks were not represented by mocks or browser fixtures as production proof.

Promotion remains disabled by default. No production activation, deployment, commit or push was performed.

## Configurable start and end dates

Eleven further tests verify the inclusive Argentina start, exclusive next-midnight end, a single-day interval, invalid/reversed periods, calendar date round-trips (including leap days), scheduling a future start, and preserving the existing start for older clients. The date helper has 100% line/branch coverage.

The actual administrative component was inspected with a synthetic local fixture: both desde/hasta controls rendered, the start was changed using the native date input and saved, and the confirmation retained the new value. No real settings were modified. Updated screenshot: `outputs/promotion-views/04-configuracion-administracion.png`.

## Medication fee layout correction

The new-request promotion breakdown now renders inside the existing “Arancel de la medicación” card. The separate promotion card above the payment step is removed. Two regression tests verify the embedded zero/positive-balance breakdown without a standalone card/heading. Full suite: 582/582 pass; TypeScript/build/diff checks pass. A new browser screenshot could not be captured because the browser runtime failed to initialize; no fresh visual verification is claimed for this adjustment. Saved-request actions retain their existing presentation.
