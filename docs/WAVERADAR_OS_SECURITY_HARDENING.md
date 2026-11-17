# WaveRadar OS — Backend Security Hardening Change Record

**Branch:** `waveradar-os/security-hardening`  
**Status:** Draft code changes; not merged or deployed.  
**Scope:** Source templates only. The connected Base44 app currently reports zero deployed backend functions.

## Changes

1. Added shared fail-closed authorization helpers:
   - Admin-only caller validation.
   - Admin-or-signed-cron validation.
   - Server-side secret lookup.
   - Constant-time secret comparison.
   - Fail-closed behavior when the scheduled-action secret is not configured.

2. Snapshot-to-Drive export:
   - Requires an authenticated user.
   - Allows only the snapshot creator, explicitly shared email, or administrator.
   - Keeps service-role access behind an ownership check.

3. Slack alerts:
   - Requires administrator role for channel listing and posting.
   - Requires an explicit server-side approved-channel allowlist before posting.
   - Bounds and sanitizes event summary text.

4. Facebook promotion:
   - Replaced unsupported phone-only/through-wall/no-cloud claims with evidence-gated R&D language.
   - Manual Page discovery/posting requires administrator role.
   - Manual posting accepts only an exact approved template.
   - Automated campaign tick requires a server-side cron secret and a separate explicit enable flag; otherwise it fails closed.

5. Scheduled email digests:
   - Require administrator or signed server-side cron authorization.
   - Detection telemetry digest sends only to the designated administrator; request-body recipient overrides were removed.
   - Investor digest requires the same authorization gate.

6. Public investor lead intake:
   - Preserves public submit behavior.
   - Adds request-size, field-length and email-format validation.
   - Admin-only outreach behavior remains.

7. Added source-regression checks in `scripts/test-backend-function-security.mjs`.

## Not changed

- No backend function was deployed.
- No email, Slack message, Facebook post or Google Drive export was sent.
- No connected account or secret was modified.
- No entity RLS policy was changed.
- No historical evidence or lead records were changed.
- No paid service was invoked.

## Remaining release blockers

- Configure and securely store cron secrets before scheduled functions can run.
- Verify Base44 function deployment and caller-authentication behavior in the target environment.
- Add rate limiting/abuse controls for public investor lead intake.
- Add audit records for exports and external publishes.
- Confirm Google Drive export ownership and share semantics with live schema tests.
- Confirm approved Slack channel allowlist and admin membership.
- Run negative integration tests for unauthenticated, non-admin, cross-user, cross-tenant and replayed cron requests.
- Verify current entity RLS, especially PinComment and incident/tenant scoping.
- Run a fresh security scan when it is confirmed to be included at no cost.
- Keep all automated publishing disabled until an authorized release decision.

These changes reduce source-level exposure; they do not establish that the app is secure, that functions are deployed, or that any external integration is operational.
