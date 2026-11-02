# WaveRadar Portability Baseline

**Status:** Architecture baseline on a migration branch; no production services changed.  
**Reviewed:** 2026-11-02  
**Branch:** `waveradar/portable-core-foundation`

## Decision

WaveRadar will move toward an independently deployable core through incremental, reversible subsystem migrations. Existing Base44 and Hatchable deployments remain in place until the replacement passes functional, security, evidence-integrity, recovery, and device tests.

The portability objective is control of source, data, interfaces, deployment, identity, and recovery—not a claim that every operating-system or infrastructure dependency can be eliminated.

## Verified repository facts

The following were inspected on `main` on 2026-11-02:

- `package.json` declares `@base44/sdk` and `@base44/vite-plugin`.
- `vite.config.js` imports and configures the Base44 Vite plugin, including legacy SDK import support and editor/analytics/navigation/HMR notifiers.
- `capacitor.config.ts` supports a `WAVERADAR_HOSTED_URL` override. When set, the Android shell loads a remote URL; the file itself warns that this is not an offline/production configuration.
- `.github/workflows/build-android.yml` currently sets `WAVERADAR_HOSTED_URL` to the Hatchable WaveRadar Core workspace URL, runs `npm install`, builds a debug APK, and publishes a debug release on main.
- `README.md` states that authentication, entities, and backend functions still depend on Base44; hosted Core APIs are not a full replacement.
- `README.md` also documents a separate Hatchable-hosted Validation Lab and says historical observations are not validation proof.

Code-search queries for several Base44 symbols returned no indexed matches. This is not proof that the source is free of those calls; a full source-tree/import inventory remains required.

## Target boundaries

1. **Clients:** React/TypeScript web and Capacitor Android. Clients call versioned WaveRadar APIs; they do not own privileged database credentials.
2. **Identity and device trust:** OIDC-compatible user identity, server-side role/tenant authorization, device enrollment and revocation.
3. **Core API:** incident, device, observation, evidence, validation session, review, and audit resources.
4. **Persistence:** PostgreSQL for structured records; S3-compatible object storage for evidence blobs; append-only event/audit history.
5. **Asynchronous processing:** transactional outbox, idempotent consumers, retryable uploads and delayed synchronization.
6. **Analytics/AI:** provider-neutral adapters. Outputs record model/version, input evidence IDs, timestamp, uncertainty, and epistemic status.
7. **Deployment:** containerized services, environment-based configuration, infrastructure definitions, backup/restore procedures, and documented clean deployment.
8. **Offline edge:** bundled application assets, encrypted local queue, authorized cached reference data, explicit stale/offline state, and deterministic reconciliation.

## Evidence contract invariants

- Every observation has a stable identifier and source/device identity.
- Preserve event time and receive time separately; include clock basis and time uncertainty where known.
- Preserve coordinate frame, units, spatial uncertainty, sensor capability/permission state, and quality flags.
- Raw evidence is append-only after acceptance. Corrections are new linked records, never silent overwrites.
- Distinguish `MEASURED`, `DERIVED`, `INFERRED`, `PREDICTED`, `SIMULATED`, `UNKNOWN`, and `UNAVAILABLE`.
- A digest supports integrity/lineage checks; it does not establish physical truth or sensor accuracy.
- Every derived record identifies its inputs, algorithm/model version, transformations, uncertainty, and exclusions.
- Exports include schema version, records, referenced media, audit events, and a digest manifest.

## Incident replay and 3D reconstruction

The WIS incident replay and 3D reconstruction requirements are specified in [WIS Incident Replay and 3D Reconstruction](WIS_INCIDENT_REPLAY_AND_3D_RECONSTRUCTION_2026-11-02.md). This defines as-known-then versus best-evidence-now replay, immutable evidence lineage, authorized source adapters, time synchronization, 3D provenance/uncertainty, fire-analysis safeguards, and acceptance tests. It is a design specification; implementation and field validation remain outstanding.

## Migration work order

### P0 — Complete the dependency and data inventory
- Enumerate every source file importing Base44 SDK or legacy integrations.
- Enumerate all entity reads/writes, backend function calls, auth/session operations, file storage, realtime subscriptions, and hosted URL references.
- Identify the authoritative store for every record type and every environment.
- Export and restore data into an isolated target; reconcile counts and content digests.
- Record secrets by name and owner only. Never copy secret values into source control.

### P1 — Define stable contracts
- Publish versioned OpenAPI and JSON Schema contracts.
- Define pagination, errors, idempotency, concurrency, authorization, and compatibility rules.
- Add contract tests to CI before moving client workflows.

### P2 — Prove one independent vertical slice
Implement and test: authenticate → enroll device → create incident → ingest observation/evidence → retrieve audit trail → export/restore.
Run it locally and on a second independently operated deployment target.

### P3 — Migrate workflows incrementally
Move device registry, incident records, validation sessions, evidence upload/finalization, dashboards, and administration one at a time. Compare old/new results and retain rollback for each cutover.

### P4 — Standalone Android
Default release builds must bundle the web application. Hosted pilot mode must be explicit and separate. Verify launch without network, local queue persistence, retry, conflict handling, and signed update compatibility.

### P5 — Retire dependencies
Remove Base44 SDK/plugin and Hatchable runtime dependencies only after complete import scans, data reconciliation, restore tests, security review, and rollback windows pass.

## Acceptance gates

- Clean checkout builds with locked dependencies.
- Same release deploys to two independent environments using configuration only.
- Export and restore reconcile records and evidence digests.
- Duplicate, delayed, out-of-order, concurrent, and interrupted writes are tested.
- Authentication, role authorization, device revocation, session expiry, and audit events are tested.
- Android launches its bundled UI without a remote hosted webpage.
- Offline functions and unavailable live services are accurately distinguished.
- AI/derived outputs preserve lineage and cannot silently become validated measurements.
- No historical evidence is deleted or silently rewritten.

## Immediate implementation cautions

- Do not remove Base44 dependencies until the full source inventory is complete.
- Do not change production visibility, hosted configuration, credentials, or signing keys as part of this baseline.
- Do not change the Android workflow to a standalone build until the backend API and client configuration are ready.
- The existing Android workflow uses `npm install`; move to a reproducible lockfile-based install only after confirming the lockfile is committed and CI-compatible.
- Keep debug APKs clearly labelled. A debug build is not a production release or safety-certified equipment.

## Next engineering deliverable

The first targeted source-level dependency audit is recorded in [`BASE44_HOSTED_RUNTIME_DEPENDENCY_AUDIT_2026-11-02.md`](./BASE44_HOSTED_RUNTIME_DEPENDENCY_AUDIT_2026-11-02.md). It confirms the central SDK/auth path, key UI callers, seven Base44 server-function entrypoints, and the Hatchable-hosted Android build setting. It remains explicitly partial: exhaustive source scanning, entity call-site reconciliation, and a tested independent backend vertical slice are still required. This document is the architecture baseline, not evidence that the migration has already been completed.


## Provider-neutral evidence repository boundary

A first implementation boundary now exists in `src/lib/incidentEvidenceRepository.js`:

- validates the canonical v1 evidence envelope before persistence;
- requires stable incident and observation identifiers, event and receipt timestamps, evidence class, payload, source identity, and capture provenance;
- exposes incident-scoped `append`, `get`, and `list` operations without importing Base44;
- returns defensive JSON copies and deterministic event-time ordering;
- rejects adapter responses that leak records from another incident.

The adapter contract requires an atomic insert with a unique observation ID, no in-place overwrite, incident-scoped reads, and server-side authorization. The contract tests use an in-memory test double only. **No production database, object store, remote API, authentication boundary, or durable persistence adapter has been connected yet.** The next implementation step is a separately deployable service and database migration, followed by isolated export/import and restore tests before any live cutover.

Run the contract checks with:

```sh
npm run test:incident-replay-policy
npm run test:incident-evidence-repository
```

These are deterministic software contract tests; they do not validate physical sensors, data accuracy, or field readiness.


## PostgreSQL reference schema (not deployed)

`infra/postgres/migrations/001_incident_evidence.sql` is a reference migration for an isolated PostgreSQL target. It defines tenant-scoped incident/evidence keys, event-time indexes, envelope identity checks, row-level tenant policies, and a trigger that rejects UPDATE/DELETE on accepted evidence. It is not wired to an application API, has not been applied to any database, and has not been exercised against a live PostgreSQL instance. Before use, the database owner must review role ownership, connection-pool tenant context, privileged-role bypass, backup/restore, retention/legal hold, and object-storage transaction boundaries. The API must set tenant context only after authenticating and authorizing the caller; clients must never set it directly.
