# WaveRadar OS — Security and Authorization Audit

**Snapshot:** 2026-11-13  
**Scope:** CMVisual source templates, connected Base44 app metadata, and the latest available Base44 security-scan record.  
**Freshness warning:** The Base44 scan record is dated 2026-08-19 and reports status `out_of_date`. Static-code analysis was disabled. It is historical evidence, not a current clean scan.

## 1. Executive findings

### S1 — DetectionEvent access policy is inadequate in the last available scan
The stale scan reported that the DetectionEvent entity had no explicit create/read RLS rules, leaving telemetry creation and reads open, and recommended owner/admin restrictions for update/delete. It marked the finding critical.

**Required action:** verify that DetectionEvent still exists in the connected app and inspect its live schema. Before real incident data or multi-tenant use, enforce incident/tenant-scoped read and create rules, plus controlled update/delete. Do not assume a front-end role check protects records.

### S2 — Privileged backend function source templates are unsafe to deploy unchanged
The last available scan identified high-severity authorization gaps in:
- `exportSnapshotToDrive`: uses service-role access to fetch and export a snapshot without verifying caller identity or snapshot ownership.
- `slackAlert`: can list channels and post arbitrary messages using the Slack connector without an in-function caller check.
- `facebookPromo`: `campaignTick` uses service role without a caller check; user-initiated list/post actions check login but not admin role.
- `weeklyDetectionDigest`: can query detection records and send email without request authentication or admin validation; it accepts a test recipient.
- `weeklyInvestorDigest`: can send an investor digest without request authentication or admin validation.

**Important deployment distinction:** a current Base44 platform API query returned zero deployed backend functions for the connected app. These are unsafe source templates / historical scan findings, not confirmed live endpoints in that app. Keep them undeployed until fixed and retested.

### S3 — Core integration protection is not ready
The last scan reported `core_integration_recommendation = would_be_blocked`. The app agent profile currently allows core integrations from client code. This indicates the current application still has integration coupling that must be mapped and moved behind authorized server-side operations before enabling integration protection.

### S4 — External federation needs endpoint and peer trust controls
The inspected federated-world client is opt-in but accepts a configurable endpoint and sends spatial/track metadata such as device/session identifiers, coordinates, speed, timestamps and source. The inspected request path does not itself establish peer authentication, signed payload integrity, replay protection, tenant/incident authorization or an endpoint allowlist.

**Required action:** require HTTPS/WSS outside explicit local development, authenticated peer identity, signed/versioned envelopes, replay windows, tenant/incident policy, retention limits and explicit operator consent. Ingestion must remain separate from control of external devices.

### S5 — Marketing library contains unsupported capability claims
The Facebook promotional source contains statements implying phone-only, no-special-hardware through-wall or facility-wide detection and broad no-cloud/no-server guarantees. These are not established by the evidence baseline.

**Required action:** quarantine these posts. Only publish claims tied to documented test conditions, supported hardware, measured results and independent validation. Distinguish prototype, inference, simulation and validated capability.

### S6 — Security headers need review
The historical scan recommended preventing iframe embedding. Verify the current published app's headers and set an appropriate anti-framing policy unless a documented embedding use case requires otherwise.

## 2. Current scan limitations

- Last scan timestamp: 2026-08-19.
- Current scan status: `out_of_date`.
- Static code analysis: disabled.
- Dependency vulnerability list: empty in that historical result; this is not a current dependency audit.
- Hardcoded secret list: empty in that historical result; this is not proof that secrets are absent.
- The current app API reports zero deployed backend functions. This does not erase source-template risks or prove that other environments have no functions.

A fresh scan was not started because the endpoint runs a background language-model review and the project constraint is no upfront paid spend. Re-run when confirmed free/included and after code changes.

## 3. Required authorization model

Every read/write/export/publish operation must be authorized by:
- authenticated principal;
- organization/tenant;
- incident or project membership;
- role and capability;
- record ownership/provenance;
- purpose and retention policy.

Recommended roles:
- **Incident Commander:** incident-scoped command and crew/device visibility.
- **Firefighter:** own device plus explicitly assigned incident data.
- **Researcher:** assigned de-identified or protocol-scoped test datasets.
- **Independent Reviewer:** read-only evidence package and review/audit actions; no production data mutation.
- **Data Steward:** controlled curation and dataset eligibility decisions.
- **Organization Administrator:** tenant/device/user administration.
- **Platform Administrator:** narrowly scoped platform operations.

Do not rely on role names alone. Enforce tenant and incident boundaries in backend RLS and server functions.

## 4. Backend function release gates

- User-facing export: authenticate caller; verify tenant, incident and snapshot ownership; require explicit export authorization; log destination and payload digest.
- Slack/marketing actions: administrator-only; validate channel/page ownership and approved content; audit every publish.
- Scheduled digests: require a server-side scheduler identity or high-entropy secret/signature; never accept arbitrary recipient overrides from public requests; rate-limit and deduplicate.
- Investor lead intake: public submit may remain available, but validate field lengths/formats, add abuse/rate controls and avoid returning private records.
- No service-role function is deployable without a negative test proving unauthenticated and cross-tenant calls fail.

## 5. RLS and data model gates

- Verify live schemas against repository definitions; do not assume all 108 files are deployed.
- Add tenant_id and incident_id only with a migration and ownership strategy.
- Restrict reads by tenant/incident membership; restrict writes to assigned roles; restrict deletes to tightly controlled administrators or retention workflows.
- Make evidence and validation records append-only where practical; corrections are new linked records.
- Audit field-level exposure of location, personal data, device identifiers, sensor payloads and incident notes.
- Test same-tenant, cross-tenant, same-incident, cross-incident, unassigned user, revoked user and admin cases.

## 6. Release blockers

Do not publish or use the application with real incident data until:
1. DetectionEvent and all sensitive entity RLS policies are verified.
2. Privileged source functions are hardened and only intentionally deployed functions are enabled.
3. External integrations are server-side, authenticated and auditable.
4. Federation endpoints and peer identity are authenticated and signed.
5. Security headers are checked.
6. Marketing claims are evidence-gated.
7. Backup/restore and incident-data retention are tested.
8. A fresh security scan and independent review are recorded.
