# WIS Incident Replay and 3D Reconstruction — Architecture Specification

**Status:** Proposed core capability; design only until implementation and validation are complete.  
**Reviewed:** 2026-11-02  
**Branch:** `waveradar/portable-core-foundation`

## Product requirement

A firefighter, incident commander, safety officer, or authorized investigator must be able to reopen an incident after the event and inspect the scene as it evolved. The replay must use the evidence that was available at each historical moment—not silently mix in later information. Where the evidence supports it, WIS may generate a navigable 3D reconstruction and a causal timeline to help assess fire spread, hazards, equipment failures, and possible origins. The system must not present an inferred reconstruction or suspected cause as measured fact.

This is an incident evidence and safety-review capability, not an automated fire-origin determination system.

## 1. Incident record and time model

Every incident has a stable `incident_id`, operational timeline, location/coordinate reference, participating devices, authorized data sources, access policy, and immutable audit history.

Every incoming item is represented as an evidence envelope with at least:

- Stable evidence ID, incident ID, source ID, device/sensor ID, modality, schema version.
- `event_time` (when the source says it happened) and `ingest_time` (when WIS received it); clock source, offset/uncertainty, and synchronization status.
- Valid-time interval where applicable, capture interval for media, and sequence number where available.
- Original payload/blob reference, content digest, format/codec, size, and retention class.
- Location, coordinate frame, units, spatial uncertainty, orientation, and calibration reference where applicable.
- Sensor capability, permission/authorization state, health, sampling rate, coverage gaps, quality flags, and known limitations.
- Evidence class: `MEASURED`, `DERIVED`, `INFERRED`, `PREDICTED`, `SIMULATED`, `UNKNOWN`, or `UNAVAILABLE`.
- Provenance: source/licence/authority, collection method, transformation history, and operator/system identity.

Event time and ingest time must never be conflated. Late-arriving records are inserted into the historical event timeline with their actual arrival time preserved. Corrections and annotations are appended as new linked records; accepted raw evidence is never silently overwritten.

## 2. Two replay modes — never blur them

1. **As-known-then replay:** Reconstruct exactly what WIS had received and could display at a selected historical time. Exclude data ingested later, even if it describes an earlier event. This is the operational decision audit.
2. **Best-evidence-now replay:** Revisit the same event using all subsequently received authorized evidence, corrected timestamps, external records, and later analysis. Every addition is visibly marked with its later receipt/analysis time.

The UI must make the active mode persistent and unmistakable. Users can compare the two modes, but cannot mistake hindsight for information available to crews during the incident.

## 3. Sensor and network ingestion

Use a source-adapter model rather than assuming every network or sensor is directly accessible. Each adapter declares its permissions, exposed fields, rate limits, provenance, update cadence, expected latency, geographic/temporal coverage, licence, and failure behavior.

Potential authorized inputs include:
- On-scene camera/video, thermal camera, microphone/audio metadata where lawfully collected, IMU, GNSS, depth/LiDAR, and device health.
- Department-owned/authorized Wi-Fi access points and network telemetry; exposed signal metrics only. No payload interception or unauthorized access.
- Cellular and satellite link/position/availability telemetry exposed by authorized devices, carriers, or public datasets.
- Dispatch/CAD and radio logs where the department has lawful access.
- Building plans, pre-incident plans, hydrant/water data, parcel/building footprints, terrain/elevation, roads, weather, flood/hazard context, and public imagery under source terms.
- External sensors and partner systems with explicit authority, provenance, and schema mapping.

A world map is the spatial index and context surface—not a magical universal receiver. It may combine all authorized and technically exposed sources, but must label missing access, stale feeds, coverage gaps, and unavailable modalities. Public coverage maps are context, not live incident RF measurements. Public building footprints are not interior geometry. Satellite imagery is not a live indoor view.

## 4. Timeline and scene reconstruction

WIS builds a time-indexed scene graph from evidence, not from untraceable model output.

- Synchronize observations into a common incident time axis while retaining original clocks and uncertainty.
- Associate records with locations, rooms/zones, devices, people/equipment only when justified and authorized.
- Display a synchronized event timeline, map, sensor tracks, media, alarms, and operator actions.
- Support pause, scrub, step, speed change, event bookmarks, side-by-side comparison, and export of a reproducible replay package.
- Build 3D geometry from actual depth/LiDAR/photogrammetry/building plans where available. Attach each surface/object to source evidence, capture time, confidence, coordinate frame, and spatial error.
- Use estimated geometry only as a separately styled layer, with explicit uncertainty and provenance. Never fill gaps with fabricated “measured” geometry.
- Overlay heat, smoke, gas, motion, signal, or hazard fields only when a corresponding sensor or defensible model exists. Interpolated areas must be visibly marked as interpolated.
- Record model name/version, parameters, inputs, processing time, and uncertainty for every reconstruction or derived layer.

The scene should answer: what was observed, where, when, by which source, with what quality, and what was not observed?

## 5. Fire and incident analysis safeguards

WIS may generate candidate timelines and competing hypotheses (for example, possible ignition areas, fire/smoke progression, equipment or structural events), but must:
- Separate observation from interpretation and hypothesis.
- Show supporting and contradicting evidence, missing evidence, uncertainty, and alternative explanations.
- Avoid ranking a fire cause as established fact without qualified investigation and appropriate independent evidence.
- Preserve original evidence and chain-of-custody events; access, export, annotation, and analysis are auditable.
- Provide role-based permissions, legal hold/retention controls, encryption, secure transfer, and tamper-evident manifests.
- Prevent post-event datasets from appearing in as-known-then replay.
- Display an explicit warning when time synchronization, calibration, source integrity, or coverage is inadequate.

## 6. World map and data organization

The world map should support global source discovery and incident-level retrieval, with spatial/temporal filters and source-specific permissions. Organize data into:
- **Incident evidence:** event-specific sensor/media records.
- **Public context:** weather, terrain, roads, public structures, hazard layers, and other licensed data.
- **Reference/ground truth:** independently surveyed measurements and authoritative records.
- **Model outputs:** derived geometry, tracks, classifications, forecasts, and hypotheses.
- **Unavailable/gap records:** explicit record of expected-but-missing sources, outage windows, denied permissions, and sensor limitations.

Use a geospatial database/index for queries and object storage for original media/blobs. Preserve source-native originals; normalized representations are additional derivatives. Cache authorized reference data for offline review, with retrieval time and expiry/freshness. Never cache private network data beyond the department's authorization or retention policy.

## 7. Minimum implementation sequence

**Phase A — Evidence foundation**
- Extend the observation envelope with incident ID, event/ingest times, clock uncertainty, capture interval, spatial reference, source authority, and immutable lineage.
- Define incident, evidence-object, source-registry, audit-event, and replay-session schemas.
- Add deterministic fixtures for late-arriving data, clock drift, missing sensors, duplicate uploads, and corrected annotations.

**Phase B — Timeline replay**
- Build an incident evidence manifest and query API.
- Implement as-known-then and best-evidence-now replay filters.
- Add synchronized timeline controls and audit log.
- Test that late-arriving records never leak into earlier as-known-then views.

**Phase C — 3D scene**
- Import real building geometry and depth/photogrammetry captures.
- Attach provenance and uncertainty to every layer/object.
- Support replay synchronized to scene time.
- Keep synthetic/demo scenes visibly marked as simulated.

**Phase D — World data and analysis**
- Add allowlisted public-data adapters and authorized department integrations.
- Add source freshness, access, licence, and coverage status.
- Add competing-hypothesis analysis and review workflow; no automated cause certification.

**Phase E — Field validation**
- Test on recorded controlled exercises with independent ground truth.
- Measure timestamp error, spatial error, reconstruction completeness, missing-data detection, false associations, replay determinism, and recovery after offline capture.
- Require independent review and department safety approval before operational life-safety claims.

## 8. Acceptance tests

1. A user can reopen an incident and replay all authorized evidence in synchronized time order.
2. Selecting a past time in as-known-then mode excludes any item WIS had not received by that time.
3. Best-evidence-now mode includes later-arriving evidence but labels when it arrived and when it was analyzed.
4. Every 3D object/layer can be traced to original evidence or is explicitly marked estimated/simulated.
5. Clock drift, missing sensors, stale feeds, denied access, and low-quality data are visible—not silently hidden.
6. Exported replay package reproduces the same timeline and scene from the included manifest and source evidence.
7. Audit records show who accessed, exported, annotated, or changed an analysis.
8. No output labels a suspected cause, inferred person location, or estimated geometry as confirmed fact.

## Non-goals and explicit limits

- No universal access to all private networks, carrier systems, device sensors, or satellite telemetry.
- No inference that Wi-Fi/cellular/satellite signals can reliably see through walls or identify people without validated, lawful sensing methods.
- No claim that a 3D reconstruction is complete where sensor coverage is absent.
- No autonomous determination of fire cause or replacement for qualified fire investigators.
- No promotion of experimental layers into firefighter navigation until separately validated.

## Architectural decision

Treat the WIS incident record as the durable source of truth for evidence, provenance, time, and audit. Treat the world map as a query and visualization layer over authorized sources. Treat replay and 3D reconstruction as reproducible views over immutable evidence and versioned analysis—not as a single mutable “recreated scene.”
