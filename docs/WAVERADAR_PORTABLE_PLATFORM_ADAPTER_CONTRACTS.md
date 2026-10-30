# WaveRadar Portable Platform Adapter Contracts

Status: design contract for staged implementation; not yet wired into production.
Purpose: make the application portable without deleting current Base44 or Hatchable services before replacements are proven.

## 1. Architecture boundary

UI and domain logic must not import vendor SDKs directly. All platform-specific access passes through application-owned interfaces:

UI and domain workflows -> WaveRadar application services -> provider adapters.

Required services: IdentityProvider, EntityRepository, EvidenceObjectStore, FunctionGateway, AIProvider, RealtimeTransport, and BackupArchive.

The current Base44 adapter remains active until each replacement passes parity and restore gates. Do not create a second source of truth during migration.

## 2. Required interface behavior

### IdentityProvider
- currentPrincipal(): return the authenticated principal or null.
- signIn(identifier, credential): authenticate and return a principal.
- signOut(): revoke the active session.
- requestPasswordReset(identifier) and completePasswordReset(token, newCredential).
- refreshSession(): refresh securely and return the principal or null.

Rules: never store passwords or long-lived secrets in application local storage. Use secure platform storage for refresh credentials where supported. Enforce authorization server-side. Preserve account subject IDs or maintain an immutable identity crosswalk. Provide recovery and MFA before cutover.

### EntityRepository
- get(id), list(query with filters/order/pagination), create(input), update(id, patch), delete(id).

Rules: stable IDs, schema version, timestamps, and tenant/owner scope on every entity. Use optimistic concurrency for updates. Paginate all lists. Make retryable writes idempotent. Keep audit history for security-sensitive changes. Client-supplied owner IDs are never authorization proof.

### WorldModelRepository

- appendObservation(observation) validates the versioned World Model contract and stores the immutable source event.
- getEntity(entityId), queryEntities(query), and getSnapshot(scope, asOf) return versioned materialized state.
- applyEntityUpdate(entityId, patch, sourceEventIds, expectedVersion) creates a new entity revision only when the expected version matches.
- getLineage(entityId) returns source events, transforms, algorithms, calibration records, and review/ground-truth references.

Rules: observations are append-only; materialized entities are versioned projections. Never update an entity without source-event lineage. A failed validation is rejected or quarantined with reason codes, not silently normalized into a valid observation. Preserve conflicting source events. Keep coordinate reference systems, transforms, units, and uncertainty explicit. The repository is not allowed to upgrade evidence classes or validation state on its own.

### ScannerAdapterRegistry

- register(adapterDescriptor) registers an adapter ID/version and supported modality declarations.
- listCapabilities(deviceContext) reports hardware, OS/driver/API, permission, calibration, runtime, sample-arrival, freshness, and validation states separately.
- get(adapterId, adapterVersion) returns a versioned adapter implementation.
- start(adapterId, sessionId), read(adapterId, signal), and stop(adapterId, sessionId) manage lifecycle.

Rules: adapters are isolated and replaceable. A declared capability is not proof of a sample. Adapters cannot write directly to WorldModelRepository. All outputs pass through the ingestion validator. Unknown modalities are retained as unknown/quarantined evidence, not coerced into a known modality. A failing or disconnected adapter must not disable unrelated sensors or the local field interface.

### ClockAndCoordinateRegistry

- registerClockSource(sourceId, clockDescriptor) records clock type, resolution, synchronization method, and estimated offset/uncertainty.
- registerCoordinateFrame(frameId, frameDescriptor) records frame origin, axes, units, handedness, datum, and calibration reference.
- estimateTransform(fromFrame, toFrame, calibrationId) returns a transform plus uncertainty and validity interval.

Rules: preserve original timestamps and coordinates. Never overwrite raw values after conversion. Missing or invalid clock/frame metadata is an explicit quality condition. A transform must be versioned, traceable, and uncertainty-bearing; do not silently mix device-local, building-local, and geographic coordinates.

### EvidenceObjectStore
- put(bytes, descriptor) returns object ID, SHA-256, byte length, media type, created time, evidence class, and state.
- get(objectId) returns original bytes and descriptor.
- verify(objectId) recomputes and checks SHA-256.

Rules: hash before upload and verify after retrieval. Preserve original bytes; transformations create new objects with parent lineage. Quarantine untrusted uploads until size, file type, malware, and parser checks pass. Evidence metadata is separate from binary storage. Provider URLs are locators, not evidence identity.

### FunctionGateway
- invoke(requestId, operation, schemaVersion, payload).

Rules: each operation has input/output schemas and authorization. Use idempotency keys for retryable side effects. Return structured error codes, not provider-specific exceptions. Record side effects in an append-only audit log.

### AIProvider
- invoke(task, input, schemaVersion, evidenceRefs) returns result, provider, model/version, prompt version, generated time, evidence references, and limitations.

Rules: AI output is DERIVED, INFERRED, or PREDICTED, never MEASURED. Store model/provider/version, prompt version, source evidence references, and limitations. Model output cannot create a confirmed victim, hazard, or location without the relevant independent validation gate. AI providers are optional and replaceable; deterministic safety rules remain local.

### RealtimeTransport
- publish(topic, event).
- subscribe(topic, handler) returns an unsubscribe function.

Rules: events carry eventId, sessionId, deviceId, sequence, observedAt, receivedAt, schemaVersion, and provenance. Support reconnect and store-and-forward. Detect duplicates, gaps, reordering, stale events, and clock skew. Realtime transport is not the authoritative evidence archive.

### BackupArchive
- export(scope) creates a versioned portable archive manifest.
- verify(archiveId) verifies every object and manifest.
- restore(archiveId, DRY_RUN or RESTORE_NEW_NAMESPACE) reports restored, skipped, and failed records.

Rules: default restore is dry-run. Never overwrite production during initial restore tests. Preserve IDs and relationships. Report every skipped or transformed record. A backup is accepted only after checksum verification and a successful clean-namespace restore.

## 3. Entity migration sequence

Current source dependency map identifies: Snapshot, SnapshotNote, DetectionEvent, PinComment, Team, InvestorLead, InvestorTarget, PromoCampaign.

Sequence:
1. Read-only export and schema inventory for all entities.
2. Snapshot and DetectionEvent in a test namespace.
3. SnapshotNote and PinComment with parent/foreign-key reconciliation.
4. Team and membership/authorization rules.
5. InvestorLead and InvestorTarget.
6. PromoCampaign.
7. User/auth identity only after a tested account-recovery plan.

For every entity compare total and per-tenant counts, stable IDs, parent references, null/empty distinctions, field types, timestamps/timezones, ownership/permissions, attachments, and deleted/archived state. Do not copy production records into a less-protected test system without privacy/security review. Use synthetic fixtures or properly de-identified exports for development.

## 4. Canonical evidence envelope

The existing src/lib/dataContract.js is the initial semantic reference. The long-term event envelope must include:
- eventId, sessionId, deviceId, sequence, schemaVersion.
- observedAt (nullable) and receivedAt (required).
- modality, sensorFamily, frameId, coordinateFrame, value, unit, uncertainty.
- evidenceClass: MEASURED, DERIVED, INFERRED, PREDICTED, SIMULATED, ENVIRONMENTAL, GROUND_TRUTH_OPERATOR_MARKER, CONFLICT, UNKNOWN.
- state: CURRENT, STALE, HISTORICAL, QUARANTINED, CONFLICT, UNVALIDATED, UNKNOWN, UNAVAILABLE.
- provenance: sourceId, sourceVersion, calibrationId, methodVersion, parentEventIds.

Important: SIMULATED and UNAVAILABLE are required in the future event vocabulary. The current contract does not yet define both as first-class enum members. Adding them requires a versioned schema migration and tests, not an unreviewed string substitution.

## 5. Scanner adapter contract

Each scanner or external technology must expose describe(), start(sessionId), read(signal) as an async event stream, and stop(). The capability description includes adapter ID/version, modalities, and per-capability state: AVAILABLE, UNAVAILABLE, PERMISSION_REQUIRED, or DEGRADED, with constraints.

Rules: scanner adapters never write directly into the World Model database. The ingestion boundary validates schema, timestamps, units, coordinate frame, evidence class, and provenance. Unknown modalities are retained as unknown/quarantined records, not coerced into a known sensor. Capability availability never implies measurement arrival or validation. Conflicting scanner outputs are retained and surfaced, not averaged away without a documented method. A scanner can disconnect without breaking base camera/map/replay experience.

## 6. Candidate self-hostable implementation profile

Do not select a final stack until load, security, Android constraints, operating costs, backup/restore, and team capability are evaluated. Candidate profile to prototype:
- PostgreSQL for relational records and transactional metadata.
- S3-compatible object storage for binary evidence, with local filesystem-compatible development.
- OpenAPI for service contracts.
- OIDC-compatible identity provider with exportable user identifiers.
- WebSocket plus durable event/outbox tables for realtime and store-and-forward.
- SQLite on Android for local durable queues and session manifests.
- OpenTelemetry-compatible logs/metrics/traces with local export and no mandatory hosted collector.

Every component must be replaceable. No provider's proprietary identity, storage URL, event format, or AI response format becomes part of the canonical data model.

## 7. Migration gates

A service is not replaced until: interface/schema are version-controlled; synthetic fixtures pass; source export is complete and hashed; destination import parity passes; clean-namespace restore passes; authorization and account recovery pass; offline/reconnect and duplicate delivery pass where relevant; rollback is demonstrated; and controlled cutover is approved.

## 8. Current status

These interfaces are design contracts only. No Base44 caller has been redirected. No database, identity provider, object store, or transport provider has been selected or deployed. No data has been migrated. Existing Base44 and Hatchable services must remain available until all relevant gates pass.