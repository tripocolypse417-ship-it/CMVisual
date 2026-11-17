# WaveRadar Incident Scene & Replay Foundation

Status: deterministic software reconstruction foundation. No live 3D rendering, sensor-to-building registration, physical accuracy, or real incident feed is established by this module.

## Data flow

Raw immutable sensor/evidence records -> normalized scene events -> timestamp/sequence ordering -> deterministic scene snapshot -> role/floor projections -> WIS and helmet renderers.

Both command and helmet views must derive from the same snapshot and synchronization key. They may filter content by role and operational need, but must not independently simulate or silently alter geometry.

## Event contract

- Every event requires an event ID, incident ID, supported event type and valid capture timestamp.
- Events with missing/invalid timestamps, missing incident IDs, unsupported types or incomplete entity keys are quarantined from time-based replay; arrival time is never substituted for capture time.
- Entity positions require x/y/z and retain coordinate-frame and floor identifiers. Alignment is explicitly ALIGNED or UNVERIFIED.
- Evidence class, source ID, evidence references, confidence and uncertainty are preserved.
- Supported events: ENTITY_UPSERT, ENTITY_REMOVE, EVIDENCE_LINK, SCENE_METADATA.

## Replay semantics

- Deterministic ordering: capture time, source sequence, arrival order, then event ID.
- Seeking reconstructs state from accepted events up to the requested cursor.
- Removal is an event, not destructive rewriting of the evidence log.
- Quarantined events remain countable and inspectable; they do not silently enter the scene.
- Chief and helmet projections share cursor and applied-event IDs.

## Required next layer

1. Durable append-only event/evidence store with hash-linked integrity and retention controls.
2. Building/floor/room geometry ingestion with units, coordinate transforms and surveyed control points.
3. Sensor extrinsic calibration and time synchronization with explicit error bounds.
4. Renderer for floor plans, 3D geometry, tracks, hazard fields, sensor footprints and coverage.
5. Timeline controls: play/pause, step, seek, speed, event filters, source toggles and evidence drill-down.
6. Helmet low-latency projection of the exact scene snapshot, with stale/offline warnings and role-based filtering.
7. Recorded replay verification against independent ground truth; synthetic/demo events must be visibly labeled.

## Safety boundary

A marker without validated spatial registration must not be drawn as a precise world coordinate. Range-only evidence must not be converted into bearing. Unknown, stale, inferred, predicted and quarantined data must remain visually distinguishable. This foundation does not establish operational readiness or rescue-grade accuracy.
