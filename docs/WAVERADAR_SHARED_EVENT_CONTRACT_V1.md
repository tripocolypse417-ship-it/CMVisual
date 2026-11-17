# WaveRadar Shared Event Contract v1

**Status:** v1 contract committed on the CMVisual feature branch; the supporting WaveRadar Core event API and append-only tables are deployed in Core v435. Device-level upload and physical validation are still pending.

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

A dependency-free adapter helper is available at `src/lib/eventEnvelope.js`. It wraps an unmodified native snapshot, preserves source clock-domain distinctions, assigns a UUID, attaches the active WIS session ID when available, and calculates a SHA-256 digest when Web Crypto is available. The native bridge now uses the same `waveradar.device.id.v1` identity and `waveradar.enrollment.token` credential keys written by the Core guided-setup flow. `src/hooks/useNativeEvidencePipeline.js` connects Android SensorManager samples and the existing Android network-discovery event to this envelope. `src/lib/localEvidenceStore.js` appends envelopes to a device-local IndexedDB store using deterministic source-sample keys; a separate delivery store tracks pending, acknowledged, and quarantined upload states without modifying evidence records. A `local-indexeddb://` reference points to the local record. IndexedDB can still be cleared or evicted, and storage exhaustion is surfaced rather than silently dropping samples.

The envelope contains event identity/type, source and adapter identity, authorization scope, observation and receive timestamps, clock domain and uncertainty, evidence class and integrity state, parent event IDs, optional spatial frame/pose and uncertainty, a versioned event-specific payload, immutable raw-evidence reference and SHA-256, retention class, and quality status.

Nullable source time, pose, and raw-evidence references represent genuine platform limitations. Missing information must remain explicit and must never be fabricated.

## Event processing contract

1. Native adapter captures source data and source-native timestamps.
2. Adapter creates an envelope and preserves original payload bytes.
3. The deployed Core endpoint `/api/events/device-ingest` authenticates the collector with the existing device enrollment token and checks that the envelope device ID matches the token-bound device.
4. Core checks envelope structure, source clock semantics, evidence class, payload byte length, and SHA-256 over canonical JSON payload data. Invalid or mismatched events are appended to an immutable quarantine table with reason codes.
5. Accepted events append to `waveradar_event_envelopes`; event IDs are idempotent, and conflicting content under the same ID is quarantined. Server receive time is stored separately from client receive time and source time.
6. A separate fusion worker consumes accepted events and emits derived scene events with parent event IDs and uncertainty.
7. Core publishes a small owner-scoped `event-stored` notification after the database insert. `/api/events-token` grants a short-lived subscription to the authenticated owner's channel; `/api/events/snapshot` returns owner-scoped, session-filterable event envelopes.
8. CMVisual's WIS workspace, spatial viewport, and HMD-style overlay receive the same local timeline cursor and shared Core event-stream status object. This is same-app view-state alignment; it is not yet proof of a separate physical helmet client or a shared server-side scene revision.
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

- JSON Schema positive/negative fixtures; reject missing required fields, unknown evidence classes, invalid hashes, malformed timestamps, and invalid units. CI regression tests cover the adapter's clock-domain and local-reference semantics.
- Verify raw payload hash before and after ingestion and replay.
- Verify idempotent duplicate delivery and conflicting-ID rejection.
- Verify out-of-order and late-arriving events preserve both replay modes.
- Verify unknown clock domain and missing pose remain explicitly unknown/unavailable.
- Verify derived scene and prediction events link to all parent event IDs.
- Verify WIS and helmet receive identical scene revision, event sequence, and timeline cursor under normal delivery, reconnect, and resynchronization.
- Verify permission-denied, unsupported, stale, disconnected, and empty are separate source states.
- Verify owner snapshot and event-token routes; verify missing/invalid device tokens are rejected. These API gate checks have passed in Core v435.
- Still required: valid enrollment-token upload from the actual Android phone; end-to-end realtime event delivery; run on the actual Android target; record build, device, OS, permission, and adapter versions. Engineering-only captures without independent ground truth are not validation.

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

**Implemented and deployed in WaveRadar Core v435:** additive append-only event-envelope and quarantine tables; database-level UPDATE/DELETE rejection triggers; device-token-authenticated event ingestion; owner-scoped snapshot retrieval; owner-scoped realtime subscription grants; session correlation; server-side canonical payload SHA-256 comparison; duplicate handling; and quarantine reason codes. The event/quarantine tables currently contain zero records; no synthetic observations were inserted during endpoint checks.

**Implemented on CMVisual branch `feat/shared-event-contract-v1`:** v1 schema and adapter helper; Android sensor and network event adapters; local IndexedDB evidence store and separate delivery queue; retry/backoff; device identity alignment with the existing guided-setup key; enrollment-token upload path; CI regression test; WIS event-stream hook; and a shared timeline summary passed to the spatial workspace, WIS timeline panel, and HMD-style overlay.

**Verified so far:** schema JSON parses; Core v435 deployed without migration warnings; immutable database triggers exist; missing/invalid device tokens are rejected; owner event-token route returns a grant; session-filtered snapshot route returns an owner-scoped empty result. These checks do not prove a real device upload.

**Not yet implemented or verified:** successful upload from the actual phone using its locally stored enrollment token; CI completion for the latest CMVisual head; installation and execution of the resulting APK on the Moto G Play; server-side 3D scene fusion from raw sensor events; scene entity/revision processor; deterministic replay of event envelopes as a spatial scene; and synchronization to a separate physical helmet display. The server stores the complete JSON envelope in Postgres; it does not yet copy raw binary sensor files into the separate evidence object vault. The payload hash covers canonical JSON payload data, not an original binary sensor file, and it is not independent validation.

Android sensor events preserve elapsed-realtime nanoseconds and leave UTC observation time null. Network snapshots retain an UNKNOWN source clock because Android's platform snapshot does not establish the original measurement time. Wi-Fi scan results may be cached; cellular metadata is platform-provided; BLE discovery is permission- and scan-window-limited.

The CMVisual upload worker posts pending events to Core `/api/events/device-ingest` with the device enrollment token, retains unacknowledged records locally, and retries with backoff. Core publishes owner-scoped realtime notices and supports session-filtered snapshots. The actual phone's token availability and successful upload still require a device-level test.

The existing Android plugin's Wi-Fi data is platform scan cache; cellular information is platform-provided; BLE discovery is limited by Android permissions and radio scope. Those limitations remain visible in every event and operator view.
