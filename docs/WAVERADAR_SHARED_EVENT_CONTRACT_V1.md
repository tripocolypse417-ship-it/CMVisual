# WaveRadar Shared Event Contract v1

**Status:** Canonical engineering contract proposal, committed on an isolated feature branch for review. This is not evidence of deployed ingestion or device validation.

## Purpose

Every authorized collector and downstream service uses one versioned event envelope. The same event identity and source evidence must survive native acquisition, ingestion, spatial fusion, WIS rendering, helmet rendering, and replay.

## Non-negotiable invariants

1. **Raw evidence is immutable.** Store original bytes/payload separately in append-only evidence storage. The envelope carries its reference and SHA-256 digest. Never overwrite raw values with normalized or fused values.
2. **Time is explicit.** Preserve source observation time, clock domain, monotonic time when available, receive time, age, and synchronization uncertainty. Never silently treat device monotonic time as UTC.
3. **Provenance is explicit.** MEASURED, DERIVED, INFERRED, PREDICTED, SIMULATED, UNKNOWN, and UNAVAILABLE are distinct classes. MEASURED does not mean accurate or validated.
4. **Spatial claims carry frames and uncertainty.** Missing pose remains unavailable; do not derive position from raw IMU alone or invent coordinates.
5. **Authorization travels with the source.** Every source has a scope reference. Discovery is not permission to read or control a device.
6. **Derived events link to parents.** Fusion, scene entities, predictions, and annotations reference their contributing event IDs.
7. **Consumers are read-only.** WIS and helmet subscribe to the same canonical scene stream and scene revision; neither independently rewrites evidence.
8. **Schema evolution is additive and versioned.** Breaking changes require a new major contract and explicit adapter compatibility.

## Envelope

Machine-readable JSON Schema: `schemas/waveradar-event-envelope-v1.schema.json`.

A dependency-free adapter helper is available at `src/lib/eventEnvelope.js`. It wraps an unmodified native snapshot, preserves source clock-domain distinctions, assigns a UUID, and calculates a SHA-256 digest when Web Crypto is available. `src/hooks/useNativeEvidencePipeline.js` now connects the Android SensorManager snapshot and the existing Android network-discovery event to this envelope. `src/lib/localEvidenceStore.js` appends envelopes to a device-local IndexedDB store using a deterministic source-sample key; a concrete `local-indexeddb://` reference is recorded in each event. This is local persistence only: it is not a remote evidence vault, and browser/app data clearing or storage eviction can remove it. A storage failure is surfaced rather than silently dropping samples.

The envelope contains event identity/type, source and adapter identity, authorization scope, observation and receive timestamps, clock domain and uncertainty, evidence class and integrity state, parent event IDs, optional spatial frame/pose and uncertainty, a versioned event-specific payload, immutable raw-evidence reference and SHA-256, retention class, and quality status.

Nullable source time, pose, and raw-evidence references represent genuine platform limitations. Missing information must remain explicit and must never be fabricated.

## Event processing contract

1. Native adapter captures source data and source-native timestamps.
2. Adapter creates an envelope and preserves original payload bytes.
3. Ingestion authenticates the collector, checks authorization scope, validates schema, verifies digest when bytes are present, and records receive time.
4. Invalid or suspicious events are quarantined with reason codes; originals remain preserved.
5. Accepted events append to the event log. Duplicate event IDs are idempotent; conflicting content under the same ID is rejected and audited.
6. A separate fusion worker consumes accepted events and emits derived scene events with parent event IDs and uncertainty.
7. A scene revision is published atomically for subscribers.
8. WIS and helmet render the same scene revision and timeline cursor. If a consumer falls behind, it requests a snapshot at a known revision and resumes from the event sequence.
9. Replay reconstructs state from a snapshot plus ordered events, using event time for the timeline and receive time to diagnose late arrivals. Late events must not silently rewrite what the operator saw at an earlier time.

## Event-specific payload conventions

- **OBSERVATION:** use a versioned payload schema such as `waveradar.observation.accelerometer.v1`; include raw sensor values, source units, sampling metadata, and separately represented normalized values.
- **DISCOVERY_CANDIDATE:** record discovery method, authorized network scope, protocol, observed descriptors, first/last seen, and classification. A candidate is not a confirmed sensor.
- **SCENE_ENTITY_UPSERT / SCENE_RELATION:** include stable scene entity ID, scene revision, entity class, geometry/pose status, time validity, parent evidence IDs, and uncertainty. Avoid asserting person identity.
- **PREDICTION:** include target, predicted state, horizon, model/version, input event IDs, uncertainty-calibration status, and expiration. Predictions never overwrite measured state.
- **VALIDATION_RESULT:** include protocol/version, apparatus and reference instrument IDs, ground-truth method, trial/session IDs, acceptance criteria, results, reviewer independence, and deviations.

## Replay semantics

- Store append-only event sequence numbers per incident/session stream.
- Store periodic scene snapshots with the highest included sequence and schema/model versions.
- Reconstruct a selected time using observed event time, with deterministic tie-breaking by stream sequence.
- Expose late-arrival and clock-uncertainty indicators.
- Support two explicit views: **As available at the time** and **Best reconstruction using all subsequently received evidence**.
- Keep source filtering and per-sensor tracks available without changing the canonical scene.
- Record the exact snapshot, event range, adapter versions, and model versions used for each replay.

## Acceptance tests before integration

- JSON Schema positive/negative fixtures; reject missing required fields, unknown evidence classes, invalid hashes, malformed timestamps, and invalid units.
- Verify raw payload hash before and after ingestion and replay.
- Verify idempotent duplicate delivery and conflicting-ID rejection.
- Verify out-of-order and late-arriving events preserve both replay modes.
- Verify unknown clock domain and missing pose remain explicitly unknown/unavailable.
- Verify derived scene and prediction events link to all parent event IDs.
- Verify WIS and helmet receive identical scene revision, event sequence, and timeline cursor under normal delivery, reconnect, and resynchronization.
- Verify permission-denied, unsupported, stale, disconnected, and empty are separate source states.
- Run on the actual Android target; record build, device, OS, permission, and adapter versions. Engineering-only captures without independent ground truth are not validation.

## Integration sequence

1. Implement envelope creation in native Android adapters without changing existing raw capture behavior.
2. Add a local durable queue with bounded storage, retry/backoff, and explicit queue health; never drop silently.
3. Implement authenticated ingestion and append-only evidence storage.
4. Add schema validation, digest verification, quarantine, and idempotency.
5. Add scene event processor and snapshot/replay service.
6. Connect WIS and helmet as read-only subscribers to one scene revision stream.
7. Add CI fixtures and device-level acceptance runs.
8. Conduct independent validation before making accuracy or life-safety claims.

## Current implementation status

Implemented on this feature branch: v1 schema; event-envelope helper; sensor and network event adapters; device-local append-only IndexedDB event storage with deduplication; visible pipeline status panel; and a CI regression-test step. The network adapter preserves the clock as UNKNOWN because the Android platform snapshot does not establish source measurement time. Sensor events preserve Android elapsed-realtime nanoseconds separately from receive time.

Not implemented or verified: authenticated remote ingestion, server-side append-only raw evidence vault, server schema validation/quarantine, cross-device event transport, shared scene processor/revision stream, deterministic replay engine, synchronized WIS/helmet subscriber, on-device APK build/install test for this branch, or independent physical validation. The local IndexedDB record is a recovery aid, not a substitute for server backup or a validated evidence repository.

The existing Android plugin's Wi-Fi data is platform scan cache; cellular information is platform-provided; BLE discovery is limited by Android permissions and radio scope. Those limitations remain visible in every event and operator view.
