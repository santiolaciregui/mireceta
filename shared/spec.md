# US-012 — Send approved image templates and preserve chat attachments
Date: 2026-10-15

Fix the existing React/Express application in its existing source directories; the user's requested repair takes precedence over the generic skill's output/NestJS scaffold. No dependencies, migrations, database maintenance, real messages, deployment, or commits.

Acceptance criteria:
- Staff images outside the customer service window upload to Meta and use the user-confirmed approved `consulta_medica_imagen` template with an IMAGE header and the existing single body variable. Default language es_AR, consistent with the supplied Spanish ARG template; allow configuration overrides.
- Images inside the window keep direct media delivery. Text-only messages retain their configured existing template. Upload/template failure must never downgrade an image to a successful text-only message. Unsupported attachments outside the window return an explicit failure.
- Return WhatsApp dispatch failures separately from successful chat persistence and show a warning without retrying/persisting the message again.
- Load full media only for the active conversation for both staff and patients. Preserve cached and outgoing attachments across summary polling; ignore stale fetches on selection/account changes. Keep polling lightweight and existing access boundaries.
- Unit tests mock network/repositories and cover image payloads, upload/send failures, text compatibility, and summary/detail attachment merging. Run TypeScript checks and build.

Tasks: T-001 image template dispatch; T-002 active chat hydration and preservation; T-003 local verification.
DevOps Required: NO.
